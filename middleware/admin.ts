import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zmtwwajyhusyrugobxur.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export async function adminMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Permitir acesso à página de login admin
  if (pathname === '/super-admin-login-x872k20') {
    return NextResponse.next()
  }

  // Verificar se é uma rota admin
  if (pathname.startsWith('/admin/')) {
    // Permitir acesso - a verificação real será feita no AdminProtectedRoute
    // O middleware do Next.js não tem acesso fácil à sessão do Supabase
    // A verificação de autenticação e role será feita no componente AdminProtectedRoute
    return NextResponse.next()
  }

  return NextResponse.next()
}

