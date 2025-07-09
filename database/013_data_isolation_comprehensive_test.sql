-- RLSデータ分離包括テストスクリプト
-- 実行日: 2025-07-09
-- 目的: 複数ユーザー環境での完全なデータ分離確認

-- ============================================
-- Phase 1: 現在のデータ状況詳細確認
-- ============================================
SELECT '=== Phase 1: データ状況詳細確認 ===' as phase;

-- 1-1. salesテーブルの全体状況
SELECT 
    'Sales Data Overview' as check_type,
    user_id,
    COUNT(*) as record_count,
    MIN(created_at) as first_record,
    MAX(created_at) as last_record,
    SUM(total_sales) as total_amount,
    AVG(total_sales) as average_amount
FROM sales 
GROUP BY user_id
ORDER BY first_record;

-- 1-2. profilesテーブルの状況確認
SELECT 
    'Profiles Data Overview' as check_type,
    user_id,
    email,
    store_name,
    created_at,
    updated_at
FROM profiles
ORDER BY created_at;

-- 1-3. 現在の認証コンテキスト
SELECT 
    'Authentication Context' as check_type,
    auth.uid() as current_user_id,
    auth.email() as current_email,
    auth.role() as current_role,
    current_user as database_user,
    session_user as session_user;

-- 1-4. ユーザー統計
SELECT 
    'User Statistics' as check_type,
    COUNT(DISTINCT user_id) as unique_users_in_sales,
    COUNT(*) as total_sales_records,
    (SELECT COUNT(*) FROM profiles) as total_profiles
FROM sales;

-- ============================================
-- Phase 3: データベースレベルでの分離確認
-- ============================================
SELECT '=== Phase 3: データベース分離確認 ===' as phase;

-- 3-1. 全ユーザーのデータ分布確認（管理者視点）
SELECT 
    'Complete User Distribution' as check_type,
    user_id,
    COUNT(*) as records,
    CASE 
        WHEN user_id = '635c35fb-0159-4bb9-9ab8-8933eb04ee31' THEN 'Original Owner'
        ELSE 'User_' || ROW_NUMBER() OVER (ORDER BY MIN(created_at))
    END as user_label,
    MIN(created_at) as first_activity,
    MAX(created_at) as last_activity
FROM sales 
GROUP BY user_id
ORDER BY MIN(created_at);

-- 3-2. RLS設定の詳細確認
SELECT 
    'RLS Configuration' as check_type,
    relname as table_name,
    relrowsecurity as rls_enabled,
    relforcerowsecurity as rls_forced,
    CASE 
        WHEN relrowsecurity AND relforcerowsecurity THEN '✅ Full RLS (Admin+User)'
        WHEN relrowsecurity THEN '⚠️ User RLS Only'
        ELSE '❌ RLS Disabled'
    END as rls_status
FROM pg_class 
WHERE relname IN ('sales', 'profiles')
ORDER BY relname;

-- 3-3. ポリシー詳細確認
SELECT 
    'Policy Details' as check_type,
    tablename,
    policyname,
    cmd,
    permissive,
    roles::text as roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('sales', 'profiles')
ORDER BY tablename, cmd, policyname;

-- 3-4. ポリシー統計
SELECT 
    'Policy Statistics' as check_type,
    tablename,
    COUNT(*) as policy_count,
    STRING_AGG(DISTINCT cmd, ', ') as commands_covered,
    STRING_AGG(DISTINCT roles::text, ', ') as roles_list
FROM pg_policies 
WHERE tablename IN ('sales', 'profiles')
GROUP BY tablename
ORDER BY tablename;

-- ============================================
-- Phase 4: セキュリティ侵害テスト
-- ============================================
SELECT '=== Phase 4: セキュリティ侵害テスト ===' as phase;

-- 4-1. 他ユーザーデータへの直接アクセス試行
-- 注意: これは失敗することを期待するテスト
SELECT 
    'Security Test: Cross-User Access' as test_type,
    'Attempting to access other users data...' as description;

-- 現在のユーザー以外のデータにアクセス試行
-- RLSが正常に動作していれば、結果は空になるはず
WITH cross_user_test AS (
    SELECT 
        user_id,
        COUNT(*) as accessible_records
    FROM sales 
    WHERE user_id != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000')
    GROUP BY user_id
)
SELECT 
    'Cross-User Access Result' as test_result,
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM cross_user_test) THEN '✅ Access Denied (Security OK)'
        ELSE '❌ Access Granted (SECURITY BREACH!)'
    END as security_status,
    COALESCE((SELECT SUM(accessible_records) FROM cross_user_test), 0) as accessible_records;

-- 4-2. 認証なしでのアクセス試行
SELECT 
    'Security Test: Unauthenticated Access' as test_type,
    CASE 
        WHEN auth.uid() IS NULL THEN 'Testing as unauthenticated user'
        ELSE 'Testing as authenticated user: ' || auth.uid()
    END as context;

-- 認証なしの場合のデータアクセス（失敗するはず）
SELECT 
    'Unauthenticated Access Result' as test_result,
    COUNT(*) as visible_records,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ No Data Visible (Security OK)'
        ELSE '❌ Data Visible (SECURITY BREACH!)'
    END as security_assessment
FROM sales 
WHERE auth.uid() IS NULL;

-- ============================================
-- 最終診断サマリー
-- ============================================
SELECT '=== 最終診断サマリー ===' as phase;

-- 包括的なセキュリティ診断
SELECT 
    'Comprehensive Security Assessment' as assessment_type,
    (SELECT COUNT(DISTINCT user_id) FROM sales) as total_users,
    (SELECT COUNT(*) FROM sales) as total_records,
    (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE relname = 'sales') as rls_properly_configured,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'sales') as sales_policies,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'profiles') as profiles_policies,
    auth.uid() IS NOT NULL as authentication_available,
    CASE 
        WHEN (SELECT COUNT(DISTINCT user_id) FROM sales) >= 2 
             AND (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE relname = 'sales')
             AND (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'sales') = 4
             AND (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'profiles') = 4
        THEN '✅ Multi-Tenant Security: PASSED'
        ELSE '❌ Multi-Tenant Security: FAILED'
    END as final_security_status;

-- データ分離品質評価
SELECT 
    'Data Isolation Quality' as quality_metric,
    CASE 
        WHEN (SELECT COUNT(DISTINCT user_id) FROM sales) = 1 THEN 'Single User Environment'
        WHEN (SELECT COUNT(DISTINCT user_id) FROM sales) >= 2 THEN 'Multi-User Environment'
        ELSE 'No Data Environment'
    END as environment_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM sales s1 
            WHERE EXISTS (
                SELECT 1 FROM sales s2 
                WHERE s1.user_id != s2.user_id
            )
        ) THEN '✅ Multi-User Data Separation Required'
        ELSE '⚠️ Single User - Separation Testing Limited'
    END as separation_requirement;

-- 実行時刻とコンテキスト
SELECT 
    'Test Execution Info' as info_type,
    now() as execution_time,
    current_user as db_user,
    version() as postgres_version,
    auth.uid() as auth_context;