'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { UserPlus, CheckCircle, AlertCircle, Clock, Mail, Store } from 'lucide-react'
import { acceptInvitation } from '@/lib/stores'
import { supabase } from '@/lib/supabase'
import type { InvitePageState, StoreInvitation, UserRole } from '@/types'
import type { User } from '@supabase/auth-js'

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const [state, setState] = useState<InvitePageState>({
    loading: true,
    error: null,
    success: false,
    user: null,
    invitation: null
  })

  useEffect(() => {
    checkAuthAndProcessInvite()
  }, [])

  const checkAuthAndProcessInvite = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        // 未ログインの場合はログインページへリダイレクト
        const redirectUrl = `/invite/${params['token']}`
        router.push(`/login?redirect=${encodeURIComponent(redirectUrl)}`)
        return
      }
      
      setState(prev => ({ ...prev, user }))
      
      // 招待情報を取得して表示
      await getInvitationInfo(params['token'] as string)
      
    } catch (err) {
      console.error('認証確認エラー:', err)
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: '認証の確認に失敗しました' 
      }))
    }
  }

  const getInvitationInfo = async (token: string) => {
    try {
      // 招待情報を取得（acceptInvitation前に情報表示用）
      const { data, error } = await supabase
        .from('store_invitations')
        .select(`
          *,
          stores (
            name,
            owner_id
          )
        `)
        .eq('token', token)
        .eq('status', 'pending')
        .single()
      
      if (error || !data) {
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: '無効な招待リンクです' 
        }))
        return
      }
      
      // 期限チェック
      if (new Date(data.expires_at) < new Date()) {
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: '招待リンクの有効期限が切れています' 
        }))
        return
      }
      
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        invitation: data 
      }))
      
    } catch (err) {
      console.error('招待情報取得エラー:', err)
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: '招待情報の取得に失敗しました' 
      }))
    }
  }

  const handleAcceptInvitation = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const response = await acceptInvitation(params['token'] as string)
      
      if (!response.success || response.error) {
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: response.error?.message || '招待の受け入れに失敗しました' 
        }))
        return
      }
      
      setState(prev => ({ ...prev, loading: false, success: true }))
      
      // 成功後、店舗ページへリダイレクト
      setTimeout(() => {
        router.push(`/?store=${response.data?.storeId}`)
      }, 2000)
      
    } catch (err) {
      console.error('招待受け入れエラー:', err)
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: '招待の受け入れに失敗しました' 
      }))
    }
  }

  const getRoleDisplay = (role: UserRole) => {
    switch (role) {
      case 'owner': return 'オーナー'
      case 'manager': return 'マネージャー'
      case 'staff': return 'スタッフ'
      default: return role
    }
  }

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'owner': return 'text-blue-600 bg-blue-50'
      case 'manager': return 'text-green-600 bg-green-50'
      case 'staff': return 'text-gray-600 bg-gray-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            招待を処理中...
          </h1>
          <p className="text-gray-600">
            しばらくお待ちください
          </p>
        </div>
      </div>
    )
  }

  if (state.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              エラーが発生しました
            </h1>
            <p className="text-gray-600 mb-6">
              {state.error}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/')}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                ホームに戻る
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                再試行
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (state.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              招待を受け入れました
            </h1>
            <p className="text-gray-600 mb-6">
              {state.invitation?.store?.name} のメンバーになりました
            </p>
            <div className="w-full px-4 py-2 bg-green-50 text-green-700 rounded-lg">
              店舗ページに移動中...
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (state.invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-6">
            {/* ヘッダー */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-8 h-8 text-blue-600" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                店舗への招待
              </h1>
              <p className="text-gray-600">
                以下の店舗に招待されています
              </p>
            </div>

            {/* 招待詳細 */}
            <div className="space-y-4 mb-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Store className="w-5 h-5 text-gray-600" />
                  <div>
                    <div className="font-medium text-gray-900">
                      {state.invitation.store?.name}
                    </div>
                    <div className="text-sm text-gray-600">
                      店舗名
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 mb-3">
                  <Mail className="w-5 h-5 text-gray-600" />
                  <div>
                    <div className="font-medium text-gray-900">
                      {state.invitation.email}
                    </div>
                    <div className="text-sm text-gray-600">
                      招待先メールアドレス
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-5 h-5 flex items-center justify-center">
                    <span className={`
                      px-2 py-1 rounded-full text-xs font-medium
                      ${getRoleColor(state.invitation.role)}
                    `}>
                      {getRoleDisplay(state.invitation.role)}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">
                      付与される役割
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-600" />
                  <div>
                    <div className="font-medium text-gray-900">
                      {new Date(state.invitation.expires_at).toLocaleDateString('ja-JP')}
                    </div>
                    <div className="text-sm text-gray-600">
                      有効期限
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 現在のユーザー情報 */}
            <div className="p-3 bg-blue-50 rounded-lg mb-6">
              <div className="text-sm text-blue-800">
                <div className="font-medium">ログイン中:</div>
                <div>{state.user?.email}</div>
              </div>
            </div>

            {/* アクション */}
            <div className="space-y-3">
              <button
                onClick={handleAcceptInvitation}
                disabled={state.loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {state.loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    処理中...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    招待を受け入れる
                  </>
                )}
              </button>
              
              <button
                onClick={() => router.push('/')}
                className="w-full px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                キャンセル
              </button>
            </div>

            {/* システム情報 */}
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm text-green-800">
                🎉 招待を受け入れると、店舗の売上データにアクセスできます
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}