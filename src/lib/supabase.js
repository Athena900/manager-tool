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
    const { data, error } = await supabase
      .from('sales')
      .insert([saleData])
      .select()
    
    if (error) throw error
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
