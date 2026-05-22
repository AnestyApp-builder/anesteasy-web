import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export async function GET(request: NextRequest) {
  try {
    if (!supabaseServiceKey) {
      return NextResponse.json({ error: 'Configuração inválida' }, { status: 500 })
    }

    // Verificar autenticação admin
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '').trim()
    const supabaseAuth = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token)

    if (userError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Verificar se é admin
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role, is_system_admin')
      .eq('id', user.id)
      .maybeSingle()

    if (!userData || userData.role !== 'admin' || !userData.is_system_admin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const sort = searchParams.get('sort') || 'created_at'
    const order = searchParams.get('order') || 'desc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Buscar usuários (excluir admins)
    let query = supabaseAdmin
      .from('users')
      .select('id, name, email, phone, role, subscription_plan, subscription_status, trial_ends_at, last_login_at, created_at, crm, free_months', { count: 'exact' })
      .neq('role', 'admin')

    // Filtro de busca
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    // Filtro de status
    const now = new Date().toISOString()
    if (status === 'trial') {
      query = query.gt('trial_ends_at', now)
    } else if (status === 'active') {
      query = query.eq('subscription_status', 'active')
    } else if (status === 'expired') {
      query = query.or(`subscription_status.eq.expired,subscription_status.eq.cancelled`)
    } else if (status === 'inactive') {
      query = query.or(`subscription_status.eq.inactive,subscription_status.is.null`)
      query = query.or(`trial_ends_at.lt.${now},trial_ends_at.is.null`)
    }

    // Ordenação
    const validSorts = ['created_at', 'last_login_at', 'name', 'email']
    const sortField = validSorts.includes(sort) ? sort : 'created_at'
    query = query.order(sortField, { ascending: order === 'asc', nullsFirst: false })

    // Paginação
    query = query.range(offset, offset + limit - 1)

    const { data: clients, error, count } = await query

    if (error) {
      console.error('❌ [ADMIN CLIENTES] Erro ao buscar:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Buscar contagem de procedimentos por usuário
    const userIds = (clients || []).map(c => c.id)
    let procedureCounts: Record<string, number> = {}

    if (userIds.length > 0) {
      const { data: procData } = await supabaseAdmin
        .from('procedures')
        .select('user_id')
        .in('user_id', userIds)

      if (procData) {
        procData.forEach((p: { user_id: string }) => {
          procedureCounts[p.user_id] = (procedureCounts[p.user_id] || 0) + 1
        })
      }
    }

    // Buscar WhatsApp accounts para números vinculados
    let whatsappPhones: Record<string, string> = {}
    if (userIds.length > 0) {
      const { data: waData } = await supabaseAdmin
        .from('whatsapp_accounts')
        .select('user_id, phone_number')
        .in('user_id', userIds)
        .eq('verified', true)

      if (waData) {
        waData.forEach((wa: { user_id: string; phone_number: string }) => {
          whatsappPhones[wa.user_id] = wa.phone_number
        })
      }
    }

    // Buscar última interação do bot (inbound)
    let lastInteractions: Record<string, string> = {}
    if (userIds.length > 0) {
      const { data: interactionData } = await supabaseAdmin
        .from('whatsapp_messages')
        .select('user_id, created_at')
        .in('user_id', userIds)
        .eq('direction', 'inbound')
        .order('created_at', { ascending: false })

      if (interactionData) {
        interactionData.forEach((m: { user_id: string; created_at: string }) => {
          if (!lastInteractions[m.user_id]) {
            lastInteractions[m.user_id] = m.created_at
          }
        })
      }
    }

    // Enriquecer dados
    const enrichedClients = (clients || []).map(client => ({
      ...client,
      procedure_count: procedureCounts[client.id] || 0,
      whatsapp_phone: whatsappPhones[client.id] || null,
      last_bot_interaction: lastInteractions[client.id] || null,
    }))

    // Calcular métricas
    const { data: allUsers } = await supabaseAdmin
      .from('users')
      .select('id, subscription_status, trial_ends_at')
      .neq('role', 'admin')

    let metrics = {
      total: 0,
      trial: 0,
      active: 0,
      inactive: 0,
    }

    if (allUsers) {
      metrics.total = allUsers.length
      allUsers.forEach(u => {
        const trialEnd = u.trial_ends_at ? new Date(u.trial_ends_at) : null
        if (trialEnd && trialEnd > new Date()) {
          metrics.trial++
        } else if (u.subscription_status === 'active') {
          metrics.active++
        } else {
          metrics.inactive++
        }
      })
    }

    return NextResponse.json({
      data: enrichedClients,
      total: count || 0,
      page,
      limit,
      metrics,
    })

  } catch (error: any) {
    console.error('❌ [ADMIN CLIENTES] Erro:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
