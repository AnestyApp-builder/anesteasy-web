import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zmtwwajyhusyrugobxur.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Cliente admin do Supabase (com service role key - bypass RLS)
const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Configuração do servidor inválida' },
        { status: 500 }
      )
    }

    // Verificar autenticação
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const accessToken = authHeader.replace('Bearer ', '').trim()
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    // Verificar se o usuário é admin
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken)
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Verificar se é admin
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role, is_system_admin')
      .eq('id', user.id)
      .maybeSingle()

    if (!userData || userData.role !== 'admin' || !userData.is_system_admin) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem acessar.' },
        { status: 403 }
      )
    }

    // Obter parâmetros de filtro
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const screen = searchParams.get('screen')
    const dateRange = searchParams.get('dateRange') || 'all'
    const appVersion = searchParams.get('appVersion')

    // Construir query base
    let query = supabaseAdmin
      .from('app_errors')
      .select(`
        *,
        users:user_id (
          id,
          name,
          email
        )
      `)
      .order('created_at', { ascending: false })

    // Aplicar filtro de data
    if (dateRange !== 'all') {
      const now = new Date()
      let dateFrom = new Date()
      
      switch (dateRange) {
        case '24h':
          dateFrom.setHours(now.getHours() - 24)
          break
        case '7d':
          dateFrom.setDate(now.getDate() - 7)
          break
        case '30d':
          dateFrom.setDate(now.getDate() - 30)
          break
      }
      
      query = query.gte('created_at', dateFrom.toISOString())
    }

    // Aplicar filtro de usuário
    if (userId) {
      query = query.eq('user_id', userId)
    }

    // Aplicar filtro de tela
    if (screen) {
      query = query.eq('screen', screen)
    }

    // Aplicar filtro de versão
    if (appVersion) {
      query = query.eq('app_version', appVersion)
    }

    const { data, error } = await query

    if (error) {
      console.error('❌ Erro ao buscar logs:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: data || [] })
  } catch (error: any) {
    console.error('❌ Erro na API de error-logs:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Configuração do servidor inválida' },
        { status: 500 }
      )
    }

    // Verificar autenticação
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const accessToken = authHeader.replace('Bearer ', '').trim()
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    // Verificar se o usuário é admin
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken)
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Verificar se é admin
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role, is_system_admin')
      .eq('id', user.id)
      .maybeSingle()

    if (!userData || userData.role !== 'admin' || !userData.is_system_admin) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem acessar.' },
        { status: 403 }
      )
    }

    // Obter dados do erro do body
    const { user_id, screen, action, error_message, device, app_version } = await request.json()

    if (!screen || !action || !error_message) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: screen, action, error_message' },
        { status: 400 }
      )
    }

    // Inserir erro (bypass RLS usando Service Role)
    const { data, error } = await supabaseAdmin
      .from('app_errors')
      .insert({
        user_id: user_id || null,
        screen,
        action,
        error_message,
        device: device || 'web',
        app_version: app_version || '1.0.0'
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Erro ao inserir erro:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('❌ Erro na API de error-logs (POST):', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

