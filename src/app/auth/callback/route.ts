import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/login'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Email confirmed successfully, sign out and redirect to login page
      // This ensures users must sign in manually after confirming their email
      await supabase.auth.signOut()
      
      const url = new URL(requestUrl)
      url.pathname = '/login'
      url.searchParams.set('message', 'Email confirmed successfully. Please sign in.')
      url.searchParams.delete('code')
      url.searchParams.delete('next')
      return NextResponse.redirect(url)
    }
  }

  // If there's an error or no code, redirect to login with error message
  const url = new URL(requestUrl)
  url.pathname = '/login'
  url.searchParams.set('error', 'Failed to confirm email. Please try again.')
  url.searchParams.delete('code')
  url.searchParams.delete('next')
  return NextResponse.redirect(url)
}

