/**
 * Funções de Assinaturas Recorrentes - Pagar.me API v5
 * Documentação: https://docs.pagar.me/v5/docs/overview-1
 */

import { pagarmeRequest } from './pagarme'

// Detectar ambiente automaticamente baseado na chave
const PAGARME_API_KEY = process.env.PAGARME_API_KEY || ''
const isTestEnvironment = PAGARME_API_KEY 
  ? (PAGARME_API_KEY.startsWith('sk_test_') || PAGARME_API_KEY.startsWith('ak_test_'))
  : false

// URL base da API Pagar.me
// A Pagar.me usa a mesma URL para sandbox e produção
// A diferença está apenas na chave de API (sk_test_... vs sk_live_...)
const PAGARME_API_URL = process.env.PAGARME_API_URL || 'https://api.pagar.me/core/v5'

/**
 * Cria um plano de assinatura
 */
export async function criarPlano(planData: {
  name: string
  description?: string
  interval: 'month' | 'year'
  interval_count: number
  billing_type: 'prepaid' | 'postpaid'
  currency: string
  items: Array<{
    name: string
    quantity: number
    pricing_scheme: {
      scheme_type: 'unit' | 'package' | 'tier' | 'volume'
      price: number
    }
  }>
  metadata?: Record<string, string>
}): Promise<any> {
  console.log('📤 Criando Plano:', planData.name)
  return await pagarmeRequest('/plans', {
    method: 'POST',
    body: JSON.stringify(planData)
  })
}

/**
 * Lista todos os planos
 */
export async function listarPlanos(): Promise<any> {
  console.log('📋 Listando Planos')
  return await pagarmeRequest('/plans')
}

/**
 * Cria uma assinatura recorrente
 */
export async function criarAssinatura(subscriptionData: {
  plan_id: string
  customer_id?: string
  customer?: {
    name: string
    email: string
    document: string
    type: 'individual' | 'company'
    document_type: 'CPF' | 'CNPJ'
    phones?: {
      mobile_phone: {
        country_code: string
        area_code: string
        number: string
      }
    }
    address?: {
      street: string
      number: string
      zipcode: string
      neighborhood: string
      city: string
      state: string
      country: string
    }
  }
  payment_method?: 'credit_card' | 'boleto' | 'pix'
  card_id?: string
  card?: {
    number: string
    holder_name: string
    exp_month: number
    exp_year: number
    cvv: string
    billing_address?: {
      street: string
      number: string
      zipcode: string
      neighborhood: string
      city: string
      state: string
      country: string
    }
  }
  metadata?: Record<string, string>
}): Promise<any> {
  console.log('📤 Criando Assinatura para plano:', subscriptionData.plan_id)
  
  // Log do payload sem dados sensíveis
  const safePayload = {
    ...subscriptionData,
    card: subscriptionData.card ? {
      ...subscriptionData.card,
      number: subscriptionData.card.number ? 
        subscriptionData.card.number.substring(0, 4) + '****' + subscriptionData.card.number.substring(subscriptionData.card.number.length - 4) 
        : 'N/A',
      cvv: '***'
    } : undefined
  }
  console.log('📋 Payload (seguro):', JSON.stringify(safePayload, null, 2))
  
  const result = await pagarmeRequest('/subscriptions', {
    method: 'POST',
    body: JSON.stringify(subscriptionData)
  })
  
  console.log('✅ Assinatura criada:', result.id)
  return result
}


/**
 * Obtém um plano por ID
 */
export async function obterPlano(planId: string): Promise<any> {
  console.log('📋 Obtendo Plano:', planId)
  return await pagarmeRequest(`/plans/${planId}`)
}

/**
 * Obtém uma assinatura por ID
 */
export async function obterAssinatura(subscriptionId: string): Promise<any> {
  console.log('📋 Obtendo Assinatura:', subscriptionId)
  return await pagarmeRequest(`/subscriptions/${subscriptionId}`)
}

/**
 * Cancela uma assinatura
 * A Pagar.me API v5 usa DELETE para cancelar assinaturas
 * Nota: A API v5 não suporta cancelamento no fim do período via API
 * O cancelamento será imediato na Pagar.me, mas podemos manter o status no Supabase
 * até o fim do período atual para permitir acesso até lá
 */
export async function cancelarAssinatura(subscriptionId: string, cancelImmediately: boolean = false): Promise<any> {
  console.log('❌ Cancelando Assinatura:', subscriptionId, cancelImmediately ? '(imediatamente)' : '(no fim do período)')
  
  // A Pagar.me API v5 só suporta DELETE para cancelamento
  // O cancelamento será sempre imediato na Pagar.me
  // Mas podemos controlar o status no Supabase para permitir acesso até o fim do período
  console.log('📝 Usando DELETE para cancelar assinatura na Pagar.me')
  
  return await pagarmeRequest(`/subscriptions/${subscriptionId}`, {
    method: 'DELETE',
    // Não enviar body para DELETE
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

