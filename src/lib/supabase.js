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

// RLS強制有効化とセキュリティ設定
if (typeof window !== 'undefined') {
  supabase.rpc('set_config', {
    setting_name: 'row_security',
    setting_value: 'on',
    is_local: false
  })
}

export const salesAPI = {
  // 後方互換性のため、引数なしの場合は既存ロジック
  async fetchAll(storeId = null) {
    // 現在のユーザーIDを取得
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('データ取得用のユーザー認証エラー:', userError)
      throw new Error('ユーザーが認証されていません。データを取得できません。')
    }

    console.log('=== ユーザー別データ取得開始 ===')
    console.log('ユーザーID:', user.id)
    console.log('店舗ID:', storeId)

    // 実証実験モードの判定（店舗IDが指定されていない場合）
    const pilotUsers = [
      '635c35fb-0159-4bb9-9ab8-8933eb04ee31',  // オーナー
      '56d64ad6-165a-4841-bfcd-a78329f322e5',  // スタッフ1
      '0aba16a3-531d-4f7a-a9a3-6ca29537d349'   // スタッフ2
    ]
    
    const isPilotMode = pilotUsers.includes(user.id) && !storeId
    
    let query = supabase.from('sales').select('*')
    
    if (storeId) {
      // 新しい店舗ベースモード
      console.log('📊 モード: 店舗ベース（招待制）')
      query = query.eq('store_id', storeId)
    } else if (!isPilotMode) {
      // 通常モード: 明示的なuser_idフィルター（RLSとの二重保護）
      console.log('📊 モード: 通常モード（個別分離）')
      query = query.eq('user_id', user.id)  // 🔑 明示的なユーザーフィルター
    } else {
      // 実証実験モード: RLSポリシーのみに依存（3人で共有）
      console.log('📊 モード: 実証実験モード（データ共有）')
    }
    
    const { data, error } = await query.order('date', { ascending: false })
    
    if (error) {
      console.error('データ取得エラー:', error)
      throw error
    }

    console.log(`✅ ユーザー ${user.id} のデータ ${data.length}件を取得しました`)
    
    // セキュリティチェック
    if (storeId) {
      // 店舗ベースモード: store_idが正しいことを確認
      const invalidData = data.filter(item => item.store_id !== storeId)
      if (invalidData.length > 0) {
        console.error('🚨 セキュリティエラー: 異なる店舗のデータが含まれています')
        console.error('無効データ:', invalidData)
        throw new Error('データ取得でセキュリティエラーが発生しました')
      }
    } else if (!isPilotMode) {
      // 通常モード: 自分のデータのみ許可
      const invalidData = data.filter(item => item.user_id !== user.id)
      if (invalidData.length > 0) {
        console.error('🚨 セキュリティエラー: 他ユーザーのデータが含まれています')
        console.error('無効データ:', invalidData)
        throw new Error('データ取得でセキュリティエラーが発生しました')
      }
    } else {
      // 実証実験モード: 3人のデータのみ許可（データのuser_idが3人のいずれかであれば OK）
      const invalidData = data.filter(item => !pilotUsers.includes(item.user_id))
      if (invalidData.length > 0) {
        console.error('🚨 セキュリティエラー: 実証実験参加者以外のデータが含まれています')
        console.error('無効データ:', invalidData)
        throw new Error('データ取得でセキュリティエラーが発生しました')
      }
      
      // 実証実験モード: 現在のユーザーが3人のいずれかであることを確認
      if (!pilotUsers.includes(user.id)) {
        console.error('🚨 セキュリティエラー: 実証実験参加者以外のアクセスです')
        throw new Error('実証実験参加者のみアクセス可能です')
      }
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

// ================================
// RLS動作不良診断・修正機能
// ================================

/**
 * RLS動作の詳細診断を実行
 * @returns {Promise<Object>} 詳細診断結果
 */
export const rlsDiagnostic = {
  /**
   * RLSポリシーの詳細確認
   */
  async checkPolicies() {
    try {
      console.log('=== RLSポリシー診断開始 ===')
      
      // 現在のユーザー認証状態確認
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) {
        return {
          success: false,
          policies: [],
          error: `認証エラー: ${userError.message}`
        }
      }
      
      // カスタムSQL実行でポリシー確認（pg_policiesは直接アクセス不可の場合があるため）
      const { data: policies, error: sqlError } = await supabase
        .rpc('get_table_policies', { table_name: 'sales' })
      
      if (sqlError) {
        console.warn('カスタム関数でのポリシー取得失敗、代替手段を試行')
        return {
          success: false,
          policies: [],
          error: `ポリシー取得エラー: ${sqlError.message}`,
          user: user ? { id: user.id, email: user.email } : null
        }
      }
      
      return {
        success: true,
        policies: policies || [],
        error: null,
        user: user ? { id: user.id, email: user.email } : null
      }
    } catch (err) {
      console.error('RLSポリシー確認エラー:', err)
      return {
        success: false,
        policies: [],
        error: err.message
      }
    }
  },

  /**
   * RLS有効状況確認
   */
  async checkRLSStatus() {
    try {
      console.log('=== RLS有効状況確認 ===')
      
      // 現在の認証ユーザー確認
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) {
        return {
          success: false,
          currentUser: null,
          error: userError.message
        }
      }
      
      return {
        success: true,
        currentUser: {
          id: user?.id || null,
          email: user?.email || null
        },
        error: null
      }
    } catch (err) {
      return {
        success: false,
        currentUser: null,
        error: err.message
      }
    }
  },

  /**
   * データアクセス比較テスト (明示的フィルター vs RLS)
   */
  async compareDataAccess() {
    try {
      console.log('=== データアクセス比較テスト開始 ===')
      
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        return {
          success: false,
          error: 'ユーザー認証失敗',
          explicitCount: 0,
          rlsCount: 0,
          isMatching: false
        }
      }
      
      // A. 明示的user_idフィルターでのデータ取得
      console.log('明示的フィルターテスト実行中...')
      const { data: explicitData, error: explicitError } = await supabase
        .from('sales')
        .select('id, user_id, date, total_sales')
        .eq('user_id', user.id)
      
      if (explicitError) {
        console.error('明示的フィルターエラー:', explicitError)
        return {
          success: false,
          error: `明示的フィルターエラー: ${explicitError.message}`,
          explicitCount: 0,
          rlsCount: 0,
          isMatching: false
        }
      }
      
      // B. RLSのみでのデータ取得
      console.log('RLSのみテスト実行中...')
      const { data: rlsData, error: rlsError } = await supabase
        .from('sales')
        .select('id, user_id, date, total_sales')
      
      if (rlsError) {
        console.error('RLSテストエラー:', rlsError)
        return {
          success: false,
          error: `RLSテストエラー: ${rlsError.message}`,
          explicitCount: explicitData?.length || 0,
          rlsCount: 0,
          isMatching: false
        }
      }
      
      const explicitCount = explicitData?.length || 0
      const rlsCount = rlsData?.length || 0
      const isMatching = explicitCount === rlsCount
      
      // C. user_id分布確認
      const rlsUserIds = Array.from(new Set(rlsData?.map(d => d.user_id).filter(Boolean) || []))
      const hasValidUserIds = rlsUserIds.length === 0 || (rlsUserIds.length === 1 && rlsUserIds[0] === user.id)
      
      console.log(`🚨 重要診断結果:`)
      console.log(`明示的フィルター: ${explicitCount}件`)
      console.log(`RLSのみ: ${rlsCount}件`)
      console.log(`一致状況: ${isMatching ? '✅ 正常' : '🚨 異常'}`)
      console.log(`user_ID分布: ${rlsUserIds.length}種類`, rlsUserIds)
      console.log(`user_ID妥当性: ${hasValidUserIds ? '✅ 正常' : '🚨 異常'}`)
      
      return {
        success: true,
        error: null,
        explicitCount,
        rlsCount,
        isMatching,
        rlsUserIds,
        hasValidUserIds,
        currentUserId: user.id,
        rawData: {
          explicit: explicitData,
          rls: rlsData
        }
      }
    } catch (err) {
      console.error('データアクセス比較テストエラー:', err)
      return {
        success: false,
        error: err.message,
        explicitCount: 0,
        rlsCount: 0,
        isMatching: false
      }
    }
  },

  /**
   * 包括的RLS診断実行
   */
  async runComprehensiveDiagnostic() {
    console.log('🚨=== RLS動作不良緊急診断開始 ===🚨')
    
    const results = {
      timestamp: new Date().toISOString(),
      policies: await this.checkPolicies(),
      rlsStatus: await this.checkRLSStatus(),
      dataAccess: await this.compareDataAccess()
    }
    
    // 総合判定
    const isRLSWorking = results.dataAccess.success && results.dataAccess.isMatching && results.dataAccess.hasValidUserIds
    const overallStatus = isRLSWorking ? '✅ RLS正常動作' : '🚨 RLS動作不良'
    
    results.overallStatus = overallStatus
    results.criticalIssues = []
    
    if (!results.dataAccess.isMatching) {
      results.criticalIssues.push(`データ件数不一致: 明示的${results.dataAccess.explicitCount}件 vs RLS${results.dataAccess.rlsCount}件`)
    }
    
    if (!results.dataAccess.hasValidUserIds) {
      results.criticalIssues.push(`不正user_ID検出: ${results.dataAccess.rlsUserIds?.length || 0}種類のuser_ID`)
    }
    
    console.log('🚨=== RLS診断結果 ===🚨')
    console.log('総合状況:', overallStatus)
    console.log('重大問題:', results.criticalIssues)
    console.log('詳細結果:', results)
    
    return results
  }
}
