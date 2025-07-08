'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '@/lib/auth'
import { AuthUser } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function AuthGuard({ children, fallback }: AuthGuardProps): JSX.Element {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuthAndProfile = async () => {
      console.log('=== AuthGuard 認証確認開始 ===')
      
      try {
        // セッション確認（より詳細に）
        const { session, error: sessionError } = await authService.getCurrentSession()
        console.log('セッション確認:', session ? 'Present' : 'None')
        console.log('セッションエラー:', sessionError)
        console.log('セッション詳細:', session ? {
          userId: session.user.id,
          email: session.user.email,
          expiresAt: session.expires_at
        } : 'N/A')
        
        // ユーザー確認
        const { user, error: userError } = await authService.getCurrentUser()
        console.log('ユーザー確認:', user ? 'Present' : 'None')
        console.log('ユーザーエラー:', userError)
        console.log('ユーザー詳細:', user ? {
          id: user.id,
          email: user.email,
          emailConfirmed: user.email_confirmed_at
        } : 'N/A')
        
        // 認証状態の詳細検証
        if (sessionError || userError || !user || !session) {
          console.error('=== 認証失敗 ===')
          console.error('詳細:', {
            sessionError: sessionError?.message,
            userError: userError?.message,
            hasUser: !!user,
            hasSession: !!session,
            sessionValid: session && new Date(session.expires_at || 0) > new Date()
          })
          
          // クエリパラメータでエラー理由を伝達
          let errorReason = 'auth_failed'
          if (sessionError) errorReason = 'session_error'
          else if (userError) errorReason = 'user_error'
          else if (!user) errorReason = 'no_user'
          else if (!session) errorReason = 'no_session'
          
          router.push(`/login?error=${errorReason}`)
          return
        }

        console.log('=== プロフィール確認開始 ===')
        
        // プロフィール確認（より詳細なエラーハンドリング）
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()

        console.log('プロフィール確認結果:', profile ? 'Found' : 'Not found')
        console.log('プロフィールエラー:', profileError)
        console.log('プロフィール詳細:', profile ? {
          storeName: profile.store_name,
          createdAt: profile.created_at
        } : 'N/A')

        // プロフィールエラーの詳細処理
        if (profileError) {
          console.log('プロフィールエラーコード:', profileError.code)
          console.log('プロフィールエラーメッセージ:', profileError.message)
          
          if (profileError.code === 'PGRST116') {
            // Row not found - 正常（プロフィール未作成）
            console.log('プロフィール未作成（正常） - プロフィール設定ページにリダイレクト')
            router.push('/profile-setup')
            return
          } else {
            // その他のエラー
            console.error('プロフィール確認で予期しないエラー:', profileError)
            router.push(`/login?error=profile_check_failed&details=${encodeURIComponent(profileError.message)}`)
            return
          }
        }

        if (!profile) {
          console.log('プロフィールが見つかりません - プロフィール設定ページにリダイレクト')
          router.push('/profile-setup')
          return
        }

        console.log('=== 認証・プロフィール確認成功 ===')
        console.log('ユーザーアクセス許可:', {
          userId: user.id,
          storeName: profile.store_name
        })
        
        setUser(user)
        
      } catch (error) {
        console.error('=== AuthGuard 予期しないエラー ===')
        console.error('エラー詳細:', error)
        
        // 重篤なエラーの場合はログインページに戻す
        router.push(`/login?error=auth_guard_exception&details=${encodeURIComponent(
          error instanceof Error ? error.message : 'Unknown error'
        )}`)
        return
      }

      setIsLoading(false)
    }

    checkAuthAndProfile()

    // 認証状態の変更を監視
    const { data: { subscription } } = authService.onAuthStateChange(
      (event, session) => {
        console.log('=== Auth State Change ===')
        console.log('Event:', event)
        console.log('Session:', session ? 'Present' : 'None')
        
        if (event === 'SIGNED_IN' && session) {
          console.log('サインイン検出 - 認証確認を再実行')
          // ページリロードではなく状態確認を再実行
          setIsLoading(true)
          setUser(null)
          checkAuthAndProfile()
        } else if (event === 'SIGNED_OUT' || !session) {
          console.log('サインアウト検出 - ログインページにリダイレクト')
          setUser(null)
          setIsLoading(false)
          router.push('/login?event=signed_out')
        } else if (event === 'TOKEN_REFRESHED' && session) {
          console.log('トークン更新検出 - 継続中')
          // トークン更新時は何もしない（継続）
        }
      }
    )

    return () => {
      console.log('AuthGuard クリーンアップ')
      subscription.unsubscribe()
    }
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">認証状態を確認中...</p>
          <p className="mt-2 text-sm text-gray-500">少々お待ちください</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">認証中...</p>
          <p className="mt-2 text-sm text-gray-500">リダイレクト中です</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}