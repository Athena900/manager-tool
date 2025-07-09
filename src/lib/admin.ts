// ============================================
// 管理者用システム制御API
// ============================================

import { supabase } from './supabase'
import { createErrorResponse, safeAsync } from './errorHandler'
import type { ApiResponse } from '@/types'

// システムモード
export type SystemMode = 'pilot' | 'store_based' | 'individual'

// システム設定
export interface SystemConfig {
  pilot_mode: {
    enabled: boolean
    users: string[]
    disabled_at?: string
  }
  rls_policies: {
    store_based: boolean
    pilot_override: boolean
  }
  system_mode: {
    current: SystemMode
    transition_date?: string
    updated_at?: string
  }
}

// RLS診断結果
export interface RLSDiagnostic {
  check_name: string
  status: 'active' | 'inactive' | 'enabled' | 'disabled' | 'info'
  details: Record<string, unknown>
}

// ユーザー権限
export interface UserPermissions {
  mode: 'pilot' | 'store_owner' | 'store_manager' | 'store_staff' | 'individual' | 'no_access'
  can_read: boolean
  can_write: boolean
  can_delete: boolean
  can_invite: boolean
  can_manage_members?: boolean
  scope: 'all_pilot_data' | 'store_data' | 'user_data' | 'none'
}

// ============================================
// システム設定管理
// ============================================

/**
 * 現在のシステム設定を取得
 */
export const getSystemConfig = async (): Promise<ApiResponse<SystemConfig>> => {
  return safeAsync(async () => {
    const { data, error } = await supabase
      .from('system_config')
      .select('config_key, config_value')
      .in('config_key', ['pilot_mode', 'rls_policies', 'system_mode'])

    if (error) throw error

    const config = data.reduce((acc, item) => {
      acc[item.config_key as keyof SystemConfig] = item.config_value
      return acc
    }, {} as SystemConfig)

    return config
  }).then(result => {
    if (result.error) {
      return createErrorResponse<SystemConfig>(result.error, 'getSystemConfig')
    }
    return { data: result.data, error: null, success: true }
  })
}

/**
 * システムモードを変更
 */
export const updateSystemMode = async (
  mode: SystemMode,
  transitionDate?: Date
): Promise<ApiResponse<void>> => {
  return safeAsync(async () => {
    const { error } = await supabase.rpc('update_system_mode', {
      new_mode: mode,
      transition_date: transitionDate?.toISOString() || null
    })

    if (error) throw error
  }).then(result => {
    if (result.error) {
      return createErrorResponse<void>(result.error, 'updateSystemMode')
    }
    return { data: null, error: null, success: true }
  })
}

/**
 * パイロットモード設定を更新
 */
export const updatePilotMode = async (
  enabled: boolean,
  users: string[] = []
): Promise<ApiResponse<void>> => {
  return safeAsync(async () => {
    const configValue = {
      enabled,
      users,
      ...(enabled ? {} : { disabled_at: new Date().toISOString() })
    }

    const { error } = await supabase
      .from('system_config')
      .update({ config_value: configValue })
      .eq('config_key', 'pilot_mode')

    if (error) throw error
  }).then(result => {
    if (result.error) {
      return createErrorResponse<void>(result.error, 'updatePilotMode')
    }
    return { data: null, error: null, success: true }
  })
}

// ============================================
// RLS診断・監視
// ============================================

/**
 * RLSシステムの包括的診断
 */
export const diagnoseRLSSystem = async (): Promise<ApiResponse<RLSDiagnostic[]>> => {
  return safeAsync(async () => {
    const { data, error } = await supabase.rpc('diagnose_rls_system')

    if (error) throw error

    return data as RLSDiagnostic[]
  }).then(result => {
    if (result.error) {
      return createErrorResponse<RLSDiagnostic[]>(result.error, 'diagnoseRLSSystem')
    }
    return { data: result.data, error: null, success: true }
  })
}

/**
 * 特定ユーザーの権限を取得
 */
export const getUserPermissions = async (
  userId: string,
  storeId?: string
): Promise<ApiResponse<UserPermissions>> => {
  return safeAsync(async () => {
    const { data, error } = await supabase.rpc('get_user_permissions', {
      user_id: userId,
      store_id: storeId || null
    })

    if (error) throw error

    return data as UserPermissions
  }).then(result => {
    if (result.error) {
      return createErrorResponse<UserPermissions>(result.error, 'getUserPermissions')
    }
    return { data: result.data, error: null, success: true }
  })
}

