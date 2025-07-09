// ============================================
// 完全型安全 店舗管理API
// ============================================

import { supabase } from './supabase'
import { 
  createErrorResponse, 
  createAuthError, 
  createValidationError,
  createAuthorizationError,
  createNotFoundError,
  safeAsync 
} from './errorHandler'
import type {
  Store,
  StoreWithRole,
  StoreMember,
  StoreInvitation,
  CreateStoreData,
  CreateInvitationData,
  AcceptInvitationResponse,
  ApiResponse,
  UserRole,
  User
} from '@/types'

// ============================================
// Store Management API
// ============================================

/**
 * 店舗作成
 */
export const createStore = async (
  data: CreateStoreData
): Promise<ApiResponse<Store>> => {
  return safeAsync(async () => {
    // バリデーション
    if (!data.name?.trim()) {
      throw createValidationError('店舗名', '店舗名は必須です')
    }

    if (data.name.length > 100) {
      throw createValidationError('店舗名', '店舗名は100文字以内で入力してください')
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      throw createAuthError()
    }

    console.log('=== 店舗作成開始 ===')
    console.log('店舗名:', data.name)
    console.log('オーナーID:', user.id)
    
    // 店舗作成
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .insert([{ 
        name: data.name.trim(), 
        description: data.description?.trim() || null,
        owner_id: user.id 
      }])
      .select()
      .single()
    
    if (storeError) {
      throw storeError
    }
    
    // オーナーをメンバーとして追加
    const { error: memberError } = await supabase
      .from('store_members')
      .insert([{ 
        store_id: store.id, 
        user_id: user.id, 
        role: 'owner' as UserRole,
        invited_by: user.id
      }])
    
    if (memberError) {
      // 店舗作成は成功したが、メンバー追加に失敗した場合のロールバック
      await supabase.from('stores').delete().eq('id', store.id)
      throw memberError
    }
    
    console.log('✅ 店舗作成完了:', store.id)
    return store as Store
  }).then(result => {
    if (result.error) {
      return createErrorResponse<Store>(result.error, 'createStore')
    }
    return { data: result.data, error: null, success: true }
  })
}

/**
 * ユーザーの参加店舗一覧取得
 */
