-- 実証実験用RLS設定（最終版）
-- 実行日: 2025-07-09
-- 参加者: オーナー + スタッフ2名

-- ============================================
-- 実証実験参加者情報
-- ============================================

-- オーナー: 635c35fb-0159-4bb9-9ab8-8933eb04ee31 (xrk123a@gmail.com)
-- スタッフ1: 56d64ad6-165a-4841-bfcd-a78329f322e5 (ahatie534@simaenaga.com)
-- スタッフ2: 0aba16a3-531d-4f7a-a9a3-6ca29537d349 (buttarown@simaenaga.com)

-- ============================================
-- Phase 3: 実証実験用RLSポリシーの作成
-- ============================================

-- 現在のマルチテナントポリシーを削除
DROP POLICY IF EXISTS "sales_rls_select_v3" ON sales;
DROP POLICY IF EXISTS "sales_rls_insert_v3" ON sales;
DROP POLICY IF EXISTS "sales_rls_update_v3" ON sales;
DROP POLICY IF EXISTS "sales_rls_delete_v3" ON sales;

DROP POLICY IF EXISTS "profiles_rls_select_v3" ON profiles;
DROP POLICY IF EXISTS "profiles_rls_insert_v3" ON profiles;
DROP POLICY IF EXISTS "profiles_rls_update_v3" ON profiles;
DROP POLICY IF EXISTS "profiles_rls_delete_v3" ON profiles;

-- 実証実験用ポリシーを作成（3人が全データを共有）

-- salesテーブル用ポリシー
CREATE POLICY "sales_pilot_select" ON sales
    FOR SELECT
    USING (
        auth.uid() IN (
            '635c35fb-0159-4bb9-9ab8-8933eb04ee31',  -- オーナー
            '56d64ad6-165a-4841-bfcd-a78329f322e5',  -- スタッフ1
            '0aba16a3-531d-4f7a-a9a3-6ca29537d349'   -- スタッフ2
        )
    );

CREATE POLICY "sales_pilot_insert" ON sales
    FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            '635c35fb-0159-4bb9-9ab8-8933eb04ee31',  -- オーナー
            '56d64ad6-165a-4841-bfcd-a78329f322e5',  -- スタッフ1
            '0aba16a3-531d-4f7a-a9a3-6ca29537d349'   -- スタッフ2
        )
    );

CREATE POLICY "sales_pilot_update" ON sales
    FOR UPDATE
    USING (
        auth.uid() IN (
            '635c35fb-0159-4bb9-9ab8-8933eb04ee31',  -- オーナー
            '56d64ad6-165a-4841-bfcd-a78329f322e5',  -- スタッフ1
            '0aba16a3-531d-4f7a-a9a3-6ca29537d349'   -- スタッフ2
        )
    )
    WITH CHECK (
        auth.uid() IN (
            '635c35fb-0159-4bb9-9ab8-8933eb04ee31',  -- オーナー
            '56d64ad6-165a-4841-bfcd-a78329f322e5',  -- スタッフ1
            '0aba16a3-531d-4f7a-a9a3-6ca29537d349'   -- スタッフ2
        )
    );

CREATE POLICY "sales_pilot_delete" ON sales
    FOR DELETE
    USING (
        auth.uid() IN (
            '635c35fb-0159-4bb9-9ab8-8933eb04ee31',  -- オーナー
            '56d64ad6-165a-4841-bfcd-a78329f322e5',  -- スタッフ1
            '0aba16a3-531d-4f7a-a9a3-6ca29537d349'   -- スタッフ2
        )
    );

-- profilesテーブル用ポリシー
CREATE POLICY "profiles_pilot_select" ON profiles
    FOR SELECT
    USING (
        auth.uid() IN (
            '635c35fb-0159-4bb9-9ab8-8933eb04ee31',  -- オーナー
            '56d64ad6-165a-4841-bfcd-a78329f322e5',  -- スタッフ1
            '0aba16a3-531d-4f7a-a9a3-6ca29537d349'   -- スタッフ2
        )
    );