/**
 * 現在のユーザーの権限を取得
 */
export const getCurrentUserPermissions = async (
  storeId?: string
): Promise<ApiResponse<UserPermissions>> => {
  return safeAsync(async () => {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      throw new Error('ユーザーが認証されていません')
    }

    return getUserPermissions(user.id, storeId).then(result => result.data)
  }).then(result => {
    if (result.error) {
      return createErrorResponse<UserPermissions>(result.error, 'getCurrentUserPermissions')
    }
    return { data: result.data, error: null, success: true }
  })
}

// ============================================
// システム移行管理
// ============================================

/**
 * パイロットモードから店舗ベースモードへの移行
 */
export const migratePilotToStoreMode = async (
  defaultStoreName: string = 'メイン店舗'
): Promise<ApiResponse<string>> => {
  return safeAsync(async () => {
    // 1. パイロットユーザーを確認
    const configResponse = await getSystemConfig()
    if (!configResponse.success || !configResponse.data) {
      throw new Error('システム設定の取得に失敗しました')
    }

    const pilotUsers = configResponse.data.pilot_mode.users

    if (pilotUsers.length === 0) {
      throw new Error('パイロットユーザーが見つかりません')
    }

    // 2. メイン店舗を作成（最初のパイロットユーザーがオーナー）
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .insert({
        name: defaultStoreName,
        owner_id: pilotUsers[0],
        description: 'パイロットモードから移行されたメイン店舗'
      })
      .select()
      .single()

    if (storeError) throw storeError

    // 3. 全パイロットユーザーをメンバーとして追加
    const members = pilotUsers.map((userId, index) => ({
      store_id: store.id,
      user_id: userId,
      role: index === 0 ? 'owner' : 'manager',
      invited_by: pilotUsers[0]
    }))

    const { error: membersError } = await supabase
      .from('store_members')
      .insert(members)

    if (membersError) throw membersError

    // 4. 既存のsalesデータにstore_idを追加
    const { error: salesUpdateError } = await supabase
      .from('sales')
      .update({ store_id: store.id })
      .in('user_id', pilotUsers)

    if (salesUpdateError) throw salesUpdateError

    // 5. システムモードを店舗ベースに変更
    await updateSystemMode('store_based', new Date())

    console.log('✅ パイロットモードから店舗ベースモードへの移行完了')
    return store.id
  }).then(result => {
    if (result.error) {
      return createErrorResponse<string>(result.error, 'migratePilotToStoreMode')
    }
    return { data: result.data, error: null, success: true }
  })
}

/**
 * データクリーンアップ（パイロット終了時）
 */
export const cleanupPilotData = async (
  keepUsers: string[] = []
): Promise<ApiResponse<number>> => {
  return safeAsync(async () => {
    const configResponse = await getSystemConfig()
    if (!configResponse.success || !configResponse.data) {
      throw new Error('システム設定の取得に失敗しました')
    }

    const pilotUsers = configResponse.data.pilot_mode.users
    const usersToDelete = pilotUsers.filter(user => !keepUsers.includes(user))

    if (usersToDelete.length === 0) {
      return 0
    }

    const { data, error } = await supabase
      .from('sales')
      .delete()
      .in('user_id', usersToDelete)
      .select('id')

    if (error) throw error

    console.log(`✅ ${data.length}件のパイロットデータを削除しました`)
    return data.length
  }).then(result => {
    if (result.error) {
      return createErrorResponse<number>(result.error, 'cleanupPilotData')
    }
    return { data: result.data, error: null, success: true }
  })
}

// ============================================
// 管理者権限チェック
// ============================================

/**
 * 現在のユーザーが管理者権限を持つかチェック
 */
export const checkAdminPermissions = async (): Promise<ApiResponse<boolean>> => {
  return safeAsync(async () => {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return false
    }

    // パイロットユーザーの場合は管理者権限あり
    const configResponse = await getSystemConfig()
    if (configResponse.success && configResponse.data) {
      const pilotUsers = configResponse.data.pilot_mode.users
      if (pilotUsers.includes(user.id)) {
        return true
      }
    }

    // 店舗オーナーの場合は管理者権限あり
    const { data: ownerStores, error: ownerError } = await supabase
      .from('stores')
      .select('id')
      .eq('owner_id', user.id)

    if (ownerError) throw ownerError

    return ownerStores.length > 0
  }).then(result => {
    if (result.error) {
      return createErrorResponse<boolean>(result.error, 'checkAdminPermissions')
    }
    return { data: result.data, error: null, success: true }
  })
}