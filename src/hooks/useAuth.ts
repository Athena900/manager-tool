import { useRouter } from 'next/navigation'
import { authService } from '@/lib/auth'

export const useAuth = () => {
  const router = useRouter()

  const logout = async () => {
    console.log('=== useAuth logout 開始 ===')
    
    try {
      const { error } = await authService.signOut()
      
      if (error) {
        console.error('Logout error:', error)
        return { success: false, error }
      }
      
      console.log('Logout successful - clearing local state')
      
      // ローカルストレージをクリア（必要に応じて）
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_timestamp')
      }
      
      // 強制的にログインページにリダイレクト
      window.location.href = '/login'
      return { success: true, error: null }
    } catch (err) {
      console.error('Logout exception:', err)
      return { success: false, error: err }
    }
  }

  const forceLogout = () => {
    console.log('=== Force logout - clearing all state ===')
    
    // ローカルストレージをクリア
    if (typeof window !== 'undefined') {
      localStorage.clear()
    }
    
    // 強制的にログインページにリダイレクト
    window.location.href = '/login'
  }

  return { logout, forceLogout }
}