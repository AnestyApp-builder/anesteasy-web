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

    // Verificar assinatura do webhook (se configurado)
    if (process.env.PAGARME_WEBHOOK_SECRET) {
      const hash = crypto
        .createHmac('sha256', process.env.PAGARME_WEBHOOK_SECRET)
        .update(body)
        .digest('hex')

      if (signature !== hash) {
        console.error('Assinatura inválida do webhook')
        return NextResponse.json(
          { error: 'Assinatura inválida' },
          { status: 401 }
        )
      }
    }

    const event = JSON.parse(body)
    console.log('Webhook recebido:', event.type || event.event)

    // Processar diferentes tipos de eventos
    switch (event.type || event.event) {
      case 'order.paid':
      case 'charge.paid':
        await handlePaymentSuccess(event)
        break

      case 'order.payment_failed':
      case 'charge.failed':
        await handlePaymentFailed(event)
        break

      case 'subscription.created':
        console.log('🔔 Webhook recebido: subscription.created')
        await handleSubscriptionCreated(event)
        break

      case 'subscription.activated':
        console.log('🔔 Webhook recebido: subscription.activated')
        await handleSubscriptionActivated(event)
        break

      case 'subscription.payment_succeeded':
        console.log('🔔 Webhook recebido: subscription.payment_succeeded')
        await handleSubscriptionPaymentSuccess(event)
        break

      case 'subscription.payment_failed':
        console.log('🔔 Webhook recebido: subscription.payment_failed')
        await handleSubscriptionPaymentFailed(event)
        break

      case 'subscription.canceled':
      case 'subscription.cancelled':
        console.log('🔔 Webhook recebido: subscription.canceled')
        await handleSubscriptionCanceled(event)
        break

      case 'subscription.expired':
        console.log('🔔 Webhook recebido: subscription.expired')
        await handleSubscriptionExpired(event)
        break

      case 'subscription.renewed':
        console.log('🔔 Webhook recebido: subscription.renewed')
        await handleSubscriptionRenewed(event)
        break

      case 'invoice.payment_succeeded':
        console.log('🔔 Webhook recebido: invoice.payment_succeeded')
        await handleInvoicePaymentSucceeded(event)
        break

      case 'invoice.payment_failed':
        console.log('🔔 Webhook recebido: invoice.payment_failed')
        await handleInvoicePaymentFailed(event)
        break

      default:
        console.log('Evento não tratado:', event.type || event.event)
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

async function handlePaymentSuccess(event: any) {
  const order = event.data || event
  const metadata = order.metadata || {}
  const userId = metadata.user_id
  const planId = metadata.plan_id

  if (!userId) {
    console.log('userId não encontrado no metadata')
    return
  }

  // Buscar assinatura pendente do usuário
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!subscription) {
    console.log('Assinatura pendente não encontrada')
    return
  }

  // Calcular período da assinatura
  const periodStart = new Date()
  const periodEnd = new Date()
  
  switch (planId) {
    case 'quarterly':
      periodEnd.setMonth(periodEnd.getMonth() + 3)
      break
    case 'annual':
      periodEnd.setFullYear(periodEnd.getFullYear() + 1)
      break
    default: // monthly
      periodEnd.setMonth(periodEnd.getMonth() + 1)
  }

  // Atualizar assinatura para ativa
  await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      pagarme_subscription_id: order.id?.toString()
    })
    .eq('id', subscription.id)

  // Criar transação
  await supabase
    .from('payment_transactions')
    .insert({
      subscription_id: subscription.id,
      user_id: userId,
      pagarme_transaction_id: order.id?.toString() || order.charges?.[0]?.id?.toString(),
      amount: subscription.amount,
      status: 'paid',
      payment_method: 'credit_card',
      paid_at: new Date().toISOString()
    })

  // Atualizar status do usuário
  await supabase
    .from('users')
    .update({
      subscription_plan: planId,
      subscription_status: 'active'
    })
    .eq('id', userId)

  console.log('✅ Assinatura ativada com sucesso:', subscription.id)
}

async function handlePaymentFailed(event: any) {
  const order = event.data || event
  const metadata = order.metadata || {}
  const userId = metadata.user_id

  if (!userId) return

  // Buscar assinatura pendente
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!subscription) return

  // Marcar como expirada
  await supabase
    .from('subscriptions')
    .update({
      status: 'expired'
    })
    .eq('id', subscription.id)

  console.log('❌ Pagamento falhou:', subscription.id)
}

