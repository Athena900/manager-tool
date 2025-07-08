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
      console.log('=== AuthGuard チェック開始 ===')
      
      // セッション確認
      const { session, error: sessionError } = await authService.getCurrentSession()
      console.log('Current session:', session)
      console.log('Session error:', sessionError)
      
      // ユーザー確認
      const { user, error: userError } = await authService.getCurrentUser()
      console.log('Current user:', user)
      console.log('User error:', userError)
      
      if (sessionError || userError || !user || !session) {
        console.log('認証失敗 - ログインページにリダイレクト')
        console.log('Reasons:', { sessionError, userError, hasUser: !!user, hasSession: !!session })
        router.push('/login')
        return
      }

      // プロフィール確認
      console.log('=== プロフィール確認開始 ===')
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()

        console.log('プロフィール確認結果:', profile)
        console.log('プロフィールエラー:', profileError)

        if (!profile && profileError?.code !== 'PGRST116') {
          // PGRST116 = 行が見つからない（これは正常）
          console.error('プロフィール確認でエラー:', profileError)
        }

        if (!profile) {
          console.log('プロフィール未作成 - プロフィール設定ページにリダイレクト')
          router.push('/profile-setup')
          return
        }

        console.log('認証・プロフィール確認成功 - ユーザーアクセス許可')
        setUser(user)
      } catch (error) {
        console.error('プロフィール確認中の予期しないエラー:', error)
        // プロフィール確認でエラーが発生した場合はプロフィール設定に送る
        router.push('/profile-setup')
        return
      }

      setIsLoading(false)
    }

    checkAuthAndProfile()

    // 認証状態の変更を監視
    const { data: { subscription } } = authService.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change:', event, 'Session:', !!session)
        if (event === 'SIGNED_IN' && session) {
          console.log('サインイン検出 - ページリロードでプロフィール確認')
          // プロフィール確認のためにページをリロード
          window.location.reload()
        } else if (event === 'SIGNED_OUT' || !session) {
          console.log('サインアウト検出 - ログインページにリダイレクト')
          setUser(null)
          router.push('/login')
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return <div>認証エラー</div>
  }

  return <>{children}</>
}