CREATE POLICY "profiles_pilot_insert" ON profiles
    FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            '635c35fb-0159-4bb9-9ab8-8933eb04ee31',  -- オーナー
            '56d64ad6-165a-4841-bfcd-a78329f322e5',  -- スタッフ1
            '0aba16a3-531d-4f7a-a9a3-6ca29537d349'   -- スタッフ2
        )
    );

CREATE POLICY "profiles_pilot_update" ON profiles
    FOR UPDATE
    USING (
        auth.uid() IN (
            '635c35fb-0159-4bb9-9ab8-8933eb04ee31',  -- オーナー
            '56d64ad6-165a-4841-bfcd-a78329f322e5',  -- スタッフ1
            '0aba16a3-531d-4f7a-a9a3-6ca29537d349'   -- スタッフ2
        )
    )
    WITH CHECK (
        auth.uid() IN (
            '635c35fb-0159-4bb9-9ab8-8933eb04ee31',  -- オーナー
            '56d64ad6-165a-4841-bfcd-a78329f322e5',  -- スタッフ1
            '0aba16a3-531d-4f7a-a9a3-6ca29537d349'   -- スタッフ2
        )
    );

CREATE POLICY "profiles_pilot_delete" ON profiles
    FOR DELETE
    USING (
        auth.uid() IN (
            '635c35fb-0159-4bb9-9ab8-8933eb04ee31',  -- オーナー
            '56d64ad6-165a-4841-bfcd-a78329f322e5',  -- スタッフ1
            '0aba16a3-531d-4f7a-a9a3-6ca29537d349'   -- スタッフ2
        )
    );

-- ============================================
-- 実証実験用ポリシーの確認
-- ============================================

-- 新しいポリシーの確認
SELECT 
    '実証実験用ポリシー確認' as check_type,
    tablename,
    policyname,
    cmd,
    permissive,
    roles::text as roles
FROM pg_policies 
WHERE tablename IN ('sales', 'profiles')
AND policyname LIKE '%pilot%'
ORDER BY tablename, policyname;

-- 実証実験参加者の確認
SELECT 
    '実証実験参加者確認' as check_type,
    id as user_id,
    email,
    CASE 
        WHEN id = '635c35fb-0159-4bb9-9ab8-8933eb04ee31' THEN 'OWNER'
        WHEN id = '56d64ad6-165a-4841-bfcd-a78329f322e5' THEN 'STAFF_1'
        WHEN id = '0aba16a3-531d-4f7a-a9a3-6ca29537d349' THEN 'STAFF_2'
        ELSE 'OTHER'
    END as pilot_role
FROM auth.users
WHERE id IN (
    '635c35fb-0159-4bb9-9ab8-8933eb04ee31',
    '56d64ad6-165a-4841-bfcd-a78329f322e5',
    '0aba16a3-531d-4f7a-a9a3-6ca29537d349'
)
ORDER BY pilot_role;

-- 動作確認用クエリ
SELECT 
    '実証実験モード確認' as test_type,
    auth.uid() as current_user,
    CASE 
        WHEN auth.uid() = '635c35fb-0159-4bb9-9ab8-8933eb04ee31' THEN 'OWNER'
        WHEN auth.uid() = '56d64ad6-165a-4841-bfcd-a78329f322e5' THEN 'STAFF_1'
        WHEN auth.uid() = '0aba16a3-531d-4f7a-a9a3-6ca29537d349' THEN 'STAFF_2'
        ELSE 'NOT_AUTHORIZED'
    END as pilot_role,
    (SELECT COUNT(*) FROM sales) as visible_sales_count,
    (SELECT COUNT(*) FROM profiles) as visible_profiles_count;

-- 成功メッセージ
SELECT 
    '🎉 実証実験用RLSポリシー設定完了' as status,
    '3人（オーナー + スタッフ2名）がデータを共有可能' as description,
    'データ共有テストの実行準備完了' as next_step;