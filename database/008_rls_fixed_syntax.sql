-- RLS強制修正スクリプト（構文エラー修正版）
-- 実行日: 2025-07-09

-- ステップ1: すべての既存ポリシーを強制削除
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    -- salesテーブルのすべてのポリシーを削除
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'sales'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON sales', pol.policyname);
    END LOOP;
    
    -- profilesテーブルのすべてのポリシーを削除
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
    END LOOP;
END $$;

-- ステップ2: RLSを一時的に無効化してから再有効化
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- ステップ3: RLSを再有効化
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ステップ4: 新しいRLSポリシーを作成（一意な名前で）
-- salesテーブル用
CREATE POLICY "sales_rls_select_v2" ON sales
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "sales_rls_insert_v2" ON sales
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sales_rls_update_v2" ON sales
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sales_rls_delete_v2" ON sales
    FOR DELETE
    USING (auth.uid() = user_id);

-- profilesテーブル用
CREATE POLICY "profiles_rls_select_v2" ON profiles
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "profiles_rls_insert_v2" ON profiles
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_rls_update_v2" ON profiles
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_rls_delete_v2" ON profiles
    FOR DELETE
    USING (auth.uid() = user_id);

-- ステップ5: インデックスの再作成
DROP INDEX IF EXISTS idx_sales_user_id;
CREATE INDEX idx_sales_user_id ON sales(user_id);

DROP INDEX IF EXISTS idx_profiles_user_id;
CREATE INDEX idx_profiles_user_id ON profiles(user_id);

-- ステップ6: 不正なデータのクリーンアップ
-- まず現在のデータ分布を確認
SELECT 'BEFORE cleanup' as status, user_id, COUNT(*) as count 
FROM sales 
GROUP BY user_id;

-- オーナー以外のデータを削除
DELETE FROM sales WHERE user_id != '635c35fb-0159-4bb9-9ab8-8933eb04ee31';

-- NULLデータも削除
DELETE FROM sales WHERE user_id IS NULL;

-- ステップ7: 最終確認
SELECT 'AFTER cleanup' as status, user_id, COUNT(*) as count 
FROM sales 
GROUP BY user_id;

-- ポリシー確認
SELECT 
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename IN ('sales', 'profiles')
ORDER BY tablename, policyname;