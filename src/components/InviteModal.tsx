'use client'

import React, { useState } from 'react'
import { X, Mail, UserPlus, Copy, CheckCircle, AlertCircle } from 'lucide-react'
import { createInvitation } from '@/lib/stores'
import type { InviteModalProps, UserRole } from '@/types'

export default function InviteModal({ 
  storeId, 
  storeName, 
  onClose, 
  onSuccess 
}: InviteModalProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('staff')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await createInvitation(storeId, email, role)
      
      if (!response.success || response.error) {
        setError(response.error?.message || '招待の送信に失敗しました')
        return
      }
      
      if (response.data) {
        const generatedLink = `${window.location.origin}/invite/${response.data.token}`
        setInviteLink(generatedLink)
        onSuccess(generatedLink)
      }
      
    } catch (err) {
      console.error('招待作成エラー:', err)
      setError('招待の送信に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('コピーエラー:', err)
    }
  }

  const getRoleDisplay = (roleValue: string) => {
    switch (roleValue) {
      case 'manager': return 'マネージャー'
      case 'staff': return 'スタッフ'
      default: return roleValue
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                スタッフを招待
              </h2>
              <p className="text-sm text-gray-500">
                {storeName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {!inviteLink ? (
            /* 招待フォーム */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* メールアドレス */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  メールアドレス
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@example.com"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* 役割選択 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  役割
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`
                    flex items-center p-3 border rounded-lg cursor-pointer transition-colors
                    ${role === 'staff' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300 hover:bg-gray-50'
                    }
                  `}>
                    <input
                      type="radio"
                      value="staff"
                      checked={role === 'staff'}
                      onChange={(e) => setRole(e.target.value as UserRole)}
                      className="sr-only"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">スタッフ</div>
                      <div className="text-xs text-gray-500">
                        売上データの入力・閲覧
                      </div>
                    </div>
                  </label>
                  
                  <label className={`
                    flex items-center p-3 border rounded-lg cursor-pointer transition-colors
                    ${role === 'manager' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300 hover:bg-gray-50'
                    }
                  `}>
                    <input
                      type="radio"
                      value="manager"
                      checked={role === 'manager'}
                      onChange={(e) => setRole(e.target.value as UserRole)}
                      className="sr-only"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">マネージャー</div>
                      <div className="text-xs text-gray-500">
                        スタッフ管理＋招待権限
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* エラーメッセージ */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span className="text-sm text-red-700">{error}</span>
                  </div>
                </div>
              )}

              {/* ボタン */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  disabled={loading}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={loading || !email}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      招待中...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      招待する
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* 招待リンク表示 */
            <div className="space-y-4">
              {/* 成功メッセージ */}
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <div className="font-medium text-green-900">
                      招待リンクを作成しました
                    </div>
                    <div className="text-sm text-green-700">
                      {email} 宛の招待（{getRoleDisplay(role)}）
                    </div>
                  </div>
                </div>
              </div>

              {/* 招待リンク */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  招待リンク（7日間有効）
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inviteLink}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                  />
                  <button
                    onClick={copyToClipboard}
                    className={`
                      px-3 py-2 rounded-lg transition-colors flex items-center gap-2
                      ${copied 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm">コピー済み</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span className="text-sm">コピー</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 注意事項 */}
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="text-sm text-yellow-800">
                  <div className="font-medium mb-1">📝 招待の注意事項</div>
                  <ul className="text-xs space-y-1">
                    <li>• 招待リンクは7日間有効です</li>
                    <li>• 招待者がアカウントを作成してリンクをクリックしてください</li>
                    <li>• 同じメールアドレスには1回のみ招待可能です</li>
                  </ul>
                </div>
              </div>

              {/* 完了ボタン */}
              <div className="flex justify-end pt-4">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  完了
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 開発中メッセージ */}
        <div className="mx-6 mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="text-sm text-yellow-800">
            🚧 開発中: 実証実験終了後に利用可能になります
          </div>
        </div>
      </div>
    </div>
  )
}