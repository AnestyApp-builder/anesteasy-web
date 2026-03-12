import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      )
    }

    const diagnostics: any = {
      email,
      timestamp: new Date().toISOString(),
      steps: []
    }

    // 1. Buscar usuário
    diagnostics.steps.push('Buscando usuário no banco...')
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()

    if (userError || !user) {
      return NextResponse.json({
        error: 'Usuário não encontrado',
        details: userError?.message,
        diagnostics
      }, { status: 404 })
    }

    diagnostics.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      subscription_plan: user.subscription_plan,
      subscription_status: user.subscription_status,
      trial_ends_at: user.trial_ends_at
    }

    // 2. Buscar assinaturas no banco
    diagnostics.steps.push('Buscando assinaturas no banco...')
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    diagnostics.subscriptions = subscriptions || []
    diagnostics.subscriptionsError = subError?.message

    // 3. Buscar na Stripe
    if (stripe) {
      diagnostics.steps.push('Buscando customer na Stripe...')
      const customers = await stripe.customers.list({
        email: email.toLowerCase().trim(),
        limit: 10
      })

      diagnostics.stripeCustomers = customers.data.map(c => ({
        id: c.id,
        email: c.email,
        created: new Date(c.created * 1000).toISOString()
      }))

      // Buscar subscriptions de cada customer
      diagnostics.stripeSubscriptions = []
      for (const customer of customers.data) {
        const stripeSubs = await stripe.subscriptions.list({
          customer: customer.id,
          limit: 10
        })

        for (const sub of stripeSubs.data) {
          diagnostics.stripeSubscriptions.push({
            id: sub.id,
            customer_id: customer.id,
            status: sub.status,
            plan_type: sub.metadata?.plan_type,
            amount: (sub.items.data[0]?.price.unit_amount || 0) / 100,
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            created: new Date(sub.created * 1000).toISOString(),
            exists_in_db: subscriptions?.some(s => s.stripe_subscription_id === sub.id) || false
          })
        }
      }
    }

    // 4. Verificar assinaturas ativas
    diagnostics.steps.push('Verificando assinaturas ativas...')
    const { data: activeSubs } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')

    diagnostics.activeSubscriptions = activeSubs || []

    // 5. Identificar problemas
    diagnostics.problems = []
    diagnostics.fixes = []

    // Problema: Subscription ativa no Stripe mas não no banco
    if (stripe && diagnostics.stripeSubscriptions) {
      for (const stripeSub of diagnostics.stripeSubscriptions) {
        if (stripeSub.status === 'active' && !stripeSub.exists_in_db) {
          diagnostics.problems.push({
            type: 'missing_subscription',
            message: `Subscription ${stripeSub.id} está ativa no Stripe mas não existe no banco`,
            stripe_subscription_id: stripeSub.id
          })
          
          diagnostics.fixes.push({
            action: 'create_subscription',
            stripe_subscription_id: stripeSub.id,
            plan_type: stripeSub.plan_type || 'monthly',
            amount: stripeSub.amount
          })
        }
      }
    }

    // Problema: Subscription no banco mas status incorreto
    if (subscriptions) {
      for (const sub of subscriptions) {
        if (sub.status !== 'active' && sub.stripe_subscription_id) {
          // Verificar se está ativa no Stripe
          const stripeSub = diagnostics.stripeSubscriptions?.find(
            s => s.id === sub.stripe_subscription_id
          )
          
          if (stripeSub && stripeSub.status === 'active') {
            diagnostics.problems.push({
              type: 'inactive_status',
              message: `Subscription ${sub.id} está inativa no banco mas ativa no Stripe`,
              subscription_id: sub.id,
              stripe_subscription_id: sub.stripe_subscription_id
            })
            
            diagnostics.fixes.push({
              action: 'update_status',
              subscription_id: sub.id,
              new_status: 'active'
            })
          }
        }
      }
    }

    // Problema: Nenhuma assinatura ativa
    if (!activeSubs || activeSubs.length === 0) {
      diagnostics.problems.push({
        type: 'no_active_subscription',
        message: 'Nenhuma assinatura ativa encontrada no banco'
      })
    }

    return NextResponse.json({
      success: true,
      diagnostics
    })

  } catch (error: any) {
    console.error('❌ Erro no diagnóstico:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao diagnosticar assinatura' },
      { status: 500 }
    )
  }
}
