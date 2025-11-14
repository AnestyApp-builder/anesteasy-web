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
 * POST /api/stripe/subscription/refund
 * Processa reembolso de uma assinatura
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
    const { subscription_id } = body

    if (!subscription_id) {
      return NextResponse.json(
        { error: 'ID da assinatura é obrigatório' },
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

    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe não configurado' },
        { status: 500 }
      )
    }

    // Buscar a última invoice paga da assinatura
    try {
      const invoices = await stripe.invoices.list({
        subscription: subscription.stripe_subscription_id,
        limit: 1,
        status: 'paid'
      })

      if (invoices.data.length === 0) {
        return NextResponse.json(
          { error: 'Nenhuma fatura paga encontrada para reembolso' },
          { status: 404 }
        )
      }

      const lastInvoice = invoices.data[0]
      const paymentIntentId = lastInvoice.payment_intent as string

      if (!paymentIntentId) {
        return NextResponse.json(
          { error: 'Não foi possível encontrar o pagamento para reembolso' },
          { status: 400 }
        )
      }

      // Criar reembolso
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        reason: 'requested_by_customer'
      })

      // Atualizar assinatura no banco
      await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      .eq('id', subscription.id)

      // Atualizar status do usuário
      await supabaseAdmin
        .from('users')
        .update({
          subscription_status: 'inactive'
        })
        .eq('id', user.id)

      return NextResponse.json({
        success: true,
        message: 'Reembolso processado com sucesso',
        refund_id: refund.id
      })

    } catch (stripeError: any) {
      console.error('❌ Erro ao processar reembolso:', stripeError)
      return NextResponse.json(
        { error: stripeError.message || 'Erro ao processar reembolso' },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('❌ Erro ao processar reembolso:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao processar reembolso' },
      { status: 500 }
    )
  }
}

