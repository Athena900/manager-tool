-- ============================================
-- プロフィール作成用RPC関数
-- ============================================

-- 既存の関数を削除（もしあれば）
DROP FUNCTION IF EXISTS create_user_profile(text, text);

-- プロフィール作成用のRPC関数
-- セキュリティコンテキストでRLSをバイパス
CREATE OR REPLACE FUNCTION create_user_profile(
  p_user_id text,
  p_store_name text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- 関数作成者の権限で実行
SET search_path = public
AS $$
DECLARE
  result_profile json;
  existing_profile_count int;
BEGIN
  -- 現在のユーザーIDを確認
  IF auth.uid()::text != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Cannot create profile for another user';
  END IF;

  -- 既存プロフィールの確認
  SELECT COUNT(*) INTO existing_profile_count 
  FROM profiles 
  WHERE user_id = p_user_id;

  -- 既存プロフィールがある場合は返す
  IF existing_profile_count > 0 THEN
    SELECT row_to_json(p.*) INTO result_profile
    FROM profiles p
    WHERE p.user_id = p_user_id;
    
    RETURN json_build_object(
      'success', true,
      'message', 'Profile already exists',
      'profile', result_profile
    );
  END IF;

  -- 新しいプロフィールを作成
  INSERT INTO profiles (user_id, store_name, created_at, updated_at)
  VALUES (
    p_user_id, 
    p_store_name, 
    now(), 
    now()
  );

  -- 作成されたプロフィールを取得
  SELECT row_to_json(p.*) INTO result_profile
  FROM profiles p
  WHERE p.user_id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Profile created successfully',
    'profile', result_profile
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;

-- 認証されたユーザーに実行権限を付与
GRANT EXECUTE ON FUNCTION create_user_profile(text, text) TO authenticated;

-- テスト用の関数実行権限確認
SELECT routine_name, routine_type, security_type 
FROM information_schema.routines 
WHERE routine_name = 'create_user_profile';