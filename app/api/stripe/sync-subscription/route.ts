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

    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar usuário por email
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', email)
      .maybeSingle()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Buscar customer na Stripe pelo email
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

    // Buscar subscriptions ativas na Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1
    })

    if (subscriptions.data.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma assinatura ativa encontrada na Stripe' },
        { status: 404 }
      )
    }

    const stripeSubscription = subscriptions.data[0]

    // Verificar se já existe no banco
    const { data: existingSubscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('stripe_subscription_id', stripeSubscription.id)
      .maybeSingle()

    const planType = stripeSubscription.metadata?.plan_type || 
                     (stripeSubscription.items.data[0]?.price.id === process.env.STRIPE_PRICE_ID_MONTHLY ? 'monthly' :
                      stripeSubscription.items.data[0]?.price.id === process.env.STRIPE_PRICE_ID_QUARTERLY ? 'quarterly' :
                      stripeSubscription.items.data[0]?.price.id === process.env.STRIPE_PRICE_ID_ANNUAL ? 'annual' : 'monthly')

    const amount = stripeSubscription.items.data[0]?.price.unit_amount ? 
                   stripeSubscription.items.data[0].price.unit_amount / 100 : 0

    if (existingSubscription) {
      // Atualizar assinatura existente
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'active',
          plan_type: planType,
          amount: amount,
          stripe_customer_id: customer.id,
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
          subscription_plan: planType,
          subscription_status: 'active'
        })
        .eq('id', user.id)

      return NextResponse.json({
        success: true,
        message: 'Assinatura sincronizada com sucesso',
        subscription: updated
      })
    } else {
      // Criar nova assinatura
      const { data: newSubscription, error: insertError } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan_type: planType,
          amount: amount,
          status: 'active',
          stripe_subscription_id: stripeSubscription.id,
          stripe_customer_id: customer.id,
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
          subscription_plan: planType,
          subscription_status: 'active'
        })
        .eq('id', user.id)

      return NextResponse.json({
        success: true,
        message: 'Assinatura criada e sincronizada com sucesso',
        subscription: newSubscription
      })
    }

  } catch (error: any) {
    console.error('❌ Erro ao sincronizar assinatura:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao sincronizar assinatura' },
      { status: 500 }
    )
  }
}

