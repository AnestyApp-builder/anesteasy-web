import { NextRequest, NextResponse } from 'next/server'

export async function secretariaMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Verificar se é uma rota da secretaria
  if (pathname.startsWith('/secretaria/')) {
    // Pular verificação para a página de login (não existe mais)
    if (pathname === '/secretaria/login') {
      return NextResponse.next()
    }

    // Por enquanto, permitir acesso a todas as rotas da secretaria
    // A verificação de autenticação será feita no lado do cliente
    return NextResponse.next()
  }

  return NextResponse.next()
}
