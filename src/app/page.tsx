'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { TrendingUp, Users, DollarSign, Plus, Edit3, Download, Moon, Sun, BarChart3, Activity, Target, LogOut, Lock, Cloud, CloudOff } from 'lucide-react'
import { supabase, salesAPI } from '../lib/supabase'

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
  profit?: number
  average_spend?: number
  event?: string
  notes?: string
  updated_by?: string
  created_at?: string
  updated_at?: string
}

interface FormData {
  date: string
  groupCount: string
  totalSales: string
  cardSales: string
  paypaySales: string
  expenses: string
  event: string
  notes: string
}

export default function BarSalesManager() {
  const [sales, setSales] = useState<Sale[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [darkMode, setDarkMode] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showLogin, setShowLogin] = useState(true)
  const [currentUser, setCurrentUser] = useState<{ name: string } | null>(null)
  const [loginData, setLoginData] = useState({ password: '' })
  const [isConnected, setIsConnected] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  
  const [formData, setFormData] = useState<FormData>({
    date: new Date().toISOString().split('T')[0],
    groupCount: '',
    totalSales: '',
    cardSales: '',
    paypaySales: '',
    expenses: '',
    event: '',
    notes: ''
  })

  const [targets, setTargets] = useState({
    daily: 50000,
    weekly: 350000,
    monthly: 1500000
  })

  const [showTargetForm, setShowTargetForm] = useState(false)
  const SIMPLE_PASSWORD = 'BarSales2024'

  useEffect(() => {
    if (!isAuthenticated) return
    initializeData()
    const unsubscribe = setupRealtimeSubscription()
    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [isAuthenticated])

  const initializeData = async () => {
    setIsLoading(true)
    try {
      const salesData = await salesAPI.fetchAll()
      setSales(salesData)
      setIsConnected(true)
      setLastSync(new Date())
      const savedTargets = JSON.parse(localStorage.getItem('barTargets') || '{}')
      if (Object.keys(savedTargets).length > 0) {
        setTargets(savedTargets)
      }
    } catch (error) {
      console.error('データの初期化に失敗:', error)
      setIsConnected(false)
      const localSales = JSON.parse(localStorage.getItem('barSalesData') || '[]')
      const localTargets = JSON.parse(localStorage.getItem('barTargets') || '{}')
      setSales(localSales)
      if (Object.keys(localTargets).length > 0) {
        setTargets(localTargets)
      }
    }
    setIsLoading(false)
  }

  const setupRealtimeSubscription = () => {
    return salesAPI.subscribeToChanges((payload) => {
      console.log('リアルタイム更新を受信:', payload)
      setLastSync(new Date())
      if (payload.eventType === 'INSERT' && payload.new) {
        setSales(prev => [payload.new as Sale, ...prev])
      } else if (payload.eventType === 'UPDATE' && payload.new) {
        setSales(prev => prev.map(sale => 
          sale.id === payload.new.id ? payload.new as Sale : sale
        ))
      } else if (payload.eventType === 'DELETE' && payload.old) {
        setSales(prev => prev.filter(sale => sale.id !== payload.old.id))
      }
    })
  }

  useEffect(() => {
    localStorage.setItem('barSalesData', JSON.stringify(sales))
  }, [sales])

  useEffect(() => {
    localStorage.setItem('barTargets', JSON.stringify(targets))
  }, [targets])

  const handleLogin = () => {
    if (loginData.password === SIMPLE_PASSWORD) {
      setIsAuthenticated(true)
      setCurrentUser({ name: 'バースタッフ' })
      setShowLogin(false)
    } else {
      alert('パスワードが間違っています。')
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setCurrentUser(null)
    setShowLogin(true)
    setLoginData({ password: '' })
  }

  const getTargetValue = (key: keyof typeof targets) => {
    const defaults = { daily: 50000, weekly: 350000, monthly: 1500000 }
    return targets[key] || defaults[key]
  }

  const theme = {
    bg: darkMode ? 'bg-gray-900' : 'bg-gray-50',
    card: darkMode ? 'bg-gray-800' : 'bg-white',
    text: darkMode ? 'text-white' : 'text-gray-800',
    textSecondary: darkMode ? 'text-gray-300' : 'text-gray-600',
    border: darkMode ? 'border-gray-700' : 'border-gray-200'
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
      average_spend: parseFloat(formData.totalSales) / parseInt(formData.groupCount),
      cash_sales: parseFloat(formData.totalSales) - (parseFloat(formData.cardSales) || 0) - (parseFloat(formData.paypaySales) || 0),
      profit: parseFloat(formData.totalSales) - (parseFloat(formData.expenses) || 0),
      event: formData.event || null,
      notes: formData.notes || null,
      updated_by: currentUser?.name || 'バースタッフ'
    }

    try {
      if (editingId) {
        await salesAPI.update(editingId, saleData)
        setEditingId(null)
      } else {
        await salesAPI.create(saleData)
      }
      setIsConnected(true)
      setLastSync(new Date())
    } catch (error) {
      console.error('データの保存に失敗:', error)
      setIsConnected(false)
      const newSale: Sale = { 
        ...saleData, 
        id: editingId || Date.now().toString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      if (editingId) {
        setSales(prev => prev.map(sale => sale.id === editingId ? newSale : sale))
        setEditingId(null)
      } else {
        setSales(prev => [newSale, ...prev])
      }
    }

    setFormData({
      date: new Date().toISOString().split('T')[0],
      groupCount: '',
      totalSales: '',
      cardSales: '',
      paypaySales: '',
      expenses: '',
      event: '',
      notes: ''
    })
    setShowForm(false)
    setIsLoading(false)
  }

  const handleEdit = (sale: Sale) => {
    setFormData({
      date: sale.date,
      groupCount: sale.group_count.toString(),
      totalSales: sale.total_sales.toString(),
      cardSales: (sale.card_sales || 0).toString(),
      paypaySales: (sale.paypay_sales || 0).toString(),
      expenses: (sale.expenses || 0).toString(),
      event: sale.event || '',
      notes: sale.notes || ''
    })
    setEditingId(sale.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('このデータを削除しますか？')) return
    setIsLoading(true)
    try {
      await salesAPI.delete(id)
      setIsConnected(true)
      setLastSync(new Date())
    } catch (error) {
      console.error('削除に失敗:', error)
      setIsConnected(false)
    }
    setIsLoading(false)
  }

  const stats = useMemo(() => {
    if (sales.length === 0) return {
      totalSales: 0, totalCardSales: 0, totalPaypaySales: 0, totalCashSales: 0,
      totalExpenses: 0, totalProfit: 0, totalGroups: 0, averageSpend: 0,
      bestDay: null, dailyAverage: 0, weeklyAverage: 0, monthlyAverage: 0,
      dailyProfit: 0, cardRatio: 0, paypayRatio: 0, cashRatio: 0,
      achievementRate: { daily: 0, weekly: 0, monthly: 0 }
    }

    const totalSales = sales.reduce((sum, sale) => sum + sale.total_sales, 0)
    const totalCardSales = sales.reduce((sum, sale) => sum + (sale.card_sales || 0), 0)
    const totalPaypaySales = sales.reduce((sum, sale) => sum + (sale.paypay_sales || 0), 0)
    const totalCashSales = sales.reduce((sum, sale) => sum + (sale.cash_sales || 0), 0)
    const totalExpenses = sales.reduce((sum, sale) => sum + (sale.expenses || 0), 0)
    const totalProfit = totalSales - totalExpenses
    const totalGroups = sales.reduce((sum, sale) => sum + sale.group_count, 0)
    const averageSpend = totalGroups > 0 ? totalSales / totalGroups : 0

    const dates = [...new Set(sales.map(sale => sale.date))]
    const dayCount = dates.length || 1
    const dailyAverage = totalSales / dayCount
    const weeklyAverage = totalSales / (dayCount / 7)
    const monthlyAverage = totalSales / (dayCount / 30)

    return {
      totalSales, totalCardSales, totalPaypaySales, totalCashSales,
      totalExpenses, totalProfit, totalGroups, averageSpend,
      dailyAverage, weeklyAverage, monthlyAverage,
      dailyProfit: totalProfit / dayCount,
      cardRatio: totalSales > 0 ? (totalCardSales / totalSales) * 100 : 0,
      paypayRatio: totalSales > 0 ? (totalPaypaySales / totalSales) * 100 : 0,
      cashRatio: totalSales > 0 ? (totalCashSales / totalSales) * 100 : 0,
      achievementRate: {
        daily: (dailyAverage / getTargetValue('daily')) * 100,
        weekly: (weeklyAverage / getTargetValue('weekly')) * 100,
        monthly: (monthlyAverage / getTargetValue('monthly')) * 100
      }
    }
  }, [sales, targets])

  const timeSeriesData = useMemo(() => {
    return sales
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(sale => ({
        ...sale,
        dateFormatted: new Date(sale.date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
      }))
  }, [sales])

  const dayStats = useMemo(() => {
    const statsObj = sales.reduce((acc: any, sale) => {
      if (!acc[sale.day_of_week]) {
        acc[sale.day_of_week] = { day: sale.day_of_week, sales: 0, groups: 0, count: 0 }
      }
      acc[sale.day_of_week].sales += sale.total_sales
      acc[sale.day_of_week].groups += sale.group_count
      acc[sale.day_of_week].count += 1
      return acc
    }, {})

    return Object.values(statsObj).map((stat: any) => ({
      ...stat,
      avgSales: Math.round(stat.sales / stat.count),
      avgGroups: Math.round(stat.groups / stat.count),
      avgSpend: Math.round((stat.sales / stat.groups) || 0)
    }))
  }, [sales])

  if (!isAuthenticated && showLogin) {
    return (
      <div className={`min-h-screen ${theme.bg} flex items-center justify-center p-4`}>
        <div className={`${theme.card} rounded-lg shadow-lg p-8 w-full max-w-md`}>
          <div className="text-center mb-8">
            <Lock className="mx-auto h-12 w-12 text-blue-600 mb-4" />
            <h1 className={`text-2xl font-bold ${theme.text} mb-2`}>バー売上管理システム</h1>
            <p className={`${theme.textSecondary}`}>🚀 Supabase リアルタイム同期</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>パスワード</label>
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
            <p className={`text-xs ${theme.textSecondary} text-center`}>💡 パスワード: BarSales2024</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${theme.bg} p-4 transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto">
        <div className={`${theme.card} rounded-lg shadow-md p-4 sm:p-6 mb-6`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className={`text-2xl sm:text-3xl font-bold ${theme.text}`}>バー売上管理ツール</h1>
              <div className="flex items-center gap-2 mt-2">
                <p className={`${theme.textSecondary} text-sm sm:text-base`}>
                  🚀 Supabase リアルタイム同期 | {currentUser?.name}
                </p>
                <div className="flex items-center gap-1">
                  {isConnected ? (
                    <Cloud size={16} className="text-green-500" title="オンライン同期" />
                  ) : (
                    <CloudOff size={16} className="text-red-500" title="オフライン" />
                  )}
                  {isLoading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg border ${theme.border} hover:bg-gray-100 transition-colors`}
              >
                {darkMode ? <Sun size={20} className="text-yellow-500" /> : <Moon size={20} className="text-gray-600" />}
              </button>
              <button
                onClick={() => setShowTargetForm(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm"
              >
                <Target size={16} />
                <span className="hidden sm:inline">目標設定</span>
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg flex items-center gap-2 transition-colors text-sm sm:text-base"
                disabled={isLoading}
              >
                <Plus size={20} />
                <span className="sm:hidden">追加</span>
                <span className="hidden sm:inline">売上を追加</span>
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-colors"
                title="ログアウト"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className={`${theme.card} rounded-lg shadow-md mb-6`}>
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {[
              { key: 'overview', label: '概要', icon: BarChart3 },
              { key: 'data', label: 'データ一覧', icon: Activity }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 sm:px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.key ? 'border-b-2 border-blue-500 text-blue-600' : `${theme.textSecondary} hover:text-blue-600`
                }`}
              >
                <tab.icon size={16} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'overview' && (
          <>
            <div className={`${theme.card} p-4 sm:p-6 rounded-lg shadow-md mb-6`}>
              <h3 className={`text-base sm:text-lg font-semibold mb-4 ${theme.text}`}>目標達成率</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(['daily', 'weekly', 'monthly'] as const).map((period) => (
                  <div key={period}>
                    <div className="flex justify-between items-center mb-2">
                      <span className={`text-sm font-medium ${theme.textSecondary}`}>
                        {period === 'daily' ? '日平均目標' : period === 'weekly' ? '週平均目標' : '月平均目標'}
                      </span>
                      <span className={`text-sm font-bold ${stats.achievementRate[period] >= 100 ? 'text-green-600' : 'text-orange-600'}`}>
                        {Math.round(stats.achievementRate[period])}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${stats.achievementRate[period] >= 100 ? 'bg-green-600' : 'bg-orange-600'}`}
                        style={{ width: `${Math.min(stats.achievementRate[period], 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className={`text-xs ${theme.textSecondary}`}>
                        ¥{Math.round(stats[`${period}Average` as keyof typeof stats] as number).toLocaleString()}
                      </span>
                      <span className={`text-xs ${theme.textSecondary}`}>
                        ¥{getTargetValue(period).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
              {[
                { label: '総売上', value: stats.totalSales, color: 'green', icon: DollarSign, sub: `日割り: ¥${Math.round(stats.dailyAverage).toLocaleString()}` },
                { label: '総組数', value: `${stats.totalGroups}組`, color: 'blue', icon: Users, sub: `日平均: ${Math.round(stats.totalGroups / Math.max(sales.length, 1))}組` },
                { label: '総経費', value: stats.totalExpenses, color: 'red', icon: '📋', sub: `日平均: ¥${Math.round(stats.totalExpenses / Math.max(sales.length, 1)).toLocaleString()}` },
                { label: '純利益', value: stats.totalProfit, color: 'indigo', icon: TrendingUp, sub: `日割り: ¥${Math.round(stats.dailyProfit).toLocaleString()}` }
              ].map((stat, index) => (
                <div key={index} className={`${theme.card} p-3 sm:p-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300`}>
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs sm:text-sm font-medium ${theme.textSecondary}`}>{stat.label}</p>
                      <p className={`text-base sm:text-xl font-bold text-${stat.color}-600 truncate`}>
                        {typeof stat.value === 'number' ? `¥${stat.value.toLocaleString()}` : stat.value}
                      </p>
                      <p className={`text-xs ${theme.textSecondary} mt-1`}>{stat.sub}</p>
                    </div>
                    <div className={`h-5 w-5 sm:h-6 sm:w-6 text-${stat.color}-600 flex-shrink-0 flex items-center justify-center text-sm`}>
                      {typeof stat.icon === 'string' ? stat.icon : <stat.icon />}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
              <div className={`${theme.card} p-4 sm:p-6 rounded-lg shadow-md`}>
                <h3 className={`text-base sm:text-lg font-semibold mb-4 ${theme.text}`}>売上推移</h3>
                <div className="h-64 sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="dateFormatted" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip formatter={(value) => [`¥${value.toLocaleString()}`, '売上']} />
                      <Area type="monotone" dataKey="total_sales" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className={`${theme.card} p-4 sm:p-6 rounded-lg shadow-md`}>
                <h3 className={`text-base sm:text-lg font-semibold mb-4 ${theme.text}`}>曜日別平均売上</h3>
                <div className="h-64 sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dayStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip formatter={(value) => [`¥${value.toLocaleString()}`, '平均売上']} />
                      <Bar dataKey="avgSales" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'data' && (
          <div className={`${theme.card} rounded-lg shadow-md p-4 sm:p-6`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-base sm:text-lg font-semibold ${theme.text}`}>売上履歴</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className={`px-3 sm:px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase tracking-wider`}>日付</th>
                    <th className={`px-3 sm:px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase tracking-wider`}>曜日</th>
                    <th className={`px-3 sm:px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase tracking-wider`}>組数</th>
                    <th className={`px-3 sm:px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase tracking-wider`}>売上</th>
                    <th className={`px-3 sm:px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase tracking-wider`}>操作</th>
                  </tr>
                </thead>
                <tbody className={`${theme.card} divide-y ${theme.border}`}>
                  {sales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                      <td className={`px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm ${theme.text}`}>
                        {new Date(sale.date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className={`px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm ${theme.text}`}>{sale.day_of_week}</td>
                      <td className={`px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm ${theme.text}`}>{sale.group_count}組</td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-green-600">
                        ¥{sale.total_sales.toLocaleString()}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(sale)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            title="編集"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(sale.id)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="削除"
                          >
                            ×
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {sales.length === 0 && (
                <div className={`text-center py-8 ${theme.textSecondary} text-sm sm:text-base`}>
                  まだ売上データがありません。「売上を追加」ボタンから入力を始めましょう。
                </div>
              )}
            </div>
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto">
            <div className={`${theme.card} rounded-lg p-4 sm:p-6 w-full max-w-md mx-auto my-8 max-h-screen overflow-y-auto`}>
              <h3 className={`text-base sm:text-lg font-semibold mb-4 ${theme.text}`}>
                {editingId ? '売上データを編集' : '売上データを追加'}
              </h3>
              <div className="space-y-4">
                {[
                  { label: '日付', type: 'date', key: 'date' as keyof FormData },
                  { label: '組数', type: 'number', key: 'groupCount' as keyof FormData, placeholder: '0', min: '0' },
                  { label: '売上金額（円）', type: 'number', key: 'totalSales' as keyof FormData, placeholder: '0', min: '0' },
                  { label: 'カード決済分（円）', type: 'number', key: 'cardSales' as keyof FormData, placeholder: '0', min: '0' },
                  { label: 'PayPay決済分（円）', type: 'number', key: 'paypaySales' as keyof FormData, placeholder: '0', min: '0' },
                  { label: '経費（円）', type: 'number', key: 'expenses' as keyof FormData, placeholder: '0', min: '0' },
                  { label: 'イベント（任意）', type: 'text', key: 'event' as keyof FormData, placeholder: '例: ライブイベント、忘年会など' }
                ].map((field) => (
                  <div key={field.key}>
                    <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>{field.label}</label>
                    <input
                      type={field.type}
                      value={formData[field.key]}
                      onChange={(e) => setFormData({...formData, [field.key]: e.target.value})}
                      className="w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 border border-gray-300 text-base"
                      placeholder={field.placeholder}
                      min={field.min}
                      disabled={isLoading}
                    />
                  </div>
                ))}
                
                <div>
                  <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>メモ（任意）</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 border border-gray-300 text-base resize-none"
                    rows={3}
                    placeholder="特記事項があれば記入"
                    disabled={isLoading}
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
                      setEditingId(null)
                      setFormData({
                        date: new Date().toISOString().split('T')[0],
                        groupCount: '',
                        totalSales: '',
                        cardSales: '',
                        paypaySales: '',
                        expenses: '',
                        event: '',
                        notes: ''
                      })
                    }}
                    className={`w-full sm:w-auto px-6 py-3 border ${theme.border} rounded-md text-base font-medium ${theme.textSecondary} hover:bg-gray-50 transition-colors`}
                    disabled={isLoading}
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="w-full sm:w-auto px-6 py-3 bg-blue-600 border border-transparent rounded-md text-base font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                    disabled={isLoading}
                  >
                    {isLoading ? '保存中...' : (editingId ? '更新' : '追加')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showTargetForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto">
            <div className={`${theme.card} rounded-lg p-4 sm:p-6 w-full max-w-md mx-auto my-8`}>
              <h3 className={`text-base sm:text-lg font-semibold mb-4 ${theme.text}`}>目標売上設定</h3>
              <div className="space-y-4">
                {[
                  { label: '日平均目標（円）', key: 'daily' as keyof typeof targets, placeholder: '50000' },
                  { label: '週平均目標（円）', key: 'weekly' as keyof typeof targets, placeholder: '350000' },
                  { label: '月平均目標（円）', key: 'monthly' as keyof typeof targets, placeholder: '1500000' }
                ].map((field) => (
                  <div key={field.key}>
                    <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>{field.label}</label>
                    <input
                      type="number"
                      value={targets[field.key]}
                      onChange={(e) => setTargets({...targets, [field.key]: parseInt(e.target.value) || 0})}
                      className="w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 border border-gray-300 text-base"
                      placeholder={field.placeholder}
                    />
                  </div>
                ))}
                
                <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-6">
                  <button
                    type="button"
                    onClick={() => setShowTargetForm(false)}
                    className={`w-full sm:w-auto px-6 py-3 border ${theme.border} rounded-md text-base font-medium ${theme.textSecondary} hover:bg-gray-50 transition-colors`}
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTargetForm(false)}
                    className="w-full sm:w-auto px-6 py-3 bg-purple-600 border border-transparent rounded-md text-base font-medium text-white hover:bg-purple-700 transition-colors"
                  >
                    保存
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
