/**
 * Biblioteca para integração com Pagar.me API v5
 * Documentação: https://docs.pagar.me/v5/docs/overview-1
 */

// Detectar ambiente automaticamente baseado na chave
const PAGARME_API_KEY = process.env.PAGARME_API_KEY || ''
const isTestEnvironment = PAGARME_API_KEY 
  ? (PAGARME_API_KEY.startsWith('sk_test_') || PAGARME_API_KEY.startsWith('ak_test_'))
  : false

// Log de debug para verificar o que está sendo lido
if (typeof process !== 'undefined' && process.env) {
  console.log('🔍 [DEBUG] PAGARME_API_KEY lida:', PAGARME_API_KEY ? `${PAGARME_API_KEY.substring(0, 20)}...` : 'VAZIA')
  console.log('🔍 [DEBUG] isTestEnvironment:', isTestEnvironment)
}

// URL base da API Pagar.me
// A Pagar.me usa a mesma URL para sandbox e produção
// A diferença está apenas na chave de API (sk_test_... vs sk_live_...)
const PAGARME_API_URL = process.env.PAGARME_API_URL || 'https://api.pagar.me/core/v5'

/**
 * Helper para fazer requisições autenticadas à API Pagar.me
 */
export async function pagarmeRequest(endpoint: string, options: RequestInit = {}) {
  if (!PAGARME_API_KEY) {
    throw new Error('PAGARME_API_KEY não configurada')
  }

  const url = `${PAGARME_API_URL}${endpoint}`
  const basicAuth = Buffer.from(`${PAGARME_API_KEY}:`).toString('base64')

  console.log('🌐 Fazendo requisição:', url)
  console.log('🔧 Ambiente:', isTestEnvironment ? 'SANDBOX (Teste)' : 'PRODUÇÃO')
  console.log('🔑 Chave (primeiros 15 chars):', PAGARME_API_KEY.substring(0, 15) + '...')
  console.log('📋 Método:', options.method || 'GET')
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers
    }
  })

  const responseText = await response.text()
  console.log('📥 Status da resposta:', response.status)
  console.log('📥 Body da resposta (primeiros 500 chars):', responseText.substring(0, 500))

  if (!response.ok) {
    console.log('❌ Resposta não OK - Status:', response.status)
    console.log('❌ Resposta completa:', responseText)
    
    // Se a resposta estiver vazia, retornar erro genérico
    if (!responseText || responseText.trim() === '') {
      throw new Error(`Erro na API Pagar.me (${response.status}): Resposta vazia`)
    }
    
    let errorData
    try {
      errorData = JSON.parse(responseText)
      console.log('❌ Erro parseado:', JSON.stringify(errorData, null, 2))
    } catch (e) {
      console.error('❌ Erro ao fazer parse do JSON:', e)
      throw new Error(`Erro na API Pagar.me (${response.status}): ${responseText.substring(0, 200)}`)
    }
    
    // Extrair mensagem de erro de diferentes formatos possíveis
    let errorMessage = `Erro na API Pagar.me (${response.status})`
    
    if (errorData.message) {
      errorMessage = typeof errorData.message === 'string' 
        ? errorData.message 
        : JSON.stringify(errorData.message)
    } else if (errorData.error) {
      if (typeof errorData.error === 'string') {
        errorMessage = errorData.error
      } else if (errorData.error.message) {
        errorMessage = typeof errorData.error.message === 'string'
          ? errorData.error.message
          : JSON.stringify(errorData.error.message)
      } else {
        errorMessage = JSON.stringify(errorData.error)
      }
    } else if (errorData.detail) {
      errorMessage = typeof errorData.detail === 'string'
        ? errorData.detail
        : JSON.stringify(errorData.detail)
    } else if (errorData.title) {
      errorMessage = typeof errorData.title === 'string'
        ? errorData.title
        : JSON.stringify(errorData.title)
    } else if (errorData.errors && Array.isArray(errorData.errors)) {
      // Se for um array de erros, pegar o primeiro
      const firstError = errorData.errors[0]
      if (typeof firstError === 'string') {
        errorMessage = firstError
      } else if (firstError.message) {
        errorMessage = firstError.message
      } else {
        errorMessage = JSON.stringify(errorData.errors)
      }
    } else {
      // Se não conseguir extrair, usar o objeto completo como string
      errorMessage = JSON.stringify(errorData)
    }
    
    console.error('❌ Mensagem de erro final:', errorMessage)
    throw new Error(errorMessage)
  }

  // Se a resposta estiver vazia (comum em DELETE com sucesso), retornar objeto vazio
  if (!responseText || responseText.trim() === '') {
    console.log('✅ Resposta vazia (comum em DELETE) - retornando sucesso')
    return { success: true, status: 'cancelled' }
  }

  try {
    return JSON.parse(responseText)
  } catch (e) {
    console.warn('⚠️ Erro ao fazer parse do JSON da resposta, retornando texto:', e)
    return { success: true, raw: responseText }
  }
}

