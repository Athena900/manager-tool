import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const error_description = requestUrl.searchParams.get('error_description')
  const origin = requestUrl.origin

  console.log('=== 認証コールバック開始 ===')
  console.log('Code:', code ? 'Present' : 'Missing')
  console.log('Error:', error)
  console.log('Error Description:', error_description)
  console.log('Full URL:', request.url)
  console.log('Origin:', origin)

  // URLパラメータにエラーが含まれている場合
  if (error) {
    console.error('認証URLエラー:', error, error_description)
    const errorMessage = error_description || error
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorMessage)}`)
  }

  // 認証コードが存在しない場合
  if (!code) {
    console.error('認証コードが見つかりません')
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('認証コードが見つかりません')}`)
  }

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
    console.log('認証コード交換を開始します...')
    
    // 認証コードをセッションに交換
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      console.error('認証コード交換エラー:', exchangeError)
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('認証に失敗しました: ' + exchangeError.message)}`)
    }
    
    if (!data.session) {
      console.error('セッションが作成されませんでした')
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('セッションの作成に失敗しました')}`)
    }
    
    if (!data.user) {
      console.error('ユーザー情報が取得できませんでした')
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('ユーザー情報の取得に失敗しました')}`)
    }
    
    console.log('認証コード交換成功!')
    console.log('ユーザーID:', data.user.id)
    console.log('メールアドレス:', data.user.email)
    console.log('セッション有効期限:', data.session.expires_at)
    
    // プロフィール存在確認
    console.log('プロフィール確認を開始します...')
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', data.user.id)
      .single()
    
    console.log('プロフィール確認結果:', profile ? 'Found' : 'Not found')
    if (profileError) {
      console.log('プロフィールエラー:', profileError.code, profileError.message)
    }
    
    // プロフィールが存在しない場合（PGRST116 = Row not found）
    if (!profile || profileError?.code === 'PGRST116') {
      console.log('プロフィール未作成 - プロフィール設定ページにリダイレクト')
      return NextResponse.redirect(`${origin}/profile-setup`)
    }
    
    // プロフィール確認でその他のエラーが発生した場合
    if (profileError && profileError.code !== 'PGRST116') {
      console.error('プロフィール確認エラー:', profileError)
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('プロフィール確認に失敗しました')}`)
    }
    
    // プロフィールが存在する場合
    console.log('プロフィール確認完了:', profile.store_name)
    console.log('メインページにリダイレクトします')
    
    return NextResponse.redirect(`${origin}/`)
    
  } catch (error) {
    console.error('認証コールバック例外:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('認証処理中にエラーが発生しました: ' + errorMessage)}`)
  }
}