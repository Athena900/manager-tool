-- ============================================
-- プロフィールテーブルRLS修正
-- ============================================

-- 現在のRLSポリシーを確認
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
WHERE tablename = 'profiles';

-- 既存のprofilesポリシーを削除（安全のため）
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;

-- プロフィールテーブルのRLSを一時的に無効化
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 改めてRLSを有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 1. プロフィール作成ポリシー（INSERT）
CREATE POLICY "profiles_insert_policy" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 2. プロフィール閲覧ポリシー（SELECT）
CREATE POLICY "profiles_select_policy" ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. プロフィール更新ポリシー（UPDATE）
CREATE POLICY "profiles_update_policy" ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. プロフィール削除ポリシー（DELETE）
CREATE POLICY "profiles_delete_policy" ON profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- パイロットモード用の追加ポリシー（必要に応じて）
-- パイロットユーザーは他のユーザーのプロフィールも閲覧可能
CREATE POLICY "pilot_users_can_view_all_profiles" ON profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      '635c35fb-0159-4bb9-9ab8-8933eb04ee31',  -- オーナー
      '56d64ad6-165a-4841-bfcd-a78329f322e5',  -- スタッフ1
      '0aba16a3-531d-4f7a-a9a3-6ca29537d349'   -- スタッフ2
    )
  );

-- ポリシーの確認
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
WHERE tablename = 'profiles'
ORDER BY policyname;