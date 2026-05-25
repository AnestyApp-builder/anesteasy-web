import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'

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
 * POST /api/stripe/cancel-subscription
 * Cancela uma assinatura ativa do usuário
 */
export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Configuração do servidor incompleta' },
        { status: 500 }
      )
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const accessToken = authHeader.replace('Bearer ', '').trim()
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Buscar assinatura ativa do usuário
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (subError) {
      console.error('❌ Erro ao buscar assinatura:', subError)
      return NextResponse.json(
        { error: 'Erro ao buscar assinatura' },
        { status: 500 }
      )
    }

    if (!subscription) {
      return NextResponse.json(
        { error: 'Nenhuma assinatura ativa encontrada' },
        { status: 404 }
      )
    }

    // Agendar cancelamento no Stripe para o fim do período (não cancela imediatamente)
    if (subscription.stripe_subscription_id && stripe) {
      try {
        const subscriptionId = subscription.stripe_subscription_id.replace(/^daily_/, '')
        await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true })
        console.log('✅ Cancelamento agendado no Stripe para fim do período:', subscriptionId)
      } catch (stripeError: any) {
        console.error('⚠️ Erro ao agendar cancelamento no Stripe:', stripeError.message)
      }
    }

    // Marcar no banco que o cancelamento está agendado — mantém status active e acesso do usuário
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id)

    if (updateError) {
      console.error('❌ Erro ao atualizar assinatura:', updateError)
      return NextResponse.json(
        { error: 'Erro ao cancelar assinatura' },
        { status: 500 }
      )
    }

    // NÃO inativa o usuário agora — ele mantém acesso até current_period_end
    // O webhook customer.subscription.deleted fará a inativação quando o período expirar

    return NextResponse.json({
      success: true,
      message: 'Renovação automática cancelada. Seu acesso continua até o fim do período atual.'
    })

  } catch (error: any) {
    console.error('❌ Erro ao cancelar assinatura:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao cancelar assinatura' },
      { status: 500 }
    )
  }
}

