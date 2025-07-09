-- RLS強制有効化スクリプト
-- 実行日: 2025-07-09
-- 目的: 管理者コンテキストでもRLSを強制適用

-- ============================================
-- ステップ1: RLSの強制有効化
-- ============================================

-- RLSを強制適用（管理者でも適用される）
ALTER TABLE sales FORCE ROW LEVEL SECURITY;
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;

-- 確認
SELECT 
    relname as tablename,
    relrowsecurity as rls_enabled,
    relforcerowsecurity as rls_forced
FROM pg_class 
WHERE relname IN ('sales', 'profiles');

-- ============================================
-- ステップ2: テスト用の認証コンテキスト設定
-- ============================================

-- 特定ユーザーのコンテキストでテスト実行
SET LOCAL auth.uid = '635c35fb-0159-4bb9-9ab8-8933eb04ee31';

-- テスト実行
SELECT 
    'RLS動作テスト' as test,
    COUNT(*) as visible_records,
    auth.uid() as current_user_context
FROM sales;

-- 設定をリセット
RESET auth.uid;

-- ============================================
-- ステップ3: 最終確認
-- ============================================

-- RLS強制設定後の最終確認
SELECT 
    'RLS設定確認' as check_type,
    relname as table_name,
    CASE 
        WHEN relrowsecurity AND relforcerowsecurity THEN '✅ RLS強制有効'
        WHEN relrowsecurity THEN '⚠️ RLS有効（管理者除外）'
        ELSE '❌ RLS無効'
    END as rls_status
FROM pg_class 
WHERE relname IN ('sales', 'profiles');