export const getUserStores = async (): Promise<ApiResponse<StoreWithRole[]>> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { 
        data: [], 
        error: { message: 'ユーザーが認証されていません' },
        success: false
      }
    }

    console.log('=== ユーザー店舗一覧取得 ===')
    console.log('ユーザーID:', user.id)
    
    const { data, error } = await supabase
      .from('store_members')
      .select(`
        store_id,
        role,
        joined_at,
        stores (
          id,
          name,
          owner_id,
          description,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false })
    
    if (error) {
      console.error('店舗一覧取得エラー:', error)
      return { 
        data: [], 
        error: { message: error.message, code: error.code },
        success: false
      }
    }
    
    const stores: StoreWithRole[] = data?.map(item => ({
      ...(item.stores as Store),
      user_role: item.role as UserRole,
      joined_at: item.joined_at
    })) || []
    
    console.log('✅ 店舗一覧取得完了:', stores.length + '件')
    return { data: stores, error: null, success: true }
    
  } catch (err) {
    console.error('店舗一覧取得例外:', err)
    return { 
      data: [], 
      error: { message: err instanceof Error ? err.message : '不明なエラー' },
      success: false
    }
  }
}

/**
 * 店舗メンバー一覧取得
 */
export const getStoreMembers = async (
  storeId: string
): Promise<ApiResponse<StoreMember[]>> => {
  try {
    if (!storeId) {
      return { 
        data: [], 
        error: { message: '店舗IDが必要です' },
        success: false
      }
    }

    console.log('=== 店舗メンバー一覧取得 ===')
    console.log('店舗ID:', storeId)
    
    const { data, error } = await supabase
      .from('store_members')
      .select(`
        id,
        store_id,
        user_id,
        role,
        invited_by,
        joined_at,
        created_at,
        updated_at
      `)
      .eq('store_id', storeId)
      .order('joined_at', { ascending: true })
    
    if (error) {
      console.error('メンバー一覧取得エラー:', error)
      return { 
        data: [], 
        error: { message: error.message, code: error.code },
        success: false
      }
    }
    
    const members = data as StoreMember[] || []
    
    console.log('✅ メンバー一覧取得完了:', members.length + '件')
    return { data: members, error: null, success: true }
    
  } catch (err) {
    console.error('メンバー一覧取得例外:', err)
    return { 
      data: [], 
      error: { message: err instanceof Error ? err.message : '不明なエラー' },
      success: false
    }
  }
}

// ============================================
// Invitation Management API
// ============================================

/**
 * 招待作成
 */
export const createInvitation = async (
  storeId: string,
  email: string,
  role: UserRole = 'staff'
): Promise<ApiResponse<StoreInvitation>> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { 
        data: null, 
        error: { message: 'ユーザーが認証されていません' },
        success: false
      }
    }

    // 招待権限チェック（オーナーまたはマネージャーのみ）
    const { data: membership, error: membershipError } = await supabase
      .from('store_members')
      .select('role')
      .eq('store_id', storeId)
      .eq('user_id', user.id)
      .single()
    
    if (membershipError || !membership) {
      return { 
        data: null, 
        error: { message: 'この店舗への招待権限がありません' },
        success: false
      }
    }
    
    if (membership.role !== 'owner' && membership.role !== 'manager') {
      return { 
        data: null, 
        error: { message: '招待権限がありません（オーナーまたはマネージャーのみ）' },
        success: false
      }
    }

    console.log('=== 招待作成開始 ===')
    console.log('店舗ID:', storeId)
    console.log('招待先:', email)
    console.log('役割:', role)
    
    // 既存の招待をチェック
    const { data: existingInvite } = await supabase
      .from('store_invitations')
      .select('id, status')
      .eq('store_id', storeId)
      .eq('email', email)
      .eq('status', 'pending')
      .single()
    
    if (existingInvite) {
      return { 
        data: null, 
        error: { message: 'このメールアドレスには既に招待を送信済みです' },
        success: false
      }
    }
    
    // 招待トークン生成 - より強固なトークン生成
    const token = `${crypto.randomUUID()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // 有効期限設定（7日後）
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)
    
    const { data: invitation, error: inviteError } = await supabase
      .from('store_invitations')
      .insert([{
        store_id: storeId,
        email,
        role,
        token,
        expires_at: expiresAt.toISOString(),
        invited_by: user.id,
        status: 'pending' as const
      }])
      .select()
      .single()
    
    if (inviteError) {
      console.error('招待作成エラー:', inviteError)
      return { 
        data: null, 
        error: { message: inviteError.message, code: inviteError.code },
        success: false
      }
    }
    
    console.log('✅ 招待作成完了:', invitation.id)
    return { data: invitation as StoreInvitation, error: null, success: true }
    
  } catch (err) {
    console.error('招待作成例外:', err)
    return { 
      data: null, 
      error: { message: err instanceof Error ? err.message : '不明なエラー' },
      success: false
    }
  }
}

/**
 * 招待受け入れ
 */
