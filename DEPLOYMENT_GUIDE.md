# デプロイ手順ガイド

## 1. GitHubリポジトリへのプッシュ

既存のGitHubリポジトリ（https://github.com/Athena900/manager-tool）にプッシュします：

```bash
git remote add origin https://github.com/Athena900/manager-tool.git
git branch -M main
git push -u origin main
```

## 2. Vercelでのデプロイ

1. **Vercelアカウントにログイン**
   - https://vercel.com でGitHubアカウントでログイン

2. **新しいプロジェクトを作成**
   - "New Project" をクリック
   - `manager-tool` リポジトリを選択
   - "Import" をクリック

3. **環境変数の設定**
   以下の環境変数を設定：
   
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://csnkakkzcpamycuvrtqk.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzbmtha2t6Y3BhbXljdXZydHFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzMDMxNDUsImV4cCI6MjA2Njg3OTE0NX0.AFX9pmygEeKbFp0djw07cBTGyWYkdPWslPQ8wU0lhlM
   NEXT_PUBLIC_ADMIN_PASSWORD=SecureBarPass2024!@#
   ```

4. **デプロイ実行**
   - "Deploy" をクリック
   - ビルドが成功するまで待機

## 3. ユーザー登録テスト

デプロイが完了したら：

1. **デプロイされたURLにアクセス**
   - 例: https://manager-tool-xxx.vercel.app

2. **ユーザー登録テスト**
   - `/signup` ページにアクセス
   - テストユーザーを作成:
     - メール: `test@example.com`
     - パスワード: `testpass123`
     - 名前: `テストユーザー`
     - 店舗名: `テスト店舗`

3. **Supabaseダッシュボードで確認**
   - https://supabase.com/dashboard
   - Authentication → Users でユーザーが作成されていることを確認

## 4. 動作確認項目

- ✅ ユーザー登録機能
- ✅ ログイン機能
- ✅ 認証保護されたページアクセス
- ✅ 売上データの作成・編集・削除
- ✅ グラフ表示
- ✅ データの永続化

## 5. トラブルシューティング

### ビルドエラーの場合
- 環境変数が正しく設定されているか確認
- パッケージの依存関係を確認

### 認証エラーの場合
- Supabaseの設定を確認
- 環境変数の値を再確認

### データベースエラーの場合
- Supabaseダッシュボードでテーブルの存在を確認
- RLSポリシーの設定を確認