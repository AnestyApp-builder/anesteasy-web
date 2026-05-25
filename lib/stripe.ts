/**
 * Biblioteca para integração com Stripe
 * Documentação: https://stripe.com/docs/api
 * 
 * IMPORTANTE: Este módulo é server-side only
 * Use apenas em API routes ou Server Components
 */

import 'server-only'
import Stripe from 'stripe'

// Inicializar cliente Stripe
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || ''

if (!stripeSecretKey) {
  console.error('❌ STRIPE_SECRET_KEY não configurada no .env.local')
}

export const stripe = stripeSecretKey 
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      typescript: true,
    })
  : null as any

// Preços dos planos em centavos (BRL)
export const PLAN_PRICES = {
  monthly: 7900, // R$ 79,00
  quarterly: 22500, // R$ 225,00
  annual: 85000 // R$ 850,00
}

// Nomes dos planos
export const PLAN_NAMES = {
  monthly: 'Plano Mensal - AnestEasy',
  quarterly: 'Plano Trimestral - AnestEasy',
  annual: 'Plano Anual - AnestEasy'
}

// IDs dos preços na Stripe (serão preenchidos após criar os produtos na Stripe Dashboard)
// Você precisará substituir esses IDs pelos IDs reais após criar os preços na Stripe
export const STRIPE_PRICE_IDS = {
  monthly: process.env.STRIPE_PRICE_ID_MONTHLY || 'price_1STnz90OPdbN283Dy0Bo5SQ9',
  quarterly: process.env.STRIPE_PRICE_ID_QUARTERLY || 'price_1STo0P0OPdbN283DwICLYGlA',
  annual: process.env.STRIPE_PRICE_ID_ANNUAL || 'price_1STo0n0OPdbN283DM1EKyzHw',
  daily: process.env.STRIPE_PRICE_ID_DAILY || 'price_1SVBLC0OPdbN283D6CArozLY',
  standard_seat_monthly: process.env.STRIPE_PRICE_ID_STANDARD_SEAT_MONTHLY || 'price_1TZzxm0OPdbN283DXv3FWJsw',
  standard_seat_quarterly: process.env.STRIPE_PRICE_ID_STANDARD_SEAT_QUARTERLY || 'price_1Ta0030OPdbN283DsAeJIsQH',
  standard_seat_annual: process.env.STRIPE_PRICE_ID_STANDARD_SEAT_ANNUAL || 'price_1Ta01v0OPdbN283DqPGZ5dur',
  coord_seat_monthly: process.env.STRIPE_PRICE_ID_COORD_SEAT_MONTHLY || 'price_1Ta03j0OPdbN283DjadzH7xZ',
  coord_seat_quarterly: process.env.STRIPE_PRICE_ID_COORD_SEAT_QUARTERLY || 'price_1Ta04L0OPdbN283D5EdFb6XQ',
  coord_seat_annual: process.env.STRIPE_PRICE_ID_COORD_SEAT_ANNUAL || 'price_1Ta0550OPdbN283DrvelJNrj'
}

/**
 * Cria uma sessão de Checkout da Stripe para assinatura
 */
