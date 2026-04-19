# TypeScript 実装方針

## 目的

このドキュメントは、本リポジトリにおける TypeScript 実装方針を定義する。対象は、東京都動物愛護相談センターの譲渡動物情報を監視し、GitHub Actions 上で実行される bot 本体である。

## 結論

- 実装言語は `TypeScript` を採用する
- GitHub Actions 上では、`tsc --noEmit` で型チェックしたうえで、Node.js により `.ts` を直接実行する
- 型検査は `strict` を前提とし、曖昧な `any` を避ける
- 外部入力である HTML、JSON、環境変数、HTTP レスポンスは、境界で明示的に検証・絞り込みを行う
- `dist/` は運用の前提にしない

## 採用理由

### 1. GitHub Actions と相性が良い

Node.js は GitHub Actions 上で素直に実行できる。依存キャッシュも `setup-node` で扱いやすく、定期実行ジョブとの相性が良い。

### 2. Bluesky 連携との相性が良い

Bluesky まわりは TypeScript の利用例が多く、bot 実装に必要な情報とライブラリ資産を活用しやすい。

### 3. 型で境界を固めやすい

この bot は、外部 HTML、画像 URL、Secrets、SNS API など、信頼できない入力を多数扱う。TypeScript の厳格な型検査を使うことで、実行時不整合を早い段階で潰しやすい。

## 実行方針

### ソースコード

- アプリケーションコードは `src/` 配下に `TypeScript` で置く
- エントリポイントは少数に保ち、CLI から実行できる形にする

### ビルド

- 実行前に `tsc --noEmit` で型チェックを行う
- 監視ジョブの実行は `node path/to/file.ts` を基本とする
- `dist/` 生成を前提としない
- `ts-node` や `tsx` などの追加ランナーには依存しない

この方針により、workflow を単純に保ちつつ、型検査を CI で維持できる。

## 推奨ディレクトリ構成

例:

```text
src/
  cli/
    run-monitor.ts
    run-activity-check.ts
  model/
    animal.ts
    publishing.ts
  monitor/
    decision.ts
    fetch.ts
    parse/
      detail-page.ts
      list-page.ts
      __fixtures__/
  publish/
    bluesky-publisher.ts
    x-publisher.ts
  persistence/
    files.ts
    load-state.ts
    save-state.ts
    state-file.ts
  shared/
    env.ts
    error.ts
    logging.ts
    http.ts
    text.ts
```

狙い:

- 取得・パース
- 判定ロジック
- 投稿
- 永続化
- 共有モデル
- 共通処理

を分離し、ユースケースごとの流れと共通部品を混ぜすぎない。

## tsconfig 方針

`tsconfig.json` を正とし、このドキュメントでは設計上重要な方針だけを扱う。

- `strict: true`
- `exactOptionalPropertyTypes: true` と `noUncheckedIndexedAccess: true` を有効にし、外部入力や state 読み書きの曖昧さを減らす
- `module: "nodenext"`
- `verbatimModuleSyntax: true`
- `rewriteRelativeImportExtensions: true` と `allowImportingTsExtensions: true` を前提に、相対 import では `.ts` 拡張子を明示する
- `erasableSyntaxOnly: true` を前提に、Node.js の type stripping で扱えない TypeScript 構文は持ち込まない
- `noEmit: true`

## Lint / Format 方針

- `Prettier` は整形だけを担当し、コードスタイルの揺れを減らす
- 行末セミコロンは付ける方針とし、ASI に依存しない
- `ESLint` はバグ予防と TypeScript 運用ルールの強制を担当する
- import の整理、未使用変数、未処理 Promise、`any` の持ち込みなど、機械的に判定できるものを優先して制約する
- 責務分離や差分判定ルールのような設計判断は lint に押し込まず、ドキュメントとレビューで維持する

## モジュール方針

- Node.js の標準に合わせて ESM を基本とする
- 相対 import では実行時に解決できる拡張子を明示する
- 相対 import は必要最小限にし、責務ごとのモジュール境界を明確にする
- 便利さのための循環参照は作らない

## 型設計方針

### 1. 外部入力と内部表現を分ける

外部から取得した値を、いきなり内部ドメイン型として扱わない。

例:

- HTML から抜いた生文字列
- JSON ファイルから読んだ未知のオブジェクト
- `process.env` の値
- SNS API から返るレスポンス

これらは一度 `unknown` または境界用の中間型として受け、検証後に内部型へ変換する。

### 2. `type` / `interface` の使い分け

- ドメインデータの形には `type` を優先する
- 拡張前提の公開契約が必要な場合だけ `interface` を使う

このリポジトリでは union 型や判別可能 union を使う場面が多いため、`type` 中心で問題ない。

### 3. 判別可能 union を使う

投稿結果、取得結果、検証結果のように分岐がある値は、成功/失敗を曖昧な nullable で表さない。

例:

```ts
type PublishResult =
  | { ok: true; platform: "bluesky"; postUri: string }
  | { ok: false; platform: "bluesky"; reason: string };
```

### 4. `never` を使って分岐漏れを防ぐ

`switch` による分岐は網羅性チェックを前提にする。

### 5. Node.js ネイティブ実行に乗らない構文を避ける

次は原則として使わない。

- `enum`
- `namespace`
- parameter properties
- `tsconfig` 依存の path alias

