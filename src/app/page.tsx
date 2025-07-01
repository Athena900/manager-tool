'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { TrendingUp, Users, DollarSign, Plus, Edit3, Download, Moon, Sun, BarChart3, Activity, Target, LogOut, Lock, Cloud, CloudOff, Wifi, Trash2 } from 'lucide-react'
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
  updatedBy: string
}

export default function BarSalesManager() {
  const [sales, setSales] = useState<Sale[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [darkMode, setDarkMode] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
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
    notes: '',
    updatedBy: ''
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
    
    let subscription: any = null
    const setupSubscription = async () => {
      try {
        subscription = salesAPI.subscribeToChanges((payload) => {
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
      } catch (error) {
        console.error('リアルタイム購読の設定に失敗:', error)
      }
    }
    
    setupSubscription()
    
    return () => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe()
      }
    }
  }, [isAuthenticated])

  const initializeData = async () => {
    setIsLoading(true)
    try {
      const salesData = await salesAPI.fetchAll()
      setSales(salesData)
      setIsConnected(true)
      setLastSync(new Date())
      
      if (typeof window !== 'undefined') {
        const savedTargets = JSON.parse(localStorage.getItem('barTargets') || '{}')
        if (Object.keys(savedTargets).length > 0) {
          setTargets(savedTargets)
        }
      }
    } catch (error) {
      console.error('データの初期化に失敗:', error)
      setIsConnected(false)
      
      if (typeof window !== 'undefined') {
        const localSales = JSON.parse(localStorage.getItem('barSalesData') || '[]')
        const localTargets = JSON.parse(localStorage.getItem('barTargets') || '{}')
        setSales(localSales)
        if (Object.keys(localTargets).length > 0) {
          setTargets(localTargets)
        }
      }
    }
    setIsLoading(false)
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('barSalesData', JSON.stringify(sales))
    }
  }, [sales])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('barTargets', JSON.stringify(targets))
    }
  }, [targets])

  const handleLogin = () => {
    if (loginData.password === SIMPLE_PASSWORD) {
      setIsAuthenticated(true)
      setCurrentUser({ name: 'バースタッフ' })
    } else {
      alert('パスワードが間違っています。')
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setCurrentUser(null)
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
      updated_by: formData.updatedBy || 'スタッフ'
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
      notes: '',
      updatedBy: ''
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
      notes: sale.notes || '',
      updatedBy: sale.updated_by || ''
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

  const forceSync = async () => {
    await initializeData()
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

    const dates = sales.map(sale => sale.date).filter((date, index, array) => array.indexOf(date) === index)
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

  const exportToCSV = () => {
    const headers = ['日付', '曜日', '組数', '売上', '平均単価', 'カード決済', 'PayPay決済', '現金', '経費', '利益', 'イベント', 'メモ', '更新者']
    const csvContent = [
      headers.join(','),
      ...sales.map(sale => [
        sale.date, sale.day_of_week, sale.group_count, sale.total_sales,
        Math.round(sale.average_spend || 0), sale.card_sales || 0, sale.paypay_sales || 0,
        sale.cash_sales || 0, sale.expenses || 0, sale.profit || 0,
        sale.event || '', sale.notes || '', sale.updated_by || ''
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `bar_sales_data_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen ${theme.bg} flex items-center justify-center p-4`}>
        <div className={`${theme.card} rounded-lg shadow-lg p-8 w-full max-w-md`}>
          <div className="text-center mb-8">
            <Lock className="mx-auto h-12 w-12 text-blue-600 mb-4" />
            <h1 className={`text-2xl font-bold ${theme.text} mb-2`}>バー管理システム</h1>
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
              <h1 className={`text-2xl sm:text-3xl font-bold ${theme.text}`}>バー管理システム</h1>
              <div className="flex items-center gap-2 mt-2">
                <p className={`${theme.textSecondary} text-sm sm:text-base`}>
                  {currentUser?.name}
                </p>
                <div className="flex items-center gap-1">
                  {isConnected ? (
                    <Cloud size={16} className="text-green-500" />
                  ) : (
                    <CloudOff size={16} className="text-red-500" />
                  )}
                  {isLoading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  )}
                </div>
              </div>
              {lastSync && (
                <p className={`text-xs ${theme.textSecondary} mt-1`}>
                  最終同期: {lastSync.toLocaleTimeString('ja-JP')}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <button
                onClick={forceSync}
                className={`p-2 rounded-lg border ${theme.border} hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                disabled={isLoading}
              >
                <Wifi size={16} className={isConnected ? 'text-green-500' : 'text-gray-400'} />
              </button>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg border ${theme.border} hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
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
                onClick={exportToCSV}
                className="bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm"
              >
                <Download size={16} />
                <span className="hidden sm:inline">CSV出力</span>
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
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className={`${theme.card} rounded-lg shadow-md mb-6`}>
          <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
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

            <div className="grid grid-cols-2 lg:grid-cols-7 gap-3 sm:gap-4 mb-6">
              {[
                { label: '総売上', value: stats.totalSales, color: 'green', icon: DollarSign, sub: `日割り: ¥${Math.round(stats.dailyAverage).toLocaleString()}` },
                { label: '総組数', value: `${stats.totalGroups}組`, color: 'blue', icon: Users, sub: `日平均: ${Math.round(stats.totalGroups / Math.max(sales.length, 1))}組` },
                { label: 'カード売上', value: stats.totalCardSales, color: 'blue', icon: '💳', sub: `${Math.round(stats.cardRatio)}%` },
                { label: 'PayPay売上', value: stats.totalPaypaySales, color: 'purple', icon: '📱', sub: `${Math.round(stats.paypayRatio)}%` },
                { label: '現金売上', value: stats.totalCashSales, color: 'green', icon: '💵', sub: `${Math.round(stats.cashRatio)}%` },
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
              <div className="flex gap-2 items-center">
                <div className="flex items-center gap-1">
                  {isConnected ? (
                    <span className="text-green-600 text-xs flex items-center gap-1">
                      <Cloud size={12} />
                      同期済み
                    </span>
                  ) : (
                    <span className="text-red-600 text-xs flex items-center gap-1">
                      <CloudOff size={12} />
                      オフライン
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className={`${theme.bg}`}>
                      <tr>
                        <th className={`px-3 sm:px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase tracking-wider`}>日付</th>
                        <th className={`px-3 sm:px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase tracking-wider`}>売上詳細</th>
                        <th className={`px-3 sm:px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase tracking-wider`}>組数</th>
                        <th className={`px-3 sm:px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase tracking-wider hidden sm:table-cell`}>平均単価</th>
                        <th className={`px-3 sm:px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase tracking-wider hidden sm:table-cell`}>利益</th>
                        <th className={`px-3 sm:px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase tracking-wider`}>操作</th>
                      </tr>
                    </thead>
                    <tbody className={`${theme.card} divide-y divide-gray-200 dark:divide-gray-700`}>
                      {sales.length === 0 ? (
                        <tr>
                          <td colSpan={6} className={`px-6 py-4 text-center ${theme.textSecondary}`}>
                            データがありません
                          </td>
                        </tr>
                      ) : (
                        sales.map((sale) => (
                          <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className={`px-3 sm:px-6 py-4 whitespace-nowrap ${theme.text}`}>
                              <div>
                                <div className="text-sm font-medium">{sale.date}</div>
                                <div className={`text-xs ${theme.textSecondary}`}>{sale.day_of_week}</div>
                              </div>
                            </td>
                            <td className={`px-3 sm:px-6 py-4 ${theme.text}`}>
                              <div className="text-sm font-medium mb-1">¥{sale.total_sales.toLocaleString()}</div>
                              <div className="text-xs space-y-1">
                                <div className="text-blue-600">カード: ¥{(sale.card_sales || 0).toLocaleString()}</div>
                                <div className="text-purple-600">PayPay: ¥{(sale.paypay_sales || 0).toLocaleString()}</div>
                                <div className="text-green-600">現金: ¥{(sale.cash_sales || 0).toLocaleString()}</div>
                              </div>
                            </td>
                            <td className={`px-3 sm:px-6 py-4 whitespace-nowrap text-sm ${theme.text}`}>
                              <div>{sale.group_count}組</div>
                              <div className={`text-xs ${theme.textSecondary} sm:hidden`}>
                                単価: ¥{Math.round(sale.average_spend || 0).toLocaleString()}
                              </div>
                            </td>
                            <td className={`px-3 sm:px-6 py-4 whitespace-nowrap text-sm ${theme.text} hidden sm:table-cell`}>
                              ¥{Math.round(sale.average_spend || 0).toLocaleString()}
                            </td>
                            <td className={`px-3 sm:px-6 py-4 whitespace-nowrap ${theme.text} hidden sm:table-cell`}>
                              <div className="text-sm font-medium">¥{(sale.profit || 0).toLocaleString()}</div>
                              <div className={`text-xs ${theme.textSecondary}`}>
                                経費: ¥{(sale.expenses || 0).toLocaleString()}
                              </div>
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-2">
                                <button
                                  onClick={() => handleEdit(sale)}
                                  className="text-blue-600 hover:text-blue-900 p-1"
                                  disabled={isLoading}
                                >
                                  <Edit3 size={16} />
                                </button>
                                <button
                                  onClick={() => handleDelete(sale.id)}
                                  className="text-red-600 hover:text-red-900 p-1"
                                  disabled={isLoading}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                              <div className={`text-xs ${theme.textSecondary} sm:hidden mt-1`}>
                                利益: ¥{(sale.profit || 0).toLocaleString()}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* フォームモーダル */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className={`${theme.card} rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto`}>
              <h2 className={`text-xl font-bold mb-4 ${theme.text}`}>
                {editingId ? '売上データ編集' : '新規売上データ'}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>日付</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className={`w-full rounded-md border ${theme.border} p-3 focus:border-blue-500 focus:ring-blue-500`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>組数 *</label>
                  <input
                    type="number"
                    value={formData.groupCount}
                    onChange={(e) => setFormData({...formData, groupCount: e.target.value})}
                    className={`w-full rounded-md border ${theme.border} p-3 focus:border-blue-500 focus:ring-blue-500`}
                    placeholder="例: 15"
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>総売上 *</label>
                  <input
                    type="number"
                    value={formData.totalSales}
                    onChange={(e) => setFormData({...formData, totalSales: e.target.value})}
                    className={`w-full rounded-md border ${theme.border} p-3 focus:border-blue-500 focus:ring-blue-500`}
                    placeholder="例: 50000"
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>カード決済</label>
                  <input
                    type="number"
                    value={formData.cardSales}
                    onChange={(e) => setFormData({...formData, cardSales: e.target.value})}
                    className={`w-full rounded-md border ${theme.border} p-3 focus:border-blue-500 focus:ring-blue-500`}
                    placeholder="例: 20000"
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>PayPay決済</label>
                  <input
                    type="number"
                    value={formData.paypaySales}
                    onChange={(e) => setFormData({...formData, paypaySales: e.target.value})}
                    className={`w-full rounded-md border ${theme.border} p-3 focus:border-blue-500 focus:ring-blue-500`}
                    placeholder="例: 15000"
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>経費</label>
                  <input
                    type="number"
                    value={formData.expenses}
                    onChange={(e) => setFormData({...formData, expenses: e.target.value})}
                    className={`w-full rounded-md border ${theme.border} p-3 focus:border-blue-500 focus:ring-blue-500`}
                    placeholder="例: 5000"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>イベント</label>
                  <input
                    type="text"
                    value={formData.event}
                    onChange={(e) => setFormData({...formData, event: e.target.value})}
                    className={`w-full rounded-md border ${theme.border} p-3 focus:border-blue-500 focus:ring-blue-500`}
                    placeholder="例: 忘年会シーズン"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>メモ</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className={`w-full rounded-md border ${theme.border} p-3 focus:border-blue-500 focus:ring-blue-500`}
                    rows={3}
                    placeholder="その他のメモ"
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>更新者</label>
                  <input
                    type="text"
                    value={formData.updatedBy}
                    onChange={(e) => setFormData({...formData, updatedBy: e.target.value})}
                    className={`w-full rounded-md border ${theme.border} p-3 focus:border-blue-500 focus:ring-blue-500`}
                    placeholder="例: 田中"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
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
                      notes: '',
                      updatedBy: ''
                    })
                  }}
                  className={`px-4 py-2 border ${theme.border} rounded-md ${theme.text} hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors`}
                  disabled={isLoading}
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                  disabled={isLoading}
                >
                  {isLoading ? '保存中...' : (editingId ? '更新' : '保存')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 目標設定モーダル */}
        {showTargetForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className={`${theme.card} rounded-lg p-6 w-full max-w-md`}>
              <h2 className={`text-xl font-bold mb-4 ${theme.text}`}>目標設定</h2>
              
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>日平均目標</label>
                  <input
                    type="number"
                    value={targets.daily}
                    onChange={(e) => setTargets({...targets, daily: parseInt(e.target.value) || 0})}
                    className={`w-full rounded-md border ${theme.border} p-3 focus:border-blue-500 focus:ring-blue-500`}
                    placeholder="50000"
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>週平均目標</label>
                  <input
                    type="number"
                    value={targets.weekly}
                    onChange={(e) => setTargets({...targets, weekly: parseInt(e.target.value) || 0})}
                    className={`w-full rounded-md border ${theme.border} p-3 focus:border-blue-500 focus:ring-blue-500`}
                    placeholder="350000"
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>月平均目標</label>
                  <input
                    type="number"
                    value={targets.monthly}
                    onChange={(e) => setTargets({...targets, monthly: parseInt(e.target.value) || 0})}
                    className={`w-full rounded-md border ${theme.border} p-3 focus:border-blue-500 focus:ring-blue-500`}
                    placeholder="1500000"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowTargetForm(false)}
                  className={`px-4 py-2 border ${theme.border} rounded-md ${theme.text} hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors`}
                >
                  キャンセル
                </button>
                <button
                  onClick={() => setShowTargetForm(false)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