export async function createCheckoutSession({
  userId,
  userEmail,
  planType,
  successUrl,
  cancelUrl,
  isDaily = false,
  standardSeats = 0,
  coordSeats = 0
}: {
  userId: string
  userEmail: string
  planType: 'monthly' | 'quarterly' | 'annual' | 'daily'
  successUrl: string
  cancelUrl: string
  isDaily?: boolean
  standardSeats?: number
  coordSeats?: number
}): Promise<Stripe.Checkout.Session> {
  
  if (!stripe) {
    throw new Error('Stripe não inicializado. Verifique STRIPE_SECRET_KEY no .env.local')
  }
  
  // Obter ou criar customer na Stripe
  const customer = await getOrCreateCustomer(userId, userEmail)
  
  // Se estiver comprando assentos de equipe, o usuário é considerado Coordenador de Grupo.
  // Portanto, o plano base dele é o Plano Coordenador (coord_seat) ao invés do individual.
  const isGroupCoordinator = (standardSeats && standardSeats > 0) || (coordSeats && coordSeats > 0);
  const resolvedPlanType = planType === 'daily' ? 'monthly' : planType;
  const priceId = isGroupCoordinator
    ? (STRIPE_PRICE_IDS as any)[`coord_seat_${resolvedPlanType}`]
    : STRIPE_PRICE_IDS[planType];
  
  console.log('🔍 Verificando Price ID para planType:', planType)
  console.log('🔍 Coordenador de Grupo:', isGroupCoordinator)
  console.log('🔍 Price ID encontrado:', priceId ? `${priceId.substring(0, 20)}...` : 'NÃO ENCONTRADO')
  
  if (!priceId) {
    const errorMsg = `Price ID não configurado para o plano ${planType}. Configure STRIPE_PRICE_ID_${planType.toUpperCase()} no .env.local`
    console.error('❌', errorMsg)
    throw new Error(errorMsg)
  }
  
  // Verificar o tipo do price para determinar o modo correto
  let mode: 'payment' | 'subscription' = 'subscription'
  let priceType: 'one_time' | 'recurring' | null = null
  
  try {
    // Verificar o tipo do price no Stripe
    const price = await stripe.prices.retrieve(priceId)
    priceType = price.type as 'one_time' | 'recurring'
    console.log('📋 Tipo do Price:', priceType)
    
    // Determinar o modo baseado no tipo do price e se é daily
    if (isDaily) {
      // Para daily, preferir 'payment' se o price for 'one_time'
      // Caso contrário, usar 'subscription' se o price for 'recurring'
      if (priceType === 'one_time') {
        mode = 'payment'
      } else if (priceType === 'recurring') {
        mode = 'subscription'
        console.log('⚠️ Price é do tipo recurring, usando mode subscription para plano daily')
      }
    } else {
      // Para planos normais, sempre usar subscription
      mode = 'subscription'
    }
  } catch (priceError: any) {
    console.error('❌ Erro ao verificar price ID:', priceError)
    // Se não conseguir verificar, usar modo padrão baseado em isDaily
    mode = isDaily ? 'payment' : 'subscription'
    console.warn('⚠️ Não foi possível verificar o tipo do price, usando modo padrão:', mode)
  }
  
  console.log('📋 Modo de checkout:', mode)
  console.log('📋 Is Daily:', isDaily)
  
  // Criar sessão de checkout
  try {
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price: priceId,
        quantity: 1,
      },
    ]
 
    // Para vagas extras da equipe, ambos (Anestesistas e Secretárias) utilizam o preço padrão de assento (R$ 79,90)
    const extraSeatsPriceId = (STRIPE_PRICE_IDS as any)[`standard_seat_${resolvedPlanType}`]
    const totalExtraSeats = (standardSeats || 0) + (coordSeats || 0)

    if (totalExtraSeats > 0 && extraSeatsPriceId) {
      lineItems.push({
        price: extraSeatsPriceId,
        quantity: totalExtraSeats,
      })
    }

    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      customer: customer.id,
      mode: mode,
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        user_id: userId,
        plan_type: isDaily ? 'test' : planType,
        is_daily: isDaily ? 'true' : 'false',
        standard_seats: standardSeats.toString(),
        coord_seats: coordSeats.toString()
      },
      billing_address_collection: isDaily && mode === 'payment' ? 'auto' : 'required',
    }

    // Adicionar payment_intent_data apenas para pagamentos únicos (daily com one_time)
    if (isDaily && mode === 'payment') {
      sessionConfig.payment_intent_data = {
        metadata: {
          user_id: userId,
          plan_type: 'test',
          is_daily: 'true'
        }
      }
    }

    // Adicionar subscription_data para subscriptions (incluindo daily com recurring)
    if (mode === 'subscription') {
      sessionConfig.subscription_data = {
        metadata: {
          user_id: userId,
          plan_type: isDaily ? 'test' : planType,
          is_daily: isDaily ? 'true' : 'false',
          standard_seats: standardSeats.toString(),
          coord_seats: coordSeats.toString()
        },
      }
      // Para daily, não permitir códigos promocionais (já que é um teste)
      if (!isDaily) {
        sessionConfig.allow_promotion_codes = true
      }
    }

    const session = await stripe.checkout.sessions.create(sessionConfig)
    
    console.log('✅ Sessão de checkout criada com sucesso:', session.id)
    console.log('📋 Payment Intent ID:', session.payment_intent)
    console.log('📋 Subscription ID:', session.subscription)
    return session
  } catch (sessionError: any) {
    console.error('❌ Erro ao criar sessão de checkout:', sessionError)
    console.error('📋 Erro do Stripe:', sessionError.message)
    console.error('📋 Tipo do erro:', sessionError.type)
    console.error('📋 Código do erro:', sessionError.code)
    throw new Error(`Erro ao criar checkout: ${sessionError.message || 'Erro desconhecido'}`)
  }
}

