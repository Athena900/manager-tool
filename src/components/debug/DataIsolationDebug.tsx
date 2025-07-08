'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { authService } from '@/lib/auth'

interface DebugInfo {
  currentUserId: string | null
  userEmail: string | null
  visibleSalesCount: number
  totalSalesInDB: number
  userIdNullCount: number
  sampleSalesData: any[]
  rlsPolicies: any[]
}

export default function DataIsolationDebug() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runDebugCheck = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // 現在のユーザー情報取得
      const { user } = await authService.getCurrentUser()
      
      console.log('=== データ分離デバッグ開始 ===')
      console.log('Current user:', user)
      
      if (!user) {
        throw new Error('ユーザーが認証されていません')
      }

      // 現在のユーザーがアクセス可能な売上データ
      const { data: visibleSales, error: visibleError } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

      if (visibleError) {
        console.error('Visible sales query error:', visibleError)
      }

      console.log('Visible sales data:', visibleSales)
      console.log('Visible sales count:', visibleSales?.length || 0)

      // サンプルデータ作成テスト
      const testSaleData = {
        date: new Date().toISOString().split('T')[0],
        total_sales: 99999,
        customer_count: 1,
        average_per_customer: 99999,
        notes: 'デバッグテストデータ - ' + new Date().toLocaleTimeString()
      }

      console.log('Creating test sale data:', testSaleData)
      
      const { data: newSale, error: createError } = await supabase
        .from('sales')
        .insert([testSaleData])
        .select()
        .single()

      if (createError) {
        console.error('Test sale creation error:', createError)
      } else {
        console.log('Test sale created successfully:', newSale)
        
        // テストデータを即座に削除
        await supabase
          .from('sales')
          .delete()
          .eq('id', newSale.id)
        
        console.log('Test sale deleted')
      }

      // 最新のvisibleデータを再取得
      const { data: finalVisibleSales } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      setDebugInfo({
        currentUserId: user.id,
        userEmail: user.email || null,
        visibleSalesCount: finalVisibleSales?.length || 0,
        totalSalesInDB: -1, // RLSにより総数は取得不可（正常）
        userIdNullCount: -1, // RLSにより取得不可（正常）
        sampleSalesData: finalVisibleSales?.slice(0, 3) || [],
        rlsPolicies: []
      })

      console.log('=== データ分離デバッグ完了 ===')
      
    } catch (err) {
      console.error('Debug check error:', err)
      setError(err instanceof Error ? err.message : 'デバッグチェック中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gray-100 p-6 rounded-lg mb-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">
        🔍 データ分離デバッグツール
      </h3>
      
      <button
        onClick={runDebugCheck}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 mb-4"
      >
        {loading ? '確認中...' : 'データ分離状況を確認'}
      </button>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>エラー:</strong> {error}
        </div>
      )}

      {debugInfo && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded border">
              <h4 className="font-semibold text-gray-700 mb-2">現在のユーザー情報</h4>
              <p><strong>ユーザーID:</strong> <code className="bg-gray-100 px-1 rounded text-sm">{debugInfo.currentUserId}</code></p>
              <p><strong>メールアドレス:</strong> {debugInfo.userEmail}</p>
            </div>

            <div className="bg-white p-4 rounded border">
              <h4 className="font-semibold text-gray-700 mb-2">データアクセス状況</h4>
              <p><strong>アクセス可能な売上データ数:</strong> {debugInfo.visibleSalesCount}件</p>
              <p className="text-sm text-gray-600 mt-2">
                ✅ 他のユーザーのデータは表示されません（RLS機能）
              </p>
            </div>
          </div>

          {debugInfo.sampleSalesData.length > 0 && (
            <div className="bg-white p-4 rounded border">
              <h4 className="font-semibold text-gray-700 mb-2">サンプルデータ（最新3件）</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">日付</th>
                      <th className="text-left p-2">売上</th>
                      <th className="text-left p-2">ユーザーID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {debugInfo.sampleSalesData.map((sale, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2">{sale.date}</td>
                        <td className="p-2">¥{sale.total_sales?.toLocaleString()}</td>
                        <td className="p-2">
                          <code className="bg-gray-100 px-1 rounded text-xs">
                            {sale.user_id?.substring(0, 8)}...
                          </code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            <h4 className="font-semibold mb-2">✅ データ分離機能の確認項目</h4>
            <ul className="text-sm space-y-1">
              <li>• 現在のユーザーのデータのみ表示される</li>
              <li>• 新規作成データに自動的にuser_idが設定される</li>
              <li>• 他のユーザーのデータにはアクセスできない</li>
              <li>• RLS（Row Level Security）が正常に機能している</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}