/**
 * Cria um Payment Link na Pagar.me
 * @param paymentLinkData Dados do payment link
 * @returns Payment Link criado
 */
export async function criarPaymentLink(paymentLinkData: {
  items: Array<{
    amount: number
    description: string
    quantity: number
    code: string
  }>
  customer: {
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
  }
  payment_config: {
    credit_card: {
      enabled: boolean
      installments: Array<{
        number: number
        total: number
      }>
    }
    boleto?: {
      enabled: boolean
    }
    pix?: {
      enabled: boolean
    }
  }
  expires_in?: number
  success_url?: string
  cancel_url?: string
  metadata?: Record<string, string>
}): Promise<{
  id: string
  url: string
  status: string
  [key: string]: any
}> {
  if (!PAGARME_API_KEY) {
    throw new Error('PAGARME_API_KEY não configurada')
  }

  const paymentLinksUrl = `${PAGARME_API_URL}/paymentlinks`
  
  console.log('📤 Criando Payment Link')
  console.log('🔗 URL:', paymentLinksUrl)
  console.log('📋 Payload:', JSON.stringify(paymentLinkData, null, 2))
  
  // Preparar Basic Auth
  const basicAuth = Buffer.from(`${PAGARME_API_KEY}:`).toString('base64')
  console.log('🔑 API Key (primeiros 10 chars):', PAGARME_API_KEY.substring(0, 10) + '...')

  const response = await fetch(paymentLinksUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(paymentLinkData)
  })

  const responseText = await response.text()

  console.log('📥 Resposta Pagar.me - Status:', response.status)
  console.log('📥 Resposta Pagar.me - Headers:', Object.fromEntries(response.headers.entries()))
  console.log('📥 Resposta Pagar.me - Body completo:', responseText)

  if (!response.ok) {
    let errorData
    try {
      errorData = JSON.parse(responseText)
    } catch (e) {
      console.error('❌ Resposta não é JSON:', responseText.substring(0, 500))
      throw new Error(`Erro na API Pagar.me (${response.status}): ${responseText.substring(0, 200)}`)
    }
    
    console.error('❌ Erro detalhado da Pagar.me:', JSON.stringify(errorData, null, 2))
    
    const errorMessage = errorData.message 
      || errorData.error 
      || errorData.detail
      || errorData.title
      || `Erro ao criar payment link (${response.status})`
    
    throw new Error(errorMessage)
  }

  const data = JSON.parse(responseText)
  return data
}

/**
 * Obtém um Payment Link da Pagar.me
 * @param linkId ID do payment link
 * @returns Dados do payment link
 */
export async function obterPaymentLink(linkId: string): Promise<{
  id: string
  url: string
  status: string
  [key: string]: any
}> {
  if (!PAGARME_API_KEY) {
    throw new Error('PAGARME_API_KEY não configurada')
  }

  const paymentLinksUrl = `${PAGARME_API_URL}/paymentlinks/${linkId}`
  
  // Preparar Basic Auth
  const basicAuth = Buffer.from(`${PAGARME_API_KEY}:`).toString('base64')

  const response = await fetch(paymentLinksUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Accept': 'application/json'
    }
  })

  const responseText = await response.text()

  if (!response.ok) {
    let errorData
    try {
      errorData = JSON.parse(responseText)
    } catch (e) {
      throw new Error(`Erro na API Pagar.me (${response.status}): ${responseText.substring(0, 200)}`)
    }
    throw new Error(errorData.message || errorData.error || `Erro ao obter payment link (${response.status})`)
  }

  const data = JSON.parse(responseText)
  return data
}

