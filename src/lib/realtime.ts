// ============================================
// 改良版リアルタイム同期システム
// ============================================

import React from 'react'
import { supabase } from './supabase'
import { createErrorResponse, safeAsync, logError } from './errorHandler'
import type { ApiResponse, RealtimeCallback, Sale } from '@/types'

// リアルタイム接続状態
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'

// リアルタイム設定
export interface RealtimeConfig {
  reconnectInterval: number
  maxReconnectAttempts: number
  heartbeatInterval: number
  enableLogging: boolean
}

// リアルタイムマネージャークラス
export class RealtimeManager {
  private channels: Map<string, any> = new Map()
  private connectionStatus: ConnectionStatus = 'disconnected'
  private reconnectAttempts: number = 0
  private config: RealtimeConfig
  private statusCallbacks: Set<(status: ConnectionStatus) => void> = new Set()
  private heartbeatInterval?: NodeJS.Timeout

  constructor(config: Partial<RealtimeConfig> = {}) {
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 5,
      heartbeatInterval: 30000,
      enableLogging: true,
      ...config
    }
  }

  /**
   * 接続状態の監視コールバックを追加
   */
  onStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    this.statusCallbacks.add(callback)
    return () => this.statusCallbacks.delete(callback)
  }

  /**
   * 接続状態を更新
   */
  private setStatus(status: ConnectionStatus): void {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status
      if (this.config.enableLogging) {
        console.log(`🔄 Realtime status: ${status}`)
      }
      this.statusCallbacks.forEach(callback => callback(status))
    }
  }

  /**
   * ハートビート開始
   */
  private startHeartbeat(): void {
    this.stopHeartbeat()
    this.heartbeatInterval = setInterval(() => {
      if (this.connectionStatus === 'connected') {
        // 接続チェック
        this.checkConnection()
      }
    }, this.config.heartbeatInterval)
  }

  /**
   * ハートビート停止
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = undefined
    }
  }

  /**
   * 接続確認
   */
  private async checkConnection(): Promise<void> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        this.setStatus('error')
        this.reconnect()
      }
    } catch (error) {
      this.setStatus('error')
      this.reconnect()
    }
  }

  /**
   * 再接続処理
   */
  private async reconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.setStatus('error')
      logError(new Error('Maximum reconnect attempts reached'), 'RealtimeManager.reconnect')
      return
    }

    this.setStatus('reconnecting')
    this.reconnectAttempts++

    setTimeout(async () => {
      try {
        // 既存チャンネルを再作成
        const channelEntries = Array.from(this.channels.entries())
        this.disconnectAll()
        
        for (const [channelId, config] of channelEntries) {
          await this.createChannel(channelId, config.table, config.callback, config.filter)
        }
        
        this.reconnectAttempts = 0
        this.setStatus('connected')
      } catch (error) {
        logError(error, 'RealtimeManager.reconnect')
        this.reconnect()
      }
    }, this.config.reconnectInterval * this.reconnectAttempts)
  }

  /**
   * チャンネル作成（内部用）
   */
  private async createChannel(
    channelId: string,
    table: string,
    callback: RealtimeCallback,
    filter?: string
  ): Promise<void> {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      throw new Error('User not authenticated for realtime subscription')
    }

    const channel = supabase.channel(channelId)
    
    // PostgreSQLの変更をリッスン
    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table,
      ...(filter && { filter })
    }, (payload) => {
      if (this.config.enableLogging) {
        console.log(`📡 Realtime update on ${table}:`, payload)
      }
      
      // セキュリティチェック
      if (table === 'sales') {
        const data = payload.new || payload.old
        if (data && data.user_id && data.user_id !== user.id) {
          // TODO: 店舗ベースモードでの追加チェック
          if (this.config.enableLogging) {
            console.warn('⚠️ Received data from different user, checking permissions...')
          }
        }
      }
      
      callback(payload)
    })

    // チャンネル状態の監視
    channel.subscribe((status) => {
      if (this.config.enableLogging) {
        console.log(`📡 Channel ${channelId} status: ${status}`)
      }
      
      switch (status) {
        case 'SUBSCRIBED':
          this.setStatus('connected')
          break
        case 'CHANNEL_ERROR':
        case 'TIMED_OUT':
          this.setStatus('error')
          this.reconnect()
          break
        case 'CLOSED':
          this.setStatus('disconnected')
          break
      }
    })

    this.channels.set(channelId, {
      channel,
      table,
      callback,
      filter,
      subscribedAt: new Date()
    })
  }

  /**
   * 売上データの変更をリッスン（ユーザーベース）
   */
  async subscribeToUserSales(
    userId: string,
    callback: RealtimeCallback<Sale>
  ): Promise<ApiResponse<string>> {
    return safeAsync(async () => {
      const channelId = `sales-user-${userId}`
      const filter = `user_id=eq.${userId}`
      
      this.setStatus('connecting')
      await this.createChannel(channelId, 'sales', callback, filter)
      this.startHeartbeat()
      
      return channelId
    }).then(result => {
      if (result.error) {
        return createErrorResponse<string>(result.error, 'subscribeToUserSales')
      }
      return { data: result.data, error: null, success: true }
    })
  }

  /**
   * 売上データの変更をリッスン（店舗ベース）
   */
  async subscribeToStoreSales(
    storeId: string,
    callback: RealtimeCallback<Sale>
  ): Promise<ApiResponse<string>> {
    return safeAsync(async () => {
      const channelId = `sales-store-${storeId}`
      const filter = `store_id=eq.${storeId}`
      
      this.setStatus('connecting')
      await this.createChannel(channelId, 'sales', callback, filter)
      this.startHeartbeat()
      
      return channelId
    }).then(result => {
      if (result.error) {
        return createErrorResponse<string>(result.error, 'subscribeToStoreSales')
      }
      return { data: result.data, error: null, success: true }
    })
  }

  /**
   * パイロットモード用（全パイロットユーザーの変更をリッスン）
   */
  async subscribeToPilotSales(
    pilotUsers: string[],
    callback: RealtimeCallback<Sale>
  ): Promise<ApiResponse<string>> {
    return safeAsync(async () => {
      const channelId = 'sales-pilot-mode'
      const filter = `user_id=in.(${pilotUsers.join(',')})`
      
      this.setStatus('connecting')
      await this.createChannel(channelId, 'sales', callback, filter)
      this.startHeartbeat()
      
      return channelId
    }).then(result => {
      if (result.error) {
        return createErrorResponse<string>(result.error, 'subscribeToPilotSales')
      }
      return { data: result.data, error: null, success: true }
    })
  }

  /**
   * 招待状況の変更をリッスン
   */
  async subscribeToInvitations(
    storeId: string,
    callback: RealtimeCallback
  ): Promise<ApiResponse<string>> {
    return safeAsync(async () => {
      const channelId = `invitations-${storeId}`
      const filter = `store_id=eq.${storeId}`
      
      this.setStatus('connecting')
      await this.createChannel(channelId, 'store_invitations', callback, filter)
      
      return channelId
    }).then(result => {
      if (result.error) {
        return createErrorResponse<string>(result.error, 'subscribeToInvitations')
      }
      return { data: result.data, error: null, success: true }
    })
  }

  /**
   * 特定チャンネルの切断
   */
  disconnect(channelId: string): void {
    const channelConfig = this.channels.get(channelId)
    if (channelConfig) {
      supabase.removeChannel(channelConfig.channel)
      this.channels.delete(channelId)
      
      if (this.config.enableLogging) {
        console.log(`📡 Disconnected channel: ${channelId}`)
      }
    }
  }

  /**
   * 全チャンネルの切断
   */
  disconnectAll(): void {
    for (const [channelId, channelConfig] of this.channels) {
      supabase.removeChannel(channelConfig.channel)
    }
    this.channels.clear()
    this.stopHeartbeat()
    this.setStatus('disconnected')
    
    if (this.config.enableLogging) {
      console.log('📡 All realtime channels disconnected')
    }
  }

  /**
   * 接続統計情報
   */
  getStats(): {
    status: ConnectionStatus
    activeChannels: number
    reconnectAttempts: number
    channels: Array<{
      id: string
      table: string
      subscribedAt: Date
    }>
  } {
    return {
      status: this.connectionStatus,
      activeChannels: this.channels.size,
      reconnectAttempts: this.reconnectAttempts,
      channels: Array.from(this.channels.entries()).map(([id, config]) => ({
        id,
        table: config.table,
        subscribedAt: config.subscribedAt
      }))
    }
  }
}

// デフォルトのリアルタイムマネージャーインスタンス
export const realtimeManager = new RealtimeManager({
  enableLogging: process.env['NODE_ENV'] === 'development'
})

// ユーティリティ関数
export const subscribeToUserSales = realtimeManager.subscribeToUserSales.bind(realtimeManager)
export const subscribeToStoreSales = realtimeManager.subscribeToStoreSales.bind(realtimeManager)
export const subscribeToPilotSales = realtimeManager.subscribeToPilotSales.bind(realtimeManager)
export const subscribeToInvitations = realtimeManager.subscribeToInvitations.bind(realtimeManager)
export const disconnectRealtime = realtimeManager.disconnectAll.bind(realtimeManager)

// React用フック
export const useRealtimeStatus = () => {
  const [status, setStatus] = React.useState<ConnectionStatus>('disconnected')
  
  React.useEffect(() => {
    return realtimeManager.onStatusChange(setStatus)
  }, [])
  
  return status
}

// Next.js用のクリーンアップ
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    realtimeManager.disconnectAll()
  })
}