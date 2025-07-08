'use client'

import React, { useState } from 'react'
import { authService } from '@/lib/auth'

interface PasswordResetTestProps {
  email: string
}

export default function PasswordResetTest({ email }: PasswordResetTestProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const handlePasswordReset = async () => {
    setIsLoading(true)
    setResult(null)

    console.log('=== パスワードリセットテスト開始 ===')
    console.log('Email:', email)

    try {
      const { error } = await authService.resetPassword(email)
      
      console.log('=== パスワードリセット結果 ===')
      console.log('Error:', error)

      if (error) {
        setResult(`エラー: ${error}`)
      } else {
        setResult(`パスワードリセットメールを送信しました（${email}）`)
      }
    } catch (err) {
      console.error('パスワードリセットテストエラー:', err)
      setResult('予期しないエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mt-4 p-4 border border-gray-300 rounded-lg bg-gray-50">
      <h4 className="font-medium text-gray-700 mb-2">デバッグ: パスワードリセットテスト</h4>
      <button
        onClick={handlePasswordReset}
        disabled={isLoading || !email}
        className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm"
      >
        {isLoading ? 'テスト中...' : 'パスワードリセットテスト'}
      </button>
      {result && (
        <div className="mt-2 p-2 bg-white border rounded text-sm">
          {result}
        </div>
      )}
    </div>
  )
}