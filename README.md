# 東京都動物愛護相談センター 譲渡動物情報 Bot

東京都動物愛護相談センターの譲渡動物情報ページを定期的に確認し、新しい掲載があったときに SNS へ投稿する bot です。

## 重要な注意

- この bot は非公式の個人開発プロジェクトです。東京都動物愛護相談センターおよび東京都とは関係ありません。
- この bot に関する問い合わせや要望を、東京都動物愛護相談センターへ行わないでください。

現在は次のページを監視対象にできます。

- 犬: https://shuyojoho.metro.tokyo.lg.jp/generals/
- 猫・その他: https://shuyojoho.metro.tokyo.lg.jp/generals/cat

## できること

- GitHub Actions で `2〜3時間` ごとにページを確認する
- 一覧ページから動物情報を取得する
- 掲載画像を取得して、画像付きで投稿する
- 新しく掲載された動物だけを投稿する
- 投稿済みの動物を `state/` で管理して重複投稿を防ぐ
- 監視 workflow の失敗が `3回` 連続したら GitHub Issue で通知する
- 監視 workflow が復旧したら Issue を自動でクローズする
- 45 日以上コミットがないときに、scheduled workflow 無効化の警告 Issue を作成する

## 現在の投稿先

- `Bluesky`

`X` への投稿はまだ実装していません。

## 動作の考え方

- 更新がなければ投稿しません
- 更新がなければ `state/` も更新しません
- ページ構造が変わって一覧の取得に失敗した場合は、安全のため投稿せず workflow を失敗にします
- 画像取得だけに失敗した場合は、画像なし投稿へフォールバックします

## リポジトリ構成

- `src/` : bot 本体
- `state/` : 最新スナップショットと投稿済み状態
- `.github/workflows/monitor.yml` : 監視と投稿
- `.github/workflows/activity-warning.yml` : 60 日無活動の警告
- `docs/` : 設計方針や実装方針

投稿文テンプレートは [src/publish/post-template.ts](/workspace/src/publish/post-template.ts) で定義しています。

## 必要なもの

- Node.js `24` 以上
- npm
- GitHub Actions が使える GitHub リポジトリ
- Bluesky アカウントと App Password

## ローカルで試す

依存関係を入れます。

```sh
npm install
```

型チェック:

```sh
npm run typecheck
```

テスト:

```sh
npm test
```

投稿せずに dry-run で確認:

```sh
DRY_RUN=true npm run monitor
```

この実行では対象ページを取得して差分判定まで行いますが、SNS 投稿はしません。

## GitHub で動かす手順

1. このリポジトリを GitHub に push する
2. `Settings` → `Secrets and variables` → `Actions` で Secrets を設定する
3. `Actions` タブで workflow を有効化する
4. 必要なら `Monitor Adoption Animals` を手動実行して初回確認を行う

## 環境変数

この bot は [src/shared/env.ts](/workspace/src/shared/env.ts) で次の環境変数を参照します。

### 必須

通常の投稿運用では、次が必須です。

- `BLUESKY_IDENTIFIER`
  - Bluesky のログイン ID
- `BLUESKY_APP_PASSWORD`
  - Bluesky の App Password

例外として、`DRY_RUN=true` の場合は実投稿しないため、上記 2 つがなくても動作確認できます。

### オプショナル

- `SOURCE_LIST_URL`
  - 監視対象の一覧ページ URL
  - カンマまたは改行区切りで複数指定可能
  - 既定値: `https://shuyojoho.metro.tokyo.lg.jp/generals/` と `https://shuyojoho.metro.tokyo.lg.jp/generals/cat`
- `USER_AGENT`
  - 取得時に使う User-Agent
  - 既定値: `tokyo-animal-adoption-bot/1.0 (+https://github.com/owner/repo)`
- `DRY_RUN`
  - `true` のとき、投稿せずに取得・差分判定だけ行う
  - 既定値: `false`
- `FETCH_TIMEOUT_MS`
  - ページ取得や画像取得のタイムアウト（ミリ秒）
  - 既定値: `15000`
- `MAX_IMAGE_BYTES`
  - 投稿用画像として受け入れる最大サイズ（バイト）
  - 既定値: `950000`
- `BLUESKY_ENABLED`
  - `false` にすると Bluesky 投稿を無効化する
  - 既定値: `true`
- `BLUESKY_SERVICE_URL`
  - Bluesky API の接続先
  - 既定値: `https://bsky.social`

## GitHub Secrets に設定するもの

GitHub Actions で通常運用する場合は、少なくとも次を `Settings` → `Secrets and variables` → `Actions` に設定してください。

- `BLUESKY_IDENTIFIER`
- `BLUESKY_APP_PASSWORD`

## GitHub Actions の内容

### 監視 workflow

`.github/workflows/monitor.yml`

- 3 時間ごとに実行
- `npm ci`
- `npm run typecheck`
- `npm run monitor`
- `state/` に変更があったときだけ commit / push

### 無活動警告 workflow

`.github/workflows/activity-warning.yml`

- 毎日 1 回実行
- default branch の最終コミット日時を確認
- 45 日以上経過していたら警告 Issue を作成

## state ファイル

- `state/animals.json`
  - 最新の掲載動物一覧
- `state/posted.json`
  - 投稿済みの管理番号と投稿先情報

`state/animals.json` の各動物には `firstSeenAt` を持たせています。これは画像取得日時ではなく、この bot がその動物を最初に検知した時刻です。

`state/posted.json` は重複投稿防止のための永続状態です。現在の実装では古い投稿記録を自動削除しないため、運用を続けるほどデータは増えていきます。件数が十分に増えた場合は、将来的に pruning 方針を検討します。

これらは bot の重複投稿防止と差分判定に使います。

## 失敗したときの見え方

- 単発の失敗: GitHub Actions の run failure として見える
- 3 回連続失敗: `monitor-failure` ラベル付き Issue を作成または更新
- 復旧後: 既存の障害 Issue にコメントしてクローズ

失敗原因としては次のようなものが考えられます。

- 監視対象ページの HTML 構造変更
- 一時的なネットワーク障害
- Bluesky 投稿失敗

## 注意点

- 対象サイトに負荷をかけないよう、監視間隔は長めに設定しています
- この bot は一覧ページの HTML 構造に依存します
- 監視対象ページや SNS API の仕様変更により、修正が必要になることがあります
- public repository の scheduled workflow は、GitHub の inactivity ルールの影響を受ける場合があります

犬と猫を両方監視したい場合の例:

```sh
SOURCE_LIST_URL="https://shuyojoho.metro.tokyo.lg.jp/generals/,https://shuyojoho.metro.tokyo.lg.jp/generals/cat" npm run monitor
```

## 今後の候補

- `X` 投稿の追加
- 通知文面の改善
- 画像処理の強化

## 関連ドキュメント

- [アーキテクチャ方針決定](./docs/architecture-decision.md)
- [アーキテクチャ](./docs/architecture.md)
- [TypeScript 実装方針](./docs/typescript-guidelines.md)
