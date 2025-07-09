-- 実証実験用シングルテナント調整スクリプト
-- 実行日: 2025-07-09
-- 目的: マルチテナント基盤を保持したまま、3人でデータ共有可能にする

-- ============================================
-- Phase 1: 現在のポリシーのバックアップ
-- ============================================
SELECT '=== Phase 1: 現在のポリシーバックアップ ===' as phase;

-- 現在のポリシーを記録（復元用）
SELECT 
    '現在のRLSポリシー（復元用）' as backup_info,
    tablename,
    policyname,
    cmd,
    permissive,
    roles::text as roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('sales', 'profiles')
ORDER BY tablename, policyname;

-- 現在のテーブル設定も記録
SELECT 
    '現在のテーブル設定（復元用）' as backup_info,
    relname as table_name,
    relrowsecurity as rls_enabled,
    relforcerowsecurity as rls_forced
FROM pg_class 
WHERE relname IN ('sales', 'profiles');

-- ============================================
-- Phase 2: スタッフアカウント確認
-- ============================================
SELECT '=== Phase 2: 現在のユーザー確認 ===' as phase;

-- 現在のユーザー一覧
SELECT 
    'Current Users' as info,
    id as user_id,
    email,
    created_at,
    CASE 
        WHEN id = '635c35fb-0159-4bb9-9ab8-8933eb04ee31' THEN 'OWNER'
        ELSE 'STAFF_' || ROW_NUMBER() OVER (ORDER BY created_at)
    END as user_role
FROM auth.users
ORDER BY created_at;

-- 現在のプロフィール状況
SELECT 
    'Current Profiles' as info,
    user_id,
    store_name,
    created_at
FROM profiles
ORDER BY created_at;

-- ============================================
-- スタッフ用アカウント作成指示
-- ============================================
SELECT '=== スタッフアカウント作成指示 ===' as phase;

SELECT 
    'STAFF ACCOUNT CREATION REQUIRED' as action_needed,
    'Please create 2 staff accounts manually:' as instruction,
    '1. Go to https://manager-tool.vercel.app/' as step1,
    '2. Create Staff 1 account with email: staff1@[your-domain]' as step2,
    '3. Create Staff 2 account with email: staff2@[your-domain]' as step3,
    '4. Return here and run the next phase' as step4;

-- 注意: 実際のスタッフアカウント作成は手動で行う必要があります
-- 以下は作成後に実行するスクリプトです