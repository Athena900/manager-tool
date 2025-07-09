// ============================================
// 管理者パネル - システム制御コンポーネント
// ============================================

'use client'

import React, { useState, useEffect } from 'react'
import { 
  Settings, 
  Users, 
  Database, 
  Shield, 
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  ArrowRight
} from 'lucide-react'
import { 
  Button, 
  Modal, 
  ModalContent, 
  ModalFooter,
  Alert,
  SuccessAlert,
  ErrorAlert,
  LoadingSpinner 
} from '@/components/ui'
import { 
  getSystemConfig, 
  updateSystemMode, 
  diagnoseRLSSystem,
  migratePilotToStoreMode,
  cleanupPilotData,
  checkAdminPermissions,
  type SystemConfig,
  type RLSDiagnostic,
  type SystemMode
} from '@/lib/admin'

interface AdminPanelProps {
  isOpen: boolean
  onClose: () => void
}

export default function AdminPanel({ isOpen, onClose }: AdminPanelProps) {
  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState<SystemConfig | null>(null)
  const [diagnostics, setDiagnostics] = useState<RLSDiagnostic[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'migration' | 'diagnostics'>('overview')
  const [migrationLoading, setMigrationLoading] = useState(false)
  const [migrationResult, setMigrationResult] = useState<string>('')

  useEffect(() => {
    if (isOpen) {
      checkPermissions()
      loadSystemData()
    }
  }, [isOpen])

  const checkPermissions = async () => {
    const response = await checkAdminPermissions()
    setIsAdmin(response.success && response.data === true)
  }

  const loadSystemData = async () => {
    setLoading(true)
    try {
      const [configResponse, diagnosticsResponse] = await Promise.all([
        getSystemConfig(),
        diagnoseRLSSystem()
      ])

      if (configResponse.success) {
        setConfig(configResponse.data)
      }

      if (diagnosticsResponse.success) {
        setDiagnostics(diagnosticsResponse.data || [])
      }
    } catch (error) {
      console.error('システムデータ取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleModeSwitch = async (mode: SystemMode) => {
    if (!confirm(`システムモードを "${mode}" に変更しますか？`)) return

    setLoading(true)
    try {
      const response = await updateSystemMode(mode)
      if (response.success) {
        await loadSystemData()
        alert('システムモードを変更しました')
      } else {
        alert(`エラー: ${response.error?.message}`)
      }
    } catch (error) {
      console.error('モード変更エラー:', error)
      alert('モード変更に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleMigration = async () => {
    if (!confirm('パイロットモードから店舗ベースモードに移行します。この操作は取り消せません。続行しますか？')) return

    setMigrationLoading(true)
    try {
      const response = await migratePilotToStoreMode('バー店舗')
      if (response.success) {
        setMigrationResult(`移行完了: 店舗ID ${response.data}`)
        await loadSystemData()
      } else {
        setMigrationResult(`移行失敗: ${response.error?.message}`)
      }
    } catch (error) {
      console.error('移行エラー:', error)
      setMigrationResult('移行中にエラーが発生しました')
    } finally {
      setMigrationLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
      case 'enabled':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'inactive':
      case 'disabled':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />
      default:
        return <Activity className="w-5 h-5 text-blue-500" />
    }
  }

  const getCurrentModeDisplay = () => {
    if (!config) return '不明'
    
    switch (config.system_mode.current) {
      case 'pilot':
        return 'パイロットモード (実証実験)'
      case 'store_based':
        return '店舗ベースモード (本格運用)'
      case 'individual':
        return '個人モード (従来方式)'
      default:
        return config.system_mode.current
    }
  }

  if (!isOpen) return null

  if (!isAdmin) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="アクセス拒否">
        <ModalContent>
          <ErrorAlert>
            管理者権限が必要です。このパネルにアクセスする権限がありません。
          </ErrorAlert>
        </ModalContent>
        <ModalFooter>
          <Button onClick={onClose}>閉じる</Button>
        </ModalFooter>
      </Modal>
    )
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="システム管理パネル" 
      size="xl"
      closeOnOverlayClick={false}
    >
      <div className="h-96 overflow-y-auto">
        {/* タブナビゲーション */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {[
            { key: 'overview', label: '概要', icon: Settings },
            { key: 'migration', label: '移行管理', icon: ArrowRight },
            { key: 'diagnostics', label: '診断', icon: Activity }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
                activeTab === tab.key 
                  ? 'border-b-2 border-blue-500 text-blue-600' 
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <ModalContent>
          {loading && (
            <div className="flex justify-center py-8">
              <LoadingSpinner text="システムデータを読み込み中..." />
            </div>
          )}

          {!loading && activeTab === 'overview' && (
            <div className="space-y-6">
              {/* システム状態 */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  現在のシステム状態
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">動作モード</label>
                    <p className="text-lg font-semibold">{getCurrentModeDisplay()}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">パイロットモード</label>
                    <div className="flex items-center gap-2">
                      {config?.pilot_mode.enabled ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-gray-400" />
                      )}
                      <span>{config?.pilot_mode.enabled ? '有効' : '無効'}</span>
                    </div>
                  </div>
                </div>

                {config?.pilot_mode.enabled && (
                  <div className="mt-4">
                    <label className="text-sm font-medium text-gray-600">
                      パイロットユーザー ({config.pilot_mode.users.length}人)
                    </label>
                    <div className="text-sm text-gray-500 font-mono">
                      {config.pilot_mode.users.slice(0, 2).join(', ')}
                      {config.pilot_mode.users.length > 2 && '...'}
                    </div>
                  </div>
                )}
              </div>

              {/* モード切替 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">システムモード切替</h3>
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    variant={config?.system_mode.current === 'pilot' ? 'success' : 'secondary'}
                    onClick={() => handleModeSwitch('pilot')}
                    disabled={loading}
                    fullWidth
                  >
                    パイロット
                  </Button>
                  <Button
                    variant={config?.system_mode.current === 'store_based' ? 'success' : 'secondary'}
                    onClick={() => handleModeSwitch('store_based')}
                    disabled={loading}
                    fullWidth
                  >
                    店舗ベース
                  </Button>
                  <Button
                    variant={config?.system_mode.current === 'individual' ? 'success' : 'secondary'}
                    onClick={() => handleModeSwitch('individual')}
                    disabled={loading}
                    fullWidth
                  >
                    個人モード
                  </Button>
                </div>
              </div>
            </div>
          )}

          {!loading && activeTab === 'migration' && (
            <div className="space-y-6">
              <Alert variant="info">
                <div>
                  <strong>移行について</strong>
                  <p className="mt-1">
                    パイロットモードから店舗ベースモードに移行すると、既存のデータが新しい店舗に統合されます。
                    この操作は取り消せません。
                  </p>
                </div>
              </Alert>

              {config?.system_mode.current === 'pilot' && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3">パイロット → 店舗ベース移行</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    現在のパイロットユーザー（{config.pilot_mode.users.length}人）を
                    1つの店舗のメンバーとして統合します。
                  </p>
                  
                  <Button
                    variant="warning"
                    onClick={handleMigration}
                    loading={migrationLoading}
                    leftIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    移行を実行
                  </Button>
                </div>
              )}

              {migrationResult && (
                <Alert variant={migrationResult.includes('完了') ? 'success' : 'error'}>
                  {migrationResult}
                </Alert>
              )}

              {config?.system_mode.current !== 'pilot' && (
                <Alert variant="warning">
                  現在のモードでは移行操作は利用できません。
                </Alert>
              )}
            </div>
          )}

          {!loading && activeTab === 'diagnostics' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">システム診断結果</h3>
                <Button
                  variant="secondary"
                  onClick={loadSystemData}
                  leftIcon={<RefreshCw className="w-4 h-4" />}
                  size="sm"
                >
                  更新
                </Button>
              </div>

              <div className="space-y-3">
                {diagnostics.map((diagnostic, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(diagnostic.status)}
                      <span className="font-semibold">{diagnostic.check_name}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        diagnostic.status === 'active' || diagnostic.status === 'enabled'
                          ? 'bg-green-100 text-green-800'
                          : diagnostic.status === 'inactive' || diagnostic.status === 'disabled'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {diagnostic.status}
                      </span>
                    </div>
                    <pre className="text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto">
                      {JSON.stringify(diagnostic.details, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ModalContent>
      </div>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          閉じる
        </Button>
        <Button onClick={loadSystemData} loading={loading}>
          更新
        </Button>
      </ModalFooter>
    </Modal>
  )
}