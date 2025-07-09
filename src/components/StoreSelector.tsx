'use client'

import React, { useState, useEffect } from 'react'
import { ChevronDown, Store, Users, Calendar } from 'lucide-react'
import { getUserStores } from '@/lib/stores'
import type { StoreWithRole, StoreSelectorProps } from '@/types'

export default function StoreSelector({ 
  currentStoreId, 
  onStoreChange, 
  disabled = false 
}: StoreSelectorProps) {
  const [stores, setStores] = useState<StoreWithRole[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    loadStores()
  }, [])

  const loadStores = async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await getUserStores()
      
      if (!response.success || response.error) {
        setError('店舗一覧の取得に失敗しました')
        console.error('店舗一覧取得エラー:', response.error)
        return
      }
      
      setStores(response.data || [])
      
      // 店舗が1つだけの場合は自動選択
      if (response.data?.length === 1 && !currentStoreId && response.data[0]) {
        onStoreChange(response.data[0].id)
      }
      
    } catch (err) {
      console.error('店舗一覧取得例外:', err)
      setError('店舗一覧の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const currentStore = stores.find(store => store.id === currentStoreId)

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'owner': return 'オーナー'
      case 'manager': return 'マネージャー'
      case 'staff': return 'スタッフ'
      default: return role
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'text-blue-600 bg-blue-50'
      case 'manager': return 'text-green-600 bg-green-50'
      case 'staff': return 'text-gray-600 bg-gray-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  if (loading) {
    return (
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          店舗選択
        </label>
        <div className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 animate-pulse">
          <div className="h-5 bg-gray-300 rounded w-1/3"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          店舗選択
        </label>
        <div className="w-full p-3 border border-red-300 rounded-lg bg-red-50 text-red-700">
          <div className="flex items-center gap-2">
            <span className="text-sm">⚠️ {error}</span>
            <button
              onClick={loadStores}
              className="text-sm text-red-600 hover:text-red-800 underline"
            >
              再試行
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (stores.length === 0) {
    return (
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          店舗選択
        </label>
        <div className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4" />
            <span className="text-sm">参加している店舗がありません</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-6 relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        店舗選択
      </label>
      
      <div className="relative">
        <button
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`
            w-full p-3 border rounded-lg text-left transition-colors
            ${disabled 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            }
            ${isOpen ? 'border-blue-500' : 'border-gray-300'}
          `}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Store className="w-5 h-5 text-gray-400" />
              <div>
                {currentStore ? (
                  <div>
                    <div className="font-medium text-gray-900">
                      {currentStore.name}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`
                        px-2 py-1 rounded-full text-xs font-medium
                        ${getRoleColor(currentStore.user_role)}
                      `}>
                        {getRoleDisplay(currentStore.user_role)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {stores.length}店舗中
                      </span>
                    </div>
                  </div>
                ) : (
                  <span className="text-gray-500">店舗を選択してください</span>
                )}
              </div>
            </div>
            <ChevronDown className={`
              w-5 h-5 text-gray-400 transition-transform
              ${isOpen ? 'transform rotate-180' : ''}
            `} />
          </div>
        </button>

        {isOpen && !disabled && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
            <div className="p-2">
              {stores.map((store) => (
                <button
                  key={store.id}
                  onClick={() => {
                    onStoreChange(store.id)
                    setIsOpen(false)
                  }}
                  className={`
                    w-full p-3 rounded-lg text-left transition-colors
                    ${currentStoreId === store.id 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'hover:bg-gray-50'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <Store className="w-4 h-4 text-gray-400" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {store.name}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`
                          px-2 py-1 rounded-full text-xs font-medium
                          ${getRoleColor(store.user_role)}
                        `}>
                          {getRoleDisplay(store.user_role)}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(store.joined_at).toLocaleDateString('ja-JP')}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 店舗情報サマリー */}
      {currentStore && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>参加中</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>
                {new Date(currentStore.joined_at).toLocaleDateString('ja-JP')}より
              </span>
            </div>
          </div>
        </div>
      )}

      {/* システム情報 */}
      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
        💼 店舗ベース売上管理システム
      </div>
    </div>
  )
}