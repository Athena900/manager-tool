'use client'

import React, { useState } from 'react'
import { Eye, EyeOff, Lock, Mail, User, Store, UserPlus } from 'lucide-react'
import { authService } from '@/lib/auth'

interface SignupFormProps {
  onSuccess: () => void
  onSwitchToLogin: () => void
  darkMode?: boolean
}

export default function SignupForm({ onSuccess, onSwitchToLogin, darkMode = false }: SignupFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    storeName: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
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

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.fullName || !formData.storeName) {
      return 'すべての項目を入力してください。'
    }

    if (formData.password.length < 6) {
      return 'パスワードは6文字以上で入力してください。'
    }

    if (formData.password !== formData.confirmPassword) {
      return 'パスワードが一致しません。'
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      return '有効なメールアドレスを入力してください。'
    }

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      setIsLoading(false)
      return
    }

    try {
      const { user, session, error } = await authService.signUp(
        formData.email,
        formData.password,
        {
          full_name: formData.fullName,
          store_name: formData.storeName
        }
      )
      
      if (error) {
        setError(error)
        return
      }

      if (user) {
        // メール確認が必要な場合の処理
        if (!session) {
          setError('確認メールを送信しました。メール内のリンクをクリックしてアカウントを有効化してください。')
        } else {
          onSuccess()
        }
      }
    } catch (err) {
      setError('アカウント作成に失敗しました。しばらくしてからお試しください。')
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
        <UserPlus className="mx-auto h-12 w-12 text-blue-600 mb-4" />
        <h1 className={`text-2xl font-bold ${theme.text} mb-2`}>新規登録</h1>
        <p className={`${theme.textSecondary} text-sm`}>
          売上管理システムアカウントを作成
        </p>
      </div>

      {error && (
        <div className={`mb-4 p-3 rounded-md text-sm ${
          error.includes('確認メール') 
            ? 'bg-green-100 border border-green-300 text-green-700'
            : 'bg-red-100 border border-red-300 text-red-700'
        }`}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="fullName" className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>
              お名前
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                value={formData.fullName}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-3 border ${theme.input} rounded-md focus:border-blue-500 focus:ring-blue-500 ${theme.text}`}
                placeholder="山田 太郎"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="storeName" className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>
              店舗名
            </label>
            <div className="relative">
              <Store className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                id="storeName"
                name="storeName"
                type="text"
                required
                value={formData.storeName}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-3 border ${theme.input} rounded-md focus:border-blue-500 focus:ring-blue-500 ${theme.text}`}
                placeholder="○○バー"
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

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
              placeholder="6文字以上で入力"
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

        <div>
          <label htmlFor="confirmPassword" className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>
            パスワード（確認）
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              className={`w-full pl-10 pr-12 py-3 border ${theme.input} rounded-md focus:border-blue-500 focus:ring-blue-500 ${theme.text}`}
              placeholder="パスワードを再入力"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-3 h-5 w-5 text-gray-400 hover:text-gray-600"
              disabled={isLoading}
            >
              {showConfirmPassword ? <EyeOff /> : <Eye />}
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
              アカウント作成中...
            </>
          ) : (
            <>
              <UserPlus size={20} />
              アカウントを作成
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className={`text-sm ${theme.textSecondary}`}>
          既にアカウントをお持ちの方は{' '}
          <button
            onClick={onSwitchToLogin}
            className="text-blue-600 hover:text-blue-800 font-medium"
            disabled={isLoading}
          >
            ログイン
          </button>
        </p>
      </div>
    </div>
  )
}