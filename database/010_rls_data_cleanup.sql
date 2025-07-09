-- RLS追加修正 - データクリーンアップスクリプト
-- 実行日: 2025-07-09
-- 目的: RLSポリシー作成後のデータクリーンアップ

-- ============================================
-- ステップ1: 現在のデータ状況を詳細確認
-- ============================================
SELECT '=== STEP 1: 現在のデータ状況確認 ===' as step;

-- user_id別のデータ分布確認
SELECT 
    user_id, 
    COUNT(*) as record_count,
    CASE 
        WHEN user_id = '635c35fb-0159-4bb9-9ab8-8933eb04ee31' THEN 'OWNER (保持)'
        WHEN user_id IS NULL THEN 'NULL (削除対象)'
        ELSE 'OTHER_USER (削除対象)'
    END as user_type,
    MIN(date) as oldest_date,
    MAX(date) as newest_date
FROM sales 
GROUP BY user_id 
ORDER BY user_type, record_count DESC;

-- 削除対象のデータ件数確認
SELECT 
    '削除対象データ件数' as info,
    COUNT(*) as delete_count
FROM sales 
WHERE user_id != '635c35fb-0159-4bb9-9ab8-8933eb04ee31' 
   OR user_id IS NULL;

-- ============================================
-- ステップ2: 強制データクリーンアップ
-- ============================================
SELECT '=== STEP 2: データクリーンアップ実行 ===' as step;

-- 削除前のバックアップ確認（削除対象のサンプルデータ）
SELECT 'サンプル削除対象データ（最大5件）' as info;
SELECT id, user_id, date, total_sales 
FROM sales 
WHERE user_id != '635c35fb-0159-4bb9-9ab8-8933eb04ee31' 
   OR user_id IS NULL
LIMIT 5;

-- 他ユーザーのデータを削除
DELETE FROM sales 
WHERE user_id != '635c35fb-0159-4bb9-9ab8-8933eb04ee31';

-- NULLデータも削除
DELETE FROM sales 
WHERE user_id IS NULL;

-- ============================================
-- ステップ3: クリーンアップ後の確認
-- ============================================
SELECT '=== STEP 3: クリーンアップ後の確認 ===' as step;

-- 残存データの確認
SELECT 
    user_id, 
    COUNT(*) as record_count,
    'OWNER' as user_type
FROM sales 
GROUP BY user_id;

-- データ総数確認
SELECT 
    'データ総数' as info,
    COUNT(*) as total_count
FROM sales;

-- ============================================
-- ステップ4: RLSポリシー確認
-- ============================================
SELECT '=== STEP 4: RLSポリシー確認 ===' as step;

-- salesテーブルのポリシー確認
SELECT 
    policyname,
    cmd,
    qual,
    with_check,
    roles
FROM pg_policies 
WHERE tablename = 'sales' 
ORDER BY policyname;

-- ============================================
-- ステップ5: 認証コンテキスト確認
-- ============================================
SELECT '=== STEP 5: 認証コンテキスト確認 ===' as step;

-- 現在のユーザーID確認（アプリケーションから実行時）
SELECT 
    auth.uid() as current_auth_user_id,
    current_user as database_user,
    now() as execution_time;

-- ============================================
-- ステップ6: 最終検証クエリ
-- ============================================
SELECT '=== STEP 6: 最終検証 ===' as step;

-- RLSが有効か確認
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('sales', 'profiles')
AND schemaname = 'public';

-- 最終的なデータ整合性確認
SELECT 
    'データ整合性チェック' as check_type,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(*) as total_records,
    CASE 
        WHEN COUNT(DISTINCT user_id) = 1 THEN '✅ 正常（単一ユーザー）'
        ELSE '❌ 異常（複数ユーザー）'
    END as status
FROM sales;