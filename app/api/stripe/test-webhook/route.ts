import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'

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
 * Rota de teste para simular o processamento de um webhook
 * Útil para testar se o webhook está funcionando corretamente
 */
export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Configuração do servidor incompleta' },
        { status: 500 }
      )
    }

    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe não inicializado' },
        { status: 500 }
      )
    }

    const { email, session_id } = await request.json()

    if (!email && !session_id) {
      return NextResponse.json(
        { error: 'Email ou session_id é obrigatório' },
        { status: 400 }
      )
    }

    let session: any = null

    // Se tiver session_id, buscar a sessão do Stripe
    if (session_id) {
      try {
        session = await stripe.checkout.sessions.retrieve(session_id, {
          expand: ['subscription', 'customer']
        })
        console.log('✅ Sessão encontrada no Stripe:', session.id)
      } catch (error: any) {
        return NextResponse.json(
          { error: `Erro ao buscar sessão: ${error.message}` },
          { status: 400 }
        )
      }
    } else if (email) {
      // Buscar última sessão do customer por email
      const customers = await stripe.customers.list({
        email: email,
        limit: 1
      })

      if (customers.data.length === 0) {
        return NextResponse.json(
          { error: 'Customer não encontrado na Stripe' },
          { status: 404 }
        )
      }

      const customer = customers.data[0]
      const sessions = await stripe.checkout.sessions.list({
        customer: customer.id,
        limit: 1
      })

      if (sessions.data.length === 0) {
        return NextResponse.json(
          { error: 'Nenhuma sessão de checkout encontrada' },
          { status: 404 }
        )
      }

      session = await stripe.checkout.sessions.retrieve(sessions.data[0].id, {
        expand: ['subscription', 'customer']
      })
    }

    if (!session) {
      return NextResponse.json(
        { error: 'Sessão não encontrada' },
        { status: 404 }
      )
    }

    // Processar como se fosse um webhook
    const userId = session.metadata?.user_id
    const planType = session.metadata?.plan_type
    const subscriptionId = session.subscription as string

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id não encontrado no metadata da sessão', metadata: session.metadata },
        { status: 400 }
      )
    }

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'subscription_id não encontrado na sessão' },
        { status: 400 }
      )
    }

    // ⚠️ VALIDAÇÃO DE SEGURANÇA: Verificar se o pagamento foi realmente pago
    if (session.payment_status !== 'paid') {
      console.error('❌ SEGURANÇA: Tentativa de criar assinatura sem pagamento confirmado')
      console.error('📋 Payment Status:', session.payment_status)
      return NextResponse.json(
        { 
          error: 'Pagamento não confirmado. A assinatura só pode ser criada após confirmação do pagamento.',
          payment_status: session.payment_status
        },
        { status: 400 }
      )
    }

    // Buscar subscription do Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId)
    
    // ⚠️ VALIDAÇÃO DE SEGURANÇA: Verificar se a subscription está ativa
    if (stripeSubscription.status !== 'active' && stripeSubscription.status !== 'trialing') {
      console.error('❌ SEGURANÇA: Tentativa de criar assinatura com subscription inativa')
      console.error('📋 Subscription Status:', stripeSubscription.status)
      return NextResponse.json(
        { 
          error: 'Subscription não está ativa. A assinatura só pode ser criada para subscriptions ativas.',
          subscription_status: stripeSubscription.status
        },
        { status: 400 }
      )
    }

    const amount = session.amount_total ? session.amount_total / 100 : 0

    // Verificar se já existe
    const { data: existingSubscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('stripe_subscription_id', subscriptionId)
      .maybeSingle()

    if (existingSubscription) {
      // Atualizar
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'active',
          plan_type: planType || existingSubscription.plan_type,
          amount: amount,
          stripe_customer_id: session.customer as string,
          current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSubscription.id)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json(
          { error: 'Erro ao atualizar assinatura', details: updateError },
          { status: 500 }
        )
      }

      // Atualizar usuário
      await supabaseAdmin
        .from('users')
        .update({
          subscription_plan: planType || existingSubscription.plan_type,
          subscription_status: 'active'
        })
        .eq('id', userId)

      return NextResponse.json({
        success: true,
        message: 'Assinatura atualizada com sucesso',
        subscription: updated
      })
    } else {
      // Criar nova
      const { data: newSubscription, error: insertError } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_type: planType || 'monthly',
          amount: amount,
          status: 'active',
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: session.customer as string,
          current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString()
        })
        .select()
        .single()

      if (insertError) {
        return NextResponse.json(
          { error: 'Erro ao criar assinatura', details: insertError },
          { status: 500 }
        )
      }

      // Atualizar usuário
      await supabaseAdmin
        .from('users')
        .update({
          subscription_plan: planType || 'monthly',
          subscription_status: 'active'
        })
        .eq('id', userId)

      return NextResponse.json({
        success: true,
        message: 'Assinatura criada com sucesso',
        subscription: newSubscription
      })
    }

  } catch (error: any) {
    console.error('❌ Erro no test-webhook:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao processar webhook de teste' },
      { status: 500 }
    )
  }
}

