'use client'

import { useState, useEffect } from 'react'
import { supabase, salesAPI } from '@/lib/supabase'
import { authService } from '@/lib/auth'

interface DataIsolationTestResults {
  currentUser: {
    id: string | null
    email: string | null
  } | null
  sessionValid: boolean
  profileInfo: {
    exists: boolean
    storeName: string | null
  }
  dataAccessTests: {
    explicitFilterCount: number
    rlsOnlyCount: number
    uniqueUserIds: string[]
    dataIsolationStatus: string
    allUserIdsMatch: boolean
  }
  securityChecks: {
    hasNullUserIds: boolean
    invalidDataFound: boolean
    rlsWorking: boolean
  }
  overallStatus: string
  errors: string[]
  testTime: string
}

export default function DataIsolationTest() {
  const [testResults, setTestResults] = useState<DataIsolationTestResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const runComprehensiveTest = async () => {
    setLoading(true)
    const errors: string[] = []
    
    try {
      console.log('=== 完全データ分離テスト開始 ===')
      
      // 1. 認証状態確認
      const { user, error: userError } = await authService.getCurrentUser()
      if (userError) {
        errors.push(`認証エラー: ${userError.message}`)
      }
      
      const { session, error: sessionError } = await authService.getCurrentSession()
      if (sessionError) {
        errors.push(`セッションエラー: ${sessionError.message}`)
      }
      
      // 2. プロフィール確認
      let profileInfo = {
        exists: false,
        storeName: null
      }
      
      if (user) {
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .single()
          
          if (profileError && profileError.code !== 'PGRST116') {
            errors.push(`プロフィールエラー: ${profileError.message}`)
          }
          
          profileInfo = {
            exists: !!profile,
            storeName: profile?.store_name || null
          }
        } catch (profileErr) {
          errors.push(`プロフィール確認例外: ${profileErr}`)
        }
      }
      
      // 3. データアクセステスト
      let dataAccessTests = {
        explicitFilterCount: 0,
        rlsOnlyCount: 0,
        uniqueUserIds: [],
        dataIsolationStatus: '❌ 未テスト',
        allUserIdsMatch: false
      }
      
      if (user) {
        try {
          // A. 明示的フィルターでのデータ取得
          console.log('明示的フィルターテスト開始')
          const { data: explicitData, error: explicitError } = await supabase
            .from('sales')
            .select('id, user_id, date, total_sales')
            .eq('user_id', user.id)
          
          if (explicitError) {
            errors.push(`明示的フィルターエラー: ${explicitError.message}`)
          } else {
            dataAccessTests.explicitFilterCount = explicitData?.length || 0
            console.log(`明示的フィルター結果: ${dataAccessTests.explicitFilterCount}件`)
          }
          
          // B. RLSのみでのデータ取得
          console.log('RLSのみテスト開始')
          const { data: rlsData, error: rlsError } = await supabase
            .from('sales')
            .select('id, user_id, date, total_sales')
          
          if (rlsError) {
            errors.push(`RLSテストエラー: ${rlsError.message}`)
          } else {
            dataAccessTests.rlsOnlyCount = rlsData?.length || 0
            console.log(`RLSのみ結果: ${dataAccessTests.rlsOnlyCount}件`)
            
            // C. user_idの一意性確認
            const userIds = Array.from(new Set(rlsData?.map(d => d.user_id).filter(Boolean) || []))
            dataAccessTests.uniqueUserIds = userIds
            dataAccessTests.allUserIdsMatch = userIds.length === 0 || (userIds.length === 1 && userIds[0] === user.id)
            
            console.log('検出されたuser_id:', userIds)
            console.log('user_id一致状況:', dataAccessTests.allUserIdsMatch)
          }
          
          // D. データ分離ステータス判定
          if (dataAccessTests.explicitFilterCount === dataAccessTests.rlsOnlyCount && 
              dataAccessTests.allUserIdsMatch) {
            dataAccessTests.dataIsolationStatus = '✅ 正常'
          } else {
            dataAccessTests.dataIsolationStatus = '🚨 異常'
            errors.push(`データ分離失敗: 明示的=${dataAccessTests.explicitFilterCount}, RLS=${dataAccessTests.rlsOnlyCount}, user_id一致=${dataAccessTests.allUserIdsMatch}`)
          }
          
        } catch (dataErr) {
          errors.push(`データアクセステスト例外: ${dataErr}`)
        }
      }
      
      // 4. セキュリティチェック
      let securityChecks = {
        hasNullUserIds: false,
        invalidDataFound: false,
        rlsWorking: false
      }
      
      if (user) {
        try {
          // salesAPI経由でのデータ取得テスト
          console.log('salesAPIセキュリティテスト開始')
          const salesApiData = await salesAPI.fetchAll()
          
          // NULL user_idチェック
          const nullUserIdData = salesApiData.filter(item => !item.user_id)
          securityChecks.hasNullUserIds = nullUserIdData.length > 0
          
          // 不正データチェック
          const invalidUserIdData = salesApiData.filter(item => item.user_id && item.user_id !== user.id)
          securityChecks.invalidDataFound = invalidUserIdData.length > 0
          
          // RLS動作確認
          securityChecks.rlsWorking = dataAccessTests.explicitFilterCount === dataAccessTests.rlsOnlyCount
          
          if (securityChecks.hasNullUserIds) {
            errors.push(`NULLユーザーIDデータ発見: ${nullUserIdData.length}件`)
          }
          
          if (securityChecks.invalidDataFound) {
            errors.push(`不正ユーザーIDデータ発見: ${invalidUserIdData.length}件`)
          }
          
          console.log('セキュリティチェック完了')
          
        } catch (securityErr) {
          errors.push(`セキュリティチェック例外: ${securityErr}`)
        }
      }
      
      // 5. 総合ステータス判定
      let overallStatus = '❌ 問題あり'
      if (errors.length === 0 && 
          user && 
          session && 
          profileInfo.exists && 
          dataAccessTests.dataIsolationStatus === '✅ 正常' &&
          !securityChecks.hasNullUserIds &&
          !securityChecks.invalidDataFound &&
          securityChecks.rlsWorking) {
        overallStatus = '✅ 完全正常'
      } else if (errors.length === 0 && dataAccessTests.dataIsolationStatus === '✅ 正常') {
        overallStatus = '⚠️ 軽微な問題'
      }
      
      setTestResults({
        currentUser: user ? {
          id: user.id,
          email: user.email || null
        } : null,
        sessionValid: !!session,
        profileInfo,
        dataAccessTests,
        securityChecks,
        overallStatus,
        errors,
        testTime: new Date().toLocaleTimeString()
      })
      
      console.log('=== 完全データ分離テスト完了 ===')
      console.log('総合結果:', overallStatus)
      
    } catch (error) {
      console.error('テスト実行エラー:', error)
      errors.push(`テスト実行例外: ${error instanceof Error ? error.message : 'Unknown error'}`)
      
      setTestResults({
        currentUser: null,
        sessionValid: false,
        profileInfo: { exists: false, storeName: null },
        dataAccessTests: {
          explicitFilterCount: 0,
          rlsOnlyCount: 0,
          uniqueUserIds: [],
          dataIsolationStatus: '❌ テスト失敗',
          allUserIdsMatch: false
        },
        securityChecks: {
          hasNullUserIds: false,
          invalidDataFound: false,
          rlsWorking: false
        },
        overallStatus: '❌ テスト失敗',
        errors,
        testTime: new Date().toLocaleTimeString()
      })
    } finally {
      setLoading(false)
    }
  }

  // オートリフレッシュ機能
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(runComprehensiveTest, 5000) // 5秒間隔
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  // 初回実行
  useEffect(() => {
    runComprehensiveTest()
  }, [])

  return (
    <div className="bg-red-50 p-6 rounded-lg mb-6 border border-red-200">
      <h3 className="text-lg font-semibold mb-4 text-red-800">
        🔒 完全データ分離テスト
      </h3>
      
      <div className="flex gap-2 mb-4">
        <button
          onClick={runComprehensiveTest}
          disabled={loading}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? 'テスト実行中...' : '包括的テスト実行'}
        </button>

        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={`px-4 py-2 rounded ${
            autoRefresh 
              ? 'bg-orange-600 text-white hover:bg-orange-700' 
              : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
          }`}
        >
          {autoRefresh ? '自動更新停止' : '自動更新開始'}
        </button>
      </div>

      {testResults && (
        <div className="space-y-4">
          {/* 総合ステータス */}
          <div className={`p-4 rounded-lg border-2 ${
            testResults.overallStatus === '✅ 完全正常' 
              ? 'bg-green-100 border-green-500 text-green-800'
              : testResults.overallStatus === '⚠️ 軽微な問題'
              ? 'bg-yellow-100 border-yellow-500 text-yellow-800'
              : 'bg-red-100 border-red-500 text-red-800'
          }`}>
            <h4 className="font-semibold text-lg">{testResults.overallStatus}</h4>
            <p className="text-sm">最終テスト実行: {testResults.testTime}</p>
          </div>

          {/* エラー表示 */}
          {testResults.errors.length > 0 && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <h4 className="font-semibold mb-2">🚨 検出されたエラー ({testResults.errors.length}件)</h4>
              <ul className="text-sm space-y-1">
                {testResults.errors.map((error, idx) => (
                  <li key={idx} className="break-words">• {error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 認証・プロフィール状況 */}
            <div className="bg-white p-4 rounded border">
              <h4 className="font-semibold text-red-700 mb-2">認証・プロフィール状況</h4>
              <div className="text-sm space-y-1">
                <p><strong>ユーザーID:</strong> {testResults.currentUser?.id ? (
                  <code className="bg-gray-100 px-1 rounded text-xs">{testResults.currentUser.id.substring(0, 8)}...</code>
                ) : '❌ なし'}</p>
                <p><strong>メール:</strong> {testResults.currentUser?.email || '❌ なし'}</p>
                <p><strong>セッション:</strong> {testResults.sessionValid ? '✅ 有効' : '❌ 無効'}</p>
                <p><strong>プロフィール:</strong> {testResults.profileInfo.exists ? '✅ 存在' : '❌ なし'}</p>
                <p><strong>店舗名:</strong> {testResults.profileInfo.storeName || '❌ なし'}</p>
              </div>
            </div>

            {/* データアクセステスト */}
            <div className="bg-white p-4 rounded border">
              <h4 className="font-semibold text-red-700 mb-2">データアクセステスト</h4>
              <div className="text-sm space-y-1">
                <p><strong>明示的フィルター:</strong> {testResults.dataAccessTests.explicitFilterCount}件</p>
                <p><strong>RLSのみ:</strong> {testResults.dataAccessTests.rlsOnlyCount}件</p>
                <p><strong>検出user_id数:</strong> {testResults.dataAccessTests.uniqueUserIds.length}種類</p>
                <p><strong>user_ID一致:</strong> {testResults.dataAccessTests.allUserIdsMatch ? '✅ 正常' : '❌ 異常'}</p>
                <p><strong>分離ステータス:</strong> {testResults.dataAccessTests.dataIsolationStatus}</p>
              </div>
            </div>

            {/* セキュリティチェック */}
            <div className="bg-white p-4 rounded border">
              <h4 className="font-semibold text-red-700 mb-2">セキュリティチェック</h4>
              <div className="text-sm space-y-1">
                <p><strong>NULL user_id:</strong> {testResults.securityChecks.hasNullUserIds ? '🚨 発見' : '✅ なし'}</p>
                <p><strong>不正データ:</strong> {testResults.securityChecks.invalidDataFound ? '🚨 発見' : '✅ なし'}</p>
                <p><strong>RLS動作:</strong> {testResults.securityChecks.rlsWorking ? '✅ 正常' : '❌ 異常'}</p>
              </div>
            </div>

            {/* 検出user_id詳細 */}
            <div className="bg-white p-4 rounded border">
              <h4 className="font-semibold text-red-700 mb-2">検出user_ID詳細</h4>
              <div className="text-sm">
                {testResults.dataAccessTests.uniqueUserIds.length > 0 ? (
                  <div className="space-y-1">
                    {testResults.dataAccessTests.uniqueUserIds.map((id, idx) => (
                      <p key={idx} className="font-mono text-xs">
                        <code className="bg-gray-100 px-1 rounded">{id.substring(0, 12)}...</code>
                        {id === testResults.currentUser?.id && <span className="text-green-600 ml-2">（現在のユーザー）</span>}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">user_IDなし</p>
                )}
              </div>
            </div>
          </div>

          {autoRefresh && (
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded text-sm">
              🔄 自動更新中 - 5秒間隔でテストを実行しています
            </div>
          )}
        </div>
      )}
    </div>
  )
}