-- 現在のRLSポリシーバックアップ（復元用）
-- 実行日: 2025-07-09
-- 目的: 実証実験後にマルチテナントポリシーに戻すためのバックアップ

-- ============================================
-- バックアップされたポリシー情報
-- ============================================

-- salesテーブルのポリシー
-- sales_rls_select_v3: SELECT (auth.uid() = user_id)
-- sales_rls_insert_v3: INSERT WITH CHECK (auth.uid() = user_id)
-- sales_rls_update_v3: UPDATE (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)
-- sales_rls_delete_v3: DELETE (auth.uid() = user_id)

-- profilesテーブルのポリシー
-- profiles_rls_select_v3: SELECT (auth.uid() = user_id)
-- profiles_rls_insert_v3: INSERT WITH CHECK (auth.uid() = user_id)
-- profiles_rls_update_v3: UPDATE (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)
-- profiles_rls_delete_v3: DELETE (auth.uid() = user_id)

-- ============================================
-- 復元用スクリプト（実証実験後に実行）
-- ============================================

-- 実証実験用ポリシーを削除してマルチテナントポリシーに戻す
-- 注意: 実証実験終了後にのみ実行してください

/*
-- 実証実験用ポリシーを削除
DROP POLICY IF EXISTS "sales_pilot_select" ON sales;
DROP POLICY IF EXISTS "sales_pilot_insert" ON sales;
DROP POLICY IF EXISTS "sales_pilot_update" ON sales;
DROP POLICY IF EXISTS "sales_pilot_delete" ON sales;

DROP POLICY IF EXISTS "profiles_pilot_select" ON profiles;
DROP POLICY IF EXISTS "profiles_pilot_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_pilot_update" ON profiles;
DROP POLICY IF EXISTS "profiles_pilot_delete" ON profiles;

-- 元のマルチテナントポリシーを復元
-- salesテーブル
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

-- profilesテーブル
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
*/