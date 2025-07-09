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
      const redirectUrl = `${typeof window !== 'undefined' ? window.location.origin : process.env['NEXT_PUBLIC_SITE_URL'] || 'https://manager-tool.vercel.app'}/auth/callback`
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
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
      console.log('=== AuthService signIn 開始 ===')
      console.log('Email:', email)
      console.log('Password provided:', !!password)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      console.log('=== Supabase signInWithPassword 応答 ===')
      console.log('Data:', data)
      console.log('Error:', error)
      console.log('User exists:', !!data?.user)
      console.log('Session exists:', !!data?.session)
      console.log('User email confirmed:', data?.user?.email_confirmed_at)

      if (error) {
        console.error('Supabase認証エラー:', {
          message: error.message,
          status: error.status,
          name: error.name
        })
        return { 
          user: null, 
          session: null, 
          error: `認証エラー: ${error.message}` 
        }
      }

      if (!data.user) {
        console.error('ユーザーデータが存在しません')
        return {
          user: null,
          session: null,
          error: 'ユーザー情報を取得できませんでした。'
        }
      }

      if (!data.session) {
        console.error('セッションが作成されませんでした')
        return {
          user: null,
          session: null,
          error: 'セッションを作成できませんでした。'
        }
      }

      console.log('認証成功 - ユーザーとセッションを返却')
      return { 
        user: data.user as AuthUser, 
        session: data.session, 
        error: null 
      }
    } catch (error) {
      console.error('予期しない認証エラー:', error)
      return { 
        user: null, 
        session: null, 
        error: '予期しないエラーが発生しました。しばらくしてからお試しください。' 
      }
    }
  }

  /**
   * ログアウト
   */
  async signOut() {
    try {
      console.log('=== AuthService signOut 開始 ===')
      
      const { error } = await supabase.auth.signOut()
      
      console.log('=== Supabase signOut 応答 ===')
      console.log('Error:', error)
      
      if (error) {
        console.error('Supabase ログアウトエラー:', error)
        return { error: error.message }
      }

      console.log('Supabase ログアウト成功')
      return { error: null }
    } catch (error) {
      console.error('予期しないログアウトエラー:', error)
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
        redirectTo: `${typeof window !== 'undefined' ? window.location.origin : process.env['NEXT_PUBLIC_SITE_URL'] || 'https://manager-tool.vercel.app'}/auth/callback`
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