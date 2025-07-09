-- ================================
-- RLS動作不良緊急修正SQL
-- Row Level Security の完全診断・修正
-- ================================

-- 1. 現在のRLS状況詳細診断
-- ================================

-- A. RLSポリシーの詳細確認
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check
FROM pg_policies 
WHERE tablename = 'sales'
ORDER BY policyname;

-- B. RLS有効状況確認
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'sales';

-- C. 現在の認証ユーザー確認
SELECT 
  auth.uid() as current_user_id, 
  auth.role() as current_role,
  current_user as postgres_user;

-- D. 全salesデータの分布確認
SELECT 
  user_id,
  COUNT(*) as count,
  MIN(created_at) as first_record,
  MAX(created_at) as last_record,
  SUM(total_sales) as total_amount
FROM sales
GROUP BY user_id
ORDER BY count DESC;

-- E. データの詳細確認（最新10件）
SELECT 
  id,
  user_id,
  date,
  total_sales,
  created_at
FROM sales
ORDER BY created_at DESC
LIMIT 10;

-- ================================
-- 2. RLS動作テスト（手動確認用）
-- ================================

-- A. 認証ユーザーでのデータアクセステスト
-- 注意: これは特定のユーザーでログイン後に実行
/*
-- 現在の認証ユーザー確認
SELECT auth.uid() as my_user_id;

-- RLSなしでの全データ確認（管理者権限の場合）
SELECT COUNT(*) as total_sales_records FROM sales;

-- RLS経由でのデータ確認（認証ユーザーが見えるデータ）
SELECT 
  COUNT(*) as visible_records,
  COUNT(DISTINCT user_id) as unique_user_ids
FROM sales;

-- 自分のuser_idのデータ数
SELECT COUNT(*) as my_records 
FROM sales 
WHERE user_id = auth.uid();
*/

-- ================================
-- 3. RLS完全リセット・再設定
-- ================================

-- A. 現在のポリシーを全て削除
DROP POLICY IF EXISTS "sales_complete_isolation_select" ON sales;
DROP POLICY IF EXISTS "sales_complete_isolation_insert" ON sales;
DROP POLICY IF EXISTS "sales_complete_isolation_update" ON sales;
DROP POLICY IF EXISTS "sales_complete_isolation_delete" ON sales;
DROP POLICY IF EXISTS "sales_user_isolation_select" ON sales;
DROP POLICY IF EXISTS "sales_user_isolation_insert" ON sales;
DROP POLICY IF EXISTS "sales_user_isolation_update" ON sales;
DROP POLICY IF EXISTS "sales_user_isolation_delete" ON sales;
DROP POLICY IF EXISTS "sales_user_select_simple" ON sales;
DROP POLICY IF EXISTS "sales_user_insert_simple" ON sales;
DROP POLICY IF EXISTS "sales_user_update_simple" ON sales;
DROP POLICY IF EXISTS "sales_user_delete_simple" ON sales;

-- B. RLS無効化・再有効化（完全リセット）
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- C. 新しいシンプルで確実なポリシー作成
-- SELECT ポリシー
CREATE POLICY "sales_rls_select_v2"
ON sales FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- INSERT ポリシー
CREATE POLICY "sales_rls_insert_v2"
ON sales FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- UPDATE ポリシー
CREATE POLICY "sales_rls_update_v2"
ON sales FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE ポリシー
CREATE POLICY "sales_rls_delete_v2"
ON sales FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ================================
-- 4. profilesテーブルのRLS確認・修正
-- ================================

-- A. profilesテーブルのRLS状況確認
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'profiles';

SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- B. profilesテーブルのRLSポリシー修正（必要に応じて）
-- 既存ポリシーの削除
DROP POLICY IF EXISTS "profiles_complete_isolation_select" ON profiles;
DROP POLICY IF EXISTS "profiles_complete_isolation_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_complete_isolation_update" ON profiles;
DROP POLICY IF EXISTS "profiles_complete_isolation_delete" ON profiles;

