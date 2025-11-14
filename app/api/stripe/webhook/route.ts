import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { constructWebhookEvent, stripe } from '@/lib/stripe'
import Stripe from 'stripe'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    console.log('📥 Webhook recebido - Headers:', {
      'stripe-signature': signature ? 'presente' : 'ausente',
      'content-type': request.headers.get('content-type'),
      'user-agent': request.headers.get('user-agent')
    })

    if (!signature) {
      console.error('❌ Assinatura do webhook não encontrada')
      console.error('📋 Headers recebidos:', Object.fromEntries(request.headers.entries()))
      return NextResponse.json(
        { error: 'Assinatura do webhook ausente' },
        { status: 400 }
      )
    }

    if (!webhookSecret) {
      console.error('❌ STRIPE_WEBHOOK_SECRET não configurado')
      return NextResponse.json(
        { error: 'Configuração do webhook incompleta' },
        { status: 500 }
      )
    }

    // Validar assinatura do webhook
    let event: Stripe.Event
    try {
      event = constructWebhookEvent(body, signature, webhookSecret)
      console.log('✅ Assinatura do webhook validada com sucesso')
    } catch (error: any) {
      console.error('❌ Erro ao validar assinatura do webhook:', error.message)
      return NextResponse.json(
        { error: `Assinatura inválida: ${error.message}` },
        { status: 400 }
      )
    }

    console.log('🔔 Webhook Stripe recebido:', event.type, 'ID:', event.id)
    console.log('📋 Dados do evento:', JSON.stringify(event.data.object, null, 2))

    // Processar diferentes tipos de eventos
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        console.log('ℹ️ Evento não tratado:', event.type)
    }

    return NextResponse.json({ received: true })

  } catch (error: any) {
    console.error('❌ Erro no webhook:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao processar webhook' },
      { status: 500 }
    )
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('✅ Checkout concluído:', session.id)
  console.log('📋 Metadata da sessão:', JSON.stringify(session.metadata, null, 2))
  console.log('👤 Customer ID:', session.customer)
  console.log('📝 Subscription ID:', session.subscription)
  console.log('💳 Payment Status:', session.payment_status)

  // ⚠️ VALIDAÇÃO DE SEGURANÇA: Verificar se o pagamento foi realmente pago
  if (session.payment_status !== 'paid') {
    console.error('❌ SEGURANÇA: Checkout concluído mas pagamento não confirmado')
    console.error('📋 Payment Status:', session.payment_status)
    console.error('⏳ Aguardando confirmação do pagamento via invoice.paid')
    // Não criar assinatura ainda - aguardar invoice.paid
    return
  }

  const userId = session.metadata?.user_id
  const planType = session.metadata?.plan_type

  if (!userId) {
    console.error('❌ user_id não encontrado no metadata')
    console.error('📋 Metadata completo:', session.metadata)
    return
  }

  console.log('👤 User ID encontrado:', userId)
  console.log('📦 Plan Type:', planType)

  // Buscar subscription criada
  const subscriptionId = session.subscription as string

  if (!subscriptionId) {
    console.error('❌ subscription_id não encontrado na sessão')
    console.error('📋 Sessão completa:', JSON.stringify(session, null, 2))
    return
  }

  console.log('📝 Subscription ID encontrado:', subscriptionId)

  // ⚠️ VALIDAÇÃO DE SEGURANÇA: Verificar status da subscription no Stripe
  try {
    if (stripe) {
      const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId)
      if (stripeSubscription.status !== 'active' && stripeSubscription.status !== 'trialing') {
        console.error('❌ SEGURANÇA: Subscription não está ativa')
        console.error('📋 Subscription Status:', stripeSubscription.status)
        // Não criar assinatura se não estiver ativa
        return
      }
      console.log('✅ Subscription Status verificado:', stripeSubscription.status)
    }
  } catch (error) {
    console.error('❌ Erro ao verificar subscription no Stripe:', error)
    // Em caso de erro, não criar assinatura por segurança
    return
  }

  // Buscar assinatura existente (pode ser pending ou já active)
  const { data: existingSubscription, error: existingError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingError) {
    console.error('❌ Erro ao buscar assinatura existente:', existingError)
  }

  if (existingSubscription) {
    console.log('📋 Assinatura existente encontrada:', existingSubscription.id, 'Status:', existingSubscription.status)
    
    // Atualizar assinatura existente
    const { data: updatedSubscription, error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: session.customer as string,
        plan_type: planType || existingSubscription.plan_type,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingSubscription.id)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Erro ao atualizar assinatura:', updateError)
    } else {
      console.log('✅ Assinatura atualizada:', updatedSubscription?.id)
    }
  } else {
    console.log('📝 Criando nova assinatura no banco...')
    // Criar nova assinatura
    const amount = session.amount_total ? session.amount_total / 100 : 0

    // Buscar dados completos da subscription do Stripe
    let currentPeriodStart = new Date().toISOString()
    let currentPeriodEnd = new Date().toISOString()

    try {
      if (stripe) {
        const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId)
        currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000).toISOString()
        currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000).toISOString()
      } else {
        console.warn('⚠️ Stripe não inicializado, usando valores padrão')
        // Usar valores padrão
        const endDate = new Date()
        endDate.setMonth(endDate.getMonth() + 1) // Adicionar 1 mês como padrão
        currentPeriodEnd = endDate.toISOString()
      }
    } catch (error) {
      console.warn('⚠️ Erro ao buscar dados da subscription do Stripe:', error)
      // Usar valores padrão
      const endDate = new Date()
      endDate.setMonth(endDate.getMonth() + 1) // Adicionar 1 mês como padrão
      currentPeriodEnd = endDate.toISOString()
    }

    const { data: newSubscription, error: insertError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan_type: planType || 'monthly',
        amount: amount,
        status: 'active',
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: session.customer as string,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ Erro ao criar assinatura:', insertError)
      console.error('📋 Dados que tentaram ser inseridos:', {
        user_id: userId,
        plan_type: planType || 'monthly',
        amount: amount,
        status: 'active',
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: session.customer as string,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd
      })
    } else {
      console.log('✅ Nova assinatura criada:', newSubscription?.id)
    }
  }

  // Atualizar usuário
  const { error: userUpdateError } = await supabase
    .from('users')
    .update({
      subscription_plan: planType || 'monthly',
      subscription_status: 'active'
    })
    .eq('id', userId)

  if (userUpdateError) {
    console.error('❌ Erro ao atualizar usuário:', userUpdateError)
  } else {
    console.log('✅ Usuário atualizado com sucesso')
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('📝 Assinatura criada:', subscription.id)

  const userId = subscription.metadata?.user_id
  const planType = subscription.metadata?.plan_type

  if (!userId) {
    console.error('❌ user_id não encontrado no metadata')
    return
  }

  // Calcular período
  const periodStart = new Date(subscription.current_period_start * 1000)
  const periodEnd = new Date(subscription.current_period_end * 1000)

  // Buscar assinatura existente
  const { data: existingSubscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle()

  if (existingSubscription) {
    // Atualizar assinatura existente
    await supabase
      .from('subscriptions')
      .update({
        status: subscription.status === 'active' ? 'active' : subscription.status,
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', existingSubscription.id)

    console.log('✅ Assinatura existente atualizada')
  } else {
    // Criar nova assinatura
    const amount = subscription.items.data[0]?.price.unit_amount || 0

    await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan_type: planType || 'monthly',
        amount: amount / 100,
        status: subscription.status === 'active' ? 'active' : subscription.status,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer as string,
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString()
      })

    console.log('✅ Nova assinatura criada')
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('🔄 Assinatura atualizada:', subscription.id)

  const userId = subscription.metadata?.user_id
  const planType = subscription.metadata?.plan_type

  // Calcular período
  const periodStart = new Date(subscription.current_period_start * 1000)
  const periodEnd = new Date(subscription.current_period_end * 1000)

  // Buscar assinatura no banco
  const { data: dbSubscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle()

  if (!dbSubscription) {
    console.error('❌ Assinatura não encontrada no banco:', subscription.id)
    return
  }

  // Atualizar assinatura
  await supabase
    .from('subscriptions')
    .update({
      status: subscription.status === 'active' ? 'active' : subscription.status === 'canceled' ? 'cancelled' : subscription.status,
      plan_type: planType || dbSubscription.plan_type,
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      ...(subscription.canceled_at && { cancelled_at: new Date(subscription.canceled_at * 1000).toISOString() }),
      updated_at: new Date().toISOString()
    })
    .eq('id', dbSubscription.id)

  // Atualizar usuário
  if (userId) {
    await supabase
      .from('users')
      .update({
        subscription_plan: planType || dbSubscription.plan_type,
        subscription_status: subscription.status === 'active' ? 'active' : 'inactive'
      })
      .eq('id', userId)
  }

  console.log('✅ Assinatura atualizada no banco')
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('🚫 Assinatura cancelada:', subscription.id)

  // Buscar assinatura no banco
  const { data: dbSubscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle()

  if (!dbSubscription) {
    console.error('❌ Assinatura não encontrada no banco:', subscription.id)
    return
  }

  // Atualizar assinatura
  await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', dbSubscription.id)

  // Atualizar usuário
  await supabase
    .from('users')
    .update({
      subscription_status: 'inactive'
    })
    .eq('id', dbSubscription.user_id)

  console.log('✅ Assinatura cancelada no banco')
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  console.log('💰 Fatura paga:', invoice.id)

  const subscriptionId = invoice.subscription as string

  if (!subscriptionId) {
    console.log('ℹ️ Fatura sem subscription_id')
    return
  }

  // Buscar assinatura no banco
  const { data: dbSubscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('stripe_subscription_id', subscriptionId)
    .maybeSingle()

  if (!dbSubscription) {
    console.error('❌ Assinatura não encontrada:', subscriptionId)
    return
  }

  // Criar registro de transação
  await supabase
    .from('payment_transactions')
    .insert({
      subscription_id: dbSubscription.id,
      user_id: dbSubscription.user_id,
      stripe_transaction_id: invoice.id,
      amount: (invoice.amount_paid || 0) / 100,
      status: 'paid',
      payment_method: 'credit_card',
      paid_at: new Date().toISOString()
    })

  // Atualizar status se necessário
  if (dbSubscription.status !== 'active') {
    await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', dbSubscription.id)

    await supabase
      .from('users')
      .update({
        subscription_status: 'active'
      })
      .eq('id', dbSubscription.user_id)
  }

  console.log('✅ Fatura processada')
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log('❌ Falha no pagamento da fatura:', invoice.id)

  const subscriptionId = invoice.subscription as string

  if (!subscriptionId) {
    return
  }

  // Buscar assinatura no banco
  const { data: dbSubscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('stripe_subscription_id', subscriptionId)
    .maybeSingle()

  if (!dbSubscription) {
    return
  }

  // Criar registro de transação falhada
  await supabase
    .from('payment_transactions')
    .insert({
      subscription_id: dbSubscription.id,
      user_id: dbSubscription.user_id,
      stripe_transaction_id: invoice.id,
      amount: (invoice.amount_due || 0) / 100,
      status: 'failed',
      payment_method: 'credit_card',
      failed_at: new Date().toISOString()
    })

  console.log('✅ Falha de pagamento registrada')
}

// GET para verificação do webhook
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    message: 'Webhook Stripe endpoint ativo'
  })
}

