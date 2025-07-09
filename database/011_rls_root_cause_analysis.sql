-- RLS根本原因分析スクリプト
-- 実行日: 2025-07-09
-- 目的: データは正常だがRLSが機能しない問題の原因特定

-- ============================================
-- ステップ1: 詳細なデータ構造確認
-- ============================================
SELECT '=== STEP 1: データ構造詳細確認 ===' as step;

-- salesテーブルの全データ詳細確認（最大20件）
SELECT 
    id,
    user_id,
    created_at,
    date,
    total_sales,
    CASE 
        WHEN user_id = '635c35fb-0159-4bb9-9ab8-8933eb04ee31' THEN 'OWNER'
        ELSE 'OTHER'
    END as user_type,
    LENGTH(user_id::text) as user_id_length
FROM sales 
ORDER BY created_at DESC
LIMIT 20;

-- user_idの統計情報
SELECT 
    'User ID Statistics' as info,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(*) as total_records,
    COUNT(CASE WHEN user_id IS NULL THEN 1 END) as null_users,
    COUNT(CASE WHEN user_id = '635c35fb-0159-4bb9-9ab8-8933eb04ee31' THEN 1 END) as owner_records
FROM sales;

-- ============================================
-- ステップ2: RLSポリシーの詳細確認
-- ============================================
SELECT '=== STEP 2: RLSポリシー詳細確認 ===' as step;

-- RLSポリシーの完全な設定確認
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'sales'
ORDER BY policyname;

-- ポリシーの要約
SELECT 
    tablename,
    COUNT(*) as policy_count,
    STRING_AGG(DISTINCT cmd, ', ') as commands,
    STRING_AGG(DISTINCT roles::text, ', ') as roles_list
FROM pg_policies 
WHERE tablename IN ('sales', 'profiles')
GROUP BY tablename;

-- ============================================
-- ステップ3: 現在の認証状況確認
-- ============================================
SELECT '=== STEP 3: 認証コンテキスト確認 ===' as step;

-- 現在の認証コンテキスト確認
SELECT 
    auth.uid() as current_auth_uid,
    auth.jwt() ->> 'sub' as jwt_sub,
    auth.jwt() ->> 'role' as jwt_role,
    auth.jwt() ->> 'email' as jwt_email,
    current_user as database_user,
    current_role as database_role,
    session_user as session_user;

-- JWT claims詳細
SELECT 
    'JWT Claims' as info,
    auth.jwt()::text as full_jwt;

-- ============================================
-- ステップ4: RLSの実際の動作テスト
-- ============================================
SELECT '=== STEP 4: RLS動作テスト ===' as step;

-- RLS適用前後の比較（管理者用）
-- 注意: これは管理者権限で実行する必要があります

-- RLSが適用されるクエリのプラン
EXPLAIN (ANALYZE, BUFFERS, VERBOSE) 
SELECT COUNT(*) FROM sales;

-- 明示的フィルターでのクエリプラン
EXPLAIN (ANALYZE, BUFFERS, VERBOSE) 
SELECT COUNT(*) FROM sales 
WHERE user_id = '635c35fb-0159-4bb9-9ab8-8933eb04ee31';

-- ============================================
-- ステップ5: テーブル権限とRLS設定確認
-- ============================================
SELECT '=== STEP 5: テーブル設定確認 ===' as step;

-- テーブルの権限とRLS設定確認
SELECT 
    n.nspname as schemaname,
    c.relname as tablename,
    pg_get_userbyid(c.relowner) as tableowner,
    c.relhasindex as hasindexes,
    c.relhasrules as hasrules,
    c.relhastriggers as hastriggers,
    c.relrowsecurity as rowsecurity,
    c.relforcerowsecurity as forcerowsecurity
FROM pg_class c
LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname IN ('sales', 'profiles')
AND n.nspname = 'public';

-- 権限の詳細確認
SELECT 
    grantee,
    table_schema,
    table_name,
    privilege_type
FROM information_schema.table_privileges
WHERE table_name IN ('sales', 'profiles')
AND table_schema = 'public'
ORDER BY table_name, grantee, privilege_type;

-- ============================================
-- ステップ6: RLS有効性の総合診断
-- ============================================
SELECT '=== STEP 6: RLS総合診断 ===' as step;

-- RLS有効性チェック
WITH rls_check AS (
    SELECT 
        c.relname as table_name,
        c.relrowsecurity as rls_enabled,
        c.relforcerowsecurity as rls_forced,
        COUNT(p.policyname) as policy_count
    FROM pg_class c
    LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_policies p ON p.tablename = c.relname AND p.schemaname = n.nspname
    WHERE c.relname IN ('sales', 'profiles')
    AND n.nspname = 'public'
    GROUP BY c.relname, c.relrowsecurity, c.relforcerowsecurity
)
SELECT 
    table_name,
    CASE 
        WHEN rls_enabled THEN '✅ 有効'
        ELSE '❌ 無効'
    END as rls_status,
    CASE 
        WHEN rls_forced THEN '✅ 強制有効'
        ELSE '❌ 強制無効'
    END as rls_force_status,
    policy_count,
    CASE 
        WHEN rls_enabled AND policy_count > 0 THEN '✅ 正常設定'
        WHEN rls_enabled AND policy_count = 0 THEN '⚠️ ポリシーなし'
        ELSE '❌ RLS無効'
    END as overall_status
FROM rls_check;

-- ============================================
-- ステップ7: 問題診断サマリー
-- ============================================
SELECT '=== STEP 7: 問題診断サマリー ===' as step;

-- 診断結果のサマリー
SELECT 
    'RLS診断サマリー' as diagnosis,
    (SELECT COUNT(*) FROM sales) as total_records,
    (SELECT COUNT(DISTINCT user_id) FROM sales) as unique_users,
    (SELECT relrowsecurity FROM pg_class WHERE relname = 'sales') as rls_enabled,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'sales') as policy_count,
    auth.uid() IS NOT NULL as auth_available,
    CASE 
        WHEN auth.uid() IS NULL THEN '❌ 認証コンテキストなし'
        WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'sales') = 0 THEN '❌ ポリシーなし'
        WHEN NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'sales') THEN '❌ RLS無効'
        ELSE '🔍 その他の問題'
    END as probable_cause;