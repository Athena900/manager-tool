import { supabase } from './supabase'

export interface UserProfile {
  id: string
  user_id: string
  store_name: string
  created_at: string
  updated_at: string
}

export class ProfileService {
  private static instance: ProfileService

  private constructor() {}

  static getInstance(): ProfileService {
    if (!ProfileService.instance) {
      ProfileService.instance = new ProfileService()
    }
    return ProfileService.instance
  }

  /**
   * 現在のユーザーのプロフィールを取得
   */
  async getCurrentProfile(): Promise<{ profile: UserProfile | null, error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { profile: null, error: 'ユーザーが認証されていません' }
      }

      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)

      if (error) {
        return { profile: null, error: error.message }
      }

      if (profiles && profiles.length > 0) {
        return { profile: profiles[0] as UserProfile, error: null }
      } else {
        return { profile: null, error: null } // プロフィールが存在しない（正常なケース）
      }
    } catch (error) {
      return { profile: null, error: 'プロフィール取得中に予期しないエラーが発生しました' }
    }
  }

  /**
   * プロフィールを作成（重複チェック付き）
   */
  async createProfile(storeName: string): Promise<{ profile: UserProfile | null, error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { profile: null, error: 'ユーザーが認証されていません' }
      }

      // 既存プロフィールの確認（重複防止）
      const { profile: existingProfile, error: checkError } = await this.getCurrentProfile()
      
      if (checkError && checkError !== 'ユーザーが認証されていません') {
        return { profile: null, error: `プロフィール確認エラー: ${checkError}` }
      }

      if (existingProfile) {
        console.log('Profile already exists, returning existing profile:', existingProfile)
        return { profile: existingProfile, error: null }
      }

      console.log('Creating new profile for user:', user.id, 'with store name:', storeName)
      
      // デバッグ: 現在の認証状態を確認
      const { data: { session } } = await supabase.auth.getSession()
      console.log('Current session:', session ? 'exists' : 'none')
      console.log('User email:', user.email)

      // 実証実験モード用の緊急回避措置
      const isEmergencyMode = false // 一時的に通常のINSERTのみを試行
      
      let data, error
      
      if (isEmergencyMode) {
        // RPC関数を使用してサーバーサイドで処理
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('create_user_profile', {
            p_user_id: user.id,
            p_store_name: storeName
          })
        
        if (rpcError) {
          console.log('RPC経由でのプロフィール作成失敗、通常の方法を試行')
          // 通常の方法にフォールバック
          const { data: insertData, error: insertError } = await supabase
            .from('profiles')
            .insert({
              user_id: user.id,
              store_name: storeName
            })
            .select()
          
          if (insertError) {
            data = null
            error = insertError
          } else if (insertData && insertData.length > 0) {
            data = insertData[0]
            error = null
          } else {
            data = null
            error = new Error('プロフィールの作成に失敗しました（フォールバック）')
          }
        } else {
          // RPC成功の場合、作成されたプロフィールを取得
          const { data: fetchData, error: fetchError } = await supabase
            .from('profiles')
            .select()
            .eq('user_id', user.id)
            .limit(1)
          
          if (fetchError) {
            data = null
            error = fetchError
          } else if (fetchData && fetchData.length > 0) {
            data = fetchData[0]
            error = null
          } else {
            data = null
            error = new Error('プロフィールが作成されましたが、取得に失敗しました')
          }
        }
      } else {
        // 通常のINSERT
        const { data: insertData, error: insertError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            store_name: storeName
          })
          .select()
        
        if (insertError) {
          data = null
          error = insertError
        } else if (insertData && insertData.length > 0) {
          data = insertData[0]
          error = null
        } else {
          data = null
          error = new Error('プロフィールの作成に失敗しました')
        }
      }

      if (error) {
        console.error('Profile creation error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
        
        if (error.code === '23505') {
          // 一意制約違反（重複）の場合
          console.log('Profile creation conflict, fetching existing profile')
          return await this.getCurrentProfile()
        }
        
        // RLSエラーの場合、より詳細な情報を提供
        if (error.message.includes('row-level security')) {
          return { 
            profile: null, 
            error: `プロフィール作成権限エラー: ${error.message}. データベース管理者に連絡してください。` 
          }
        }
        
        return { profile: null, error: error.message }
      }

      console.log('Profile created successfully:', data)

      // プロフィール作成後、既存のsalesデータを自動的に関連付け
      try {
        const { migrated } = await this.migrateExistingSalesData()
        if (migrated > 0) {
          console.log(`Migrated ${migrated} existing sales records to new profile`)
        }
      } catch (migrationError) {
        console.warn('Sales data migration failed, but profile created:', migrationError)
      }

      return { profile: data as UserProfile, error: null }
    } catch (error) {
      console.error('Unexpected error in createProfile:', error)
      return { profile: null, error: 'プロフィール作成中に予期しないエラーが発生しました' }
    }
  }

  /**
   * プロフィールを更新
   */
  async updateProfile(updates: Partial<Pick<UserProfile, 'store_name'>>): Promise<{ profile: UserProfile | null, error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { profile: null, error: 'ユーザーが認証されていません' }
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        return { profile: null, error: error.message }
      }

      return { profile: data as UserProfile, error: null }
    } catch (error) {
      return { profile: null, error: 'プロフィール更新中に予期しないエラーが発生しました' }
    }
  }

  /**
   * プロフィールが存在するかチェック
   */
  async hasProfile(): Promise<{ exists: boolean, error: string | null }> {
    try {
      const { profile, error } = await this.getCurrentProfile()
      
      if (error) {
        return { exists: false, error }
      }

      return { exists: !!profile, error: null }
    } catch (error) {
      return { exists: false, error: 'プロフィール確認中に予期しないエラーが発生しました' }
    }
  }

  /**
   * 既存の売上データを現在のユーザーに関連付け
   */
  async migrateExistingSalesData(): Promise<{ migrated: number, error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { migrated: 0, error: 'ユーザーが認証されていません' }
      }

      // user_idがNULLの売上データを現在のユーザーに関連付け
      const { data, error } = await supabase
        .from('sales')
        .update({ user_id: user.id })
        .is('user_id', null)
        .select('id')

      if (error) {
        return { migrated: 0, error: error.message }
      }

      return { migrated: data?.length || 0, error: null }
    } catch (error) {
      return { migrated: 0, error: '売上データ移行中に予期しないエラーが発生しました' }
    }
  }
}

// シングルトンインスタンス
export const profileService = ProfileService.getInstance()