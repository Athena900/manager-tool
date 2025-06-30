import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
