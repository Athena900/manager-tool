-- 招待制システム - データベース準備
-- 実行日: 2025-07-10
-- 目的: 既存システムに影響を与えずに新テーブル作成

-- ============================================
-- 1. 店舗管理テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS stores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    owner_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 外部キー制約（CASCADE削除でデータ整合性保証）
    CONSTRAINT fk_stores_owner 
        FOREIGN KEY (owner_id) 
        REFERENCES auth.users(id) 
        ON DELETE CASCADE
);

-- ============================================
-- 2. 店舗メンバーシップテーブル
-- ============================================
CREATE TABLE IF NOT EXISTS store_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'staff',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 制約
    CONSTRAINT fk_store_members_store 
        FOREIGN KEY (store_id) 
        REFERENCES stores(id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_store_members_user 
        FOREIGN KEY (user_id) 
        REFERENCES auth.users(id) 
        ON DELETE CASCADE,
    CONSTRAINT chk_store_members_role 
        CHECK (role IN ('owner', 'manager', 'staff')),
    CONSTRAINT uk_store_members_store_user 
        UNIQUE(store_id, user_id)
);

-- ============================================
-- 3. 招待管理テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS store_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID NOT NULL,
    inviter_id UUID NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'staff',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 制約
    CONSTRAINT fk_store_invitations_store 
        FOREIGN KEY (store_id) 
        REFERENCES stores(id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_store_invitations_inviter 
        FOREIGN KEY (inviter_id) 
        REFERENCES auth.users(id) 
        ON DELETE CASCADE,
    CONSTRAINT chk_store_invitations_role 
        CHECK (role IN ('manager', 'staff')),
    CONSTRAINT chk_store_invitations_status 
        CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    CONSTRAINT uk_store_invitations_token 
        UNIQUE(token)
);

-- ============================================
-- 4. 既存salesテーブルの拡張（安全な方法）
-- ============================================
-- store_idカラムがまだ存在しない場合のみ追加
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales' AND column_name = 'store_id'
    ) THEN
        ALTER TABLE sales ADD COLUMN store_id UUID;
        
        -- 外部キー制約は後で追加（既存データに影響しないため）
        ALTER TABLE sales ADD CONSTRAINT fk_sales_store 
            FOREIGN KEY (store_id) 
            REFERENCES stores(id) 
            ON DELETE CASCADE;
    END IF;
END $$;

-- ============================================
-- 5. パフォーマンス最適化用インデックス
-- ============================================
CREATE INDEX IF NOT EXISTS idx_stores_owner ON stores(owner_id);
CREATE INDEX IF NOT EXISTS idx_store_members_store_user ON store_members(store_id, user_id);
CREATE INDEX IF NOT EXISTS idx_store_members_user ON store_members(user_id);
CREATE INDEX IF NOT EXISTS idx_store_invitations_token ON store_invitations(token);
CREATE INDEX IF NOT EXISTS idx_store_invitations_email ON store_invitations(email);
CREATE INDEX IF NOT EXISTS idx_store_invitations_expires ON store_invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_sales_store_id ON sales(store_id);

-- ============================================
-- 6. RLSポリシー準備（まだ有効化しない）
-- ============================================
-- 店舗テーブルのRLS準備
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- メンバーシップテーブルのRLS準備
ALTER TABLE store_members ENABLE ROW LEVEL SECURITY;

-- 招待テーブルのRLS準備
ALTER TABLE store_invitations ENABLE ROW LEVEL SECURITY;

-- 新しいRLSポリシー作成（まだ無効な状態）
CREATE POLICY "stores_access_new" ON stores
FOR ALL USING (
    owner_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM store_members 
        WHERE store_id = stores.id AND user_id = auth.uid()
    )
);

CREATE POLICY "store_members_access_new" ON store_members
FOR ALL USING (
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM stores 
        WHERE id = store_members.store_id AND owner_id = auth.uid()
    )
);

CREATE POLICY "store_invitations_access_new" ON store_invitations
FOR ALL USING (
    inviter_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM stores 
        WHERE id = store_invitations.store_id AND owner_id = auth.uid()
    )
);

-- ============================================
-- 7. 確認クエリ
-- ============================================
SELECT 
    '✅ 招待制システム準備完了' as status,
    'stores: ' || (SELECT COUNT(*) FROM stores) || '件' as stores_count,
    'store_members: ' || (SELECT COUNT(*) FROM store_members) || '件' as members_count,
    'store_invitations: ' || (SELECT COUNT(*) FROM store_invitations) || '件' as invitations_count;

-- 既存salesテーブルの構造確認
SELECT 
    'salesテーブル構造確認' as check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'sales'
ORDER BY ordinal_position;