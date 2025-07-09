-- 実証実験用RLS設定スクリプト
-- 実行日: 2025-07-09
-- 注意: スタッフアカウント作成後に実行

-- ============================================
-- Phase 3: 実証実験用RLSポリシーの作成
-- ============================================
SELECT '=== Phase 3: 実証実験用RLSポリシー作成 ===' as phase;

-- 手順1: 現在のポリシーを削除
DROP POLICY IF EXISTS "sales_rls_select_v3" ON sales;
DROP POLICY IF EXISTS "sales_rls_insert_v3" ON sales;
DROP POLICY IF EXISTS "sales_rls_update_v3" ON sales;
DROP POLICY IF EXISTS "sales_rls_delete_v3" ON sales;

-- 手順2: 実証実験用ポリシーを作成
-- 注意: STAFF_USER_ID_1, STAFF_USER_ID_2 を実際のuser_idに置換してください

-- SELECT用ポリシー（全員が全データを見れる）
CREATE POLICY "sales_pilot_select" ON sales
    FOR SELECT
    USING (
        auth.uid() IN (
            '635c35fb-0159-4bb9-9ab8-8933eb04ee31',  -- オーナー
            'STAFF_USER_ID_1',                        -- スタッフ1のID（要置換）
            'STAFF_USER_ID_2'                         -- スタッフ2のID（要置換）
        )
    );

-- INSERT用ポリシー（全員がデータを作成できる）
CREATE POLICY "sales_pilot_insert" ON sales
    FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            '635c35fb-0159-4bb9-9ab8-8933eb04ee31',
            'STAFF_USER_ID_1',
            'STAFF_USER_ID_2'
        )
    );

-- UPDATE用ポリシー（全員がデータを更新できる）
CREATE POLICY "sales_pilot_update" ON sales
    FOR UPDATE
    USING (
        auth.uid() IN (
            '635c35fb-0159-4bb9-9ab8-8933eb04ee31',
            'STAFF_USER_ID_1',
            'STAFF_USER_ID_2'
        )
    )
    WITH CHECK (
        auth.uid() IN (
            '635c35fb-0159-4bb9-9ab8-8933eb04ee31',
            'STAFF_USER_ID_1',
            'STAFF_USER_ID_2'
        )
    );

-- DELETE用ポリシー（全員がデータを削除できる）
CREATE POLICY "sales_pilot_delete" ON sales
    FOR DELETE
    USING (
        auth.uid() IN (
            '635c35fb-0159-4bb9-9ab8-8933eb04ee31',
            'STAFF_USER_ID_1',
            'STAFF_USER_ID_2'
        )
    );

-- profilesテーブルも同様に設定
DROP POLICY IF EXISTS "profiles_rls_select_v3" ON profiles;
DROP POLICY IF EXISTS "profiles_rls_insert_v3" ON profiles;
DROP POLICY IF EXISTS "profiles_rls_update_v3" ON profiles;
DROP POLICY IF EXISTS "profiles_rls_delete_v3" ON profiles;

CREATE POLICY "profiles_pilot_select" ON profiles
    FOR SELECT
    USING (
        auth.uid() IN (
            '635c35fb-0159-4bb9-9ab8-8933eb04ee31',
            'STAFF_USER_ID_1',
            'STAFF_USER_ID_2'
        )
    );

CREATE POLICY "profiles_pilot_insert" ON profiles
    FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            '635c35fb-0159-4bb9-9ab8-8933eb04ee31',
            'STAFF_USER_ID_1',
            'STAFF_USER_ID_2'
        )
    );

CREATE POLICY "profiles_pilot_update" ON profiles
    FOR UPDATE
    USING (
        auth.uid() IN (
            '635c35fb-0159-4bb9-9ab8-8933eb04ee31',
            'STAFF_USER_ID_1',
            'STAFF_USER_ID_2'
        )
    )
    WITH CHECK (
        auth.uid() IN (
            '635c35fb-0159-4bb9-9ab8-8933eb04ee31',
            'STAFF_USER_ID_1',
            'STAFF_USER_ID_2'
        )
    );

CREATE POLICY "profiles_pilot_delete" ON profiles
    FOR DELETE
    USING (
        auth.uid() IN (
            '635c35fb-0159-4bb9-9ab8-8933eb04ee31',
            'STAFF_USER_ID_1',
            'STAFF_USER_ID_2'
        )
    );

-- 手順3: 新しいポリシーの確認
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

-- 手順4: 動作確認用クエリ
SELECT 
    '実証実験モード確認' as test_type,
    auth.uid() as current_user,
    CASE 
        WHEN auth.uid() = '635c35fb-0159-4bb9-9ab8-8933eb04ee31' THEN 'OWNER'
        ELSE 'STAFF'
    END as user_role,
    (SELECT COUNT(*) FROM sales) as visible_sales_count,
    (SELECT COUNT(*) FROM profiles) as visible_profiles_count;

-- 注意事項の表示
SELECT 
    '⚠️ 重要な注意事項' as warning,
    'このスクリプトを実行する前に以下を確認してください:' as instruction,
    '1. スタッフ2名のアカウント作成が完了していること' as step1,
    '2. STAFF_USER_ID_1, STAFF_USER_ID_2 を実際のuser_idに置換済みであること' as step2,
    '3. 実証実験期間中のみ有効であること' as step3,
    '4. 実証実験後は元のマルチテナントポリシーに戻すこと' as step4;