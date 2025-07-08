-- ================================
-- 既存テストデータのクリーンアップSQL
-- オーナーのデータのみ保持し、テストユーザーのデータを削除
-- ================================

-- 1. 現在のデータ状況確認
-- ================================

-- A. 全ユーザーとデータ件数確認
SELECT 
  u.id as user_id,
  u.email,
  u.created_at as user_created,
  COUNT(s.id) as sales_count
FROM auth.users u
LEFT JOIN sales s ON u.id = s.user_id
GROUP BY u.id, u.email, u.created_at
ORDER BY u.created_at ASC;

-- B. プロフィール情報確認
SELECT 
  p.user_id,
  p.store_name,
  p.created_at,
  u.email
FROM profiles p
JOIN auth.users u ON p.user_id = u.id
ORDER BY p.created_at ASC;

-- C. salesデータの詳細確認
SELECT 
  user_id,
  COUNT(*) as count,
  MIN(created_at) as first_record,
  MAX(created_at) as last_record,
  SUM(total_sales) as total_amount
FROM sales 
WHERE user_id IS NOT NULL
GROUP BY user_id
ORDER BY first_record ASC;

-- ================================
-- 2. オーナー特定
-- ================================

-- A. 最初に作成されたユーザー（オーナー）を確認
SELECT 
  id as owner_user_id,
  email as owner_email,
  created_at as owner_created
FROM auth.users 
ORDER BY created_at ASC 
LIMIT 1;

-- ================================
-- 3. テストデータ削除（慎重に実行）
-- ================================

-- ⚠️ 重要: 以下は手動で実行し、オーナーのIDを確認後に実行してください

-- A. オーナーのuser_id確認（手動でメモ）
-- 実際のオーナーIDに置換して使用: 'OWNER_USER_ID_HERE'

-- B. テスト用プロフィールの削除（オーナー以外）
/*
-- オーナー以外のプロフィールを削除
DELETE FROM profiles 
WHERE user_id != 'OWNER_USER_ID_HERE';

-- 削除結果確認
SELECT COUNT(*) as remaining_profiles FROM profiles;
*/

-- C. テスト用売上データの削除（オーナー以外）
/*
-- オーナー以外の売上データを削除
DELETE FROM sales 
WHERE user_id != 'OWNER_USER_ID_HERE' 
AND user_id IS NOT NULL;

-- NULL user_idのデータも削除（またはオーナーに関連付け）
-- オプション1: 削除
DELETE FROM sales WHERE user_id IS NULL;

-- オプション2: オーナーに関連付け（既存データが重要な場合）
-- UPDATE sales SET user_id = 'OWNER_USER_ID_HERE' WHERE user_id IS NULL;

-- 削除結果確認
SELECT COUNT(*) as remaining_sales FROM sales;
SELECT COUNT(DISTINCT user_id) as unique_user_count FROM sales;
*/

-- D. テストユーザーアカウントの削除（オプション - 慎重に）
/*
-- ⚠️ 注意: これによりテストユーザーはログインできなくなります
-- オーナー以外のユーザーアカウントを削除
DELETE FROM auth.users 
WHERE id != 'OWNER_USER_ID_HERE';

-- 削除結果確認
SELECT COUNT(*) as remaining_users FROM auth.users;
*/

-- ================================
-- 4. クリーンアップ後の確認
-- ================================

-- A. 最終的なデータ状況確認
SELECT 
  'sales' as table_name,
  COUNT(*) as record_count,
  COUNT(DISTINCT user_id) as unique_users
FROM sales
UNION ALL
SELECT 
  'profiles' as table_name,
  COUNT(*) as record_count,
  COUNT(DISTINCT user_id) as unique_users
FROM profiles
UNION ALL
SELECT 
  'users' as table_name,
  COUNT(*) as record_count,
  COUNT(DISTINCT id) as unique_users
FROM auth.users;

-- B. オーナーのデータ確認
/*
SELECT 
  s.id,
  s.date,
  s.total_sales,
  s.user_id,
  p.store_name,
  u.email
FROM sales s
LEFT JOIN profiles p ON s.user_id = p.user_id
LEFT JOIN auth.users u ON s.user_id = u.id
WHERE s.user_id = 'OWNER_USER_ID_HERE'
ORDER BY s.created_at DESC
LIMIT 10;
*/

-- ================================
-- 5. 推奨実行手順
-- ================================

/*
実行手順:

1. 【確認】現在のデータ状況確認クエリを実行
   - 全ユーザーとデータ件数確認
   - プロフィール情報確認
   - salesデータの詳細確認

2. 【特定】オーナーuser_id特定
   - 最初に作成されたユーザー = オーナー
   - オーナーのuser_idをメモ

3. 【バックアップ】重要データのバックアップ
   - 念のため重要なsalesデータをCSVエクスポート
   - Supabaseの自動バックアップ確認

4. 【削除】テストデータの段階的削除
   a. テスト用プロフィール削除
   b. テスト用売上データ削除
   c. NULL user_idデータの処理
   d. （オプション）テストユーザーアカウント削除

5. 【確認】クリーンアップ後の動作確認
   - オーナーアカウントでのログイン確認
   - オーナーのデータのみ表示されることを確認
   - 新規ユーザー作成テストで空データセット確認

注意事項:
- 本番環境での実行は慎重に
- 重要なデータがある場合は削除ではなく適切なuser_idへの関連付けを検討
- テスト後は必ずデータ分離が正常に機能することを確認
*/

-- ================================
-- 6. 安全な実行例（段階的）
-- ================================

-- Step 1: オーナーID確認
-- SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1;

-- Step 2: 削除対象確認
-- SELECT COUNT(*) FROM profiles WHERE user_id != 'OWNER_ID';
-- SELECT COUNT(*) FROM sales WHERE user_id != 'OWNER_ID' AND user_id IS NOT NULL;

-- Step 3: 実際の削除（オーナーIDを置換して実行）
-- DELETE FROM profiles WHERE user_id != 'OWNER_ID';
-- DELETE FROM sales WHERE user_id != 'OWNER_ID' AND user_id IS NOT NULL;
-- DELETE FROM sales WHERE user_id IS NULL;