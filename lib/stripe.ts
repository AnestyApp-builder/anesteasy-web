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
      apiVersion: '2024-12-18.acacia',
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
  monthly: process.env.STRIPE_PRICE_ID_MONTHLY || '',
  quarterly: process.env.STRIPE_PRICE_ID_QUARTERLY || '',
  annual: process.env.STRIPE_PRICE_ID_ANNUAL || ''
}

/**
 * Cria uma sessão de Checkout da Stripe para assinatura
 */
export async function createCheckoutSession({
  userId,
  userEmail,
  planType,
  successUrl,
  cancelUrl
}: {
  userId: string
  userEmail: string
  planType: 'monthly' | 'quarterly' | 'annual'
  successUrl: string
  cancelUrl: string
}): Promise<Stripe.Checkout.Session> {
  
  if (!stripe) {
    throw new Error('Stripe não inicializado. Verifique STRIPE_SECRET_KEY no .env.local')
  }
  
  // Obter ou criar customer na Stripe
  const customer = await getOrCreateCustomer(userId, userEmail)
  
  // Obter Price ID do plano
  const priceId = STRIPE_PRICE_IDS[planType]
  
  if (!priceId) {
    throw new Error(`Price ID não configurado para o plano ${planType}. Configure STRIPE_PRICE_ID_${planType.toUpperCase()} no .env.local`)
  }
  
  // Criar sessão de checkout
  const session = await stripe.checkout.sessions.create({
    customer: customer.id,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      user_id: userId,
      plan_type: planType,
    },
    subscription_data: {
      metadata: {
        user_id: userId,
        plan_type: planType,
      },
    },
    // Permitir códigos promocionais
    allow_promotion_codes: true,
    // Coletar endereço de cobrança
    billing_address_collection: 'required',
  })
  
  return session
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
  const subscription = await stripe.subscriptions.cancel(subscriptionId)
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

