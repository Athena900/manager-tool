# 緊急デプロイ手順

## 1. Vercelの環境変数設定

Vercelダッシュボードで以下の環境変数を設定：

```
NEXT_PUBLIC_ADMIN_PASSWORD=SecureBarPass2024!@#
```

## 2. 設定手順

1. https://vercel.com/dashboard にアクセス
2. manager-tool プロジェクトを選択
3. Settings → Environment Variables
4. 以下を追加：
   - Name: `NEXT_PUBLIC_ADMIN_PASSWORD`
   - Value: `SecureBarPass2024!@#`
   - Environment: Production, Preview, Development すべて選択

## 3. 再デプロイ

```bash
git add .
git commit -m "fix: セキュリティ修正 - パスワード環境変数化"
git push origin main
```

## 4. 確認

- https://manager-tool.vercel.app/ にアクセス
- 新しいパスワード「SecureBarPass2024!@#」でログイン
- 正常に動作することを確認

## 緊急度：HIGH
この修正により、パスワードがソースコードから削除されます。