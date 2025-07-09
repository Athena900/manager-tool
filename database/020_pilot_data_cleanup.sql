-- 実証実験データクリーンアップ & 招待制移行
-- 実行日: 2025-07-10
-- 目的: 実証実験データの削除と本格運用準備

-- ============================================
-- 1. 実証実験データの安全なバックアップ
-- ============================================
-- 実証実験終了時に実行するための準備
CREATE TABLE IF NOT EXISTS pilot_data_backup AS 
SELECT 
    'backup_created_at: ' || NOW() as backup_info,
    * 
FROM sales 
WHERE user_id IN (
    '635c35fb-0159-4bb9-9ab8-8933eb04ee31',  -- オーナー
    '56d64ad6-165a-4841-bfcd-a78329f322e5',  -- スタッフ1
    '0aba16a3-531d-4f7a-a9a3-6ca29537d349'   -- スタッフ2
) 
LIMIT 0; -- 構造のみ作成（まだデータは入れない）

-- ============================================
-- 2. 実証実験データの削除（実行時のみ）
-- ============================================
-- 注意: このセクションは実証実験終了時に手動で実行

/*
-- 実証実験終了時に実行するSQL:

-- バックアップ実行
INSERT INTO pilot_data_backup 
SELECT 
    'backup_created_at: ' || NOW() as backup_info,
    * 
FROM sales 
WHERE user_id IN (
    '635c35fb-0159-4bb9-9ab8-8933eb04ee31',
    '56d64ad6-165a-4841-bfcd-a78329f322e5',
    '0aba16a3-531d-4f7a-a9a3-6ca29537d349'
);

-- 実証実験データの削除
DELETE FROM sales 
WHERE user_id IN (
    '635c35fb-0159-4bb9-9ab8-8933eb04ee31',
    '56d64ad6-165a-4841-bfcd-a78329f322e5',
    '0aba16a3-531d-4f7a-a9a3-6ca29537d349'
);

-- 確認
SELECT 
    'データクリア確認' as check_type,
    COUNT(*) as remaining_records
FROM sales;
*/

-- ============================================
-- 3. 店舗とメンバーシップの初期化
-- ============================================
-- 実証実験終了時に実行するための準備スクリプト

/*
-- 実証実験終了時に実行するSQL:

-- 3-1. 店舗作成
INSERT INTO stores (name, owner_id) 
VALUES ('実証実験店舗', '635c35fb-0159-4bb9-9ab8-8933eb04ee31')
ON CONFLICT DO NOTHING;

-- 3-2. メンバーシップ作成
INSERT INTO store_members (store_id, user_id, role) 
VALUES 
    ((SELECT id FROM stores WHERE owner_id = '635c35fb-0159-4bb9-9ab8-8933eb04ee31'), 
     '635c35fb-0159-4bb9-9ab8-8933eb04ee31', 'owner'),
    ((SELECT id FROM stores WHERE owner_id = '635c35fb-0159-4bb9-9ab8-8933eb04ee31'), 
     '56d64ad6-165a-4841-bfcd-a78329f322e5', 'staff'),
    ((SELECT id FROM stores WHERE owner_id = '635c35fb-0159-4bb9-9ab8-8933eb04ee31'), 
     '0aba16a3-531d-4f7a-a9a3-6ca29537d349', 'staff')
ON CONFLICT (store_id, user_id) DO NOTHING;

-- 3-3. 確認
SELECT 
    'メンバーシップ確認' as check_type,
    s.name as store_name,
    sm.role,
    u.email
FROM store_members sm
JOIN stores s ON sm.store_id = s.id
JOIN auth.users u ON sm.user_id = u.id
ORDER BY sm.role DESC, u.email;
*/

-- ============================================
-- 4. RLSポリシー切り替え準備
-- ============================================
-- 実証実験終了時に実行するための準備

/*
-- 実証実験終了時に実行するSQL:

-- 4-1. 古い実証実験用ポリシーを削除
DROP POLICY IF EXISTS "sales_pilot_select" ON sales;
DROP POLICY IF EXISTS "sales_pilot_insert" ON sales;
DROP POLICY IF EXISTS "sales_pilot_update" ON sales;
DROP POLICY IF EXISTS "sales_pilot_delete" ON sales;

-- 4-2. 新しい店舗ベースポリシーを有効化
CREATE POLICY "sales_store_access" ON sales
FOR ALL USING (
    store_id IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM store_members 
        WHERE store_id = sales.store_id AND user_id = auth.uid()
    )
);

-- 4-3. 確認
SELECT 
    'RLSポリシー確認' as check_type,
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE tablename = 'sales'
ORDER BY policyname;
*/

-- ============================================
-- 5. 移行完了確認用クエリ
-- ============================================
-- 実証実験終了後の動作確認用

/*
-- 移行完了後に実行する確認SQL:

-- 5-1. 店舗・メンバー構成確認
SELECT 
    '店舗構成確認' as check_type,
    s.name as store_name,
    s.owner_id,
    COUNT(sm.user_id) as member_count
FROM stores s
LEFT JOIN store_members sm ON s.id = sm.store_id
GROUP BY s.id, s.name, s.owner_id;

-- 5-2. データアクセス確認
SELECT 
    'データアクセス確認' as check_type,
    auth.uid() as current_user,
    COUNT(*) as accessible_records
FROM sales
WHERE store_id IS NOT NULL;

-- 5-3. RLS動作確認
SELECT 
    'RLS動作確認' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM store_members 
            WHERE user_id = auth.uid()
        ) THEN '✅ メンバーアクセス可能'
        ELSE '❌ メンバーアクセス不可'
    END as access_status;
*/

-- ============================================
-- 6. 準備完了メッセージ
-- ============================================
SELECT 
    '📋 実証実験データクリーンアップ準備完了' as status,
    '実証実験終了時にコメントアウトされたSQLを実行してください' as instruction,
    'バックアップテーブル準備完了: pilot_data_backup' as backup_status;