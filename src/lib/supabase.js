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
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('date', { ascending: false })
    
    if (error) throw error
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
    const { data, error } = await supabase
      .from('sales')
      .update({ ...saleData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
    
    if (error) throw error
    return data[0]
  },

  async delete(id) {
    const { error } = await supabase
      .from('sales')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  subscribeToChanges(callback) {
    return supabase
      .channel('sales')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, callback)
      .subscribe()
  }
}
