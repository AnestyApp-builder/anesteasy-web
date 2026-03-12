import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { secretariaMiddleware } from './middleware/secretaria'
import { adminMiddleware } from './middleware/admin'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Verificar se é uma rota admin (antes de outras verificações)
  if (pathname.startsWith('/admin/') || pathname === '/super-admin-login-x872k20') {
    return adminMiddleware(request)
  }
  
  // Verificar se é uma rota da secretaria
  if (pathname.startsWith('/secretaria/')) {
    return secretariaMiddleware(request)
  }
  
  // Rotas públicas (incluindo login admin)
  if (
    pathname.startsWith('/feedback/') ||
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname === '/confirm-email' ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.includes('reset-password') ||
    pathname === '/super-admin-login-x872k20' ||
    pathname === '/planos' ||
    pathname === '/checkout'
  ) {
    return NextResponse.next()
  }

  // Rotas protegidas - a verificação será feita no ProtectedRoute usando /api/auth/status
  // O middleware apenas permite passar, pois não temos acesso fácil ao token no Edge Runtime
  // A decisão de rota será feita no ProtectedRoute baseado no resultado de /api/auth/status
  if (pathname.startsWith('/dashboard') || 
      pathname.startsWith('/procedimentos') || 
      pathname.startsWith('/agenda') || 
      pathname.startsWith('/financeiro') || 
      pathname.startsWith('/relatorios') || 
      pathname.startsWith('/configuracoes')) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/procedimentos/:path*',
    '/configuracoes/:path*',
    '/agenda/:path*',
    '/financeiro/:path*',
    '/relatorios/:path*',
    '/secretaria/:path*',
    '/admin/:path*',
    '/super-admin-login-x872k20'
  ]
}
