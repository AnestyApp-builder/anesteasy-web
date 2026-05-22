import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export async function POST(
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
    const { days } = await request.json()

    if (!days || typeof days !== 'number' || days < 1 || days > 365) {
      return NextResponse.json({ error: 'Número de dias inválido (1-365)' }, { status: 400 })
    }

    // Buscar dados atuais do cliente
    const { data: client, error: clientError } = await supabaseAdmin
      .from('users')
      .select('trial_ends_at, name, email')
      .eq('id', clientId)
      .maybeSingle()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    // Calcular nova data de trial
    const currentTrialEnd = client.trial_ends_at ? new Date(client.trial_ends_at) : new Date()
    const baseDate = currentTrialEnd > new Date() ? currentTrialEnd : new Date()
    const newTrialEnd = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000)

    // Atualizar trial
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        trial_ends_at: newTrialEnd.toISOString(),
        subscription_status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', clientId)

    if (updateError) {
      console.error('❌ [EXTEND TRIAL] Erro:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      new_trial_ends_at: newTrialEnd.toISOString(),
      message: `Trial estendido em ${days} dias para ${client.name || client.email}`,
    })

  } catch (error: any) {
    console.error('❌ [EXTEND TRIAL] Erro:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
