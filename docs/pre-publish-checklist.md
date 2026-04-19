# 公開前チェックリスト

GitHub でこのリポジトリを公開する前に、最低限次を確認する。

## Secrets と認証情報

- ソースコード、workflow、state、docs に Secrets を直接書いていない
- Bluesky の認証情報を GitHub Secrets 以外に保存していない
- `.env`、認証メモ、個人用設定ファイルをコミットしていない
- ログ出力にトークンやパスワードを含めない

## リポジトリ内容

- `README.md` に非公式であることを明記している
- `README.md` に、この bot について東京都動物愛護相談センターへ問い合わせしないことを明記している
- 対象サイトへのアクセス頻度が過度でない
- state ファイルに個人情報や Secrets が入っていない
- `.vscode/`、`.devcontainer/`、`.codex` などのローカル開発補助ファイルを公開に含めるか判断している

## GitHub Actions

- workflow 内で Secrets を echo していない
- Actions の permissions が必要以上に広くない
- state の commit は `state/` に限定されている
- 失敗通知や inactivity 警告の動作意図が README / docs と一致している

## 公開時の運用

- 公開後も Secrets は GitHub Secrets でのみ管理する
- 将来 SNS 投稿先を増やす場合も API キーをリポジトリへ含めない
- 外部サービスや対象サイトの仕様変更に応じて docs を更新する

## 実施コマンド例

```sh
git grep -nE 'BLUESKY_APP_PASSWORD|BLUESKY_IDENTIFIER|token|secret|password'
find . -maxdepth 2 -type f | sort
git status --short
```

必要なら、公開前に未追跡ファイルや Actions の設定内容も目視確認する。
