# 🚨 URGENT: Supabase Site URL設定確認

## 緊急実行が必要な設定

### Supabaseダッシュボード設定変更手順

1. **Supabaseダッシュボードにアクセス**
   - URL: https://supabase.com/dashboard
   - プロジェクト: `csnkakkzcpamycuvrtqk`

2. **Authentication → URL Configuration**
   - 左メニューから「Authentication」をクリック
   - 「URL Configuration」タブをクリック

3. **Site URL を確認・修正**
   **現在の設定確認**:
   - Site URL が `http://localhost:3000` になっている場合は緊急修正が必要
   
   **正しい設定**:
   ```
   Site URL: https://manager-tool.vercel.app
   ```

4. **Redirect URLs を確認・追加**
   以下のURLが設定されていることを確認:
   ```
   https://manager-tool.vercel.app/**
   https://manager-tool.vercel.app/auth/callback
   ```

5. **設定の保存**
   - 「Save」ボタンをクリック
   - 設定変更が反映されるまで1-2分待機

## ✅ コード修正完了事項

### 1. Supabaseクライアント設定
- ✅ デフォルトリダイレクトURLを本番環境に設定
- ✅ 環境変数による動的URL設定

### 2. 認証サービス修正
- ✅ `signUp`メソッドに`emailRedirectTo`を明示指定
- ✅ 本番環境とローカル環境の自動判定

### 3. 環境変数追加
- ✅ `NEXT_PUBLIC_SITE_URL=https://manager-tool.vercel.app`
- ✅ Vercelでも同じ環境変数を設定する必要あり

## 🔧 Vercel環境変数設定

Vercelダッシュボードで以下の環境変数を追加:
```
NEXT_PUBLIC_SITE_URL=https://manager-tool.vercel.app
```

## 🧪 テスト手順

1. **コードのデプロイ**
   ```bash
   git add .
   git commit -m "Fix Site URL configuration for production emails"
   git push origin main
   ```

2. **Vercel再デプロイ後のテスト**
   - 新規ユーザー登録
   - 確認メールのリンクURL確認
   - 認証フローの完了確認

## 🚨 重要: 設定チェックリスト

- [ ] Supabase Site URL: `https://manager-tool.vercel.app`
- [ ] Supabase Redirect URLs に本番URLを追加
- [ ] Vercel環境変数 `NEXT_PUBLIC_SITE_URL` 設定
- [ ] コードのプッシュ＆デプロイ
- [ ] 新規ユーザーでの動作テスト

## 問題解決の確認方法

**成功の確認**:
- 新規ユーザー登録後の確認メールリンクが `https://manager-tool.vercel.app/auth/callback?code=...` 形式
- リンククリック後、正常にメインページにリダイレクト
- 認証状態が正常に設定される

**失敗の場合**:
- 確認メールリンクが `http://localhost:3000` のまま
- → Supabase Site URL設定を再確認
- → 設定保存後、1-2分待機してから再テスト

緊急度: 最高 - メール認証が機能しない状態