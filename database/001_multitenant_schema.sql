-- マルチテナント基盤のためのデータベーススキーマ
-- 最小限の実装 - 技術的負債回避のための戦略的基盤構築

-- 1. プロフィールテーブル作成（簡易版）
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  store_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 既存salesテーブルの拡張
-- 注意: 本番環境では慎重に実行する必要あり
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 3. インデックス作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);

-- 4. Row Level Security (RLS) 設定

-- プロフィールテーブルのRLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のプロフィールのみアクセス可能
DROP POLICY IF EXISTS "Users can manage their own profile" ON profiles;
CREATE POLICY "Users can manage their own profile" 
ON profiles FOR ALL 
USING (user_id = auth.uid());

-- 売上データテーブルのRLS
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のデータのみアクセス可能
DROP POLICY IF EXISTS "Users can manage their own sales data" ON sales;
CREATE POLICY "Users can manage their own sales data" 
ON sales FOR ALL 
USING (user_id = auth.uid());

-- 5. 更新日時を自動更新するためのトリガー（プロフィール用）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at 
BEFORE UPDATE ON profiles 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. デフォルトデータ挿入用の関数
CREATE OR REPLACE FUNCTION create_profile_for_user(
  p_user_id UUID,
  p_store_name TEXT
) RETURNS UUID AS $$
DECLARE
  profile_id UUID;
BEGIN
  INSERT INTO profiles (user_id, store_name)
  VALUES (p_user_id, p_store_name)
  RETURNING id INTO profile_id;
  
  RETURN profile_id;
END;
$$ LANGUAGE plpgsql;

-- 7. 既存データ移行用の一時的な関数（手動実行用）
-- 注意: 本番環境では管理者が慎重に実行すること
CREATE OR REPLACE FUNCTION migrate_existing_sales_data(
  p_user_id UUID
) RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- user_idがNULLの既存データを指定されたユーザーに関連付け
  UPDATE sales 
  SET user_id = p_user_id 
  WHERE user_id IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- 8. プロフィール存在確認用の関数
CREATE OR REPLACE FUNCTION has_profile(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles WHERE user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql;

-- コメント追加
COMMENT ON TABLE profiles IS 'ユーザープロフィール情報（店舗名など）';
COMMENT ON COLUMN profiles.user_id IS '認証ユーザーIDへの参照';
COMMENT ON COLUMN profiles.store_name IS '店舗名';
COMMENT ON COLUMN sales.user_id IS 'マルチテナント対応のためのユーザーID';

-- 完了メッセージ
SELECT 'マルチテナント基盤スキーマの作成が完了しました' AS status;