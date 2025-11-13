import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-pagarme-signature')

    // Verificar assinatura (se configurado)
    if (process.env.PAGARME_WEBHOOK_SECRET) {
      const hash = crypto
        .createHmac('sha256', process.env.PAGARME_WEBHOOK_SECRET)
        .update(body)
        .digest('hex')

      if (signature !== hash) {
        return NextResponse.json(
          { error: 'Assinatura inválida' },
          { status: 401 }
        )
      }
    }

    const event = JSON.parse(body)

    // Pagar.me envia postbacks com estrutura diferente
    // Verificar se é um postback de transação ou assinatura
    if (event.object === 'transaction') {
      // Postback de transação
      await handleTransactionPostback(event)
    } else if (event.object === 'subscription') {
      // Postback de assinatura
      await handleSubscriptionPostback(event)
    } else {
      // Tentar processar como evento genérico
      if (event.type === 'transaction_status_changed' || event.current_status) {
        await handleTransactionPostback(event)
      } else if (event.type === 'subscription_status_changed') {
        await handleSubscriptionPostback(event)
      } else {
        console.log('Evento não tratado:', event.type || event.object, event)
      }
    }

    return NextResponse.json({ received: true })

  } catch (error: any) {
    console.error('Erro no webhook:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao processar webhook' },
      { status: 500 }
    )
  }
}

async function handleTransactionPostback(event: any) {
  // Pagar.me envia o objeto transaction diretamente no postback
  const transaction = event.object === 'transaction' ? event : event.transaction

  if (!transaction || !transaction.id) return

  // Buscar transação no banco
  const { data: paymentTransaction } = await supabase
    .from('payment_transactions')
    .select('*, subscription:subscriptions(*)')
    .eq('pagarme_transaction_id', transaction.id.toString())
    .single()

  if (!paymentTransaction) return

  // Atualizar status da transação
  await supabase
    .from('payment_transactions')
    .update({
      status: transaction.status === 'paid' ? 'paid' : 'refused',
      paid_at: transaction.status === 'paid' ? new Date().toISOString() : null
    })
    .eq('id', paymentTransaction.id)

  // Se pagamento aprovado, ativar assinatura
  if (transaction.status === 'paid' && paymentTransaction.subscription) {
    await supabase
      .from('subscriptions')
      .update({
        status: 'active'
      })
      .eq('id', paymentTransaction.subscription.id)

    // Atualizar status do usuário
    await supabase
      .from('users')
      .update({
        subscription_plan: paymentTransaction.subscription.plan_type,
        subscription_status: 'active'
      })
      .eq('id', paymentTransaction.user_id)
  }
}

async function handleSubscriptionPostback(event: any) {
  // Pagar.me envia o objeto subscription diretamente no postback
  const subscription = event.object === 'subscription' ? event : event.subscription

  if (!subscription || !subscription.id) return

  // Buscar assinatura no banco
  const { data: dbSubscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('pagarme_subscription_id', subscription.id.toString())
    .single()

  if (!dbSubscription) return

  // Atualizar status da assinatura
  const statusMap: Record<string, string> = {
    'active': 'active',
    'canceled': 'cancelled',
    'expired': 'expired',
    'suspended': 'suspended'
  }

  await supabase
    .from('subscriptions')
    .update({
      status: statusMap[subscription.status] || 'pending',
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      cancelled_at: subscription.status === 'canceled' ? new Date().toISOString() : null
    })
    .eq('id', dbSubscription.id)

  // Atualizar status do usuário
  if (subscription.status === 'active') {
    await supabase
      .from('users')
      .update({
        subscription_status: 'active'
      })
      .eq('id', dbSubscription.user_id)
  } else if (subscription.status === 'canceled' || subscription.status === 'expired') {
    await supabase
      .from('users')
      .update({
        subscription_status: 'inactive'
      })
      .eq('id', dbSubscription.user_id)
  }
}

// GET para verificação do webhook (alguns serviços requerem)
export async function GET() {
  return NextResponse.json({ status: 'ok' })
}

