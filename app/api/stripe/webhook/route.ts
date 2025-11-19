import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { constructWebhookEvent, stripe } from '@/lib/stripe'
import Stripe from 'stripe'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

/**
 * Valida e mapeia plan_type para valores aceitos pelo banco
 * Constraint do banco: 'monthly', 'quarterly', 'annual'
 */
function validatePlanType(planType: string | undefined | null): 'monthly' | 'quarterly' | 'annual' {
  const validTypes = ['monthly', 'quarterly', 'annual']
  if (planType && validTypes.includes(planType)) {
    return planType as 'monthly' | 'quarterly' | 'annual'
  }
  // Se for 'test' ou outro valor inválido, mapear para 'monthly'
  if (planType && planType !== 'monthly' && planType !== 'quarterly' && planType !== 'annual') {
    console.warn(`⚠️ Plan type inválido: ${planType}, mapeando para 'monthly'`)
  }
  return 'monthly'
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
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
    console.log('⏱️ Tempo de validação:', Date.now() - startTime, 'ms')
    console.log('📋 Dados do evento:', JSON.stringify(event.data.object, null, 2))

    // Processar diferentes tipos de eventos
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'payment_intent.succeeded':
        // Para pagamentos únicos (daily), também processar via payment_intent
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent)
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

    const processingTime = Date.now() - startTime
    console.log(`✅ Webhook processado com sucesso em ${processingTime}ms`)
    
    return NextResponse.json({ 
      received: true,
      event_type: event.type,
      processing_time_ms: processingTime
    })

  } catch (error: any) {
    const processingTime = Date.now() - startTime
    console.error('❌ Erro no webhook:', error)
    console.error(`⏱️ Tempo até erro: ${processingTime}ms`)
    return NextResponse.json(
      { error: error.message || 'Erro ao processar webhook' },
      { status: 500 }
    )
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const handlerStartTime = Date.now()
  console.log('✅ Checkout concluído:', session.id)
  console.log('📋 Metadata da sessão:', JSON.stringify(session.metadata, null, 2))
  console.log('👤 Customer ID:', session.customer)
  console.log('📝 Subscription ID:', session.subscription)
  console.log('💳 Payment Status:', session.payment_status)
  console.log('💵 Mode:', session.mode)

  const userId = session.metadata?.user_id
  const planType = validatePlanType(session.metadata?.plan_type)
  const isDaily = session.metadata?.is_daily === 'true'

  if (!userId) {
    console.error('❌ user_id não encontrado no metadata')
    console.error('📋 Metadata completo:', session.metadata)
    return
  }

  console.log('👤 User ID encontrado:', userId)
  console.log('📦 Plan Type:', planType)
  console.log('📅 Is Daily:', isDaily)

  // ⚡ OTIMIZAÇÃO: Liberar acesso IMEDIATAMENTE quando checkout é concluído
  // Para pagamentos únicos (payment mode) ou assinaturas (subscription mode)
  // O payment_status será 'paid' quando o pagamento for confirmado
  
  // Validação de segurança mais flexível
  if (session.payment_status !== 'paid' && session.mode === 'payment') {
    // Para pagamentos únicos, exigir paid
    console.warn('⚠️ Pagamento único ainda não confirmado, aguardando...')
    console.log('📋 Payment Status:', session.payment_status)
    return
  }

  if (session.mode === 'subscription' && !session.subscription) {
    console.warn('⚠️ Modo subscription mas sem subscription_id, aguardando...')
    return
  }

  console.log('✅ Validações passadas - liberando acesso!')

  // Se for pagamento daily (compra de 1 dia), processar de forma diferente
  if (isDaily) {
    console.log('📅 Processando pagamento daily - adicionando 1 dia à conta')
    
    // Se for subscription (recurring price), cancelar a subscription no Stripe após processar
    if (session.subscription && stripe) {
      try {
        // Cancelar a subscription no Stripe imediatamente (não queremos cobrança recorrente)
        await stripe.subscriptions.cancel(session.subscription as string)
        console.log('✅ Subscription cancelada no Stripe (daily - não deve ser recorrente)')
      } catch (cancelError) {
        console.warn('⚠️ Não foi possível cancelar subscription no Stripe:', cancelError)
      }
    }
    
    // Buscar assinatura mais recente do usuário (independente do status)
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id, current_period_end, current_period_start, status, stripe_subscription_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    if (subscription) {
      // Calcular novo período baseado no período atual ou em "agora"
      const now = new Date()
      let baseDate = subscription.current_period_end ? new Date(subscription.current_period_end) : now
      
      // Se a assinatura já expirou, começar de agora
      if (baseDate < now) {
        console.log('⚠️ Assinatura expirada, reiniciando período de agora')
        baseDate = now
      }
      
      const newEnd = new Date(baseDate.getTime() + 24 * 60 * 60 * 1000) // +1 dia
      const newStart = subscription.status === 'active' ? subscription.current_period_start : now.toISOString()
      
      // Atualizar assinatura existente (reativar se necessário)
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          status: 'active', // Reativar se estava cancelled
          current_period_start: newStart,
          current_period_end: newEnd.toISOString(),
          stripe_subscription_id: session.subscription ? `daily_${session.subscription}` : subscription.stripe_subscription_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id)
      
      if (updateError) {
        console.error('❌ Erro ao atualizar período:', updateError)
      } else {
        console.log('✅ 1 dia adicionado à assinatura. Novo período:', newEnd.toISOString())
        console.log('   Status atualizado para: active')
      }
    } else {
      // Se não tem assinatura ativa, criar uma de teste com 1 dia
      const now = new Date()
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      
      // Obter valor do pagamento
      const amount = session.amount_total ? session.amount_total / 100 : 1.00
      
      const { error: insertError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_type: 'monthly', // Daily/test mapeado para monthly
          status: 'active',
          amount: amount,
          stripe_subscription_id: session.subscription ? `daily_${session.subscription}` : `daily_${session.id}`,
          stripe_customer_id: session.customer as string,
          current_period_start: now.toISOString(),
          current_period_end: tomorrow.toISOString()
        })
      
      if (insertError) {
        console.error('❌ Erro ao criar assinatura de teste:', insertError)
      } else {
        console.log('✅ Assinatura de teste criada com 1 dia')
      }
    }
    
    // Atualizar usuário
    await supabase
      .from('users')
      .update({
        subscription_plan: 'monthly', // Daily/test mapeado para monthly
        subscription_status: 'active'
      })
      .eq('id', userId)
    
    return // Não processar como subscription normal
  }

  // Buscar subscription criada (apenas para planos normais)
  const subscriptionId = session.subscription as string

  if (!subscriptionId) {
    console.error('❌ subscription_id não encontrado na sessão')
    console.error('📋 Sessão completa:', JSON.stringify(session, null, 2))
    return
  }

  console.log('📝 Subscription ID encontrado:', subscriptionId)

  // ⚡ OTIMIZAÇÃO: Não verificar status da subscription no Stripe aqui
  // A validação já foi feita no checkout.session.completed
  // Criar assinatura imediatamente para liberar acesso rápido
  console.log('✅ Subscription será criada/atualizada imediatamente')

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
        plan_type: validatePlanType(planType || existingSubscription.plan_type),
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

    // ⚡ OTIMIZAÇÃO: Buscar dados da subscription do Stripe em paralelo (não bloqueante)
    // Criar a assinatura imediatamente com valores padrão
    // O webhook customer.subscription.created/updated atualizará com valores corretos
    const now = new Date()
    const defaultEndDate = new Date()
    
    // Calcular período baseado no plan_type
    switch (planType) {
      case 'monthly':
        defaultEndDate.setMonth(defaultEndDate.getMonth() + 1)
        break
      case 'quarterly':
        defaultEndDate.setMonth(defaultEndDate.getMonth() + 3)
        break
      case 'annual':
        defaultEndDate.setFullYear(defaultEndDate.getFullYear() + 1)
        break
      default:
        defaultEndDate.setMonth(defaultEndDate.getMonth() + 1)
    }
    
    let currentPeriodStart = now.toISOString()
    let currentPeriodEnd = defaultEndDate.toISOString()

    // Tentar buscar dados precisos do Stripe (sem bloquear criação)
    const stripeDataPromise = (async () => {
      try {
        if (stripe) {
          const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId)
          return {
            start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
            end: new Date(stripeSubscription.current_period_end * 1000).toISOString()
          }
        }
      } catch (error) {
        console.warn('⚠️ Erro ao buscar dados da subscription do Stripe (não crítico):', error)
      }
      return null
    })()

    // Criar assinatura imediatamente (não esperar Stripe)
    console.log('⚡ Criando assinatura IMEDIATAMENTE com período padrão')
    const { data: newSubscription, error: insertError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan_type: validatePlanType(planType),
        amount: amount,
        status: 'active',
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: session.customer as string,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd
      })
      .select()
      .single()

    // Atualizar com dados do Stripe se disponível (não crítico)
    stripeDataPromise.then(async (stripeData) => {
      if (stripeData && newSubscription) {
        await supabase
          .from('subscriptions')
          .update({
            current_period_start: stripeData.start,
            current_period_end: stripeData.end,
            updated_at: new Date().toISOString()
          })
          .eq('id', newSubscription.id)
        console.log('✅ Períodos atualizados com dados precisos do Stripe')
      }
    })

    if (insertError) {
      console.error('❌ Erro ao criar assinatura:', insertError)
      console.error('📋 Dados que tentaram ser inseridos:', {
        user_id: userId,
        plan_type: validatePlanType(planType),
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

  const handlerTime = Date.now() - handlerStartTime
  console.log(`⚡ Checkout processado em ${handlerTime}ms - Acesso liberado!`)
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('📝 Assinatura criada:', subscription.id)
  console.log('📋 Status da subscription:', subscription.status)

  const userId = subscription.metadata?.user_id
  const planType = validatePlanType(subscription.metadata?.plan_type)

  if (!userId) {
    console.error('❌ user_id não encontrado no metadata')
    return
  }

  // Calcular período
  const periodStart = new Date(subscription.current_period_start * 1000)
  const periodEnd = new Date(subscription.current_period_end * 1000)

  // ⚡ OTIMIZAÇÃO: Ativar imediatamente se status for active ou trialing
  const shouldActivate = subscription.status === 'active' || subscription.status === 'trialing'
  const dbStatus = shouldActivate ? 'active' : subscription.status

  console.log(`⚡ Status no banco será: ${dbStatus} (Stripe status: ${subscription.status})`)

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
        status: dbStatus,
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', existingSubscription.id)

    console.log('✅ Assinatura existente atualizada com status:', dbStatus)
  } else {
    // Criar nova assinatura
    const amount = subscription.items.data[0]?.price.unit_amount || 0

    await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan_type: validatePlanType(planType),
        amount: amount / 100,
        status: dbStatus,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer as string,
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString()
      })

    console.log('✅ Nova assinatura criada com status:', dbStatus)
  }

  // ⚡ Atualizar usuário imediatamente se status for ativo
  if (shouldActivate) {
    await supabase
      .from('users')
      .update({
        subscription_plan: validatePlanType(planType),
        subscription_status: 'active'
      })
      .eq('id', userId)
    
    console.log('✅ Usuário atualizado - acesso liberado!')
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('🔄 Assinatura atualizada:', subscription.id)

  const userId = subscription.metadata?.user_id
  const planType = validatePlanType(subscription.metadata?.plan_type)

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
      plan_type: validatePlanType(planType || dbSubscription.plan_type),
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
        subscription_plan: validatePlanType(planType || dbSubscription.plan_type),
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

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('💰 Payment Intent bem-sucedido:', paymentIntent.id)
  console.log('📋 Metadata do Payment Intent:', paymentIntent.metadata)
  
  // Verificar se é daily pelo metadata
  if (paymentIntent.metadata?.is_daily !== 'true') {
    console.log('ℹ️ Payment Intent não é daily, ignorando')
    return
  }

  const userId = paymentIntent.metadata?.user_id
  
  if (!userId) {
    console.error('❌ user_id não encontrado no metadata do payment_intent')
    return
  }

  console.log('📅 Processando payment_intent para daily')
  
  // Buscar assinatura mais recente do usuário (independente do status)
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id, current_period_end, current_period_start, status, stripe_subscription_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  
  if (subscription) {
    // Calcular novo período baseado no período atual ou em "agora"
    const now = new Date()
    let baseDate = subscription.current_period_end ? new Date(subscription.current_period_end) : now
    
    // Se a assinatura já expirou, começar de agora
    if (baseDate < now) {
      console.log('⚠️ Assinatura expirada, reiniciando período de agora')
      baseDate = now
    }
    
    const newEnd = new Date(baseDate.getTime() + 24 * 60 * 60 * 1000) // +1 dia
    const newStart = subscription.status === 'active' ? subscription.current_period_start : now.toISOString()
    
    // Atualizar assinatura existente (reativar se necessário)
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'active', // Reativar se estava cancelled
        current_period_start: newStart,
        current_period_end: newEnd.toISOString(),
        stripe_subscription_id: subscription.stripe_subscription_id || `daily_payment_${paymentIntent.id}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id)
    
    if (updateError) {
      console.error('❌ Erro ao atualizar período:', updateError)
    } else {
      console.log('✅ 1 dia adicionado à assinatura. Novo período:', newEnd.toISOString())
      console.log('   Status atualizado para: active')
    }
  } else {
    // Se não tem assinatura ativa, criar uma de teste com 1 dia
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    
    // Obter valor do pagamento
    const amount = paymentIntent.amount ? paymentIntent.amount / 100 : 1.00
    
    const { error: insertError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan_type: 'monthly', // Daily/test mapeado para monthly
        status: 'active',
        amount: amount,
        stripe_subscription_id: `daily_pi_${paymentIntent.id}`,
        stripe_customer_id: paymentIntent.customer as string,
        current_period_start: now.toISOString(),
        current_period_end: tomorrow.toISOString()
      })
    
    if (insertError) {
      console.error('❌ Erro ao criar assinatura de teste:', insertError)
    } else {
      console.log('✅ Assinatura de teste criada com 1 dia')
    }
  }
  
  // Atualizar usuário
  await supabase
    .from('users')
    .update({
      subscription_plan: 'monthly', // Daily/test mapeado para monthly
      subscription_status: 'active'
    })
    .eq('id', userId)
}

async function handleDailyPayment(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id
  
  if (!userId) {
    console.error('❌ user_id não encontrado no metadata')
    return
  }

  console.log('📅 Processando pagamento daily - adicionando 1 dia à conta')
  
  // Buscar assinatura ativa do usuário
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id, current_period_end, status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()
  
  if (subscription && subscription.current_period_end) {
    // Adicionar 1 dia ao current_period_end
    const currentEnd = new Date(subscription.current_period_end)
    const newEnd = new Date(currentEnd.getTime() + 24 * 60 * 60 * 1000) // +1 dia
    
    // Atualizar assinatura
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        current_period_end: newEnd.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id)
    
    if (updateError) {
      console.error('❌ Erro ao atualizar período:', updateError)
    } else {
      console.log('✅ 1 dia adicionado à assinatura. Novo período:', newEnd.toISOString())
    }
  } else {
    // Se não tem assinatura ativa, criar uma de teste com 1 dia
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    
    const { error: insertError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan_type: 'monthly', // Daily/test mapeado para monthly
        status: 'active',
        amount: 0,
        stripe_subscription_id: `daily_${session.id}`,
        stripe_customer_id: session.customer as string,
        current_period_start: now.toISOString(),
        current_period_end: tomorrow.toISOString()
      })
    
    if (insertError) {
      console.error('❌ Erro ao criar assinatura de teste:', insertError)
    } else {
      console.log('✅ Assinatura de teste criada com 1 dia')
    }
  }
  
  // Atualizar usuário
  await supabase
    .from('users')
    .update({
      subscription_plan: 'monthly', // Daily/test mapeado para monthly
      subscription_status: 'active'
    })
    .eq('id', userId)
}

// GET para verificação do webhook
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    message: 'Webhook Stripe endpoint ativo'
  })
}

