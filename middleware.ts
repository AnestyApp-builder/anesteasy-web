import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { secretariaMiddleware } from './middleware/secretaria'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Verificar se é uma rota da secretaria
  if (pathname.startsWith('/secretaria/')) {
    return secretariaMiddleware(request)
  }
  
  // Rotas públicas
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
    pathname.includes('reset-password')
  ) {
    return NextResponse.next()
  }

  // Verificar se é uma rota protegida que requer autenticação
  if (pathname.startsWith('/dashboard') || 
      pathname.startsWith('/procedimentos') || 
      pathname.startsWith('/agenda') || 
      pathname.startsWith('/financeiro') || 
      pathname.startsWith('/relatorios') || 
      pathname.startsWith('/configuracoes')) {
    
    // Verificar se há usuário no localStorage (lado cliente)
    // O middleware não tem acesso ao localStorage, então a verificação real
    // será feita no ProtectedRoute component
    
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
    '/secretaria/:path*'
  ]
}