async function handleSubscriptionCreated(event: any) {
  console.log('📝 Assinatura criada:', event.data?.id)
}

async function handleSubscriptionPaymentSuccess(event: any) {
  const subscription = event.data || event
  const metadata = subscription.metadata || {}
  const userId = metadata.user_id

  if (!userId) return

  // Atualizar assinatura
  const { data: dbSubscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('pagarme_subscription_id', subscription.id?.toString())
    .maybeSingle()

  if (dbSubscription) {
    await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        current_period_start: subscription.current_period_start 
          ? new Date(subscription.current_period_start).toISOString() 
          : new Date().toISOString(),
        current_period_end: subscription.current_period_end
          ? new Date(subscription.current_period_end).toISOString()
          : null
      })
      .eq('id', dbSubscription.id)

    console.log('✅ Pagamento recorrente processado:', dbSubscription.id)
  }
}

async function handleSubscriptionCanceled(event: any) {
  const subscription = event.data || event

  // Buscar assinatura no banco
  const { data: dbSubscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('pagarme_subscription_id', subscription.id?.toString())
    .maybeSingle()

  if (dbSubscription) {
    await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('id', dbSubscription.id)

    // Atualizar status do usuário
    await supabase
      .from('users')
      .update({
        subscription_status: 'inactive'
      })
      .eq('id', dbSubscription.user_id)

    console.log('🚫 Assinatura cancelada:', dbSubscription.id)
  }
}

async function handleSubscriptionExpired(event: any) {
  const subscription = event.data || event

  // Buscar assinatura no banco
  const { data: dbSubscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('pagarme_subscription_id', subscription.id?.toString())
    .maybeSingle()

  if (dbSubscription) {
    await supabase
      .from('subscriptions')
      .update({
        status: 'expired'
      })
      .eq('id', dbSubscription.id)

    // Atualizar status do usuário
    await supabase
      .from('users')
      .update({
        subscription_status: 'inactive'
      })
      .eq('id', dbSubscription.user_id)

    console.log('⏰ Assinatura expirada:', dbSubscription.id)
  }
}

async function handleSubscriptionRenewed(event: any) {
  const subscription = event.data || event
  const metadata = subscription.metadata || {}
  const userId = metadata.user_id

  if (!userId) return

  // Buscar assinatura no banco
  const { data: dbSubscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('pagarme_subscription_id', subscription.id?.toString())
    .maybeSingle()

  if (dbSubscription) {
    // Verificar se há mudança de plano pendente
    if (dbSubscription.pending_plan_type && dbSubscription.pending_plan_change_at) {
      const changeDate = new Date(dbSubscription.pending_plan_change_at)
      const now = new Date()
      
      // Se chegou a data de mudança, aplicar o novo plano
      if (now >= changeDate) {
        // Buscar novo plano
        const { data: newPlan } = await supabase
          .from('pagarme_plans')
          .select('*')
          .eq('plan_type', dbSubscription.pending_plan_type)
          .maybeSingle()

        if (newPlan) {
          // Atualizar para o novo plano
          await supabase
            .from('subscriptions')
            .update({
              plan_type: dbSubscription.pending_plan_type,
              amount: newPlan.amount,
              pending_plan_type: null,
              pending_plan_change_at: null,
              status: 'active',
              current_period_start: subscription.current_period_start 
                ? new Date(subscription.current_period_start).toISOString() 
                : new Date().toISOString(),
              current_period_end: subscription.current_period_end
                ? new Date(subscription.current_period_end).toISOString()
                : null,
              updated_at: new Date().toISOString()
            })
            .eq('id', dbSubscription.id)

          console.log(`🔄 Plano alterado de ${dbSubscription.plan_type} para ${dbSubscription.pending_plan_type}:`, dbSubscription.id)
        }
      } else {
        // Ainda não chegou a data, apenas atualizar período
        await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            current_period_start: subscription.current_period_start 
              ? new Date(subscription.current_period_start).toISOString() 
              : new Date().toISOString(),
            current_period_end: subscription.current_period_end
              ? new Date(subscription.current_period_end).toISOString()
              : null
          })
          .eq('id', dbSubscription.id)
      }
    } else {
      // Sem mudança pendente, apenas renovar
      await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          current_period_start: subscription.current_period_start 
            ? new Date(subscription.current_period_start).toISOString() 
            : new Date().toISOString(),
          current_period_end: subscription.current_period_end
            ? new Date(subscription.current_period_end).toISOString()
            : null
        })
        .eq('id', dbSubscription.id)
    }

    // Verificar se deve cancelar no fim do período
    if (dbSubscription.cancel_at_period_end) {
      const periodEnd = subscription.current_period_end 
        ? new Date(subscription.current_period_end)
        : null
      const now = new Date()
      
      // Se o período terminou e estava marcado para cancelar, cancelar agora
      if (periodEnd && now >= periodEnd) {
        await supabase
          .from('subscriptions')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancel_at_period_end: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', dbSubscription.id)

        console.log('🚫 Assinatura cancelada ao fim do período:', dbSubscription.id)
        return
      }
    }

    console.log('🔄 Assinatura renovada:', dbSubscription.id)
  }
}

