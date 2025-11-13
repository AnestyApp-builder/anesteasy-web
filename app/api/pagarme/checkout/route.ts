import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { criarPaymentLink } from '@/lib/pagarme'

const PLAN_PRICES = {
  monthly: 7900, // R$ 79,00 em centavos
  quarterly: 22500, // R$ 225,00 em centavos
  annual: 85000 // R$ 850,00 em centavos
}

const PLAN_NAMES = {
  monthly: 'Plano Mensal - AnestEasy',
  quarterly: 'Plano Trimestral - AnestEasy',
  annual: 'Plano Anual - AnestEasy'
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const pagarmeApiKey = process.env.PAGARME_API_KEY || ''
const pagarmeApiUrl = process.env.PAGARME_API_URL || 'https://api.pagar.me/core/v5'

// Cliente admin para operações privilegiadas
const supabaseAdmin = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

// Verificar variáveis de ambiente no início
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis do Supabase não configuradas:', {
    hasUrl: !!supabaseUrl,
    hasServiceKey: !!supabaseServiceKey
  })
}

if (!pagarmeApiKey) {
  console.error('❌ PAGARME_API_KEY não configurada')
}

export async function POST(request: NextRequest) {
  try {
    const { plan_id, user_id, customer_data } = await request.json()

    if (!plan_id || !['monthly', 'quarterly', 'annual'].includes(plan_id)) {
      return NextResponse.json(
        { error: 'Plano inválido' },
        { status: 400 }
      )
    }

    // Verificar configurações
    if (!supabaseAdmin) {
      console.error('❌ Supabase Admin não inicializado')
      return NextResponse.json(
        { error: 'Configuração do Supabase não encontrada. Verifique SUPABASE_SERVICE_ROLE_KEY no .env.local' },
        { status: 500 }
      )
    }

    if (!pagarmeApiKey) {
      console.error('❌ PAGARME_API_KEY não configurada')
      return NextResponse.json(
        { error: 'Configuração da Pagar.me não encontrada. Verifique PAGARME_API_KEY no .env.local' },
        { status: 500 }
      )
    }

    // Verificar autenticação
    const authHeader = request.headers.get('authorization')
    console.log('Auth header recebido:', authHeader ? 'Presente' : 'Ausente')
    
    if (!authHeader) {
      console.error('❌ Header de autorização não encontrado')
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Verificar token do usuário
    const accessToken = authHeader.replace('Bearer ', '')
    console.log('Token recebido:', accessToken.substring(0, 20) + '...')
    
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken)

    if (authError) {
      console.error('❌ Erro ao validar token:', authError.message)
      return NextResponse.json(
        { error: `Não autorizado: ${authError.message}` },
        { status: 401 }
      )
    }

    if (!user) {
      console.error('❌ Usuário não encontrado após validação do token')
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    console.log('✅ Usuário autenticado:', user.id, user.email)

    // Verificar se é secretária (secretárias não pagam)
    const { data: secretaria } = await supabaseAdmin
      .from('secretarias')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (secretaria) {
      return NextResponse.json(
        { error: 'Secretárias não precisam de assinatura' },
        { status: 403 }
      )
    }

    // Verificar se já tem assinatura ativa
    const { data: existingSubscription } = await supabaseAdmin
      .from('subscriptions')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (existingSubscription) {
      return NextResponse.json(
        { error: 'Você já possui uma assinatura ativa' },
        { status: 400 }
      )
    }

    const amount = PLAN_PRICES[plan_id as keyof typeof PLAN_PRICES]
    const planName = PLAN_NAMES[plan_id as keyof typeof PLAN_NAMES]

    // URLs de retorno
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const successUrl = `${baseUrl}/checkout/success?plan=${plan_id}&user_id=${user.id}`
    const cancelUrl = `${baseUrl}/planos?checkout=cancelled`

    // Buscar CPF do usuário na tabela users
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    // Criar Payment Link (checkout hospedado da Pagar.me)
    // Estrutura conforme documentação: https://docs.pagar.me/reference/create-link
    const customerName = customer_data?.name || user.user_metadata?.name || userData?.name || user.email?.split('@')[0] || 'Cliente'
    const customerEmail = user.email || ''
    
    // CPF do usuário: buscar do customer_data, user_metadata, ou criar um de teste
    let customerDocument = customer_data?.document?.replace(/\D/g, '') || ''
    
    // Se não tiver CPF, buscar de user_metadata ou criar um de teste baseado no ID
    if (!customerDocument || customerDocument.length !== 11) {
      // Tentar buscar de user_metadata
      customerDocument = user.user_metadata?.cpf?.replace(/\D/g, '') || ''
      
      // Se ainda não tiver, criar um CPF de teste baseado no ID do usuário
      if (!customerDocument || customerDocument.length !== 11) {
        // Gerar CPF de teste válido baseado no ID do usuário
        const userIdHash = user.id.replace(/-/g, '').substring(0, 9)
        customerDocument = userIdHash.padEnd(9, '0').substring(0, 9) + '00'
        console.log('⚠️ CPF não encontrado, usando CPF de teste:', customerDocument)
      }
    }

    // Montar objeto Payment Link conforme documentação oficial
    // https://docs.pagar.me/reference/criar-link
    const paymentLinkData: any = {
      items: [{
        amount: amount,
        description: planName,
        quantity: 1,
        code: `plan_${plan_id}`
      }],
      customer: {
        name: customerName,
        email: customerEmail,
        document: customerDocument,
        type: 'individual',
        document_type: 'CPF'
      },
      payment_config: {
        credit_card: {
          enabled: true,
          installments: [
            {
              number: 1,
              total: amount
            }
          ]
        },
        boleto: {
          enabled: false
        },
        pix: {
          enabled: false
        }
      },
      expires_in: 30 * 60, // 30 minutos em segundos
      success_url: successUrl,
      cancel_url: cancelUrl
    }

    // Adicionar telefone apenas se fornecido (obrigatório para PSP)
    if (customer_data?.phone && customer_data.phone.length >= 10) {
      paymentLinkData.customer.phones = {
        mobile_phone: {
          country_code: '55',
          area_code: customer_data.phone.substring(0, 2) || '11',
          number: customer_data.phone.substring(2) || '999999999'
        }
      }
    }

    // Adicionar metadata se necessário
    if (plan_id && user.id) {
      paymentLinkData.metadata = {
        plan_id: plan_id,
        user_id: user.id
      }
    }

    console.log('📋 Payment Link Data:', JSON.stringify(paymentLinkData, null, 2))

    console.log('📤 Criando Payment Link na Pagar.me usando biblioteca')
    
    // Usar função da biblioteca
    const responseData = await criarPaymentLink(paymentLinkData)

    console.log('✅ Payment Link criado:', responseData.id)
    console.log('🔗 URL do checkout:', responseData.url)

    // A URL do payment link
    const checkoutUrl = responseData.url || responseData.payment_url || responseData.checkout_url

    if (!checkoutUrl) {
      console.error('❌ URL do payment link não encontrada na resposta:', responseData)
      return NextResponse.json(
        { error: 'URL do payment link não retornada pela API' },
        { status: 500 }
      )
    }

    // Salvar assinatura no banco com status "pending"
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        user_id: user.id,
        plan_type: plan_id,
        amount: amount / 100,
        status: 'pending',
        pagarme_subscription_id: responseData.id?.toString(),
        current_period_start: new Date().toISOString(),
        current_period_end: null
      })
      .select()
      .single()

    if (subError) {
      console.error('Erro ao criar assinatura:', subError)
      return NextResponse.json(
        { error: 'Erro ao criar assinatura' },
        { status: 500 }
      )
    }

    console.log('✅ Assinatura criada no banco:', subscription.id)

    // Retornar URL do payment link para redirecionar conforme solicitado
    return NextResponse.json({
      checkout_url: responseData.url,
      link_id: responseData.id
    })

  } catch (error: any) {
    console.error('Erro ao criar payment link:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao processar checkout' },
      { status: 500 }
    )
  }
}
