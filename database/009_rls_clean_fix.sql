-- RLS完全修正スクリプト（クリーン版）
-- 実行日: 2025-07-09
-- COUNT(*)エラー修正済み

-- ステップ1: 既存ポリシーの強制削除
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'sales'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON sales', pol.policyname);
    END LOOP;
    
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
    END LOOP;
END $$;

-- ステップ2: RLS無効化
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- ステップ3: RLS再有効化
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ステップ4: 新規ポリシー作成
CREATE POLICY "sales_rls_select_v3" ON sales
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "sales_rls_insert_v3" ON sales
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sales_rls_update_v3" ON sales
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sales_rls_delete_v3" ON sales
    FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "profiles_rls_select_v3" ON profiles
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "profiles_rls_insert_v3" ON profiles
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_rls_update_v3" ON profiles
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_rls_delete_v3" ON profiles
    FOR DELETE
    USING (auth.uid() = user_id);

-- ステップ5: インデックス再作成
DROP INDEX IF EXISTS idx_sales_user_id;
CREATE INDEX idx_sales_user_id ON sales(user_id);

DROP INDEX IF EXISTS idx_profiles_user_id;
CREATE INDEX idx_profiles_user_id ON profiles(user_id);

-- ステップ6: データクリーンアップ前の確認
SELECT 'BEFORE_CLEANUP' as status, user_id, COUNT(*) as record_count 
FROM sales 
GROUP BY user_id
ORDER BY user_id;

-- ステップ7: 不正データ削除
DELETE FROM sales WHERE user_id != '635c35fb-0159-4bb9-9ab8-8933eb04ee31';
DELETE FROM sales WHERE user_id IS NULL;

-- ステップ8: データクリーンアップ後の確認
SELECT 'AFTER_CLEANUP' as status, user_id, COUNT(*) as record_count 
FROM sales 
GROUP BY user_id
ORDER BY user_id;

-- ステップ9: ポリシー確認
SELECT 
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename IN ('sales', 'profiles')
ORDER BY tablename, policyname;