このプロジェクトでは、Node.js が軽量に strip できる TypeScript 構文に寄せる。

## エラーハンドリング方針

- 例外を広く握りつぶさない
- `catch` では `unknown` から `Error` 相当へ絞り込む
- 外部 I/O の失敗は、処理継続可否が分かる戻り値に変換する
- 投稿失敗と状態保存失敗は分けて扱う

この bot では、次のような失敗は分離する。

- 一覧取得失敗
- 詳細取得失敗
- 画像取得失敗
- Bluesky 投稿失敗
- state ファイル保存失敗
- git コミット失敗

## パース方針

- HTML パース結果をそのまま信頼しない
- 必須項目が欠けた場合は、そのレコードを無理に採用しない
- `管理番号` は normalize して比較用キーを安定化する
- 空文字と `undefined` を混同しない

## 状態管理方針

- state ファイルの読み込み結果は必ずバリデーションする
- state のバージョンを持てる形にして、将来の移行をしやすくする
- 動物スナップショットには、差分判定と履歴把握に必要な項目だけを持たせる
- state ファイルは毎回保存せず、意味のある差分があるときだけ更新する
- 失敗通知は state ファイルではなく workflow 履歴と Issue に分離する

例:

```ts
type StateFile<T> = {
  version: 1;
  updatedAt: string;
  data: T;
};
```

## 環境変数方針

- `process.env` を各所で直接読まない
- `env.ts` に集約して読み込み、起動時に必須値を検証する
- 不足がある場合は早期に失敗させる

例:

- `BLUESKY_IDENTIFIER`
- `BLUESKY_APP_PASSWORD`
- `X_API_KEY`
- `X_API_SECRET`

## HTTP 方針

- `fetch` を共通化し、タイムアウトと User-Agent を一元管理する
- リトライは対象を限定する
- HTML 取得と画像取得でログ粒度を分ける

## ログ方針

- 構造化しやすいキー付きログを優先する
- 秘密情報はログに出さない
- 失敗時には対象 URL、管理番号、投稿先など、追跡に必要な情報だけを出す

## コメント方針

- 各 `.ts` ファイルには、そのファイルの責務や意図がひと目で分かる最小限の日本語コメントを入れる
- 各関数には JSDoc 形式で、その関数が何をするかを日本語で記述する
- コメントは実装の逐語説明ではなく、「何のためのファイルか」「なぜこの処理があるか」を補う用途に限る
- 条件分岐や変換が自明な場合はコメントを増やしすぎない
- TypeScript の型だけで十分に読める引数には `@param` を付けなくてよい
- `@param` や `@returns` は、型だけでは意図や前提が伝わりにくい場合に限って追加する

## テスト方針

- パーサーと差分判定を優先的にテストする
- 対象サイトの HTML 断片を fixture として持てるようにする
- SNS 投稿クライアントはスタブ化できるように抽象化する
- すべての関数へ機械的にテストを書くのではなく、壊れると困る判断ロジックとパースを優先する
- fixture や mock のコストが高い境界処理は、薄いラッパーを無理にテストせず、その内側の判断ロジックを重点的にテストする

優先順位:

1. 一覧ページパース
2. 詳細ページからの画像 URL 抽出
3. 差分判定
4. 投稿文生成
5. state 読み書き

優先度が低いもの:

- 外部 API を薄く呼ぶだけの関数
- 単純なログ出力
- 型や統合確認で十分に守れる薄いラッパー

## GitHub Actions 実行方針

- `actions/setup-node` を使って Node.js をセットアップする
- パッケージマネージャのキャッシュは `setup-node` の機能を使う
- workflow 内では次の順に実行する
  1. 依存解決
  2. 型チェック
  3. 監視ジョブ実行

監視ジョブ実行例:

```sh
npm run typecheck
node src/cli/run-monitor.ts
```

## `dist/` 方針

- `dist/` はコミットしない
- `dist/` を生成しない前提で運用する
- 将来 bundling や配布が必要になった場合だけ再検討する

## 非推奨

- 広い範囲での `any`
- `as` による安易な型断言
- `process.env.X!` の多用
- nullable と optional の混在で意味を曖昧にすること
- 1 ファイルに取得、パース、差分判定、投稿を全部詰め込むこと
- Node.js が直接扱えない TypeScript 構文への依存
- `tsconfig` の path alias を前提にした import

## Node.js ネイティブ実行の前提

- Node.js 24 以上を前提とする
- `tsc --noEmit` による型検査と、Node.js 実行時の制約の両方を満たすコードを書く
- `tsconfig.json` に依存した実行時変換を前提にしない
- 実行系は `node file.ts`、型検査は `tsc --noEmit` と役割分担する

## 参考

- TypeScript `strict`: https://www.typescriptlang.org/tsconfig/strict.html
- TypeScript `exactOptionalPropertyTypes`: https://www.typescriptlang.org/tsconfig/exactOptionalPropertyTypes.html
- TypeScript `useUnknownInCatchVariables`: https://www.typescriptlang.org/tsconfig/useUnknownInCatchVariables.html
- TypeScript Handbook `Narrowing`: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- GitHub Actions 依存キャッシュ: https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching
- Node.js TypeScript modules: https://nodejs.org/download/release/v24.1.0/docs/api/typescript.html
- Node.js Running TypeScript Natively: https://nodejs.org/en/learn/typescript/run-natively
