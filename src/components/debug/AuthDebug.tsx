'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { authService } from '@/lib/auth'

interface AuthDebugInfo {
  currentUser: {
    id: string | null
    email: string | null
    emailConfirmed: string | null
    lastSignIn: string | null
  } | null
  session: {
    expiresAt: string | null
    accessToken: string | null
    isValid: boolean
  } | null
  profile: {
    storeName: string | null
    createdAt: string | null
    exists: boolean
  } | null
  salesAccess: {
    dataCount: number
    userIds: string[]
    isIsolated: boolean
  }
  errors: string[]
  lastCheck: string
}

export default function AuthDebug() {
  const [debugInfo, setDebugInfo] = useState<AuthDebugInfo | null>(null)
  const [loading, setLoading] = useState(false)

  const runAuthDiagnostic = async () => {
    setLoading(true)
    const errors: string[] = []
    
    try {
      console.log('=== 認証診断開始 ===')
      
      // ユーザー情報取得
      const { user, error: userError } = await authService.getCurrentUser()
      
      if (userError) {
        errors.push(`ユーザー取得エラー: ${userError.message}`)
      }
      
      // セッション情報取得
      const { session, error: sessionError } = await authService.getCurrentSession()
      
      if (sessionError) {
        errors.push(`セッション取得エラー: ${sessionError.message}`)
      }
      
      // プロフィール確認
      let profile = null
      if (user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()
        
        if (profileError && profileError.code !== 'PGRST116') {
          errors.push(`プロフィール確認エラー: ${profileError.message}`)
        }
        
        profile = {
          storeName: profileData?.store_name || null,
          createdAt: profileData?.created_at || null,
          exists: !!profileData
        }
      }
      
      // 売上データアクセス確認
      let salesAccess = {
        dataCount: 0,
        userIds: [],
        isIsolated: true
      }
      
      if (user) {
        try {
          const { data: salesData, error: salesError } = await supabase
            .from('sales')
            .select('id, user_id')
            .limit(20)
          
          if (salesError) {
            errors.push(`売上データ取得エラー: ${salesError.message}`)
          } else {
            const userIds = Array.from(new Set(salesData?.map(d => d.user_id).filter(Boolean) || []))
            salesAccess = {
              dataCount: salesData?.length || 0,
              userIds,
              isIsolated: userIds.length <= 1 && (userIds.length === 0 || userIds[0] === user.id)
            }
            
            if (!salesAccess.isIsolated) {
              errors.push(`🚨 データ分離失敗: 複数のuser_idが検出されました`)
            }
          }
        } catch (salesErr) {
          errors.push(`売上データアクセス例外: ${salesErr}`)
        }
      }
      
      setDebugInfo({
        currentUser: user ? {
          id: user.id,
          email: user.email || null,
          emailConfirmed: user.email_confirmed_at || null,
          lastSignIn: user.last_sign_in_at || null
        } : null,
        session: session ? {
          expiresAt: session.expires_at || null,
          accessToken: session.access_token ? `${session.access_token.substring(0, 20)}...` : null,
          isValid: new Date(session.expires_at || 0) > new Date()
        } : null,
        profile,
        salesAccess,
        errors,
        lastCheck: new Date().toLocaleTimeString()
      })
      
      console.log('=== 認証診断完了 ===')
      
    } catch (error) {
      errors.push(`診断中の予期しないエラー: ${error instanceof Error ? error.message : 'Unknown error'}`)
      console.error('認証診断エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  const clearAllData = async () => {
    if (window.confirm('全ての認証データをクリアしますか？（ログアウトされます）')) {
      try {
        await authService.signOut()
        console.log('認証データをクリアしました')
        setDebugInfo(null)
      } catch (error) {
        console.error('データクリアエラー:', error)
      }
    }
  }

  useEffect(() => {
    runAuthDiagnostic()
  }, [])

  return (
    <div className="bg-yellow-50 p-6 rounded-lg mb-6 border border-yellow-200">
      <h3 className="text-lg font-semibold mb-4 text-yellow-800">
        🔍 認証状態デバッグツール
      </h3>
      
      <div className="flex gap-2 mb-4">
        <button
          onClick={runAuthDiagnostic}
          disabled={loading}
          className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 disabled:opacity-50"
        >
          {loading ? '診断中...' : '認証状態を診断'}
        </button>

        <button
          onClick={clearAllData}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          認証データクリア
        </button>
      </div>

      {debugInfo && (
        <div className="space-y-4">
          {/* エラー表示 */}
          {debugInfo.errors.length > 0 && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <h4 className="font-semibold mb-2">🚨 検出されたエラー</h4>
              <ul className="text-sm space-y-1">
                {debugInfo.errors.map((error, idx) => (
                  <li key={idx}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ユーザー情報 */}
            <div className="bg-white p-4 rounded border">
              <h4 className="font-semibold text-yellow-700 mb-2">ユーザー情報</h4>
              {debugInfo.currentUser ? (
                <div className="text-sm space-y-1">
                  <p><strong>ID:</strong> <code className="bg-gray-100 px-1 rounded text-xs">{debugInfo.currentUser.id}</code></p>
                  <p><strong>メール:</strong> {debugInfo.currentUser.email}</p>
                  <p><strong>確認済み:</strong> {debugInfo.currentUser.emailConfirmed ? '✅ Yes' : '❌ No'}</p>
                  <p><strong>最終ログイン:</strong> {debugInfo.currentUser.lastSignIn ? new Date(debugInfo.currentUser.lastSignIn).toLocaleString() : 'N/A'}</p>
                </div>
              ) : (
                <p className="text-red-600">ユーザー情報なし</p>
              )}
            </div>

            {/* セッション情報 */}
            <div className="bg-white p-4 rounded border">
              <h4 className="font-semibold text-yellow-700 mb-2">セッション情報</h4>
              {debugInfo.session ? (
                <div className="text-sm space-y-1">
                  <p><strong>有効期限:</strong> {debugInfo.session.expiresAt ? new Date(debugInfo.session.expiresAt).toLocaleString() : 'N/A'}</p>
                  <p><strong>状態:</strong> {debugInfo.session.isValid ? '✅ 有効' : '❌ 期限切れ'}</p>
                  <p><strong>トークン:</strong> <code className="bg-gray-100 px-1 rounded text-xs">{debugInfo.session.accessToken}</code></p>
                </div>
              ) : (
                <p className="text-red-600">セッション情報なし</p>
              )}
            </div>

            {/* プロフィール情報 */}
            <div className="bg-white p-4 rounded border">
              <h4 className="font-semibold text-yellow-700 mb-2">プロフィール情報</h4>
              {debugInfo.profile ? (
                <div className="text-sm space-y-1">
                  <p><strong>存在:</strong> {debugInfo.profile.exists ? '✅ あり' : '❌ なし'}</p>
                  <p><strong>店舗名:</strong> {debugInfo.profile.storeName || 'N/A'}</p>
                  <p><strong>作成日:</strong> {debugInfo.profile.createdAt ? new Date(debugInfo.profile.createdAt).toLocaleString() : 'N/A'}</p>
                </div>
              ) : (
                <p className="text-red-600">プロフィール確認不可</p>
              )}
            </div>

            {/* データアクセス状況 */}
            <div className="bg-white p-4 rounded border">
              <h4 className="font-semibold text-yellow-700 mb-2">データアクセス状況</h4>
              <div className="text-sm space-y-1">
                <p><strong>売上データ件数:</strong> {debugInfo.salesAccess.dataCount}件</p>
                <p><strong>含まれるuser_id:</strong> {debugInfo.salesAccess.userIds.length}種類</p>
                <p><strong>データ分離:</strong> {debugInfo.salesAccess.isIsolated ? '✅ 正常' : '🚨 異常'}</p>
                {debugInfo.salesAccess.userIds.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium">user_id一覧:</p>
                    {debugInfo.salesAccess.userIds.map((id, idx) => (
                      <p key={idx} className="text-xs">
                        <code className="bg-gray-100 px-1 rounded">{id.substring(0, 8)}...</code>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded border">
            <h4 className="font-semibold text-yellow-700 mb-2">診断結果サマリー</h4>
            <div className="text-sm">
              <p><strong>最終確認:</strong> {debugInfo.lastCheck}</p>
              <p><strong>総合状態:</strong> {
                debugInfo.errors.length === 0 ? 
                <span className="text-green-600 font-medium">✅ 正常</span> : 
                <span className="text-red-600 font-medium">🚨 問題あり ({debugInfo.errors.length}件)</span>
              }</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}