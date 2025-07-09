-- ============================================
-- 動的RLSシステム & 権限管理最適化
-- ============================================

-- 1. 設定テーブル（システム動作モード管理）
CREATE TABLE IF NOT EXISTS system_config (
  id SERIAL PRIMARY KEY,
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 基本設定を挿入
INSERT INTO system_config (config_key, config_value, description) VALUES
  ('pilot_mode', '{"enabled": true, "users": ["635c35fb-0159-4bb9-9ab8-8933eb04ee31", "56d64ad6-165a-4841-bfcd-a78329f322e5", "0aba16a3-531d-4f7a-a9a3-6ca29537d349"]}', 'パイロットモード設定'),
  ('rls_policies', '{"store_based": false, "pilot_override": true}', 'RLSポリシー設定'),
  ('system_mode', '{"current": "pilot", "transition_date": null}', 'システムモード管理')
ON CONFLICT (config_key) DO NOTHING;

-- 2. 権限管理関数
CREATE OR REPLACE FUNCTION get_user_permissions(user_id UUID, store_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  pilot_config JSONB;
  user_role TEXT;
  permissions JSONB := '{}';
BEGIN
  -- パイロットモード確認
  SELECT config_value INTO pilot_config 
  FROM system_config 
  WHERE config_key = 'pilot_mode';
  
  -- パイロットモードの場合
  IF pilot_config->>'enabled' = 'true' AND 
     pilot_config->'users' ? user_id::TEXT THEN
    RETURN '{
      "mode": "pilot",
      "can_read": true,
      "can_write": true,
      "can_delete": true,
      "can_invite": true,
      "scope": "all_pilot_data"
    }';
  END IF;
  
  -- 店舗ベースモードの場合
  IF store_id IS NOT NULL THEN
    SELECT role INTO user_role
    FROM store_members
    WHERE user_id = get_user_permissions.user_id 
    AND store_id = get_user_permissions.store_id;
    
    IF user_role IS NOT NULL THEN
      permissions := CASE user_role
        WHEN 'owner' THEN '{
          "mode": "store_owner",
          "can_read": true,
          "can_write": true,
          "can_delete": true,
          "can_invite": true,
          "can_manage_members": true,
          "scope": "store_data"
        }'
        WHEN 'manager' THEN '{
          "mode": "store_manager", 
          "can_read": true,
          "can_write": true,
          "can_delete": false,
          "can_invite": true,
          "can_manage_members": false,
          "scope": "store_data"
        }'
        WHEN 'staff' THEN '{
          "mode": "store_staff",
          "can_read": true,
          "can_write": true,
          "can_delete": false,
          "can_invite": false,
          "can_manage_members": false,
          "scope": "store_data"
        }'
        ELSE '{
          "mode": "no_access",
          "can_read": false,
          "can_write": false,
          "can_delete": false,
          "can_invite": false,
          "scope": "none"
        }'
      END;
      
      RETURN permissions;
    END IF;
  END IF;
  
  -- 個人モード（従来の方式）
  RETURN '{
    "mode": "individual",
    "can_read": true,
    "can_write": true,
    "can_delete": true,
    "can_invite": false,
    "scope": "user_data"
  }';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 動的RLS確認関数
CREATE OR REPLACE FUNCTION check_sales_access(operation TEXT, store_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_id UUID;
  permissions JSONB;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  permissions := get_user_permissions(current_user_id, store_id);
  
  RETURN CASE operation
    WHEN 'SELECT' THEN permissions->>'can_read' = 'true'
    WHEN 'INSERT' THEN permissions->>'can_write' = 'true'
    WHEN 'UPDATE' THEN permissions->>'can_write' = 'true'
    WHEN 'DELETE' THEN permissions->>'can_delete' = 'true'
    ELSE FALSE
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 既存のRLSポリシーを削除して新しい動的ポリシーを作成
DROP POLICY IF EXISTS "sales_pilot_select" ON sales;
DROP POLICY IF EXISTS "sales_pilot_insert" ON sales;
DROP POLICY IF EXISTS "sales_pilot_update" ON sales;
DROP POLICY IF EXISTS "sales_pilot_delete" ON sales;

-- 新しい動的RLSポリシー
CREATE POLICY "sales_dynamic_select" ON sales
    FOR SELECT
    USING (check_sales_access('SELECT', store_id));

CREATE POLICY "sales_dynamic_insert" ON sales
    FOR INSERT
    WITH CHECK (check_sales_access('INSERT', store_id));

CREATE POLICY "sales_dynamic_update" ON sales
    FOR UPDATE
    USING (check_sales_access('UPDATE', store_id))
    WITH CHECK (check_sales_access('UPDATE', store_id));

CREATE POLICY "sales_dynamic_delete" ON sales
    FOR DELETE
    USING (check_sales_access('DELETE', store_id));

-- 5. 店舗関連テーブルのRLSポリシー
-- stores テーブル
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stores_member_access" ON stores
    FOR ALL
    USING (
        auth.uid() = owner_id OR
        EXISTS (
            SELECT 1 FROM store_members 
            WHERE store_id = stores.id 
            AND user_id = auth.uid()
        )
    );

-- store_members テーブル
ALTER TABLE store_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "store_members_access" ON store_members
    FOR ALL
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM store_members sm
            WHERE sm.store_id = store_members.store_id
            AND sm.user_id = auth.uid()
            AND sm.role IN ('owner', 'manager')
        )
    );

