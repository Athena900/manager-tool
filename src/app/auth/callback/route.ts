import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const cookieStore = cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )
    
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        console.error('認証コード交換エラー:', error)
        return NextResponse.redirect(`${origin}/login?error=auth_error`)
      }
      console.log('認証コード交換成功')
    } catch (error) {
      console.error('認証コード交換エラー:', error)
      return NextResponse.redirect(`${origin}/login?error=auth_error`)
    }
  }

  // 認証成功後はメインページにリダイレクト
  return NextResponse.redirect(`${origin}/`)
}