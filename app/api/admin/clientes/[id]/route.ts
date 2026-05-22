import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!supabaseServiceKey) {
      return NextResponse.json({ error: 'Configuração inválida' }, { status: 500 })
    }

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

    const { data: adminData } = await supabaseAdmin
      .from('users')
      .select('role, is_system_admin')
      .eq('id', user.id)
      .maybeSingle()

    if (!adminData || adminData.role !== 'admin' || !adminData.is_system_admin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { id: clientId } = await params

    // Buscar dados do cliente
    const { data: client, error: clientError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', clientId)
      .maybeSingle()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    // Buscar assinatura
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Buscar contagem de procedimentos
    const { count: procedureCount } = await supabaseAdmin
      .from('procedures')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', clientId)

    // Buscar últimos 5 procedimentos
    const { data: recentProcedures } = await supabaseAdmin
      .from('procedures')
      .select('id, procedure_name, procedure_date, procedure_value, payment_status')
      .eq('user_id', clientId)
      .order('procedure_date', { ascending: false })
      .limit(5)

    // Buscar WhatsApp vinculado exclusivamente se verificado
    const { data: whatsappAccount } = await supabaseAdmin
      .from('whatsapp_accounts')
      .select('phone_number, verified, created_at')
      .eq('user_id', clientId)
      .eq('verified', true)
      .maybeSingle()

    // Buscar mensagens admin enviadas para este cliente
    const { data: adminMessages } = await supabaseAdmin
      .from('admin_messages')
      .select('*')
      .eq('target_user_id', clientId)
      .order('created_at', { ascending: false })
      .limit(20)

    // Buscar última mensagem WhatsApp recebida (para verificar janela de 24h)
    const { data: lastWhatsappMsg } = await supabaseAdmin
      .from('whatsapp_messages')
      .select('created_at')
      .eq('user_id', clientId)
      .eq('direction', 'inbound')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const lastInboundAt = lastWhatsappMsg?.created_at
    const withinWindow = lastInboundAt
      ? (Date.now() - new Date(lastInboundAt).getTime()) < 24 * 60 * 60 * 1000
      : false

    return NextResponse.json({
      client,
      subscription,
      stats: {
        procedure_count: procedureCount || 0,
        recent_procedures: recentProcedures || [],
      },
      whatsapp: {
        account: whatsappAccount,
        last_inbound_at: lastInboundAt || null,
        within_24h_window: withinWindow,
      },
      messages: adminMessages || [],
    })

  } catch (error: any) {
    console.error('❌ [ADMIN CLIENTE DETALHE] Erro:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
