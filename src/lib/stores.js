import { supabase } from './supabase'

// ============================================
// 店舗管理API
// ============================================

/**
 * 店舗作成
 * @param {string} name - 店舗名
 * @returns {Promise<{data: Object, error: Object}>}
 */
export const createStore = async (name) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { data: null, error: { message: 'ユーザーが認証されていません' } }
    }

    console.log('=== 店舗作成開始 ===')
    console.log('店舗名:', name)
    console.log('オーナーID:', user.id)
    
    // 店舗作成
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .insert([{ name, owner_id: user.id }])
      .select()
      .single()
    
    if (storeError) {
      console.error('店舗作成エラー:', storeError)
      return { data: null, error: storeError }
    }
    
    // オーナーをメンバーとして追加
    const { error: memberError } = await supabase
      .from('store_members')
      .insert([{ 
        store_id: store.id, 
        user_id: user.id, 
        role: 'owner' 
      }])
    
    if (memberError) {
      console.error('メンバー追加エラー:', memberError)
      // 店舗作成は成功したが、メンバー追加に失敗した場合のロールバック
      await supabase.from('stores').delete().eq('id', store.id)
      return { data: null, error: memberError }
    }
    
    console.log('✅ 店舗作成完了:', store.id)
    return { data: store, error: null }
    
  } catch (err) {
    console.error('店舗作成例外:', err)
    return { data: null, error: { message: err.message } }
  }
}

/**
 * ユーザーの参加店舗一覧取得
 * @returns {Promise<{data: Array, error: Object}>}
 */
export const getUserStores = async () => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { data: [], error: { message: 'ユーザーが認証されていません' } }
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
          created_at
        )
      `)
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false })
    
    if (error) {
      console.error('店舗一覧取得エラー:', error)
      return { data: [], error }
    }
    
    const stores = data?.map(item => ({
      ...item.stores,
      user_role: item.role,
      joined_at: item.joined_at
    })) || []
    
    console.log('✅ 店舗一覧取得完了:', stores.length + '件')
    return { data: stores, error: null }
    
  } catch (err) {
    console.error('店舗一覧取得例外:', err)
    return { data: [], error: { message: err.message } }
  }
}

/**
 * 店舗メンバー一覧取得
 * @param {string} storeId - 店舗ID
 * @returns {Promise<{data: Array, error: Object}>}
 */
export const getStoreMembers = async (storeId) => {
  try {
    if (!storeId) {
      return { data: [], error: { message: '店舗IDが必要です' } }
    }

    console.log('=== 店舗メンバー一覧取得 ===')
    console.log('店舗ID:', storeId)
    
    const { data, error } = await supabase
      .from('store_members')
      .select(`
        id,
        role,
        joined_at,
        auth.users (
          id,
          email
        )
      `)
      .eq('store_id', storeId)
      .order('joined_at', { ascending: true })
    
    if (error) {
      console.error('メンバー一覧取得エラー:', error)
      return { data: [], error }
    }
    
    const members = data?.map(item => ({
      id: item.id,
      user_id: item.auth?.users?.id,
      email: item.auth?.users?.email,
      role: item.role,
      joined_at: item.joined_at
    })) || []
    
    console.log('✅ メンバー一覧取得完了:', members.length + '件')
    return { data: members, error: null }
    
  } catch (err) {
    console.error('メンバー一覧取得例外:', err)
    return { data: [], error: { message: err.message } }
  }
}

// ============================================
// 招待管理API
// ============================================

/**
 * 招待作成
 * @param {string} storeId - 店舗ID
 * @param {string} email - 招待するメールアドレス
 * @param {string} role - 役割（staff/manager）
 * @returns {Promise<{data: Object, error: Object}>}
 */
export const createInvitation = async (storeId, email, role = 'staff') => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { data: null, error: { message: 'ユーザーが認証されていません' } }
    }

    // 招待権限チェック（オーナーまたはマネージャーのみ）
    const { data: membership, error: membershipError } = await supabase
      .from('store_members')
      .select('role')
      .eq('store_id', storeId)
      .eq('user_id', user.id)
      .single()
    
    if (membershipError || !membership) {
      return { data: null, error: { message: 'この店舗への招待権限がありません' } }
    }
    
    if (membership.role !== 'owner' && membership.role !== 'manager') {
      return { data: null, error: { message: '招待権限がありません（オーナーまたはマネージャーのみ）' } }
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
      return { data: null, error: { message: 'このメールアドレスには既に招待を送信済みです' } }
    }
    
    // 招待トークン生成
    const token = crypto.randomUUID()
    
    const { data: invitation, error: inviteError } = await supabase
      .from('store_invitations')
      .insert([{
        store_id: storeId,
        email,
        role,
        token,
        inviter_id: user.id
      }])
      .select()
      .single()
    
    if (inviteError) {
      console.error('招待作成エラー:', inviteError)
      return { data: null, error: inviteError }
    }
    
    console.log('✅ 招待作成完了:', invitation.id)
    return { data: invitation, error: null }
    
  } catch (err) {
    console.error('招待作成例外:', err)
    return { data: null, error: { message: err.message } }
  }
}

/**
 * 招待受け入れ
 * @param {string} token - 招待トークン
 * @returns {Promise<{data: string, error: Object}>}
 */
export const acceptInvitation = async (token) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { data: null, error: { message: 'ユーザーが認証されていません' } }
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
      return { data: null, error: { message: '無効な招待リンクです' } }
    }
    
    // 期限チェック
    if (new Date(invitation.expires_at) < new Date()) {
      return { data: null, error: { message: '招待リンクの有効期限が切れています' } }
    }
    
    // 重複チェック
    const { data: existingMember } = await supabase
      .from('store_members')
      .select('id')
      .eq('store_id', invitation.store_id)
      .eq('user_id', user.id)
      .single()
    
    if (existingMember) {
      return { data: null, error: { message: '既にこの店舗のメンバーです' } }
    }
    
    // メンバー追加
    const { error: memberError } = await supabase
      .from('store_members')
      .insert([{
        store_id: invitation.store_id,
        user_id: user.id,
        role: invitation.role
      }])
    
    if (memberError) {
      console.error('メンバー追加エラー:', memberError)
      return { data: null, error: memberError }
    }
    
    // 招待ステータス更新
    await supabase
      .from('store_invitations')
      .update({ status: 'accepted' })
      .eq('id', invitation.id)
    
    console.log('✅ 招待受け入れ完了:', invitation.store_id)
    return { data: invitation.store_id, error: null }
    
  } catch (err) {
    console.error('招待受け入れ例外:', err)
    return { data: null, error: { message: err.message } }
  }
}

/**
 * 招待一覧取得
 * @param {string} storeId - 店舗ID
 * @returns {Promise<{data: Array, error: Object}>}
 */
export const getInvitations = async (storeId) => {
  try {
    if (!storeId) {
      return { data: [], error: { message: '店舗IDが必要です' } }
    }

    console.log('=== 招待一覧取得 ===')
    console.log('店舗ID:', storeId)
    
    const { data, error } = await supabase
      .from('store_invitations')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('招待一覧取得エラー:', error)
      return { data: [], error }
    }
    
    console.log('✅ 招待一覧取得完了:', data?.length || 0, '件')
    return { data: data || [], error: null }
    
  } catch (err) {
    console.error('招待一覧取得例外:', err)
    return { data: [], error: { message: err.message } }
  }
}