'use client'

import React, { useState } from 'react'
import { Lock } from 'lucide-react'

export default function BarSalesManager() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loginData, setLoginData] = useState({ password: '' })

  const handleLogin = () => {
    if (loginData.password === 'BarSales2024') {
      setIsAuthenticated(true)
    } else {
      alert('パスワードが間違っています。')
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <Lock className="mx-auto h-12 w-12 text-blue-600 mb-4" />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">バー管理システム</h1>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">パスワード</label>
              <input
                type="password"
                value={loginData.password}
                onChange={(e) => setLoginData({password: e.target.value})}
                className="w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 border border-gray-300"
                placeholder="パスワードを入力"
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            
            <button
              onClick={handleLogin}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-md transition-colors"
            >
              ログイン
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800">バー管理システム</h1>
          <p className="text-gray-600 mt-2">テスト版が動作しています！</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">システム準備中</h2>
          <p className="text-gray-600">
            基本的なログイン機能が動作しています。<br/>
            このページが表示されれば、構文エラーは解決しています。
          </p>
        </div>
      </div>
    </div>
  )
}
