'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Lock, LogOut } from 'lucide-react'
import { supabase, salesAPI } from '../lib/supabase'

interface Sale {
  id: string
  date: string
  day_of_week: string
  group_count: number
  total_sales: number
  created_at?: string
  updated_at?: string
}

export default function BarSalesManager() {
  const [sales, setSales] = useState<Sale[]>([])
  const [showForm, setShowForm] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loginData, setLoginData] = useState({ password: '' })
  const [isLoading, setIsLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    groupCount: '',
    totalSales: ''
  })

  const SIMPLE_PASSWORD = 'BarSales2024'

  useEffect(() => {
    if (!isAuthenticated) return
    loadSales()
  }, [isAuthenticated])

  const loadSales = async () => {
    setIsLoading(true)
    try {
      const salesData = await salesAPI.fetchAll()
      setSales(salesData)
    } catch (error) {
      console.error('データの読み込みに失敗:', error)
    }
    setIsLoading(false)
  }

  const handleLogin = () => {
    if (loginData.password === SIMPLE_PASSWORD) {
      setIsAuthenticated(true)
    } else {
      alert('パスワードが間違っています。')
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setLoginData({ password: '' })
  }

  const getDayOfWeek = (date: string) => {
    return new Date(date).toLocaleDateString('ja-JP', { weekday: 'long' })
  }

  const handleSubmit = async () => {
    if (!formData.groupCount || !formData.totalSales) {
      alert('組数と売上金額は必須項目です')
      return
    }

    setIsLoading(true)
    const saleData = {
      date: formData.date,
      day_of_week: getDayOfWeek(formData.date),
      group_count: parseInt(formData.groupCount),
      total_sales: parseFloat(formData.totalSales)
    }

    try {
      await salesAPI.create(saleData)
      await loadSales()
    } catch (error) {
      console.error('データの保存に失敗:', error)
      alert('データの保存に失敗しました。')
    }

    setFormData({
      date: new Date().toISOString().split('T')[0],
      groupCount: '',
      totalSales: ''
    })
    setShowForm(false)
    setIsLoading(false)
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <Lock className="mx-auto h-12 w-12 text-blue-600 mb-4" />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">バー売上管理システム</h1>
            <p className="text-gray-600">🚀 Supabase リアルタイム同期</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">パスワード</label>
              <input
                type="password"
                value={loginData.password}
                onChange={(e) => setLoginData({password: e.target.value})}
                className="w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 border border-gray-300"
                placeholder="パスワードを入力"
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            
            <button
              onClick={handleLogin}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-md transition-colors"
            >
              ログイン
            </button>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-md">
            <p className="text-xs text-gray-600 text-center">💡 パスワード: BarSales2024</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">バー売上管理ツール</h1>
              <p className="text-gray-600 mt-2">🚀 Supabase リアルタイム同期</p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
                disabled={isLoading}
              >
                <Plus size={20} />
                売上を追加
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-lg transition-colors"
                title="ログアウト"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">売上履歴</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日付</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">曜日</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">組数</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">売上</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                      {new Date(sale.date).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{sale.day_of_week}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{sale.group_count}組</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      ¥{sale.total_sales.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sales.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                まだ売上データがありません。「売上を追加」ボタンから入力を始めましょう。
              </div>
            )}
          </div>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">売上データを追加</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">日付</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 border border-gray-300"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">組数</label>
                  <input
                    type="number"
                    value={formData.groupCount}
                    onChange={(e) => setFormData({...formData, groupCount: e.target.value})}
                    className="w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 border border-gray-300"
                    placeholder="0"
                    min="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">売上金額（円）</label>
                  <input
                    type="number"
                    value={formData.totalSales}
                    onChange={(e) => setFormData({...formData, totalSales: e.target.value})}
                    className="w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 border border-gray-300"
                    placeholder="0"
                    min="0"
                  />
                </div>
                
                <div className="flex justify-end space-x-3 pt-6">
                  <button
                    onClick={() => setShowForm(false)}
                    className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    disabled={isLoading}
                  >
                    {isLoading ? '保存中...' : '追加'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
