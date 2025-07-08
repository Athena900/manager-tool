import { supabase } from './supabase'
import { User, Session } from '@supabase/supabase-js'

export interface AuthUser {
  id: string
  email: string
  user_metadata: {
    full_name?: string
    store_name?: string
    subscription_plan?: 'starter' | 'standard' | 'enterprise'
  }
  created_at: string
}

export interface AuthState {
  user: AuthUser | null
  session: Session | null
  loading: boolean
  error: string | null
}

export class AuthService {
  private static instance: AuthService
  
  private constructor() {}
  
  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }

  /**
   * 新規ユーザー登録
   */
  async signUp(email: string, password: string, metadata: { full_name: string, store_name: string }) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: metadata.full_name,
            store_name: metadata.store_name,
            subscription_plan: 'starter'
          }
        }
      })

      if (error) {
        return { user: null, session: null, error: error.message }
      }

      return { 
        user: data.user as AuthUser, 
        session: data.session, 
        error: null 
      }
    } catch (error) {
      return { 
        user: null, 
        session: null, 
        error: '登録に失敗しました。しばらくしてからお試しください。' 
      }
    }
  }

  /**
   * ログイン
   */
  async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        return { 
          user: null, 
          session: null, 
          error: 'メールアドレスまたはパスワードが間違っています。' 
        }
      }

      return { 
        user: data.user as AuthUser, 
        session: data.session, 
        error: null 
      }
    } catch (error) {
      return { 
        user: null, 
        session: null, 
        error: 'ログインに失敗しました。しばらくしてからお試しください。' 
      }
    }
  }

  /**
   * ログアウト
   */
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        return { error: error.message }
      }

      return { error: null }
    } catch (error) {
      return { error: 'ログアウトに失敗しました。' }
    }
  }

  /**
   * 現在のセッション取得
   */
  async getCurrentSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        return { session: null, error: error.message }
      }

      return { session, error: null }
    } catch (error) {
      return { session: null, error: 'セッションの取得に失敗しました。' }
    }
  }

  /**
   * 現在のユーザー取得
   */
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) {
        return { user: null, error: error.message }
      }

      return { user: user as AuthUser, error: null }
    } catch (error) {
      return { user: null, error: 'ユーザー情報の取得に失敗しました。' }
    }
  }

  /**
   * 認証状態変更の監視
   */
  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session)
    })
  }

  /**
   * パスワードリセット
   */
  async resetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL || 'https://manager-tool.vercel.app'}/auth/callback`
      })

      if (error) {
        return { error: error.message }
      }

      return { error: null }
    } catch (error) {
      return { error: 'パスワードリセットに失敗しました。' }
    }
  }

  /**
   * メールアドレス変更
   */
  async updateEmail(newEmail: string) {
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail
      })

      if (error) {
        return { error: error.message }
      }

      return { error: null }
    } catch (error) {
      return { error: 'メールアドレスの変更に失敗しました。' }
    }
  }

  /**
   * パスワード変更
   */
  async updatePassword(newPassword: string) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        return { error: error.message }
      }

      return { error: null }
    } catch (error) {
      return { error: 'パスワードの変更に失敗しました。' }
    }
  }

  /**
   * ユーザーメタデータ更新
   */
  async updateUserMetadata(metadata: { full_name?: string, store_name?: string }) {
    try {
      const { error } = await supabase.auth.updateUser({
        data: metadata
      })

      if (error) {
        return { error: error.message }
      }

      return { error: null }
    } catch (error) {
      return { error: 'ユーザー情報の更新に失敗しました。' }
    }
  }
}

// シングルトンインスタンス
export const authService = AuthService.getInstance()