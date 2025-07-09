// ============================================
// エラーハンドリングシステムのテスト
// ============================================

import {
  AppError,
  ErrorType,
  parseError,
  createValidationError,
  createAuthError,
  createAuthorizationError,
  createNotFoundError,
  createErrorResponse,
  safeAsync
} from '@/lib/errorHandler'

describe('ErrorHandler', () => {
  describe('AppError', () => {
    it('should create AppError with all properties', () => {
      const error = new AppError(
        ErrorType.VALIDATION,
        'Test error',
        'User message',
        'TEST_CODE',
        { field: 'test' }
      )

      expect(error.type).toBe(ErrorType.VALIDATION)
      expect(error.message).toBe('Test error')
      expect(error.userMessage).toBe('User message')
      expect(error.code).toBe('TEST_CODE')
      expect(error.details).toEqual({ field: 'test' })
    })

    it('should use message as userMessage when not provided', () => {
      const error = new AppError(ErrorType.NETWORK, 'Network error')
      expect(error.userMessage).toBe('Network error')
    })
  })

  describe('parseError', () => {
    it('should return AppError as-is', () => {
      const originalError = new AppError(ErrorType.VALIDATION, 'Test')
      const parsed = parseError(originalError)
      expect(parsed).toBe(originalError)
    })

    it('should parse Supabase errors', () => {
      const supabaseError = {
        code: 'PGRST301',
        message: 'Insufficient privileges'
      }
      
      const parsed = parseError(supabaseError)
      expect(parsed.type).toBe(ErrorType.AUTHORIZATION)
      expect(parsed.userMessage).toBe('このデータにアクセスする権限がありません')
    })

    it('should parse generic Error objects', () => {
      const error = new Error('Generic error')
      const parsed = parseError(error)
      
      expect(parsed.type).toBe(ErrorType.UNKNOWN)
      expect(parsed.message).toBe('Generic error')
      expect(parsed.userMessage).toBe('予期しないエラーが発生しました')
    })

    it('should handle unknown error types', () => {
      const parsed = parseError('string error')
      
      expect(parsed.type).toBe(ErrorType.UNKNOWN)
      expect(parsed.message).toBe('string error')
    })
  })

  describe('Error creators', () => {
    it('should create validation error', () => {
      const error = createValidationError('email', 'Invalid format')
      
      expect(error.type).toBe(ErrorType.VALIDATION)
      expect(error.userMessage).toBe('email: Invalid format')
      expect(error.details).toEqual({ field: 'email' })
    })

    it('should create auth error', () => {
      const error = createAuthError('Custom message')
      
      expect(error.type).toBe(ErrorType.AUTHENTICATION)
      expect(error.userMessage).toBe('Custom message')
      expect(error.code).toBe('AUTH_REQUIRED')
    })

    it('should create authorization error', () => {
      const error = createAuthorizationError('delete_user')
      
      expect(error.type).toBe(ErrorType.AUTHORIZATION)
      expect(error.userMessage).toBe('この操作を実行する権限がありません')
      expect(error.details).toEqual({ action: 'delete_user' })
    })

    it('should create not found error', () => {
      const error = createNotFoundError('User', '123')
      
      expect(error.type).toBe(ErrorType.NOT_FOUND)
      expect(error.userMessage).toBe('Userが見つかりません')
      expect(error.details).toEqual({ resource: 'User', id: '123' })
    })
  })

  describe('createErrorResponse', () => {
    it('should create error response from AppError', () => {
      const error = new AppError(ErrorType.VALIDATION, 'Test', 'User message')
      const response = createErrorResponse(error, 'test context')
      
      expect(response.data).toBeNull()
      expect(response.success).toBe(false)
      expect(response.error.message).toBe('User message')
    })
  })

  describe('safeAsync', () => {
    it('should return data on success', async () => {
      const operation = async () => 'success'
      const result = await safeAsync(operation)
      
      expect(result.data).toBe('success')
      expect(result.error).toBeNull()
    })

    it('should return error on failure', async () => {
      const operation = async () => {
        throw new Error('Test error')
      }
      const result = await safeAsync(operation)
      
      expect(result.data).toBeNull()
      expect(result.error).toBeInstanceOf(AppError)
      expect(result.error?.message).toBe('Test error')
    })
  })
})