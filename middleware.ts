import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Lista de rotas que requerem autenticação
  const protectedRoutes = ['/dashboard', '/procedimentos', '/financeiro', '/relatorios', '/configuracoes']
  
  // Lista de rotas públicas (apenas para usuários não logados)
  const publicRoutes = ['/login', '/register', '/forgot-password']
  
  const { pathname } = request.nextUrl
  
  // Verificar se é uma rota protegida
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  
  // Aqui você pode implementar a lógica de verificação de autenticação
  // Por enquanto, vamos permitir acesso a todas as rotas
  // Em produção, você deve verificar o token de autenticação
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
