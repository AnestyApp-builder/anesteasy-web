import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSubscription, stripe } from '@/lib/stripe'

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
 * GET /api/stripe/subscription
 * Busca a assinatura ativa do usuário
 */
export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      console.error('❌ Supabase Admin não inicializado')
      return NextResponse.json(
        { error: 'Configuração do servidor incompleta' },
        { status: 500 }
      )
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      console.error('❌ Header Authorization não encontrado')
      return NextResponse.json(
        { error: 'Não autorizado. Token de acesso não fornecido.' },
        { status: 401 }
      )
    }

    const accessToken = authHeader.replace('Bearer ', '').trim()
    
    if (!accessToken) {
      console.error('❌ Token de acesso vazio')
      return NextResponse.json(
        { error: 'Não autorizado. Token de acesso inválido.' },
        { status: 401 }
      )
    }

    console.log('🔐 Validando token... (primeiros 20 chars):', accessToken.substring(0, 20) + '...')
    
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
        { error: 'Não autorizado. Usuário não encontrado.' },
        { status: 401 }
      )
    }

    console.log('✅ Usuário autenticado:', user.id, user.email)

    // Buscar assinatura ativa do usuário
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (subError) {
      console.error('❌ Erro ao buscar assinatura:', subError)
      return NextResponse.json(
        { error: 'Erro ao buscar assinatura' },
        { status: 500 }
      )
    }

    if (!subscription) {
      console.log('ℹ️ Nenhuma assinatura ativa encontrada para o usuário')
      return NextResponse.json(
        { error: 'Assinatura não encontrada' },
        { status: 404 }
      )
    }

    console.log('✅ Assinatura encontrada:', subscription.id, 'Plano:', subscription.plan_type)

    // Se tiver subscription_id do Stripe, buscar dados atualizados
    if (subscription.stripe_subscription_id && stripe) {
      try {
        const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id)
        
        // Atualizar dados locais se necessário
        if (stripeSubscription.current_period_end) {
          const periodEnd = new Date(stripeSubscription.current_period_end * 1000).toISOString()
          if (subscription.current_period_end !== periodEnd) {
            await supabaseAdmin
              .from('subscriptions')
              .update({
                current_period_end: periodEnd,
                current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', subscription.id)
            
            subscription.current_period_end = periodEnd
            subscription.current_period_start = new Date(stripeSubscription.current_period_start * 1000).toISOString()
          }
        }
      } catch (stripeError) {
        console.warn('⚠️ Erro ao buscar dados do Stripe:', stripeError)
        // Continuar com dados locais
      }
    }

    return NextResponse.json({ subscription })

  } catch (error: any) {
    console.error('❌ Erro ao buscar assinatura:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar assinatura' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/stripe/subscription
 * Cria uma nova assinatura (usado pelo checkout)
 */
export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      console.error('❌ Supabase Admin não inicializado')
      return NextResponse.json(
        { error: 'Configuração do servidor incompleta' },
        { status: 500 }
      )
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      console.error('❌ Header Authorization não encontrado')
      return NextResponse.json(
        { error: 'Não autorizado. Token de acesso não fornecido.' },
        { status: 401 }
      )
    }

    const accessToken = authHeader.replace('Bearer ', '').trim()
    
    if (!accessToken) {
      console.error('❌ Token de acesso vazio')
      return NextResponse.json(
        { error: 'Não autorizado. Token de acesso inválido.' },
        { status: 401 }
      )
    }

    console.log('🔐 Validando token (POST)... (primeiros 20 chars):', accessToken.substring(0, 20) + '...')
    
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
        { error: 'Não autorizado. Usuário não encontrado.' },
        { status: 401 }
      )
    }

    console.log('✅ Usuário autenticado (POST):', user.id, user.email)

    const body = await request.json()
    const { plan_type, stripe_subscription_id, stripe_customer_id } = body

    if (!plan_type || !stripe_subscription_id) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      )
    }

    // Verificar se já existe assinatura ativa
    const { data: existingSubscription } = await supabaseAdmin
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (existingSubscription) {
      return NextResponse.json(
        { error: 'Você já possui uma assinatura ativa' },
        { status: 400 }
      )
    }

    // Buscar dados da assinatura do Stripe
    let currentPeriodStart = new Date().toISOString()
    let currentPeriodEnd = new Date().toISOString()
    let amount = 0

    if (stripe) {
      try {
        const stripeSubscription = await stripe.subscriptions.retrieve(stripe_subscription_id)
        currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000).toISOString()
        currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000).toISOString()
        amount = (stripeSubscription.items.data[0]?.price?.unit_amount || 0) / 100
      } catch (error) {
        console.warn('⚠️ Erro ao buscar dados do Stripe, usando valores padrão')
      }
    }

    // Criar assinatura no banco
    const { data: subscription, error: insertError } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        user_id: user.id,
        plan_type,
        amount,
        status: 'active',
        stripe_subscription_id,
        stripe_customer_id: stripe_customer_id || null,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ Erro ao criar assinatura:', insertError)
      return NextResponse.json(
        { error: 'Erro ao criar assinatura' },
        { status: 500 }
      )
    }

    // Atualizar status do usuário
    await supabaseAdmin
      .from('users')
      .update({
        subscription_plan: plan_type,
        subscription_status: 'active'
      })
      .eq('id', user.id)

    return NextResponse.json({ subscription })

  } catch (error: any) {
    console.error('❌ Erro ao criar assinatura:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao criar assinatura' },
      { status: 500 }
    )
  }
}