-- store_invitations テーブル
ALTER TABLE store_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "store_invitations_access" ON store_invitations
    FOR ALL
    USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
        EXISTS (
            SELECT 1 FROM store_members
            WHERE store_id = store_invitations.store_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'manager')
        )
    );

-- 6. システム設定管理関数
CREATE OR REPLACE FUNCTION update_system_mode(new_mode TEXT, transition_date TIMESTAMPTZ DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  -- システムモード更新
  UPDATE system_config 
  SET config_value = jsonb_build_object(
    'current', new_mode,
    'transition_date', transition_date,
    'updated_at', NOW()
  )
  WHERE config_key = 'system_mode';
  
  -- モードに応じた設定更新
  CASE new_mode
    WHEN 'pilot' THEN
      UPDATE system_config 
      SET config_value = config_value || '{"pilot_override": true}'
      WHERE config_key = 'rls_policies';
      
    WHEN 'store_based' THEN
      UPDATE system_config 
      SET config_value = jsonb_build_object(
        'enabled', false,
        'disabled_at', NOW()
      )
      WHERE config_key = 'pilot_mode';
      
      UPDATE system_config 
      SET config_value = config_value || '{"store_based": true, "pilot_override": false}'
      WHERE config_key = 'rls_policies';
      
    WHEN 'individual' THEN
      UPDATE system_config 
      SET config_value = jsonb_build_object(
        'enabled', false,
        'disabled_at', NOW()
      )
      WHERE config_key = 'pilot_mode';
      
      UPDATE system_config 
      SET config_value = config_value || '{"store_based": false, "pilot_override": false}'
      WHERE config_key = 'rls_policies';
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. パフォーマンス最適化インデックス
CREATE INDEX IF NOT EXISTS idx_sales_store_user ON sales(store_id, user_id);
CREATE INDEX IF NOT EXISTS idx_store_members_store_user ON store_members(store_id, user_id);
CREATE INDEX IF NOT EXISTS idx_store_members_role ON store_members(role);
CREATE INDEX IF NOT EXISTS idx_store_invitations_token ON store_invitations(token);
CREATE INDEX IF NOT EXISTS idx_store_invitations_email ON store_invitations(email);
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(config_key);

-- 8. 監査ログテーブル（オプション）
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  table_name VARCHAR(50) NOT NULL,
  operation VARCHAR(10) NOT NULL,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. RLS診断関数の更新
CREATE OR REPLACE FUNCTION diagnose_rls_system()
RETURNS TABLE (
  check_name TEXT,
  status TEXT,
  details JSONB
) AS $$
BEGIN
  -- 現在のシステムモード
  RETURN QUERY
  SELECT 
    'system_mode'::TEXT,
    'info'::TEXT,
    config_value
  FROM system_config 
  WHERE config_key = 'system_mode';
  
  -- パイロットモード状態
  RETURN QUERY
  SELECT 
    'pilot_mode'::TEXT,
    CASE 
      WHEN config_value->>'enabled' = 'true' THEN 'active'
      ELSE 'inactive'
    END::TEXT,
    config_value
  FROM system_config 
  WHERE config_key = 'pilot_mode';
  
  -- RLS有効状態
  RETURN QUERY
  SELECT 
    'rls_enabled'::TEXT,
    CASE 
      WHEN relrowsecurity THEN 'enabled'
      ELSE 'disabled'
    END::TEXT,
    jsonb_build_object('table', relname, 'rls_enabled', relrowsecurity)
  FROM pg_class 
  WHERE relname IN ('sales', 'stores', 'store_members', 'store_invitations');
  
  -- 現在のユーザー権限
  RETURN QUERY
  SELECT 
    'user_permissions'::TEXT,
    'info'::TEXT,
    get_user_permissions(auth.uid())
  WHERE auth.uid() IS NOT NULL;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- コメント追加
COMMENT ON FUNCTION get_user_permissions IS '動的ユーザー権限取得関数';
COMMENT ON FUNCTION check_sales_access IS 'セールスデータアクセス権限確認';
COMMENT ON FUNCTION update_system_mode IS 'システムモード切替関数';
COMMENT ON FUNCTION diagnose_rls_system IS 'RLSシステム診断関数';