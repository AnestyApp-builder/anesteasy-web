import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { secretariaMiddleware } from './middleware/secretaria'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Verificar se é uma rota da secretaria
  if (pathname.startsWith('/secretaria/')) {
    return secretariaMiddleware(request)
  }
  
  // Para rotas de anestesista, permitir acesso por enquanto
  // A verificação de autenticação será feita no lado do cliente
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
