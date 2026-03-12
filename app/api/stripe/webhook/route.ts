import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { constructWebhookEvent, stripe } from '@/lib/stripe'
import Stripe from 'stripe'

// Configuração do runtime para garantir que rode no Node.js (não Edge)
export const runtime = 'nodejs'
export const maxDuration = 30

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
  // Plan type inválido mapeado para 'monthly'
  return 'monthly'
}

/**
 * Converte timestamp do Stripe (em segundos) para Date de forma segura
 * Retorna uma data válida ou a data atual como fallback
 */
function stripeTimestampToDate(timestamp: number | null | undefined): Date {
  if (timestamp == null || isNaN(timestamp)) {
    return new Date() // Fallback para data atual
  }
  
  // Verificar se o timestamp está em segundos (Stripe) ou milissegundos
  // Timestamps do Stripe geralmente são menores que 1e12 (segundos)
  const timestampMs = timestamp < 1e12 ? timestamp * 1000 : timestamp
  const date = new Date(timestampMs)
  
  // Validar se a data é válida
  if (isNaN(date.getTime())) {
    return new Date() // Fallback para data atual se inválida
  }
  
  return date
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let processingTime = 0
  
  try {
    // Obter body raw (importante para validação de assinatura do Stripe)
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      processingTime = Date.now() - startTime
      return NextResponse.json(
        { error: 'Assinatura do webhook ausente', processing_time_ms: processingTime },
        { status: 400 }
      )
    }

    if (!webhookSecret) {
      processingTime = Date.now() - startTime
      return NextResponse.json(
        { error: 'Configuração do webhook incompleta', processing_time_ms: processingTime },
        { status: 500 }
      )
    }

    // Validar assinatura do webhook
    let event: Stripe.Event
    try {
      event = constructWebhookEvent(body, signature, webhookSecret)
    } catch (error: any) {
      processingTime = Date.now() - startTime
      return NextResponse.json(
        { error: `Assinatura inválida: ${error.message}`, processing_time_ms: processingTime },
        { status: 400 }
      )
    }

    // Webhook Stripe recebido e validado

    // Processar diferentes tipos de eventos
    console.log('📦 Processando evento:', event.type, 'Event ID:', event.id)
    
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          console.log('📋 Processando checkout.session.completed...')
          await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
          console.log('✅ checkout.session.completed processado com sucesso')
          break

        case 'payment_intent.succeeded':
          console.log('💰 Processando payment_intent.succeeded...')
          // Para pagamentos únicos (daily), também processar via payment_intent
          await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent)
          console.log('✅ payment_intent.succeeded processado com sucesso')
          break

        case 'customer.subscription.created':
          console.log('📦 Processando customer.subscription.created...')
          await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
          console.log('✅ customer.subscription.created processado com sucesso')
          break

        case 'customer.subscription.updated':
          console.log('🔄 Processando customer.subscription.updated...')
          await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
          console.log('✅ customer.subscription.updated processado com sucesso')
          break

        case 'customer.subscription.deleted':
          console.log('🗑️ Processando customer.subscription.deleted...')
          await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
          console.log('✅ customer.subscription.deleted processado com sucesso')
          break

        case 'invoice.paid':
          console.log('💳 Processando invoice.paid...')
          await handleInvoicePaid(event.data.object as Stripe.Invoice)
          console.log('✅ invoice.paid processado com sucesso')
          break

        case 'invoice.payment_failed':
          console.log('❌ Processando invoice.payment_failed...')
          await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
          console.log('✅ invoice.payment_failed processado com sucesso')
          break

        default:
          console.log('ℹ️ Evento não tratado:', event.type)
          // Evento não tratado
      }
    } catch (handlerError: any) {
      console.error('❌ Erro ao processar evento:', event.type, handlerError)
      console.error('❌ Stack trace:', handlerError.stack)
      throw handlerError // Re-throw para ser capturado no catch externo
    }
    
    processingTime = Date.now() - startTime
    
    return NextResponse.json({ 
      received: true,
      event_type: event.type,
      processing_time_ms: processingTime
    })

  } catch (error: any) {
    // Erro no webhook
    processingTime = Date.now() - startTime
    return NextResponse.json(
      { error: error.message || 'Erro ao processar webhook', processing_time_ms: processingTime },
      { status: 500 }
    )
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const handlerStartTime = Date.now()
  console.log('📋 [handleCheckoutSessionCompleted] Iniciando processamento. Session ID:', session.id)
  console.log('📋 [handleCheckoutSessionCompleted] Metadata:', JSON.stringify(session.metadata))
  console.log('📋 [handleCheckoutSessionCompleted] Mode:', session.mode, 'Payment Status:', session.payment_status)
  console.log('📋 [handleCheckoutSessionCompleted] Subscription ID:', session.subscription)

  const userId = session.metadata?.user_id
  const planType = validatePlanType(session.metadata?.plan_type)
  const isDaily = session.metadata?.is_daily === 'true'

  console.log('📋 [handleCheckoutSessionCompleted] User ID:', userId, 'Plan Type:', planType, 'Is Daily:', isDaily)

  if (!userId) {
    console.error('❌ [handleCheckoutSessionCompleted] user_id não encontrado nos metadata da session')
    console.error('❌ [handleCheckoutSessionCompleted] Metadata completo:', JSON.stringify(session.metadata))
    throw new Error('user_id não encontrado nos metadata da checkout session')
  }

  // ⚡ OTIMIZAÇÃO: Liberar acesso IMEDIATAMENTE quando checkout é concluído
  // Para pagamentos únicos (payment mode) ou assinaturas (subscription mode)
  // O payment_status será 'paid' quando o pagamento for confirmado
  
  // Validação de segurança mais flexível
  if (session.payment_status !== 'paid' && session.mode === 'payment') {
    console.warn('⚠️ [handleCheckoutSessionCompleted] Payment status não é "paid" para mode "payment". Status:', session.payment_status)
    // Para pagamentos únicos, exigir paid - mas não retornar silenciosamente
    // Continuar para verificar se é subscription
  }

  if (session.mode === 'subscription' && !session.subscription) {
    console.error('❌ [handleCheckoutSessionCompleted] Mode é "subscription" mas session.subscription é null/undefined')
    throw new Error('Subscription ID não encontrado na checkout session (mode: subscription)')
  }

  // Se for pagamento daily (compra de 1 dia), processar de forma diferente
  if (isDaily) {
    // Processando pagamento daily
    
    // Se for subscription (recurring price), cancelar a subscription no Stripe após processar
    if (session.subscription && stripe) {
      try {
        // Cancelar a subscription no Stripe imediatamente (não queremos cobrança recorrente)
        await stripe.subscriptions.cancel(session.subscription as string)
        // Subscription cancelada no Stripe (daily)
      } catch (cancelError) {
        // Não foi possível cancelar subscription
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
        // Assinatura expirada, reiniciando período
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

  console.log('📋 [handleCheckoutSessionCompleted] Verificando subscription ID:', subscriptionId)

  if (!subscriptionId) {
    console.error('❌ [handleCheckoutSessionCompleted] Subscription ID não encontrado na session')
    console.error('❌ [handleCheckoutSessionCompleted] Session mode:', session.mode)
    console.error('❌ [handleCheckoutSessionCompleted] Session subscription:', session.subscription)
    throw new Error('Subscription ID não encontrado na checkout session')
  }

  // ⚡ OTIMIZAÇÃO: Não verificar status da subscription no Stripe aqui
  // A validação já foi feita no checkout.session.completed
  // Criar assinatura imediatamente para liberar acesso rápido
  // Subscription será criada/atualizada imediatamente

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
    console.log('📋 [handleCheckoutSessionCompleted] Assinatura existente encontrada:', existingSubscription.id, 'Status:', existingSubscription.status)
    console.log('📋 [handleCheckoutSessionCompleted] Stripe Subscription ID atual:', existingSubscription.stripe_subscription_id)
    console.log('📋 [handleCheckoutSessionCompleted] Novo Stripe Subscription ID:', subscriptionId)
    
    // Buscar dados completos do Stripe para atualizar períodos corretamente
    let periodStart = currentPeriodStart
    let periodEnd = currentPeriodEnd
    
    try {
      if (stripe) {
        console.log('📋 [handleCheckoutSessionCompleted] Buscando dados da subscription no Stripe...')
        const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId)
        periodStart = stripeTimestampToDate(stripeSubscription.current_period_start).toISOString()
        periodEnd = stripeTimestampToDate(stripeSubscription.current_period_end).toISOString()
        console.log('✅ [handleCheckoutSessionCompleted] Períodos obtidos do Stripe:', {
          start: periodStart,
          end: periodEnd
        })
      }
    } catch (stripeError: any) {
      console.warn('⚠️ [handleCheckoutSessionCompleted] Erro ao buscar dados do Stripe, usando períodos padrão calculados:', stripeError.message)
    }
    
    // Atualizar assinatura existente
    const { data: updatedSubscription, error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: session.customer as string,
        plan_type: validatePlanType(planType || existingSubscription.plan_type),
        current_period_start: periodStart,
        current_period_end: periodEnd,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingSubscription.id)
      .select()
      .single()

    if (updateError) {
      console.error('❌ [handleCheckoutSessionCompleted] ERRO ao atualizar assinatura existente:', updateError)
      console.error('❌ [handleCheckoutSessionCompleted] Detalhes do erro:', {
        message: updateError.message,
        code: updateError.code,
        details: updateError.details,
        hint: updateError.hint
      })
      throw updateError
    } else {
      console.log('✅ [handleCheckoutSessionCompleted] Assinatura existente atualizada:', updatedSubscription?.id)
      console.log('✅ [handleCheckoutSessionCompleted] Períodos atualizados:', {
        start: periodStart,
        end: periodEnd
      })
    }
  } else {
    console.log('📝 [handleCheckoutSessionCompleted] Criando nova assinatura no banco...')
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
            start: stripeTimestampToDate(stripeSubscription.current_period_start).toISOString(),
            end: stripeTimestampToDate(stripeSubscription.current_period_end).toISOString()
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
        // Períodos atualizados
      }
    })

    if (insertError) {
      console.error('❌ [handleCheckoutSessionCompleted] ERRO CRÍTICO ao criar assinatura:', insertError)
      console.error('❌ [handleCheckoutSessionCompleted] Detalhes do erro:', {
        message: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint
      })
      console.error('❌ [handleCheckoutSessionCompleted] Dados que tentaram ser inseridos:', {
        user_id: userId,
        plan_type: validatePlanType(planType),
        amount: amount,
        status: 'active',
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: session.customer,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd
      })
      throw insertError // Lançar erro para ser capturado no catch externo
    } else {
      console.log('✅ [handleCheckoutSessionCompleted] Assinatura criada com sucesso:', newSubscription?.id)
    }
  }

  // Atualizar usuário
  console.log('📋 [handleCheckoutSessionCompleted] Atualizando usuário com plano:', planType || 'monthly')
  
  const { error: userUpdateError } = await supabase
    .from('users')
    .update({
      subscription_plan: planType || 'monthly',
      subscription_status: 'active'
    })
    .eq('id', userId)

  if (userUpdateError) {
    console.error('❌ [handleCheckoutSessionCompleted] Erro ao atualizar usuário:', userUpdateError)
    console.error('❌ [handleCheckoutSessionCompleted] Detalhes do erro:', {
      message: userUpdateError.message,
      code: userUpdateError.code,
      details: userUpdateError.details
    })
    // Não lançar erro aqui pois a assinatura já foi criada
    // Mas logar para diagnóstico
  } else {
    console.log('✅ [handleCheckoutSessionCompleted] Usuário atualizado com sucesso')
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('📦 [handleSubscriptionCreated] Iniciando processamento. Subscription ID:', subscription.id)
  console.log('📦 [handleSubscriptionCreated] Metadata:', JSON.stringify(subscription.metadata))
  
  const userId = subscription.metadata?.user_id
  const planType = validatePlanType(subscription.metadata?.plan_type)

  console.log('📦 [handleSubscriptionCreated] User ID:', userId, 'Plan Type:', planType)

  if (!userId) {
    console.error('❌ [handleSubscriptionCreated] user_id não encontrado nos metadata da subscription')
    console.error('❌ [handleSubscriptionCreated] Metadata completo:', JSON.stringify(subscription.metadata))
    throw new Error('user_id não encontrado nos metadata da subscription')
  }

  // Calcular período (validação segura de timestamps)
  const periodStart = stripeTimestampToDate(subscription.current_period_start)
  const periodEnd = stripeTimestampToDate(subscription.current_period_end)

  // ⚡ OTIMIZAÇÃO: Ativar imediatamente se status for active ou trialing
  const shouldActivate = subscription.status === 'active' || subscription.status === 'trialing'
  const dbStatus = shouldActivate ? 'active' : subscription.status

  // Status no banco será: dbStatus

  // Buscar assinatura existente
  const { data: existingSubscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle()

  if (existingSubscription) {
    console.log('📦 [handleSubscriptionCreated] Assinatura existente encontrada:', existingSubscription.id)
    
    // Atualizar assinatura existente
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: dbStatus,
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', existingSubscription.id)

    if (updateError) {
      console.error('❌ [handleSubscriptionCreated] Erro ao atualizar assinatura existente:', updateError)
      throw updateError
    }

    console.log('✅ [handleSubscriptionCreated] Assinatura existente atualizada com status:', dbStatus)
  } else {
    console.log('📦 [handleSubscriptionCreated] Criando nova assinatura no banco...')
    
    // Criar nova assinatura
    const amount = subscription.items.data[0]?.price.unit_amount || 0

    const { data: newSubscription, error: insertError } = await supabase
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
      .select()
      .single()

    if (insertError) {
      console.error('❌ [handleSubscriptionCreated] ERRO CRÍTICO ao criar assinatura:', insertError)
      console.error('❌ [handleSubscriptionCreated] Detalhes do erro:', {
        message: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint
      })
      console.error('❌ [handleSubscriptionCreated] Dados que tentaram ser inseridos:', {
        user_id: userId,
        plan_type: validatePlanType(planType),
        amount: amount / 100,
        status: dbStatus,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer,
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString()
      })
      throw insertError
    }

    console.log('✅ [handleSubscriptionCreated] Nova assinatura criada com status:', dbStatus, 'ID:', newSubscription?.id)
  }

  // ⚡ Atualizar usuário imediatamente se status for ativo
  if (shouldActivate) {
    console.log('📦 [handleSubscriptionCreated] Atualizando usuário com plano ativo...')
    
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({
        subscription_plan: validatePlanType(planType),
        subscription_status: 'active'
      })
      .eq('id', userId)
    
    if (userUpdateError) {
      console.error('❌ [handleSubscriptionCreated] Erro ao atualizar usuário:', userUpdateError)
      // Não lançar erro aqui pois a assinatura já foi criada/atualizada
    } else {
      console.log('✅ [handleSubscriptionCreated] Usuário atualizado - acesso liberado!')
    }
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('🔄 Assinatura atualizada:', subscription.id)

  const userId = subscription.metadata?.user_id
  const planType = validatePlanType(subscription.metadata?.plan_type)

  // Calcular período (validação segura de timestamps)
  const periodStart = stripeTimestampToDate(subscription.current_period_start)
  const periodEnd = stripeTimestampToDate(subscription.current_period_end)

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
      ...(subscription.canceled_at && { cancelled_at: stripeTimestampToDate(subscription.canceled_at).toISOString() }),
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

