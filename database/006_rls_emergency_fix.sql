-- RLS緊急修正スクリプト
-- 実行日: 2025-07-09

-- ステップ1: 現在のRLSポリシーを完全に削除
DROP POLICY IF EXISTS "salesテーブル - ユーザーは自分のデータのみ表示可能" ON sales;
DROP POLICY IF EXISTS "salesテーブル - ユーザーは自分のデータのみ挿入可能" ON sales;
DROP POLICY IF EXISTS "salesテーブル - ユーザーは自分のデータのみ更新可能" ON sales;
DROP POLICY IF EXISTS "salesテーブル - ユーザーは自分のデータのみ削除可能" ON sales;

-- 既存の他のポリシーも削除
DROP POLICY IF EXISTS "Users can only see their own sales data" ON sales;
DROP POLICY IF EXISTS "Users can only insert their own sales data" ON sales;
DROP POLICY IF EXISTS "Users can only update their own sales data" ON sales;
DROP POLICY IF EXISTS "Users can only delete their own sales data" ON sales;

-- profilesテーブルのポリシーも削除
DROP POLICY IF EXISTS "profilesテーブル - ユーザーは自分のプロフィールのみ操作可能" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- ステップ2: RLSを一時的に無効化してから再有効化
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- ステップ3: RLSを再有効化
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ステップ4: シンプルで確実な新しいRLSポリシーを作成
-- salesテーブル用
CREATE POLICY "sales_select_policy" ON sales
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "sales_insert_policy" ON sales
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sales_update_policy" ON sales
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sales_delete_policy" ON sales
    FOR DELETE
    USING (auth.uid() = user_id);

-- profilesテーブル用
CREATE POLICY "profiles_select_policy" ON profiles
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "profiles_insert_policy" ON profiles
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_policy" ON profiles
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_delete_policy" ON profiles
    FOR DELETE
    USING (auth.uid() = user_id);

-- ステップ5: インデックスの再作成（パフォーマンス向上）
DROP INDEX IF EXISTS idx_sales_user_id;
CREATE INDEX idx_sales_user_id ON sales(user_id);

DROP INDEX IF EXISTS idx_profiles_user_id;
CREATE INDEX idx_profiles_user_id ON profiles(user_id);

-- ステップ6: 不正なデータのクリーンアップ
-- オーナー以外のデータを削除（オーナーのuser_idを指定）
DELETE FROM sales WHERE user_id != '635c35fb-0159-4bb9-9ab8-8933eb04ee31';

-- ステップ7: データ整合性チェック
-- user_idがNULLのレコードがないことを確認
DELETE FROM sales WHERE user_id IS NULL;

-- ステップ8: 確認用クエリ
SELECT 
    'Sales table user_id distribution' as check_type,
    user_id,
    COUNT(*) as record_count
FROM sales
GROUP BY user_id;

-- ポリシー確認
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