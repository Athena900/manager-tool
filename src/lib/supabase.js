import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// 開発時の警告：適切なSupabase URLが設定されていない場合
if (!supabaseUrl || supabaseUrl === 'your_supabase_url') {
  console.warn('⚠️ 適切なSupabase URLが設定されていません。実際のSupabase URLを .env.local に設定してください。')
}

if (!supabaseAnonKey || supabaseAnonKey === 'your_supabase_anon_key') {
  console.warn('⚠️ 適切なSupabase Anon Keyが設定されていません。実際のSupabase Anon Keyを .env.local に設定してください。')
}

// 開発時用のダミー値（実際の運用では必ず適切な値に変更）
const defaultUrl = 'https://dummy.supabase.co'
const defaultKey = 'dummy_key'

export const supabase = createClient(
  supabaseUrl || defaultUrl,
  supabaseAnonKey || defaultKey,
  {
    auth: {
      redirectTo: process.env.NEXT_PUBLIC_SITE_URL || 'https://manager-tool.vercel.app/auth/callback'
    }
  }
)

export const salesAPI = {
  async fetchAll() {
    // 現在のユーザーIDを取得
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('データ取得用のユーザー認証エラー:', userError)
      throw new Error('ユーザーが認証されていません。データを取得できません。')
    }

    console.log('=== ユーザー別データ取得開始 ===')
    console.log('ユーザーID:', user.id)

    // 明示的なuser_idフィルター（RLSとの二重保護）
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('user_id', user.id)  // 🔑 明示的なユーザーフィルター
      .order('date', { ascending: false })
    
    if (error) {
      console.error('データ取得エラー:', error)
      throw error
    }

    console.log(`✅ ユーザー ${user.id} のデータ ${data.length}件を取得しました`)
    
    // セキュリティチェック: 全データのuser_idを確認
    const invalidData = data.filter(item => item.user_id !== user.id)
    if (invalidData.length > 0) {
      console.error('🚨 セキュリティエラー: 他ユーザーのデータが含まれています')
      console.error('無効データ:', invalidData)
      throw new Error('データ取得でセキュリティエラーが発生しました')
    }
    
    return data || []
  },

  async create(saleData) {
    // 現在のユーザーIDを取得して自動的に追加
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('User authentication error:', userError)
      throw new Error('ユーザーが認証されていません。ログインし直してください。')
    }
    
    if (!user.id) {
      console.error('User ID is missing')
      throw new Error('ユーザーIDが取得できません。ログインし直してください。')
    }
    
    const dataWithUserId = {
      ...saleData,
      user_id: user.id  // マルチテナント対応のためのuser_id自動設定（必須）
    }
    
    console.log('=== salesAPI.create ===')
    console.log('Current user ID:', user.id)
    console.log('Original data:', saleData)
    console.log('Data with user_id:', dataWithUserId)
    
    const { data, error } = await supabase
      .from('sales')
      .insert([dataWithUserId])
      .select()
    
    if (error) {
      console.error('Sales data creation error:', error)
      if (error.code === 'PGRST301') {
        throw new Error('データの作成権限がありません。管理者に連絡してください。')
      }
      throw new Error(`売上データの作成に失敗しました: ${error.message}`)
    }
    
    if (!data || data.length === 0) {
      throw new Error('売上データが正常に作成されませんでした。')
    }
    
    console.log('Created sales data successfully:', data[0])
    return data[0]
  },

  async update(id, saleData) {
    // 現在のユーザーIDを取得
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('データ更新用のユーザー認証エラー:', userError)
      throw new Error('ユーザーが認証されていません。データを更新できません。')
    }

    console.log('=== データ更新開始 ===')
    console.log('ユーザーID:', user.id, 'データID:', id)

    // user_idフィルターを追加して、自分のデータのみ更新可能にする
    const { data, error } = await supabase
      .from('sales')
      .update({ ...saleData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)  // 🔑 ユーザー認証済みデータのみ更新
      .select()
    
    if (error) {
      console.error('データ更新エラー:', error)
      throw error
    }

    if (!data || data.length === 0) {
      console.error('更新対象データが見つかりません:', id)
      throw new Error('更新権限がないか、データが存在しません')
    }

    console.log(`✅ ユーザー ${user.id} のデータ ${id} を更新しました`)
    return data[0]
  },

  async delete(id) {
    // 現在のユーザーIDを取得
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('データ削除用のユーザー認証エラー:', userError)
      throw new Error('ユーザーが認証されていません。データを削除できません。')
    }

    console.log('=== データ削除開始 ===')
    console.log('ユーザーID:', user.id, 'データID:', id)

    // user_idフィルターを追加して、自分のデータのみ削除可能にする
    const { error } = await supabase
      .from('sales')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)  // 🔑 ユーザー認証済みデータのみ削除
    
    if (error) {
      console.error('データ削除エラー:', error)
      throw error
    }

    console.log(`✅ ユーザー ${user.id} のデータ ${id} を削除しました`)
  },

  async subscribeToChanges(callback) {
    // 現在のユーザーIDを取得
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('リアルタイム同期用のユーザー認証エラー:', userError)
      throw new Error('ユーザーが認証されていません。リアルタイム同期を開始できません。')
    }

    console.log('=== ユーザー別リアルタイム同期開始 ===')
    console.log('ユーザーID:', user.id)

    // ユーザー固有のチャンネル名を作成
    const channelName = `sales-changes-${user.id}`
    
    return supabase
      .channel(channelName)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'sales',
        filter: `user_id=eq.${user.id}`  // 🔑 ユーザー別フィルター追加
      }, (payload) => {
        console.log('=== ユーザー固有のリアルタイム更新 ===')
        console.log('ユーザーID:', user.id)
        console.log('イベント:', payload.eventType)
        console.log('データ:', payload.new || payload.old)
        
        // データのuser_idを確認（セキュリティチェック）
        const dataUserId = payload.new?.user_id || payload.old?.user_id
        if (dataUserId && dataUserId !== user.id) {
          console.error('🚨 セキュリティエラー: 他ユーザーのデータが配信されました')
          console.error('期待:', user.id, '実際:', dataUserId)
          return // コールバックを実行しない
        }
        
        callback(payload)
      })
      .subscribe((status) => {
        console.log('リアルタイム同期ステータス:', status)
        if (status === 'SUBSCRIBED') {
          console.log(`✅ ユーザー ${user.id} のリアルタイム同期が開始されました`)
        }
      })
  },

  // 全てのリアルタイム同期を停止
  unsubscribeAll() {
    const channels = supabase.getChannels()
    console.log('=== リアルタイム同期停止 ===')
    console.log('停止対象チャンネル数:', channels.length)
    
    channels.forEach(channel => {
      console.log('チャンネル停止:', channel.topic)
      supabase.removeChannel(channel)
    })
    
    console.log('✅ 全てのリアルタイム同期を停止しました')
  }
}
