'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Store, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function ProfileSetup() {
  const [storeName, setStoreName] = useState('')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [checking, setChecking] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkUserAndProfile = async () => {
      console.log('=== ProfileSetup: ユーザーとプロフィール確認開始 ===')
      
      try {
        // 現在のユーザーを取得
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError) {
          console.error('ユーザー取得エラー:', userError)
          router.push('/login')
          return
        }

        if (!user) {
          console.log('ユーザーが認証されていません - ログインページにリダイレクト')
          router.push('/login')
          return
        }

        console.log('認証済みユーザー:', user.email)
        setUser(user)

        // 既存のプロフィールをチェック
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()

        console.log('プロフィール確認結果:', profile)
        console.log('プロフィールエラー:', profileError)

        if (profile) {
          console.log('プロフィールが存在 - メインページにリダイレクト')
          router.push('/')
          return
        }

        console.log('プロフィール未作成 - 設定画面を表示')
        setChecking(false)
      } catch (error) {
        console.error('予期しないエラー:', error)
        router.push('/login')
      }
    }

    checkUserAndProfile()
  }, [router])

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!storeName.trim()) {
      alert('店舗名を入力してください。')
      return
    }

    console.log('=== プロフィール作成開始 ===')
    console.log('ユーザーID:', user?.id)
    console.log('店舗名:', storeName)

    setLoading(true)

    try {
      // プロフィール作成
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          store_name: storeName.trim()
        })
        .select()

      console.log('プロフィール作成結果:', data)
      console.log('プロフィール作成エラー:', error)

      if (error) {
        console.error('プロフィール作成エラー:', error)
        alert(`プロフィール作成に失敗しました: ${error.message}`)
        return
      }

      console.log('プロフィール作成成功!')
      console.log('作成されたプロフィール:', data[0])

      // 既存の売上データがある場合、user_idを関連付け
      console.log('既存売上データの関連付けを開始...')
      const { data: salesUpdateData, error: salesUpdateError } = await supabase
        .from('sales')
        .update({ user_id: user.id })
        .is('user_id', null)
        .select('id')

      if (salesUpdateError) {
        console.warn('既存売上データの関連付けでエラー:', salesUpdateError)
        // エラーがあっても続行（新規ユーザーの場合は既存データがないため）
      } else {
        const updatedCount = salesUpdateData?.length || 0
        console.log(`既存売上データの関連付け完了: ${updatedCount}件`)
      }

      console.log('プロフィール設定完了 - メインページにリダイレクト')
      
      // リダイレクト前に少し待機（データベース更新の確実な反映のため）
      setTimeout(() => {
        // 強制的にページをリロードしてAuthGuardの再評価をトリガー
        window.location.href = '/'
      }, 500)
    } catch (error) {
      console.error('予期しないプロフィール作成エラー:', error)
      alert('プロフィール作成中に予期しないエラーが発生しました。')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">プロフィール確認中...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // ユーザーがいない場合はリダイレクト処理中
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <Store className="mx-auto h-16 w-16 text-blue-600 mb-4" />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">店舗情報設定</h1>
            <p className="text-gray-600">
              バー売上管理システムへようこそ！<br />
              まず、あなたの店舗名を設定してください。
            </p>
          </div>

          <form onSubmit={handleCreateProfile} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                店舗名 *
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="例: Café Claude, Bar Tokyo"
                required
                disabled={loading}
              />
              <p className="mt-2 text-sm text-gray-500">
                後で設定画面から変更できます
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !storeName.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  設定中...
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  設定完了
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              ユーザー: {user.email}
            </p>
          </div>
        </div>

        <div className="mt-8 bg-blue-50 rounded-lg p-4">
          <h3 className="font-medium text-blue-800 mb-2">マルチテナント対応について</h3>
          <p className="text-sm text-blue-700">
            このシステムは複数の店舗で安全に使用できるように設計されています。
            あなたのデータは他の店舗から完全に分離されて管理されます。
          </p>
        </div>
      </div>
    </div>
  )
}