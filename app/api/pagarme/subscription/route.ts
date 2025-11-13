import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { criarAssinatura, obterAssinatura } from '@/lib/pagarme-subscriptions'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabaseAdmin = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

/**
 * POST /api/pagarme/subscription
 * Cria uma nova assinatura recorrente
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const accessToken = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin?.auth.getUser(accessToken) || { data: { user: null }, error: null }

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { plan_id, cardData } = body

    if (!plan_id) {
      return NextResponse.json(
        { error: 'plan_id é obrigatório' },
        { status: 400 }
      )
    }

    if (!cardData || !cardData.number) {
      return NextResponse.json(
        { error: 'Dados do cartão são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se é secretária (secretárias não pagam)
    const { data: secretaria } = await supabaseAdmin
      ?.from('secretarias')
      .select('id')
      .eq('id', user.id)
      .maybeSingle() || { data: null }

    if (secretaria) {
      return NextResponse.json(
        { error: 'Secretárias não precisam de assinatura' },
        { status: 403 }
      )
    }

    // Verificar se já tem assinatura ativa
    const { data: existingSubscription } = await supabaseAdmin
      ?.from('subscriptions')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle() || { data: null }

    if (existingSubscription) {
      return NextResponse.json(
        { error: 'Você já possui uma assinatura ativa' },
        { status: 400 }
      )
    }

    // Buscar dados do usuário
    const { data: userData } = await supabaseAdmin
      ?.from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle() || { data: null }

    // Buscar plano no Supabase para obter pagarme_plan_id
    console.log('🔍 Buscando plano:', plan_id)
    const { data: planData, error: planError } = await supabaseAdmin
      ?.from('pagarme_plans')
      .select('pagarme_plan_id, plan_type')
      .eq('plan_type', plan_id)
      .maybeSingle() || { data: null, error: null }

    if (planError) {
      console.error('❌ Erro ao buscar plano:', planError)
      return NextResponse.json(
        { error: `Erro ao buscar plano: ${planError.message}` },
        { status: 500 }
      )
    }

    if (!planData) {
      console.error('❌ Plano não encontrado:', plan_id)
      // Listar todos os planos disponíveis para debug
      const { data: allPlans } = await supabaseAdmin
        ?.from('pagarme_plans')
        .select('*') || { data: [] }
      console.log('📋 Planos disponíveis:', allPlans)
      
      return NextResponse.json(
        { 
          error: 'Plano não encontrado. Execute POST /api/pagarme/plans/init primeiro para criar os planos.',
          available_plans: allPlans?.map(p => p.plan_type) || []
        },
        { status: 404 }
      )
    }

    console.log('✅ Plano encontrado:', planData)

    let pagarmePlanId = planData.pagarme_plan_id

    // Verificar se o plano existe na Pagar.me antes de criar a assinatura
    try {
      const { obterPlano } = await import('@/lib/pagarme-subscriptions')
      await obterPlano(pagarmePlanId)
      console.log('✅ Plano validado na Pagar.me:', pagarmePlanId)
    } catch (planError: any) {
      console.error('❌ Plano não encontrado na Pagar.me:', planError.message)
      console.log('⚠️ O plano não existe na Pagar.me. Execute POST /api/pagarme/plans/init manualmente para recriar os planos.')
      
      // NÃO recriar automaticamente - retornar erro
      return NextResponse.json(
        { 
          error: 'O plano não existe na Pagar.me. Execute POST /api/pagarme/plans/init manualmente para recriar os planos.',
          details: planError.message,
          plan_id: pagarmePlanId,
          plan_type: plan_id
        },
        { status: 404 }
      )
    }

    // Preparar dados do cliente
    const customerName = userData?.name || user.user_metadata?.name || user.email?.split('@')[0] || 'Cliente'
    const customerEmail = user.email || ''
    
    // CPF do usuário - garantir 11 dígitos
    let customerDocument = cardData?.document?.replace(/\D/g, '') || ''
    if (!customerDocument || customerDocument.length !== 11) {
      customerDocument = user.user_metadata?.cpf?.replace(/\D/g, '') || ''
      if (!customerDocument || customerDocument.length !== 11) {
        // Gerar CPF de teste válido (11 dígitos)
        const userIdHash = user.id.replace(/-/g, '').substring(0, 9)
        customerDocument = (userIdHash + '00').substring(0, 11).padEnd(11, '0')
        console.log('⚠️ CPF não encontrado, usando CPF de teste:', customerDocument)
      }
    }
    
    // Validar CPF tem exatamente 11 dígitos
    if (customerDocument.length !== 11) {
      customerDocument = customerDocument.padEnd(11, '0').substring(0, 11)
    }
    
    console.log('📋 CPF do cliente:', customerDocument.substring(0, 3) + '.***.***-**')

    // Criar assinatura direta com cartão (API v5 não suporta checkout links para assinaturas)
    console.log('📤 Criando assinatura direta com cartão')

    // Converter ano de 2 dígitos para 4 dígitos (25 -> 2025)
    const expYearNum = parseInt(cardData.exp_year)
    const currentYear = new Date().getFullYear()
    const currentCentury = Math.floor(currentYear / 100) * 100
    
    let expYearFull: number
    if (expYearNum < 100) {
      // Ano de 2 dígitos: 25 -> 2025
      expYearFull = currentCentury + expYearNum
      // Se o ano calculado for menor que o ano atual, assumir próximo século (25 -> 2125)
      if (expYearFull < currentYear) {
        expYearFull = expYearFull + 100
      }
    } else {
      // Ano já está em 4 dígitos
      expYearFull = expYearNum
    }
    
    console.log('📅 Conversão de ano:', {
      original: cardData.exp_year,
      parsed: expYearNum,
      full: expYearFull,
      currentYear
    })

    // Preparar dados do cliente
    const customerData: any = {
      name: customerName,
      email: customerEmail,
      document: customerDocument,
      type: 'individual',
      document_type: 'CPF'
    }

    // Adicionar telefone (obrigatório para alguns casos)
    if (cardData.phone && cardData.phone.length >= 10) {
      const phoneClean = cardData.phone.replace(/\D/g, '')
      customerData.phones = {
        mobile_phone: {
          country_code: '55',
          area_code: phoneClean.substring(0, 2) || '11',
          number: phoneClean.substring(2) || '999999999'
        }
      }
    } else {
      // Telefone padrão se não fornecido
      customerData.phones = {
        mobile_phone: {
          country_code: '55',
          area_code: '11',
          number: '999999999'
        }
      }
    }

    // Adicionar endereço (obrigatório para cartão)
    // A API da Pagar.me espera zip_code (com underscore), não zipcode
    const addressData = cardData.address ? {
      street: cardData.address.street || 'Rua Teste',
      number: cardData.address.number || '123',
      zip_code: cardData.address.zipcode?.replace(/\D/g, '') || '01310100',
      neighborhood: cardData.address.neighborhood || 'Centro',
      city: cardData.address.city || 'São Paulo',
      state: cardData.address.state || 'SP',
      country: 'BR'
    } : {
      street: 'Rua Teste',
      number: '123',
      zip_code: '01310100',
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      country: 'BR'
    }

    customerData.address = addressData

    // Preparar dados do cartão
    const cardNumber = cardData.number.replace(/\s/g, '')
    
    // Validar número do cartão
    if (!cardNumber || cardNumber.length < 13 || cardNumber.length > 19) {
      throw new Error('Número do cartão inválido')
    }
    
    // Validar mês (1-12)
    const expMonth = parseInt(cardData.exp_month)
    if (expMonth < 1 || expMonth > 12) {
      throw new Error('Mês de validade inválido (deve ser entre 1 e 12)')
    }
    
    // Validar CVV
    if (!cardData.cvv || cardData.cvv.length < 3 || cardData.cvv.length > 4) {
      throw new Error('CVV inválido')
    }
    
    const cardDataForAPI = {
      number: cardNumber,
      holder_name: cardData.holder_name.toUpperCase().trim(),
      exp_month: expMonth,
      exp_year: expYearFull,
      cvv: cardData.cvv,
      billing_address: addressData
    }

    console.log('📋 Dados do cartão preparados:', {
      number: cardNumber.substring(0, 4) + '****' + cardNumber.substring(cardNumber.length - 4),
      holder_name: cardDataForAPI.holder_name,
      exp_month: cardDataForAPI.exp_month,
      exp_year: cardDataForAPI.exp_year,
      has_cvv: !!cardDataForAPI.cvv,
      has_billing_address: !!cardDataForAPI.billing_address
    })

    // Estrutura do payload conforme API v5
    const subscriptionData: any = {
      plan_id: pagarmePlanId,
      customer: customerData,
      payment_method: 'credit_card',
      card: cardDataForAPI,
      metadata: {
        plan_id: plan_id,
        user_id: user.id
      }
    }

    const subscription = await criarAssinatura(subscriptionData)

    // Log completo da resposta inicial para debug
    console.log('📋 Resposta inicial da Pagar.me:', JSON.stringify({
      id: subscription.id,
      status: subscription.status,
      current_cycle: subscription.current_cycle
    }, null, 2))

    // Consultar assinatura novamente para obter status atualizado (pode ter mudado após processamento)
    let finalSubscription = subscription
    try {
      // Aguardar um pouco para a Pagar.me processar o pagamento
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const { obterAssinatura } = await import('@/lib/pagarme-subscriptions')
      finalSubscription = await obterAssinatura(subscription.id)
      console.log('📋 Status atualizado da assinatura:', finalSubscription.status)
      console.log('📋 Status do ciclo:', finalSubscription.current_cycle?.status)
    } catch (error) {
      console.warn('⚠️ Não foi possível consultar assinatura novamente, usando resposta inicial')
    }

    // Determinar status correto baseado na resposta da Pagar.me
    // A Pagar.me retorna status como 'active', 'pending', 'canceled', 'failed', etc.
    // IMPORTANTE: Priorizar o status do ciclo atual, pois é mais confiável
    let subscriptionStatus = 'pending'
    
    // PRIMEIRO: Verificar o status do ciclo atual (mais confiável)
    if (finalSubscription.current_cycle) {
      const cycleStatus = finalSubscription.current_cycle.status
      console.log('📊 Status do ciclo atual:', cycleStatus)
      
      if (cycleStatus === 'billed') {
        // Ciclo foi cobrado com sucesso = assinatura ATIVA
        subscriptionStatus = 'active'
        console.log('✅ Ciclo cobrado - assinatura marcada como ATIVA')
      } else if (cycleStatus === 'unpaid' || cycleStatus === 'failed') {
        // Pagamento falhou
        subscriptionStatus = 'failed'
        console.log('❌ Pagamento falhou - assinatura marcada como FALHA')
      } else if (cycleStatus === 'pending') {
        // Aguardando pagamento
        subscriptionStatus = 'pending'
        console.log('⏳ Aguardando pagamento - assinatura marcada como PENDENTE')
      }
    }
    
    // SEGUNDO: Verificar o status direto da assinatura (pode não existir ou ser menos confiável)
    // Só usar se o ciclo não indicar nada ou se for um status crítico (canceled, expired)
    if (finalSubscription.status) {
      const statusMap: Record<string, string> = {
        'active': 'active',
        'pending': 'pending',
        'canceled': 'cancelled',
        'cancelled': 'cancelled',
        'expired': 'expired',
        'suspended': 'suspended',
        'failed': 'failed',
        'pending_payment': 'pending'
      }
      const mappedStatus = statusMap[finalSubscription.status.toLowerCase()] || 'pending'
      console.log('📊 Status direto da assinatura:', finalSubscription.status, '→ mapeado:', mappedStatus)
      
      // Se o status direto indica cancelamento ou expiração, priorizar isso
      if (mappedStatus === 'cancelled' || mappedStatus === 'expired') {
        subscriptionStatus = mappedStatus
        console.log('⚠️ Status crítico detectado - sobrescrevendo para:', mappedStatus)
      }
      // Se ainda não determinamos status pelo ciclo, usar o status direto
      else if (subscriptionStatus === 'pending' && !finalSubscription.current_cycle) {
        subscriptionStatus = mappedStatus
        console.log('📊 Usando status direto (sem ciclo):', mappedStatus)
      }
    }
    
    console.log('✅ Status final determinado:', subscriptionStatus)

    // Obter o valor do plano
    const planAmount = planData.amount || 0

    // Salvar assinatura no Supabase
    if (supabaseAdmin && finalSubscription.id) {
      const { error: subError } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan_type: plan_id,
          amount: planAmount,
          status: subscriptionStatus,
          pagarme_subscription_id: finalSubscription.id.toString(),
          current_period_start: finalSubscription.current_cycle?.start_at || finalSubscription.start_at || new Date().toISOString(),
          current_period_end: finalSubscription.current_cycle?.end_at || finalSubscription.next_billing_at || null
        })

      if (subError) {
        console.error('Erro ao salvar assinatura no Supabase:', subError)
        // Não falhar a requisição se houver erro ao salvar, mas logar
      } else {
        console.log('✅ Assinatura salva no Supabase com sucesso')
      }
    }

    return NextResponse.json({
      subscription: finalSubscription,
      status: subscriptionStatus,
      pagarme_status: finalSubscription.status,
      cycle_status: finalSubscription.current_cycle?.status
    })

  } catch (error: any) {
    console.error('❌ Erro ao criar assinatura:', error)
    console.error('❌ Stack:', error.stack)
    
    // Garantir que a mensagem de erro seja uma string
    let errorMessage = 'Erro ao criar assinatura'
    if (error.message) {
      errorMessage = typeof error.message === 'string' ? error.message : JSON.stringify(error.message)
    } else if (typeof error === 'string') {
      errorMessage = error
    } else if (error && typeof error === 'object') {
      errorMessage = error.message || error.error || JSON.stringify(error)
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? {
          stack: error.stack,
          originalError: error.toString()
        } : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/pagarme/subscription?user_id=xxx
 * Obtém assinatura do usuário
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const accessToken = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin?.auth.getUser(accessToken) || { data: { user: null }, error: null }

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id') || user.id

    // Buscar assinatura no Supabase
    const { data: subscription } = await supabaseAdmin
      ?.from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle() || { data: null }

    if (!subscription) {
      return NextResponse.json(
        { error: 'Assinatura não encontrada' },
        { status: 404 }
      )
    }

    // Buscar dados atualizados da Pagar.me se tiver subscription_id
    let pagarmeData = null
    if (subscription.pagarme_subscription_id) {
      try {
        pagarmeData = await obterAssinatura(subscription.pagarme_subscription_id)
        
        // Sincronizar status da Pagar.me com Supabase se houver diferença
        if (pagarmeData && supabaseAdmin) {
          let pagarmeStatus = 'pending'
          
          // PRIMEIRO: Verificar o status do ciclo atual (mais confiável)
          if (pagarmeData.current_cycle) {
            const cycleStatus = pagarmeData.current_cycle.status
            if (cycleStatus === 'billed') {
              pagarmeStatus = 'active'
            } else if (cycleStatus === 'unpaid' || cycleStatus === 'failed') {
              pagarmeStatus = 'failed'
            } else if (cycleStatus === 'pending') {
              pagarmeStatus = 'pending'
            }
          }
          
          // SEGUNDO: Verificar o status direto da assinatura
          if (pagarmeData.status) {
            const statusMap: Record<string, string> = {
              'active': 'active',
              'pending': 'pending',
              'canceled': 'cancelled',
              'cancelled': 'cancelled',
              'expired': 'expired',
              'suspended': 'suspended',
              'failed': 'failed'
            }
            const mappedStatus = statusMap[pagarmeData.status.toLowerCase()] || 'pending'
            
            // Se o status direto indica cancelamento ou expiração, priorizar isso
            if (mappedStatus === 'cancelled' || mappedStatus === 'expired') {
              pagarmeStatus = mappedStatus
            }
            // Se ainda não determinamos status pelo ciclo, usar o status direto
            else if (pagarmeStatus === 'pending' && !pagarmeData.current_cycle) {
              pagarmeStatus = mappedStatus
            }
          }
          
          // Se o status na Pagar.me for diferente do Supabase, atualizar
          if (pagarmeStatus !== subscription.status) {
            console.log(`🔄 Sincronizando status: Supabase=${subscription.status} → Pagar.me=${pagarmeStatus}`)
            await supabaseAdmin
              .from('subscriptions')
              .update({
                status: pagarmeStatus,
                updated_at: new Date().toISOString()
              })
              .eq('id', subscription.id)
            
            // Atualizar objeto local
            subscription.status = pagarmeStatus
          }
        }
      } catch (error) {
        console.warn('Não foi possível buscar dados da Pagar.me:', error)
      }
    }

    return NextResponse.json({
      subscription: subscription,
      pagarme_data: pagarmeData
    })

  } catch (error: any) {
    console.error('Erro ao obter assinatura:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao obter assinatura' },
      { status: 500 }
    )
  }
}