/**
 * Cria uma sessão do Customer Portal da Stripe
 */
export async function createCustomerPortalSession({
  userId,
  userEmail,
  returnUrl
}: {
  userId: string
  userEmail: string
  returnUrl: string
}): Promise<Stripe.BillingPortal.Session> {
  
  if (!stripe) {
    throw new Error('Stripe não inicializado. Verifique STRIPE_SECRET_KEY no .env.local')
  }
  
  // Obter customer existente
  const customer = await getOrCreateCustomer(userId, userEmail)
  
  // Criar sessão do portal
  const session = await stripe.billingPortal.sessions.create({
    customer: customer.id,
    return_url: returnUrl,
  })
  
  return session
}

/**
 * Busca ou cria um customer na Stripe
 */
async function getOrCreateCustomer(userId: string, userEmail: string): Promise<Stripe.Customer> {
  if (!stripe) {
    throw new Error('Stripe não inicializado. Verifique STRIPE_SECRET_KEY no .env.local')
  }
  
  // Buscar customer existente pelo metadata user_id
  const existingCustomers = await stripe.customers.list({
    email: userEmail,
    limit: 1,
  })
  
  if (existingCustomers.data.length > 0) {
    const customer = existingCustomers.data[0]
    
    // Atualizar metadata se necessário
    if (customer.metadata.user_id !== userId) {
      const updatedCustomer = await stripe.customers.update(customer.id, {
        metadata: {
          user_id: userId,
        },
      })
      return updatedCustomer
    }
    
    return customer
  }
  
  // Criar novo customer
  const customer = await stripe.customers.create({
    email: userEmail,
    metadata: {
      user_id: userId,
    },
  })
  
  return customer
}

/**
 * Busca uma assinatura da Stripe pelo ID
 */
export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  if (!stripe) {
    throw new Error('Stripe não inicializado. Verifique STRIPE_SECRET_KEY no .env.local')
  }
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  return subscription
}

/**
 * Cancela uma assinatura na Stripe
 */
export async function cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  if (!stripe) {
    throw new Error('Stripe não inicializado. Verifique STRIPE_SECRET_KEY no .env.local')
  }
  // Agenda o cancelamento para o fim do período atual (não cancela imediatamente)
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  })
  return subscription
}

export async function reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  if (!stripe) {
    throw new Error('Stripe não inicializado. Verifique STRIPE_SECRET_KEY no .env.local')
  }
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  })
  return subscription
}

/**
 * Atualiza uma assinatura na Stripe (para upgrade/downgrade)
 * A Stripe calcula automaticamente a proration
 */
export async function updateSubscription(
  subscriptionId: string,
  newPlanType: 'monthly' | 'quarterly' | 'annual'
): Promise<Stripe.Subscription> {
  
  if (!stripe) {
    throw new Error('Stripe não inicializado. Verifique STRIPE_SECRET_KEY no .env.local')
  }
  
  const newPriceId = STRIPE_PRICE_IDS[newPlanType]
  
  if (!newPriceId) {
    throw new Error(`Price ID não configurado para o plano ${newPlanType}`)
  }
  
  // Buscar assinatura atual
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  
  // Atualizar o item da assinatura com o novo preço
  const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
    proration_behavior: 'always_invoice', // Sempre criar invoice com proration
    metadata: {
      ...subscription.metadata,
      plan_type: newPlanType,
    },
  })
  
  return updatedSubscription
}

/**
 * Valida a assinatura de um webhook da Stripe
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  if (!stripe) {
    throw new Error('Stripe não inicializado. Verifique STRIPE_SECRET_KEY no .env.local')
  }
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret)
}

