-- ================================
-- 完全データ分離システム緊急修正SQL
-- RLS（Row Level Security）の完全リセット・再設定
-- ================================

-- 1. 現在の状況確認
-- ================================

-- A. 現在のRLSポリシー確認
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'sales'
ORDER BY policyname;

-- B. RLS有効状況確認
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'sales';

-- C. 現在のデータ状況確認
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(CASE WHEN user_id IS NULL THEN 1 END) as null_user_id_records
FROM sales;

-- D. ユーザー別データ分布確認
SELECT 
  user_id,
  COUNT(*) as record_count,
  MIN(created_at) as first_record,
  MAX(created_at) as last_record
FROM sales 
WHERE user_id IS NOT NULL
GROUP BY user_id
ORDER BY record_count DESC;

-- ================================
-- 2. RLS完全リセット・再設定
-- ================================

-- A. 既存のRLSポリシーを全て削除
DROP POLICY IF EXISTS "Strict user data isolation - SELECT" ON sales;
DROP POLICY IF EXISTS "Strict user data isolation - INSERT" ON sales;
DROP POLICY IF EXISTS "Strict user data isolation - UPDATE" ON sales;
DROP POLICY IF EXISTS "Strict user data isolation - DELETE" ON sales;
DROP POLICY IF EXISTS "Users can manage their own sales data" ON sales;
DROP POLICY IF EXISTS "sales_policy" ON sales;
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON sales;
DROP POLICY IF EXISTS "Enable insert access for users based on user_id" ON sales;
DROP POLICY IF EXISTS "Enable update access for users based on user_id" ON sales;
DROP POLICY IF EXISTS "Enable delete access for users based on user_id" ON sales;
DROP POLICY IF EXISTS "sales_user_isolation_select" ON sales;
DROP POLICY IF EXISTS "sales_user_isolation_insert" ON sales;
DROP POLICY IF EXISTS "sales_user_isolation_update" ON sales;
DROP POLICY IF EXISTS "sales_user_isolation_delete" ON sales;

-- B. RLSを一旦無効化してから再有効化（完全リセット）
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- C. 新しい厳密なRLSポリシーを作成
-- SELECT ポリシー（認証済みユーザーは自分のデータのみ閲覧可能）
CREATE POLICY "sales_complete_isolation_select" 
ON sales FOR SELECT 
TO authenticated
USING (
  user_id = auth.uid() 
  AND user_id IS NOT NULL 
  AND auth.uid() IS NOT NULL
);

-- INSERT ポリシー（認証済みユーザーは自分のuser_idでのみ作成可能）
CREATE POLICY "sales_complete_isolation_insert" 
ON sales FOR INSERT 
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  AND user_id IS NOT NULL 
  AND auth.uid() IS NOT NULL
);

-- UPDATE ポリシー（認証済みユーザーは自分のデータのみ更新可能）
CREATE POLICY "sales_complete_isolation_update" 
ON sales FOR UPDATE 
TO authenticated
USING (
  user_id = auth.uid() 
  AND user_id IS NOT NULL 
  AND auth.uid() IS NOT NULL
)
WITH CHECK (
  user_id = auth.uid() 
  AND user_id IS NOT NULL 
  AND auth.uid() IS NOT NULL
);

-- DELETE ポリシー（認証済みユーザーは自分のデータのみ削除可能）
CREATE POLICY "sales_complete_isolation_delete" 
ON sales FOR DELETE 
TO authenticated
USING (
  user_id = auth.uid() 
  AND user_id IS NOT NULL 
  AND auth.uid() IS NOT NULL
);

-- ================================
-- 3. profiles テーブルのRLS確認・修正
-- ================================

-- A. profilesテーブルの現在のポリシー確認
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- B. profilesテーブルのRLS強化（必要に応じて）
-- 既存ポリシーの削除
DROP POLICY IF EXISTS "Users can view own profile only" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile only" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile only" ON profiles;

-- 新しい厳密なprofilesポリシー
CREATE POLICY "profiles_complete_isolation_select" 
ON profiles FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "profiles_complete_isolation_insert" 
ON profiles FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles_complete_isolation_update" 
ON profiles FOR UPDATE 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles_complete_isolation_delete" 
ON profiles FOR DELETE 
TO authenticated
USING (user_id = auth.uid());

-- ================================
-- 4. データ整合性の確保
-- ================================

-- A. user_idがNULLのレコードを特定（これらは削除対象）
SELECT 
  id, 
  date, 
  total_sales, 
  created_at,
  user_id
FROM sales 
WHERE user_id IS NULL 
ORDER BY created_at DESC;

-- B. user_idがNULLのレコードを削除（安全のためコメントアウト）
-- ⚠️ 重要: 実行前にオーナーのuser_idを確認し、必要に応じて関連付けてください
/*
-- オーナーのuser_idを確認
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at ASC 
LIMIT 1;

-- 必要に応じて、NULLデータをオーナーに関連付け
-- YOUR_OWNER_USER_IDを実際のオーナーIDに置換
UPDATE sales 
SET user_id = 'YOUR_OWNER_USER_ID_HERE'
WHERE user_id IS NULL;

-- または、テストデータの場合は削除
DELETE FROM sales WHERE user_id IS NULL;
*/

-- ================================
-- 5. RLS動作確認クエリ
-- ================================

-- A. ポリシー設定確認
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('sales', 'profiles')
ORDER BY tablename, policyname;

-- B. RLS有効状況の最終確認
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('sales', 'profiles');

-- C. データ分離テスト用クエリ
-- 各ユーザーでログイン後、以下を実行してデータが分離されているか確認
/*
-- 現在のユーザーID確認
SELECT auth.uid() as current_user_id;

-- アクセス可能なsalesデータ確認（ユーザー固有のデータのみ表示されるべき）
SELECT 
  id, 
  date, 
  total_sales, 
  user_id, 
  created_at 
FROM sales 
ORDER BY created_at DESC 
LIMIT 10;

-- データ件数確認
SELECT COUNT(*) as accessible_records FROM sales;

-- ユーザー別データ分布（現在のユーザーのデータのみ表示されるべき）
SELECT 
  user_id,
  COUNT(*) as count
FROM sales 
GROUP BY user_id;
*/

-- ================================
-- 6. 追加のセキュリティ措置
-- ================================

-- A. user_idカラムのNOT NULL制約追加（オプション）
-- 注意: 既存のNULLデータを事前に処理してから実行
/*
ALTER TABLE sales ALTER COLUMN user_id SET NOT NULL;
*/

-- B. 外部キー制約の追加（データ整合性確保）
-- 注意: auth.usersテーブルへの参照
/*
ALTER TABLE sales 
ADD CONSTRAINT fk_sales_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) 
ON DELETE CASCADE;

ALTER TABLE profiles 
ADD CONSTRAINT fk_profiles_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) 
ON DELETE CASCADE;
*/

-- ================================
-- 実行手順サマリー
-- ================================

/*
手順:
1. 【確認】現在のRLSポリシーとデータ状況を確認
2. 【実行】RLS完全リセット（既存ポリシー削除 → 再有効化）
3. 【実行】新しい厳密なRLSポリシー作成
4. 【確認】ポリシー設定の確認
5. 【手動】NULLデータの処理（オーナーへの関連付けまたは削除）
6. 【テスト】各ユーザーでのデータ分離確認

重要事項:
- NULLデータの処理は慎重に行う（重要なデータがある可能性）
- 各ユーザーでログインしてデータ分離を確認
- 問題がある場合はロールバック可能
- 本番環境での実行前に必ずバックアップを取得
*/