-- 実証実験モードのデータクリーンアップ
-- 問題: 実証実験参加者以外のユーザーデータが混在している

-- 1. 問題のあるユーザーのデータを確認
SELECT 
    '問題データの確認' as check_type,
    id,
    user_id,
    date,
    total_sales,
    CASE 
        WHEN user_id = '373c74e8-2152-461a-b502-ba66bcedb353' THEN '❌ 非参加者データ'
        WHEN user_id IN (
            '635c35fb-0159-4bb9-9ab8-8933eb04ee31',
            '56d64ad6-165a-4841-bfcd-a78329f322e5',
            '0aba16a3-531d-4f7a-a9a3-6ca29537d349'
        ) THEN '✅ 実証実験参加者'
        ELSE '❓ その他'
    END as data_status
FROM sales
ORDER BY user_id, date;

-- 2. 非参加者のデータを削除
DELETE FROM sales 
WHERE user_id = '373c74e8-2152-461a-b502-ba66bcedb353';

-- 3. クリーンアップ後の確認
SELECT 
    'クリーンアップ後の確認' as check_type,
    COUNT(*) as total_records,
    COUNT(DISTINCT user_id) as unique_users,
    STRING_AGG(DISTINCT user_id::text, ', ') as user_ids
FROM sales;

-- 4. 実証実験参加者ごとのデータ数
SELECT 
    '参加者別データ数' as check_type,
    user_id,
    CASE 
        WHEN user_id = '635c35fb-0159-4bb9-9ab8-8933eb04ee31' THEN 'オーナー'
        WHEN user_id = '56d64ad6-165a-4841-bfcd-a78329f322e5' THEN 'スタッフ1'
        WHEN user_id = '0aba16a3-531d-4f7a-a9a3-6ca29537d349' THEN 'スタッフ2'
    END as role,
    COUNT(*) as record_count
FROM sales
WHERE user_id IN (
    '635c35fb-0159-4bb9-9ab8-8933eb04ee31',
    '56d64ad6-165a-4841-bfcd-a78329f322e5',
    '0aba16a3-531d-4f7a-a9a3-6ca29537d349'
)
GROUP BY user_id
ORDER BY role;

-- 5. 成功メッセージ
SELECT 
    '✅ データクリーンアップ完了' as status,
    '非参加者データを削除しました' as action,
    '実証実験モードが正常に動作します' as result;