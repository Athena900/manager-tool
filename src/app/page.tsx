'use client'

import React, { useState, useEffect } from 'react'
import { Lock, Plus, Edit3, LogOut } from 'lucide-react'
import { salesAPI } from '../lib/supabase'

interface Sale {
  id: string
  date: string
  day_of_week: string
  group_count: number
  total_sales: number
  card_sales?: number
  paypay_sales?: number
  cash_sales?: number
  expenses?: number
  updated_by?: string
}

export default function BarSalesManager() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loginData, setLoginData] = useState({ password: '' })
  const [sales, setSales] = useState<Sale[]>([])
  const [showForm, setShowForm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    groupCount: '',
    totalSales: '',
    cardSales: '',
    paypaySales: '',
    expenses: '',
    updatedBy: ''
  })

  const handleLogin = () => {
    if (loginData.password === 'BarSales2024') {
      setIsAuthenticated(true)
      loadSales()
    } else {
      alert('パスワードが間違っています。')
    }
  }

  const loadSales = async () => {
    try {
      const salesData = await salesAPI.fetchAll()
      setSales(salesData)
    } catch (error) {
      console.error('データの読み込みに失敗:', error)
    }
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
      total_sales: parseFloat(formData.totalSales),
      card_sales: parseFloat(formData.cardSales) || 0,
      paypay_sales: parseFloat(formData.paypaySales) || 0,
      expenses: parseFloat(formData.expenses) || 0,
      cash_sales: parseFloat(formData.totalSales) - (parseFloat(formData.cardSales) || 0) - (parseFloat(formData.paypaySales) || 0),
      updated_by: formData.updatedBy || 'スタッフ'
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
      totalSales: '',
      cardSales: '',
      paypaySales: '',
      expenses: '',
      updatedBy: ''
    })
    setShowForm(false)
    setIsLoading(false)
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setLoginData({ password: '' })
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <Lock className="mx-auto h-12 w-12 text-blue-600 mb-4" />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">バー管理システム</h1>
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
              <h1 className="text-3xl font-bold text-gray-800">バー管理システム</h1>
              <p className="text-gray-600 mt-2">売上データ管理</p>
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
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">売上履歴</h3>
          
          {/* モバイル表示 */}
          <div className="block sm:hidden">
            <div className="space-y-4">
              {sales.map((sale) => (
                <div key={sale.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-800">
                      {new Date(sale.date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })} ({sale.day_of_week})
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">組数:</span>
                      <span className="ml-1 text-gray-800">{sale.group_count}組</span>
                    </div>
                    <div>
                      <span className="text-gray-600">売上:</span>
                      <span className="ml-1 font-medium text-green-600">¥{sale.total_sales.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">カード:</span>
                      <span className="ml-1 font-medium text-blue-600">¥{(sale.card_sales || 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">PayPay:</span>
                      <span className="ml-1 font-medium text-red-500">¥{(sale.paypay_sales || 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">現金:</span>
                      <span className="ml-1 font-medium text-orange-600">¥{(sale.cash_sales || 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">経費:</span>
                      <span className="ml-1 font-medium text-red-600">¥{(sale.expenses || 0).toLocaleString()}</span>
                    </div>
                  </div>
                  {sale.updated_by && (
                    <div className="text-xs text-gray-500 border-t pt-2">
                      更新者: {sale.updated_by}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* デスクトップ表示 */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日付</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">曜日</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">組数</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">売上</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">カード</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PayPay</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">現金</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">経費</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">更新者</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                      {new Date(sale.date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{sale.day_of_week}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{sale.group_count}組</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      ¥{sale.total_sales.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      ¥{(sale.card_sales || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-500">
                      ¥{(sale.paypay_sales || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-600">
                      ¥{(sale.cash_sales || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                      ¥{(sale.expenses || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sale.updated_by || '---'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {sales.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              まだ売上データがありません。「売上を追加」ボタンから入力を始めましょう。
            </div>
          )}
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
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">カード決済分（円）</label>
                  <input
                    type="number"
                    value={formData.cardSales}
                    onChange={(e) => setFormData({...formData, cardSales: e.target.value})}
                    className="w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 border border-gray-300"
                    placeholder="0"
                    min="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">PayPay決済分（円）</label>
                  <input
                    type="number"
                    value={formData.paypaySales}
                    onChange={(e) => setFormData({...formData, paypaySales: e.target.value})}
                    className="w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 border border-gray-300"
                    placeholder="0"
                    min="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">経費（円）</label>
                  <input
                    type="number"
                    value={formData.expenses}
                    onChange={(e) => setFormData({...formData, expenses: e.target.value})}
                    className="w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 border border-gray-300"
                    placeholder="0"
                    min="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">更新者</label>
                  <input
                    type="text"
                    value={formData.updatedBy}
                    onChange={(e) => setFormData({...formData, updatedBy: e.target.value})}
                    className="w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 border border-gray-300"
                    placeholder="名前を入力"
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
