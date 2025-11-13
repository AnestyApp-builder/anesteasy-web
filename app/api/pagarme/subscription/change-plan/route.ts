import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { obterPlano } from '@/lib/pagarme-subscriptions'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabaseAdmin = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

/**
 * POST /api/pagarme/subscription/change-plan
 * Agenda mudança de plano para o fim do período atual
 * O usuário continua com o plano atual até current_period_end
 * No fim do período, o sistema muda automaticamente para o novo plano
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const accessToken = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin?.auth.getUser(accessToken) || { data: { user: null }, error: null }

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { subscription_id, new_plan_type } = body

    if (!subscription_id || !new_plan_type) {
      return NextResponse.json(
        { error: 'ID da assinatura e novo tipo de plano são obrigatórios' },
        { status: 400 }
      )
    }

    // Validar tipo de plano
    if (!['monthly', 'quarterly', 'annual'].includes(new_plan_type)) {
      return NextResponse.json(
        { error: 'Tipo de plano inválido' },
        { status: 400 }
      )
    }

    // Verificar se a assinatura pertence ao usuário
    const { data: subscription, error: subError } = await supabaseAdmin
      ?.from('subscriptions')
      .select('*')
      .eq('pagarme_subscription_id', subscription_id)
      .eq('user_id', user.id)
      .maybeSingle() || { data: null, error: null }

    if (subError || !subscription) {
      return NextResponse.json(
        { error: 'Assinatura não encontrada' },
        { status: 404 }
      )
    }

    // Verificar se já não é o mesmo plano
    if (subscription.plan_type === new_plan_type) {
      return NextResponse.json(
        { error: 'Você já está neste plano' },
        { status: 400 }
      )
    }

    // Verificar se a assinatura está ativa ou cancelada (mas ainda com acesso)
    if (subscription.status !== 'active' && subscription.status !== 'cancelled') {
      return NextResponse.json(
        { error: 'Apenas assinaturas ativas ou canceladas podem ter o plano alterado' },
        { status: 400 }
      )
    }

    // Buscar o novo plano no Supabase
    const { data: newPlan } = await supabaseAdmin
      ?.from('pagarme_plans')
      .select('*')
      .eq('plan_type', new_plan_type)
      .maybeSingle() || { data: null }

    if (!newPlan) {
      return NextResponse.json(
        { error: 'Novo plano não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se o plano existe na Pagar.me
    try {
      await obterPlano(newPlan.pagarme_plan_id)
    } catch (error) {
      return NextResponse.json(
        { error: 'Plano não encontrado na Pagar.me. Entre em contato com o suporte.' },
        { status: 404 }
      )
    }

    // Agendar mudança de plano para o fim do período atual
    const changeDate = subscription.current_period_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    await supabaseAdmin
      ?.from('subscriptions')
      .update({
        pending_plan_type: new_plan_type,
        pending_plan_change_at: changeDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id)

    return NextResponse.json({
      success: true,
      message: `Mudança de plano agendada. Você continuará com o plano ${subscription.plan_type} até ${new Date(changeDate).toLocaleDateString('pt-BR')}, quando será alterado para ${new_plan_type}.`,
      current_plan: subscription.plan_type,
      new_plan: new_plan_type,
      change_date: changeDate
    })

  } catch (error: any) {
    console.error('❌ Erro ao agendar mudança de plano:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Erro ao agendar mudança de plano',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

