-- ================================
-- データ分離緊急修正SQL
-- マルチテナント機能問題解決
-- ================================

-- 1. 現在のデータ状況確認
-- ================================

-- A. salesテーブルのuser_id状況確認
SELECT 
  COUNT(*) as total_records,
  COUNT(user_id) as records_with_user_id,
  COUNT(*) - COUNT(user_id) as null_user_id_records
FROM sales;

-- B. user_idがNULLのレコード詳細
SELECT id, date, total_sales, created_at, user_id
FROM sales 
WHERE user_id IS NULL 
ORDER BY created_at DESC;

-- C. 既存ユーザー一覧（作成順）
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at ASC;

-- ================================
-- 2. 既存データ修正
-- ================================

-- 注意: 以下のクエリは手動で実行し、YOUR_USER_IDを実際のオーナーIDに置換してください

-- A. オーナーのuser_idを確認（最初のユーザー = オーナー）
-- SELECT id as owner_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;

-- B. 既存データをオーナーに関連付け（手動実行用）
/*
UPDATE sales 
SET user_id = 'YOUR_USER_ID_HERE'  -- 実際のオーナーIDに置換
WHERE user_id IS NULL;
*/

-- C. 更新結果確認
-- SELECT COUNT(*) as updated_records FROM sales WHERE user_id IS NOT NULL;
-- SELECT COUNT(*) as remaining_null_records FROM sales WHERE user_id IS NULL;

-- ================================
-- 3. RLSポリシーの強化
-- ================================

-- A. 既存の緩いポリシーを削除
DROP POLICY IF EXISTS "Users can manage their own sales data" ON sales;
DROP POLICY IF EXISTS "sales_policy" ON sales;
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON sales;
DROP POLICY IF EXISTS "Enable insert access for users based on user_id" ON sales;
DROP POLICY IF EXISTS "Enable update access for users based on user_id" ON sales;
DROP POLICY IF EXISTS "Enable delete access for users based on user_id" ON sales;

-- B. 厳密なデータ分離ポリシーを作成
CREATE POLICY "Strict user data isolation - SELECT" 
ON sales FOR SELECT 
USING (
  user_id = auth.uid() 
  AND user_id IS NOT NULL
);

CREATE POLICY "Strict user data isolation - INSERT" 
ON sales FOR INSERT 
WITH CHECK (
  user_id = auth.uid() 
  AND user_id IS NOT NULL
);

CREATE POLICY "Strict user data isolation - UPDATE" 
ON sales FOR UPDATE 
USING (
  user_id = auth.uid() 
  AND user_id IS NOT NULL
)
WITH CHECK (
  user_id = auth.uid() 
  AND user_id IS NOT NULL
);

CREATE POLICY "Strict user data isolation - DELETE" 
ON sales FOR DELETE 
USING (
  user_id = auth.uid() 
  AND user_id IS NOT NULL
);

-- ================================
-- 4. データ整合性確保
-- ================================

-- A. user_idのNOT NULL制約を追加（既存データ修正後に実行）
-- ALTER TABLE sales ALTER COLUMN user_id SET NOT NULL;

-- B. 外部キー制約を追加（データ整合性確保）
-- ALTER TABLE sales 
-- ADD CONSTRAINT fk_sales_user_id 
-- FOREIGN KEY (user_id) REFERENCES auth.users(id) 
-- ON DELETE CASCADE;

-- ================================
-- 5. 確認用クエリ
-- ================================

-- A. RLSポリシー確認
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'sales'
ORDER BY policyname;

-- B. データ分離テスト用クエリ
-- 各ユーザーでログイン後、以下を実行してデータが分離されているか確認
/*
-- 現在のユーザーID確認
SELECT auth.uid() as current_user_id;

-- アクセス可能なsalesデータ確認
SELECT id, date, total_sales, user_id, created_at 
FROM sales 
ORDER BY created_at DESC 
LIMIT 10;

-- データ件数確認
SELECT COUNT(*) as accessible_records FROM sales;
*/

-- ================================
-- 6. 緊急時のロールバック
-- ================================

-- 問題が発生した場合の緊急ロールバック用
/*
-- RLSを一時的に無効化（緊急時のみ）
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;

-- 元の緩いポリシーに戻す（緊急時のみ）
CREATE POLICY "Emergency access policy" 
ON sales FOR ALL 
USING (true);
*/

-- ================================
-- 実行手順サマリー
-- ================================

/*
1. 【確認】現在のデータ状況確認クエリを実行
2. 【手動】オーナーのuser_idを特定
3. 【手動】UPDATEクエリでYOUR_USER_IDを置換して実行
4. 【自動】RLSポリシー強化を実行
5. 【確認】データ分離テストを実行
6. 【オプション】NOT NULL制約追加（推奨）

注意: 本番環境での実行前に必ずバックアップを取得してください
*/