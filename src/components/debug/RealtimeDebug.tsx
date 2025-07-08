'use client'

import { useState, useEffect } from 'react'
import { supabase, salesAPI } from '@/lib/supabase'
import { authService } from '@/lib/auth'

interface RealtimeDebugInfo {
  currentUserId: string | null
  userEmail: string | null
  activeChannels: Array<{
    topic: string
    state: string
  }>
  testResults: {
    fetchTest: boolean
    subscriptionTest: boolean
    filterTest: boolean
  }
  lastRealtimeEvent: any
  logs: string[]
}

export default function RealtimeDebug() {
  const [debugInfo, setDebugInfo] = useState<RealtimeDebugInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [subscription, setSubscription] = useState<any>(null)
  const [testRunning, setTestRunning] = useState(false)

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const logMessage = `[${timestamp}] ${message}`
    console.log(logMessage)
    setDebugInfo(prev => prev ? {
      ...prev,
      logs: [...prev.logs.slice(-9), logMessage] // 最新10件を保持
    } : null)
  }

  const runRealtimeDebug = async () => {
    setLoading(true)
    setTestRunning(false)
    
    try {
      // ユーザー情報取得
      const { user } = await authService.getCurrentUser()
      if (!user) {
        throw new Error('ユーザーが認証されていません')
      }

      addLog(`リアルタイムデバッグ開始 - ユーザー: ${user.id}`)

      // 現在のチャンネル状況確認
      const channels = supabase.getChannels()
      const channelInfo = channels.map(ch => ({
        topic: ch.topic,
        state: ch.state
      }))

      addLog(`現在のチャンネル数: ${channels.length}`)
      channelInfo.forEach(ch => {
        addLog(`チャンネル: ${ch.topic} (状態: ${ch.state})`)
      })

      setDebugInfo({
        currentUserId: user.id,
        userEmail: user.email || null,
        activeChannels: channelInfo,
        testResults: {
          fetchTest: false,
          subscriptionTest: false,
          filterTest: false
        },
        lastRealtimeEvent: null,
        logs: [`[${new Date().toLocaleTimeString()}] リアルタイムデバッグ開始 - ユーザー: ${user.id}`]
      })

    } catch (error) {
      console.error('リアルタイムデバッグエラー:', error)
      addLog(`エラー: ${error instanceof Error ? error.message : 'unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const runComprehensiveTest = async () => {
    if (!debugInfo) return
    
    setTestRunning(true)
    addLog('=== 包括的テスト開始 ===')

    try {
      // 1. データ取得テスト
      addLog('1. データ取得テスト開始')
      const salesData = await salesAPI.fetchAll()
      addLog(`データ取得完了: ${salesData.length}件`)
      
      // user_idの一意性確認
      const userIds = Array.from(new Set(salesData.map(d => d.user_id)))
      const fetchTestResult = userIds.length <= 1 && userIds[0] === debugInfo.currentUserId
      addLog(`データ取得テスト: ${fetchTestResult ? '✅ 成功' : '❌ 失敗'} (ユーザーID: ${userIds.join(', ')})`)

      // 2. リアルタイム購読テスト
      addLog('2. リアルタイム購読テスト開始')
      
      // 既存の購読をクリーンアップ
      if (subscription) {
        supabase.removeChannel(subscription)
        addLog('既存購読をクリーンアップしました')
      }

      let subscriptionTestResult = false
      let lastEvent: any = null

      const newSubscription = await salesAPI.subscribeToChanges((payload) => {
        addLog(`リアルタイムイベント受信: ${payload.eventType}`)
        addLog(`データuser_id: ${payload.new?.user_id || payload.old?.user_id}`)
        lastEvent = payload
        subscriptionTestResult = true
        
        setDebugInfo(prev => prev ? {
          ...prev,
          lastRealtimeEvent: payload,
          testResults: {
            ...prev.testResults,
            subscriptionTest: true
          }
        } : null)
      })

      setSubscription(newSubscription)
      addLog('リアルタイム購読を開始しました')

      // 3. フィルターテスト（テストデータ作成）
      addLog('3. フィルターテスト - テストデータ作成')
      
      const testData = {
        date: new Date().toISOString().split('T')[0],
        total_sales: 12345,
        group_count: 1,
        notes: `リアルタイムテスト - ${new Date().toLocaleTimeString()}`
      }

      const createdData = await salesAPI.create(testData)
      addLog(`テストデータ作成完了: ID ${createdData.id}`)

      // イベント受信を少し待つ
      setTimeout(async () => {
        // テストデータを削除
        try {
          await salesAPI.delete(createdData.id)
          addLog(`テストデータ削除完了: ID ${createdData.id}`)
        } catch (error) {
          addLog(`テストデータ削除失敗: ${error}`)
        }

        // フィルターテスト結果判定
        const filterTestResult = lastEvent && 
          (lastEvent.new?.user_id === debugInfo.currentUserId || 
           lastEvent.old?.user_id === debugInfo.currentUserId)

        addLog(`フィルターテスト: ${filterTestResult ? '✅ 成功' : '❌ 失敗'}`)

        setDebugInfo(prev => prev ? {
          ...prev,
          testResults: {
            fetchTest: fetchTestResult,
            subscriptionTest: subscriptionTestResult,
            filterTest: filterTestResult
          }
        } : null)

        addLog('=== 包括的テスト完了 ===')
        setTestRunning(false)
      }, 2000)

    } catch (error) {
      addLog(`テストエラー: ${error instanceof Error ? error.message : 'unknown error'}`)
      setTestRunning(false)
    }
  }

  const stopRealtimeSubscription = () => {
    if (subscription) {
      supabase.removeChannel(subscription)
      setSubscription(null)
      addLog('リアルタイム購読を停止しました')
    }
    
    // 全チャンネルクリーンアップ
    salesAPI.unsubscribeAll()
    addLog('全てのリアルタイム購読を停止しました')
  }

  useEffect(() => {
    return () => {
      // コンポーネントアンマウント時のクリーンアップ
      if (subscription) {
        supabase.removeChannel(subscription)
      }
    }
  }, [subscription])

  return (
    <div className="bg-blue-50 p-6 rounded-lg mb-6 border border-blue-200">
      <h3 className="text-lg font-semibold mb-4 text-blue-800">
        📡 リアルタイム同期デバッグツール
      </h3>
      
      <div className="flex gap-2 mb-4">
        <button
          onClick={runRealtimeDebug}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '確認中...' : 'リアルタイム状況確認'}
        </button>

        {debugInfo && (
          <>
            <button
              onClick={runComprehensiveTest}
              disabled={testRunning}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {testRunning ? 'テスト実行中...' : '包括的テスト実行'}
            </button>

            <button
              onClick={stopRealtimeSubscription}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              リアルタイム停止
            </button>
          </>
        )}
      </div>

      {debugInfo && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded border">
              <h4 className="font-semibold text-blue-700 mb-2">ユーザー情報</h4>
              <p><strong>ユーザーID:</strong> <code className="bg-gray-100 px-1 rounded text-sm">{debugInfo.currentUserId}</code></p>
              <p><strong>メール:</strong> {debugInfo.userEmail}</p>
            </div>

            <div className="bg-white p-4 rounded border">
              <h4 className="font-semibold text-blue-700 mb-2">アクティブチャンネル</h4>
              <p><strong>チャンネル数:</strong> {debugInfo.activeChannels.length}</p>
              {debugInfo.activeChannels.map((ch, idx) => (
                <div key={idx} className="text-sm">
                  <code className="bg-gray-100 px-1 rounded">{ch.topic}</code> ({ch.state})
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-4 rounded border">
            <h4 className="font-semibold text-blue-700 mb-2">テスト結果</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className={`p-2 rounded ${debugInfo.testResults.fetchTest ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                <div className="font-medium">データ取得テスト</div>
                <div>{debugInfo.testResults.fetchTest ? '✅ 成功' : '⏳ 未実行'}</div>
              </div>
              <div className={`p-2 rounded ${debugInfo.testResults.subscriptionTest ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                <div className="font-medium">購読テスト</div>
                <div>{debugInfo.testResults.subscriptionTest ? '✅ 成功' : '⏳ 未実行'}</div>
              </div>
              <div className={`p-2 rounded ${debugInfo.testResults.filterTest ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                <div className="font-medium">フィルターテスト</div>
                <div>{debugInfo.testResults.filterTest ? '✅ 成功' : '⏳ 未実行'}</div>
              </div>
            </div>
          </div>

          {debugInfo.lastRealtimeEvent && (
            <div className="bg-white p-4 rounded border">
              <h4 className="font-semibold text-blue-700 mb-2">最新リアルタイムイベント</h4>
              <div className="text-sm space-y-1">
                <p><strong>イベント:</strong> {debugInfo.lastRealtimeEvent.eventType}</p>
                <p><strong>テーブル:</strong> {debugInfo.lastRealtimeEvent.table}</p>
                <p><strong>user_id:</strong> <code className="bg-gray-100 px-1 rounded">
                  {debugInfo.lastRealtimeEvent.new?.user_id || debugInfo.lastRealtimeEvent.old?.user_id}
                </code></p>
              </div>
            </div>
          )}

          <div className="bg-white p-4 rounded border">
            <h4 className="font-semibold text-blue-700 mb-2">ログ</h4>
            <div className="bg-gray-50 p-2 rounded text-xs font-mono max-h-32 overflow-y-auto">
              {debugInfo.logs.map((log, idx) => (
                <div key={idx} className="mb-1">{log}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}