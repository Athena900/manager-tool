'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import SignupForm from '@/components/auth/SignupForm'
import { authService } from '@/lib/auth'

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const { session } = await authService.getCurrentSession()
      if (session) {
        router.push('/')
      }
      setIsLoading(false)
    }

    checkAuth()
  }, [router])

  const handleSignupSuccess = () => {
    router.push('/')
  }

  const handleSwitchToLogin = () => {
    router.push('/login')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <SignupForm 
        onSuccess={handleSignupSuccess}
        onSwitchToLogin={handleSwitchToLogin}
        darkMode={darkMode}
      />
    </div>
  )
}