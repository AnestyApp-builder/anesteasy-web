import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Verificar se as variáveis de ambiente estão configuradas
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Cliente admin do Supabase (com service role key)
const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null

// Método OPTIONS para health check
export async function OPTIONS() {
  return new NextResponse(null, { status: 200 })
}

export async function POST(request: NextRequest) {
  try {
    // Verificar se o cliente admin está configurado
    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          error: 'Configuração do servidor inválida',
          details: 'SUPABASE_SERVICE_ROLE_KEY não está configurada',
        },
        { status: 500 }
      )
    }

    // 🔐 Autenticação obrigatória via Bearer token
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Não autorizado. Token de acesso não fornecido.' },
        { status: 401 }
      )
    }

    const accessToken = authHeader.replace('Bearer ', '').trim()
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Não autorizado. Token de acesso inválido.' },
        { status: 401 }
      )
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(accessToken)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado. Usuário não autenticado.' },
        { status: 401 }
      )
    }

    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID é obrigatório' },
        { status: 400 }
      )
    }

    // 🔒 Garantir que o usuário só possa excluir a própria conta
    if (userId !== user.id) {
      return NextResponse.json(
        { error: 'Proibido. Você só pode excluir a própria conta.' },
        { status: 403 }
      )
    }

    // Excluir usuário do Supabase Auth usando Admin API
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteError) {
      // Se o usuário não foi encontrado, significa que já foi excluído
      if (deleteError.message === 'User not found' || deleteError.code === 'user_not_found') {
        return NextResponse.json(
          { message: 'Usuário já foi excluído do Supabase Auth' },
          { status: 200 }
        )
      }

      return NextResponse.json(
        {
          error: 'Erro ao excluir usuário do Supabase Auth',
          details: deleteError.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'Usuário excluído com sucesso do Supabase Auth' },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}