-- RLS有効化確認
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 新しいシンプルなprofilesポリシー
CREATE POLICY "profiles_rls_select_v2"
ON profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "profiles_rls_insert_v2"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles_rls_update_v2"
ON profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles_rls_delete_v2"
ON profiles FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ================================
-- 5. 不正データの特定・クリーンアップ
-- ================================

-- A. オーナーのuser_id確認（最初のユーザー）
SELECT 
  id as owner_user_id,
  email as owner_email,
  created_at
FROM auth.users 
ORDER BY created_at ASC 
LIMIT 1;

-- B. 不正なuser_idのデータ特定
-- 注意: OWNER_USER_ID_HEREを実際のオーナーIDに置換
/*
-- 不正データの確認
SELECT 
  id,
  user_id,
  date,
  total_sales,
  created_at
FROM sales
WHERE user_id != 'OWNER_USER_ID_HERE'
   OR user_id IS NULL
ORDER BY created_at DESC;

-- 不正データ数の確認
SELECT 
  COUNT(*) as invalid_records
FROM sales
WHERE user_id != 'OWNER_USER_ID_HERE'
   OR user_id IS NULL;

-- 不正データの削除（慎重に実行）
DELETE FROM sales 
WHERE user_id != 'OWNER_USER_ID_HERE'
   OR user_id IS NULL;

-- 削除後の確認
SELECT 
  COUNT(*) as remaining_records,
  COUNT(DISTINCT user_id) as unique_users
FROM sales;
*/

-- ================================
-- 6. RLS動作確認テスト
-- ================================

-- A. ポリシー設定の最終確認
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  qual as using_expression,
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

-- C. データ整合性確認
SELECT 
  'sales' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(CASE WHEN user_id IS NULL THEN 1 END) as null_user_ids
FROM sales
UNION ALL
SELECT 
  'profiles' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(CASE WHEN user_id IS NULL THEN 1 END) as null_user_ids
FROM profiles;

-- ================================
-- 7. RLS動作テスト用クエリ
-- ================================

-- 各ユーザーでログイン後、以下を実行してRLSが正常に機能することを確認
/*
-- Step 1: 認証状態確認
SELECT auth.uid() as current_user_id;

-- Step 2: アクセス可能なsalesデータ確認（RLS適用）
SELECT 
  id, 
  user_id, 
  date,
  total_sales,
  created_at 
FROM sales 
ORDER BY created_at DESC 
LIMIT 5;

-- Step 3: データ件数確認
SELECT COUNT(*) as accessible_records FROM sales;

-- Step 4: user_id分布確認（現在のユーザーのデータのみ表示されるべき）
SELECT 
  user_id,
  COUNT(*) as count
FROM sales 
GROUP BY user_id;

-- Step 5: 他ユーザーのデータアクセステスト（失敗するべき）
-- 以下は明示的に他ユーザーのデータを要求するが、RLSにより空結果になるべき
SELECT COUNT(*) as should_be_zero
FROM sales 
WHERE user_id != auth.uid();
*/

-- ================================
-- 実行手順と確認ポイント
-- ================================

/*
緊急修正手順:

1. 【診断】現在のRLS状況確認
   - RLSポリシー詳細確認
   - データ分布確認
   - 不正データ特定

2. 【リセット】RLS完全リセット
   - 既存ポリシー全削除
   - RLS無効化→再有効化
   - 新しいシンプルポリシー作成

3. 【クリーンアップ】不正データ削除
   - オーナーID特定
   - 不正データ削除
   - データ整合性確認

4. 【テスト】RLS動作確認
   - 各ユーザーでのデータアクセス確認
   - データ分離の完全性確認

確認ポイント:
- RLS経由でのデータ取得 = 明示的フィルターでの取得
- 検出user_ID数: 1種類のみ
- 各ユーザーは自分のデータのみアクセス可能
- 他ユーザーのデータに一切アクセスできない

注意事項:
- 本番環境での実行は段階的に
- 重要データのバックアップを事前取得
- オーナーIDの確認を慎重に実施
- RLS動作確認は複数ユーザーでテスト
*/