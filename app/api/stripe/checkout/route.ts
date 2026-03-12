import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createCheckoutSession } from '@/lib/stripe'

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

export async function POST(request: NextRequest) {
  try {
    // Verificar configuração do Supabase
    if (!supabaseAdmin) {
      console.error('❌ Supabase Admin não inicializado')
      return NextResponse.json(
        { error: 'Configuração do servidor incompleta' },
        { status: 500 }
      )
    }

    const { plan_id } = await request.json()

    // Validar plano (incluindo 'test' que usa daily)
    if (!plan_id || !['monthly', 'quarterly', 'annual', 'test'].includes(plan_id)) {
      return NextResponse.json(
        { error: 'Plano inválido' },
        { status: 400 }
      )
    }

    // Verificar autenticação
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      console.error('❌ Header de autorização não encontrado')
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const accessToken = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken)

    if (authError || !user) {
      console.error('❌ Erro ao validar token:', authError?.message)
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

    // Para plano 'test', não verificar se já tem assinatura ativa
    // (permite comprar dias adicionais mesmo tendo assinatura)
    if (plan_id !== 'test') {
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
    }

    // URLs de retorno
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const successUrl = `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${baseUrl}/planos?checkout=cancelled`

    console.log('📤 Criando Checkout Session na Stripe...')
    console.log('📋 Plan ID recebido:', plan_id)

    // Para plano 'test', usar o price_id daily
    const actualPlanType = plan_id === 'test' ? 'daily' : plan_id
    const isDaily = plan_id === 'test'
    
    console.log('📋 Actual Plan Type:', actualPlanType)
    console.log('📋 Is Daily:', isDaily)
    console.log('📋 STRIPE_PRICE_ID_DAILY:', process.env.STRIPE_PRICE_ID_DAILY ? 'Configurado' : 'NÃO CONFIGURADO')

    // Criar sessão de checkout na Stripe
    try {
      const session = await createCheckoutSession({
        userId: user.id,
        userEmail: user.email || '',
        planType: actualPlanType as 'monthly' | 'quarterly' | 'annual' | 'daily',
        successUrl,
        cancelUrl,
        isDaily: isDaily // Flag para indicar que é compra de 1 dia
      })

      console.log('✅ Checkout Session criada:', session.id)
      console.log('🔗 Checkout URL:', session.url)

    // Criar registro de assinatura pendente no banco
    // Nota: Não criar aqui, deixar o webhook criar quando o pagamento for confirmado
    // Isso evita problemas se o usuário cancelar o checkout
    console.log('ℹ️ Assinatura será criada pelo webhook quando o pagamento for confirmado')

      return NextResponse.json({
        checkout_url: session.url,
        session_id: session.id
      })
    } catch (checkoutError: any) {
      console.error('❌ Erro ao criar sessão de checkout:', checkoutError)
      console.error('📋 Erro completo:', JSON.stringify(checkoutError, null, 2))
      throw checkoutError
    }

  } catch (error: any) {
    console.error('❌ Erro ao criar checkout:', error)
    console.error('📋 Stack trace:', error.stack)
    return NextResponse.json(
      { 
        error: error.message || 'Erro ao processar checkout',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

