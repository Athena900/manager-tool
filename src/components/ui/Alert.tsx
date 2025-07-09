// ============================================
// 統一アラートコンポーネント
// ============================================

import React from 'react'
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './Button'

export interface AlertProps {
  variant?: 'success' | 'error' | 'warning' | 'info'
  title?: string
  children: React.ReactNode
  onDismiss?: () => void
  className?: string
}

export function Alert({ 
  variant = 'info', 
  title, 
  children, 
  onDismiss,
  className 
}: AlertProps) {
  const variants = {
    success: {
      container: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400',
      icon: CheckCircle,
      iconColor: 'text-green-500 dark:text-green-400'
    },
    error: {
      container: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400',
      icon: AlertCircle,
      iconColor: 'text-red-500 dark:text-red-400'
    },
    warning: {
      container: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-400',
      icon: AlertTriangle,
      iconColor: 'text-yellow-500 dark:text-yellow-400'
    },
    info: {
      container: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400',
      icon: Info,
      iconColor: 'text-blue-500 dark:text-blue-400'
    }
  }

  const config = variants[variant]
  const Icon = config.icon

  return (
    <div className={cn(
      'p-4 border rounded-lg',
      config.container,
      className
    )}>
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon className={cn('w-5 h-5', config.iconColor)} />
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className="text-sm font-medium mb-1">
              {title}
            </h3>
          )}
          <div className="text-sm">
            {children}
          </div>
        </div>
        {onDismiss && (
          <div className="ml-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="p-1 hover:bg-black/5 dark:hover:bg-white/5"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// 使いやすいエイリアス
export function SuccessAlert(props: Omit<AlertProps, 'variant'>) {
  return <Alert variant="success" {...props} />
}

export function ErrorAlert(props: Omit<AlertProps, 'variant'>) {
  return <Alert variant="error" {...props} />
}

export function WarningAlert(props: Omit<AlertProps, 'variant'>) {
  return <Alert variant="warning" {...props} />
}

export function InfoAlert(props: Omit<AlertProps, 'variant'>) {
  return <Alert variant="info" {...props} />
}