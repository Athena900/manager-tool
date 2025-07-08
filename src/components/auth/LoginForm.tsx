'use client'

import React, { useState } from 'react'
import { Eye, EyeOff, Lock, Mail, LogIn } from 'lucide-react'
import { authService } from '@/lib/auth'

interface LoginFormProps {
  onSuccess: () => void
  onSwitchToSignup: () => void
  darkMode?: boolean
}

export default function LoginForm({ onSuccess, onSwitchToSignup, darkMode = false }: LoginFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const theme = {
    bg: darkMode ? 'bg-gray-900' : 'bg-gray-50',
    card: darkMode ? 'bg-gray-800' : 'bg-white',
    text: darkMode ? 'text-white' : 'text-gray-800',
    textSecondary: darkMode ? 'text-gray-300' : 'text-gray-600',
    border: darkMode ? 'border-gray-700' : 'border-gray-200',
    input: darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const { user, session, error } = await authService.signIn(formData.email, formData.password)
      
      if (error) {
        setError(error)
        return
      }

      if (user && session) {
        onSuccess()
      }
    } catch (err) {
      setError('ログインに失敗しました。しばらくしてからお試しください。')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <div className={`${theme.card} rounded-lg shadow-lg p-8 w-full max-w-md`}>
      <div className="text-center mb-8">
        <Lock className="mx-auto h-12 w-12 text-blue-600 mb-4" />
        <h1 className={`text-2xl font-bold ${theme.text} mb-2`}>ログイン</h1>
        <p className={`${theme.textSecondary} text-sm`}>
          売上管理システムにアクセス
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>
            メールアドレス
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              className={`w-full pl-10 pr-4 py-3 border ${theme.input} rounded-md focus:border-blue-500 focus:ring-blue-500 ${theme.text}`}
              placeholder="example@email.com"
              disabled={isLoading}
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>
            パスワード
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={formData.password}
              onChange={handleChange}
              className={`w-full pl-10 pr-12 py-3 border ${theme.input} rounded-md focus:border-blue-500 focus:ring-blue-500 ${theme.text}`}
              placeholder="パスワードを入力"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 h-5 w-5 text-gray-400 hover:text-gray-600"
              disabled={isLoading}
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ログイン中...
            </>
          ) : (
            <>
              <LogIn size={20} />
              ログイン
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className={`text-sm ${theme.textSecondary}`}>
          アカウントをお持ちでない方は{' '}
          <button
            onClick={onSwitchToSignup}
            className="text-blue-600 hover:text-blue-800 font-medium"
            disabled={isLoading}
          >
            新規登録
          </button>
        </p>
      </div>
    </div>
  )
}