export const acceptInvitation = async (
  token: string
): Promise<ApiResponse<AcceptInvitationResponse>> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { 
        data: null, 
        error: { message: 'ユーザーが認証されていません' },
        success: false
      }
    }

    console.log('=== 招待受け入れ開始 ===')
    console.log('ユーザーID:', user.id)
    console.log('トークン:', token)
    
    // 招待情報を取得
    const { data: invitation, error: inviteError } = await supabase
      .from('store_invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single()
    
    if (inviteError || !invitation) {
      console.error('招待取得エラー:', inviteError)
      return { 
        data: null, 
        error: { message: '無効な招待リンクです' },
        success: false
      }
    }
    
    // 期限チェック
    if (new Date(invitation.expires_at) < new Date()) {
      return { 
        data: null, 
        error: { message: '招待リンクの有効期限が切れています' },
        success: false
      }
    }
    
    // 重複チェック
    const { data: existingMember } = await supabase
      .from('store_members')
      .select('id')
      .eq('store_id', invitation.store_id)
      .eq('user_id', user.id)
      .single()
    
    if (existingMember) {
      return { 
        data: null, 
        error: { message: '既にこの店舗のメンバーです' },
        success: false
      }
    }
    
    // メンバー追加
    const { error: memberError } = await supabase
      .from('store_members')
      .insert([{
        store_id: invitation.store_id,
        user_id: user.id,
        role: invitation.role as UserRole,
        invited_by: invitation.invited_by
      }])
    
    if (memberError) {
      console.error('メンバー追加エラー:', memberError)
      return { 
        data: null, 
        error: { message: memberError.message, code: memberError.code },
        success: false
      }
    }
    
    // 招待ステータス更新
    await supabase
      .from('store_invitations')
      .update({ status: 'accepted' as const })
      .eq('id', invitation.id)
    
    console.log('✅ 招待受け入れ完了:', invitation.store_id)
    
    const response: AcceptInvitationResponse = {
      storeId: invitation.store_id,
      role: invitation.role as UserRole
    }
    
    return { data: response, error: null, success: true }
    
  } catch (err) {
    console.error('招待受け入れ例外:', err)
    return { 
      data: null, 
      error: { message: err instanceof Error ? err.message : '不明なエラー' },
      success: false
    }
  }
}

/**
 * 招待一覧取得
 */
export const getInvitations = async (
  storeId: string
): Promise<ApiResponse<StoreInvitation[]>> => {
  try {
    if (!storeId) {
      return { 
        data: [], 
        error: { message: '店舗IDが必要です' },
        success: false
      }
    }

    console.log('=== 招待一覧取得 ===')
    console.log('店舗ID:', storeId)
    
    const { data, error } = await supabase
      .from('store_invitations')
      .select(`
        id,
        store_id,
        email,
        role,
        token,
        expires_at,
        status,
        invited_by,
        created_at,
        updated_at,
        stores (
          id,
          name,
          owner_id
        )
      `)
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('招待一覧取得エラー:', error)
      return { 
        data: [], 
        error: { message: error.message, code: error.code },
        success: false
      }
    }
    
    const invitations = data as StoreInvitation[] || []
    
    console.log('✅ 招待一覧取得完了:', invitations.length + '件')
    return { data: invitations, error: null, success: true }
    
  } catch (err) {
    console.error('招待一覧取得例外:', err)
    return { 
      data: [], 
      error: { message: err instanceof Error ? err.message : '不明なエラー' },
      success: false
    }
  }
}

// ============================================
// Utility Functions
// ============================================

/**
 * ユーザーの店舗での権限を取得
 */
export const getUserRoleInStore = async (
  storeId: string,
  userId?: string
): Promise<ApiResponse<UserRole | null>> => {
  try {
    const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id
    
    if (!targetUserId) {
      return { 
        data: null, 
        error: { message: 'ユーザーが認証されていません' },
        success: false
      }
    }
    
    const { data, error } = await supabase
      .from('store_members')
      .select('role')
      .eq('store_id', storeId)
      .eq('user_id', targetUserId)
      .single()
    
    if (error) {
      return { 
        data: null, 
        error: { message: error.message, code: error.code },
        success: false
      }
    }
    
    return { data: data.role as UserRole, error: null, success: true }
    
  } catch (err) {
    return { 
      data: null, 
      error: { message: err instanceof Error ? err.message : '不明なエラー' },
      success: false
    }
  }
}

/**
 * 招待権限チェック
 */
export const canInviteUsers = async (storeId: string): Promise<boolean> => {
  const { data: role } = await getUserRoleInStore(storeId)
  return role === 'owner' || role === 'manager'
}