async function handleInvoicePaymentSucceeded(event: any) {
  const invoice = event.data || event
  const subscription = invoice.subscription || {}
  const metadata = subscription.metadata || {}
  const userId = metadata.user_id

  if (!userId) return

  // Buscar assinatura no banco
  const { data: dbSubscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('pagarme_subscription_id', subscription.id?.toString())
    .maybeSingle()

  if (dbSubscription) {
    // Verificar se há mudança de plano pendente
    let finalPlanType = dbSubscription.plan_type
    let finalAmount = dbSubscription.amount
    
    if (dbSubscription.pending_plan_type && dbSubscription.pending_plan_change_at) {
      const changeDate = new Date(dbSubscription.pending_plan_change_at)
      const now = new Date()
      
      // Se chegou a data de mudança, aplicar o novo plano
      if (now >= changeDate) {
        const { data: newPlan } = await supabase
          .from('pagarme_plans')
          .select('*')
          .eq('plan_type', dbSubscription.pending_plan_type)
          .maybeSingle()

        if (newPlan) {
          finalPlanType = dbSubscription.pending_plan_type
          finalAmount = newPlan.amount
          console.log(`🔄 Aplicando mudança de plano: ${dbSubscription.plan_type} → ${finalPlanType}`)
        }
      }
    }

    // Atualizar assinatura para ativa
    await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        plan_type: finalPlanType,
        amount: finalAmount,
        pending_plan_type: finalPlanType !== dbSubscription.plan_type ? null : dbSubscription.pending_plan_type,
        pending_plan_change_at: finalPlanType !== dbSubscription.plan_type ? null : dbSubscription.pending_plan_change_at,
        current_period_start: subscription.current_period_start 
          ? new Date(subscription.current_period_start).toISOString() 
          : new Date().toISOString(),
        current_period_end: subscription.current_period_end
          ? new Date(subscription.current_period_end).toISOString()
          : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', dbSubscription.id)

    // Criar transação de pagamento
    await supabase
      .from('payment_transactions')
      .insert({
        subscription_id: dbSubscription.id,
        user_id: userId,
        pagarme_transaction_id: invoice.id?.toString() || invoice.charges?.[0]?.id?.toString(),
        amount: finalAmount,
        status: 'paid',
        payment_method: 'credit_card',
        paid_at: new Date().toISOString()
      })

    console.log('✅ Pagamento de fatura processado:', dbSubscription.id)
  }
}

async function handleInvoicePaymentFailed(event: any) {
  const invoice = event.data || event
  const subscription = invoice.subscription || {}
  const metadata = subscription.metadata || {}
  const userId = metadata.user_id

  if (!userId) return

  // Buscar assinatura no banco
  const { data: dbSubscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('pagarme_subscription_id', subscription.id?.toString())
    .maybeSingle()

  if (dbSubscription) {
    // Criar transação de pagamento falhado
    await supabase
      .from('payment_transactions')
      .insert({
        subscription_id: dbSubscription.id,
        user_id: userId,
        pagarme_transaction_id: invoice.id?.toString() || invoice.charges?.[0]?.id?.toString(),
        amount: invoice.amount || dbSubscription.amount,
        status: 'failed',
        payment_method: 'credit_card',
        failed_at: new Date().toISOString()
      })

    // Não alterar status da assinatura imediatamente - a Pagar.me pode tentar novamente
    console.log('❌ Pagamento de fatura falhou:', dbSubscription.id)
  }
}

// GET para verificação do webhook
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    message: 'Webhook endpoint ativo'
  })
}

