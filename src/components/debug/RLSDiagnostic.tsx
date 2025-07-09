'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { authService } from '@/lib/auth'

interface DiagnosticResult {
  currentUserId: string | null
  userEmail: string | null
  explicitFilterCount: number
  rlsOnlyCount: number
  uniqueUserIds: string[]
  dataConsistency: 'normal' | 'abnormal'
  rlsStatus: 'working' | 'not_working'
  sampleData: any[]
  rlsPolicies: any[]
}

export default function RLSDiagnostic() {
  const [result, setResult] = useState<DiagnosticResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runDiagnostic = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const { user } = await authService.getCurrentUser()
      
      if (!user) {
        throw new Error('ユーザーが認証されていません')
      }

      console.log('=== RLS診断開始 ===')
      console.log('Current user ID:', user.id)

      // 1. 明示的フィルターでのクエリ
      const { data: explicitData, error: explicitError } = await supabase
        .from('sales')
        .select('*')
        .eq('user_id', user.id)
      
      if (explicitError) {
        console.error('Explicit filter error:', explicitError)
      }

      // 2. RLSのみでのクエリ（フィルターなし）
      const { data: rlsData, error: rlsError } = await supabase
        .from('sales')
        .select('*')
      
      if (rlsError) {
        console.error('RLS only error:', rlsError)
      }

      // 3. ユニークなuser_IDを取得
      const uniqueUserIds = new Set<string>()
      rlsData?.forEach(sale => {
        if (sale.user_id) uniqueUserIds.add(sale.user_id)
      })

      // 4. RLSポリシーの状態を確認（管理者権限が必要）
      let policies: any[] = []
      try {
        const { data: policyData } = await supabase
          .from('pg_policies')
          .select('*')
          .eq('tablename', 'sales')
        
        if (policyData) policies = policyData
      } catch (err) {
        console.log('Policy check skipped (requires admin)')
      }

      // 5. 診断結果の判定
      const explicitCount = explicitData?.length || 0
      const rlsCount = rlsData?.length || 0
      const isConsistent = explicitCount === rlsCount
      const uniqueCount = uniqueUserIds.size

      const result: DiagnosticResult = {
        currentUserId: user.id,
        userEmail: user.email || null,
        explicitFilterCount: explicitCount,
        rlsOnlyCount: rlsCount,
        uniqueUserIds: Array.from(uniqueUserIds),
        dataConsistency: isConsistent ? 'normal' : 'abnormal',
        rlsStatus: isConsistent && uniqueCount === 1 ? 'working' : 'not_working',
        sampleData: rlsData?.slice(0, 3) || [],
        rlsPolicies: policies
      }

      console.log('診断結果:', result)
      setResult(result)
      
    } catch (err) {
      console.error('Diagnostic error:', err)
      setError(err instanceof Error ? err.message : '診断中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gray-900 text-white p-6 rounded-lg mb-6">
      <h3 className="text-xl font-bold mb-4 text-red-400">
        🚨 RLS緊急診断ツール
      </h3>
      
      <button
        onClick={runDiagnostic}
        disabled={loading}
        className="bg-red-600 text-white px-6 py-3 rounded font-semibold hover:bg-red-700 disabled:opacity-50 mb-4"
      >
        {loading ? '診断中...' : 'RLS状態を診断'}
      </button>

      {error && (
        <div className="bg-red-900 border border-red-600 text-red-200 px-4 py-3 rounded mb-4">
          <strong>エラー:</strong> {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="bg-gray-800 p-4 rounded border border-gray-700">
            <h4 className="font-bold text-yellow-400 mb-3">診断結果サマリー</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400">明示的フィルター（WHERE user_id = ?）:</p>
                <p className="text-2xl font-bold">{result.explicitFilterCount}件</p>
              </div>
              <div>
                <p className="text-gray-400">RLSのみ（フィルターなし）:</p>
                <p className="text-2xl font-bold">{result.rlsOnlyCount}件</p>
              </div>
            </div>
            
            <div className={`mt-4 p-3 rounded ${
              result.rlsStatus === 'working' 
                ? 'bg-green-900 border border-green-600' 
                : 'bg-red-900 border border-red-600'
            }`}>
              <p className="font-bold">
                RLSステータス: {result.rlsStatus === 'working' ? '✅ 正常' : '❌ 異常'}
              </p>
              <p className="text-sm mt-1">
                検出されたuser_ID数: {result.uniqueUserIds.length}種類
                {result.uniqueUserIds.length > 1 && ' （複数のユーザーデータが混在）'}
              </p>
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded border border-gray-700">
            <h4 className="font-bold text-yellow-400 mb-3">詳細情報</h4>
            <div className="space-y-2 text-sm">
              <p><strong>現在のユーザーID:</strong> <code className="bg-gray-700 px-2 py-1 rounded">{result.currentUserId}</code></p>
              <p><strong>メール:</strong> {result.userEmail}</p>
              <p><strong>データ整合性:</strong> 
                <span className={`ml-2 font-bold ${
                  result.dataConsistency === 'normal' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {result.dataConsistency === 'normal' ? '正常' : '異常'}
                </span>
              </p>
            </div>
          </div>

          {result.uniqueUserIds.length > 0 && (
            <div className="bg-gray-800 p-4 rounded border border-yellow-600">
              <h4 className="font-bold text-yellow-400 mb-3">検出されたuser_ID一覧</h4>
              <div className="space-y-1">
                {result.uniqueUserIds.map((id, index) => (
                  <div key={index} className="text-sm">
                    <code className="bg-gray-700 px-2 py-1 rounded">
                      {id} {id === result.currentUserId && '(現在のユーザー)'}
                    </code>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.sampleData.length > 0 && (
            <div className="bg-gray-800 p-4 rounded border border-gray-700">
              <h4 className="font-bold text-yellow-400 mb-3">サンプルデータ</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left p-2">ID</th>
                      <th className="text-left p-2">日付</th>
                      <th className="text-left p-2">売上</th>
                      <th className="text-left p-2">user_id</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.sampleData.map((sale, index) => (
                      <tr key={index} className="border-b border-gray-700">
                        <td className="p-2">{sale.id?.substring(0, 8)}...</td>
                        <td className="p-2">{sale.date}</td>
                        <td className="p-2">¥{sale.total_sales?.toLocaleString()}</td>
                        <td className="p-2">
                          <code className={`px-1 rounded text-xs ${
                            sale.user_id === result.currentUserId 
                              ? 'bg-green-700' 
                              : 'bg-red-700'
                          }`}>
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

          <div className="bg-yellow-900 border border-yellow-600 p-4 rounded">
            <h4 className="font-bold mb-2">⚠️ 次のアクション</h4>
            {result.rlsStatus === 'not_working' ? (
              <ul className="text-sm space-y-1">
                <li>• RLSポリシーの再作成が必要です</li>
                <li>• 不正なuser_IDのデータをクリーンアップする必要があります</li>
                <li>• Supabaseダッシュボードでポリシーを確認してください</li>
              </ul>
            ) : (
              <p className="text-sm">RLSは正常に動作しています。追加のアクションは不要です。</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}