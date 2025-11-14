import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { updateSubscription, stripe } from '@/lib/stripe'

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
 * POST /api/stripe/subscription/change-plan
 * Altera o plano de uma assinatura (upgrade/downgrade)
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

    const accessToken = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken)

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
        { error: 'ID da assinatura e novo plano são obrigatórios' },
        { status: 400 }
      )
    }

    if (!['monthly', 'quarterly', 'annual'].includes(new_plan_type)) {
      return NextResponse.json(
        { error: 'Plano inválido' },
        { status: 400 }
      )
    }

    // Buscar assinatura no banco
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('stripe_subscription_id', subscription_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (subError || !subscription) {
      return NextResponse.json(
        { error: 'Assinatura não encontrada' },
        { status: 404 }
      )
    }

    if (subscription.plan_type === new_plan_type) {
      return NextResponse.json(
        { error: 'Você já está neste plano' },
        { status: 400 }
      )
    }

    // Atualizar na Stripe (com proration automática)
    if (stripe && subscription.stripe_subscription_id) {
      try {
        const updatedStripeSubscription = await updateSubscription(
          subscription.stripe_subscription_id,
          new_plan_type
        )

        // Atualizar no banco
        const PLAN_PRICES: Record<string, number> = {
          monthly: 79.00,
          quarterly: 225.00,
          annual: 850.00
        }

        const { error: updateError } = await supabaseAdmin
          .from('subscriptions')
          .update({
            plan_type: new_plan_type,
            amount: PLAN_PRICES[new_plan_type],
            current_period_start: new Date(updatedStripeSubscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(updatedStripeSubscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id)

        if (updateError) {
          console.error('❌ Erro ao atualizar assinatura:', updateError)
          return NextResponse.json(
            { error: 'Erro ao atualizar assinatura' },
            { status: 500 }
          )
        }

        // Atualizar status do usuário
        await supabaseAdmin
          .from('users')
          .update({
            subscription_plan: new_plan_type
          })
          .eq('id', user.id)

        return NextResponse.json({
          success: true,
          message: 'Plano alterado com sucesso. A proration foi calculada automaticamente pela Stripe.'
        })

      } catch (stripeError: any) {
        console.error('❌ Erro ao atualizar na Stripe:', stripeError)
        return NextResponse.json(
          { error: stripeError.message || 'Erro ao alterar plano' },
          { status: 500 }
        )
      }
    } else {
      return NextResponse.json(
        { error: 'Stripe não configurado ou assinatura sem ID do Stripe' },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('❌ Erro ao alterar plano:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao alterar plano' },
      { status: 500 }
    )
  }
}

