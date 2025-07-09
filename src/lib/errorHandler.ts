// ============================================
// 統一エラーハンドリングシステム
// ============================================

import type { ApiError } from '@/types'

// エラー種別の定義
export enum ErrorType {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  NETWORK = 'NETWORK',
  DATABASE = 'DATABASE',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT',
  INTERNAL_SERVER = 'INTERNAL_SERVER',
  UNKNOWN = 'UNKNOWN'
}

// カスタムエラークラス
export class AppError extends Error {
  public readonly type: ErrorType
  public readonly code?: string
  public readonly details?: Record<string, unknown>
  public readonly userMessage: string

  constructor(
    type: ErrorType,
    message: string,
    userMessage?: string,
    code?: string,
    details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'AppError'
    this.type = type
    this.code = code
    this.details = details
    this.userMessage = userMessage || message
  }
}

// Supabaseエラーコードマッピング
const SUPABASE_ERROR_MAP: Record<string, { type: ErrorType; userMessage: string }> = {
  'PGRST301': {
    type: ErrorType.AUTHORIZATION,
    userMessage: 'このデータにアクセスする権限がありません'
  },
  'PGRST116': {
    type: ErrorType.NOT_FOUND,
    userMessage: 'データが見つかりません'
  },
  '23505': {
    type: ErrorType.VALIDATION,
    userMessage: 'データが重複しています'
  },
  '23503': {
    type: ErrorType.VALIDATION,
    userMessage: '関連するデータが存在しません'
  },
  '42501': {
    type: ErrorType.AUTHORIZATION,
    userMessage: 'この操作を実行する権限がありません'
  },
  'auth.session_not_found': {
    type: ErrorType.AUTHENTICATION,
    userMessage: 'ログインセッションが見つかりません。再ログインしてください'
  },
  'auth.invalid_credentials': {
    type: ErrorType.AUTHENTICATION,
    userMessage: 'メールアドレスまたはパスワードが正しくありません'
  }
}

// エラー解析関数
export function parseError(error: unknown): AppError {
  // すでにAppErrorの場合はそのまま返す
  if (error instanceof AppError) {
    return error
  }

  // Supabaseエラーの場合
  if (isSupabaseError(error)) {
    const mapping = SUPABASE_ERROR_MAP[error.code] || SUPABASE_ERROR_MAP[error.error_description] || {
      type: ErrorType.DATABASE,
      userMessage: 'データベースエラーが発生しました'
    }

    return new AppError(
      mapping.type,
      error.message,
      mapping.userMessage,
      error.code,
      { originalError: error }
    )
  }

  // ネットワークエラーの場合
  if (isNetworkError(error)) {
    return new AppError(
      ErrorType.NETWORK,
      'Network request failed',
      'ネットワークエラーが発生しました。接続を確認してください',
      'NETWORK_ERROR',
      { originalError: error }
    )
  }

  // Errorオブジェクトの場合
  if (error instanceof Error) {
    return new AppError(
      ErrorType.UNKNOWN,
      error.message,
      '予期しないエラーが発生しました',
      undefined,
      { originalError: error }
    )
  }

  // その他の場合
  return new AppError(
    ErrorType.UNKNOWN,
    String(error),
    '予期しないエラーが発生しました',
    undefined,
    { originalError: error }
  )
}

// Supabaseエラーかどうかを判定
function isSupabaseError(error: unknown): error is { code: string; message: string; error_description?: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  )
}

// ネットワークエラーかどうかを判定
function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.name === 'NetworkError' ||
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('connection')
    )
  }
  return false
}

// エラーログ関数
export function logError(error: AppError, context?: string): void {
  const logData = {
    timestamp: new Date().toISOString(),
    type: error.type,
    message: error.message,
    userMessage: error.userMessage,
    code: error.code,
    context,
    details: error.details,
    stack: error.stack
  }

  // 開発環境では詳細ログ
  if (process.env['NODE_ENV'] === 'development') {
    console.error('🚨 AppError:', logData)
  } else {
    // 本番環境では必要最小限のログ
    console.error('AppError:', {
      type: error.type,
      code: error.code,
      context,
      timestamp: logData.timestamp
    })
  }

  // TODO: 本番環境では外部ログサービスに送信
  // sendToLogService(logData)
}

// エラーレスポンス作成関数
export function createErrorResponse<T>(error: unknown, context?: string): { data: T | null; error: ApiError; success: false } {
  const appError = parseError(error)
  logError(appError, context)

  return {
    data: null,
    error: {
      message: appError.userMessage,
      code: appError.code,
      details: appError.details
    },
    success: false
  }
}

// 安全なtry-catch wrapper
export async function safeAsync<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<{ data: T | null; error: AppError | null }> {
  try {
    const data = await operation()
    return { data, error: null }
  } catch (error) {
    const appError = parseError(error)
    logError(appError, context)
    return { data: null, error: appError }
  }
}

// バリデーションエラー作成
export function createValidationError(field: string, message: string): AppError {
  return new AppError(
    ErrorType.VALIDATION,
    `Validation failed for ${field}: ${message}`,
    `${field}: ${message}`,
    'VALIDATION_ERROR',
    { field }
  )
}

// 認証エラー作成
export function createAuthError(message: string = 'ユーザーが認証されていません'): AppError {
  return new AppError(
    ErrorType.AUTHENTICATION,
    'Authentication required',
    message,
    'AUTH_REQUIRED'
  )
}

// 認可エラー作成
export function createAuthorizationError(action: string): AppError {
  return new AppError(
    ErrorType.AUTHORIZATION,
    `Authorization failed for action: ${action}`,
    'この操作を実行する権限がありません',
    'AUTHORIZATION_FAILED',
    { action }
  )
}

// リソースが見つからないエラー作成
export function createNotFoundError(resource: string, id?: string): AppError {
  return new AppError(
    ErrorType.NOT_FOUND,
    `${resource} not found${id ? ` with id: ${id}` : ''}`,
    `${resource}が見つかりません`,
    'NOT_FOUND',
    { resource, id }
  )
}