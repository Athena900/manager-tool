// ============================================
// 統一入力コンポーネント
// ============================================

import React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helpText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className,
    label,
    error,
    helpText,
    leftIcon,
    rightIcon,
    fullWidth = false,
    type = 'text',
    id,
    ...props 
  }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`
    const hasError = !!error

    return (
      <div className={cn('space-y-2', fullWidth && 'w-full')}>
        {/* ラベル */}
        {label && (
          <label 
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
          </label>
        )}
        
        {/* 入力フィールド */}
        <div className="relative">
          {/* 左アイコン */}
          {leftIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              {leftIcon}
            </div>
          )}
          
          <input
            type={type}
            id={inputId}
            ref={ref}
            className={cn(
              'block w-full rounded-lg border-gray-300 shadow-sm transition-colors',
              'focus:border-blue-500 focus:ring-blue-500',
              'dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100',
              'dark:focus:border-blue-400 dark:focus:ring-blue-400',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              hasError && 'border-red-300 focus:border-red-500 focus:ring-red-500',
              className
            )}
            aria-invalid={hasError}
            aria-describedby={
              error ? `${inputId}-error` : 
              helpText ? `${inputId}-help` : undefined
            }
            {...props}
          />
          
          {/* 右アイコン */}
          {rightIcon && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              {rightIcon}
            </div>
          )}
        </div>
        
        {/* エラーメッセージ */}
        {error && (
          <p id={`${inputId}-error`} className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        
        {/* ヘルプテキスト */}
        {helpText && !error && (
          <p id={`${inputId}-help`} className="text-sm text-gray-500 dark:text-gray-400">
            {helpText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }