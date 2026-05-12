import 'server-only'
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

    const fixes: any[] = []

    // 1. Buscar usuário
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado', details: userError?.message },
        { status: 404 }
      )
    }

    // 2. Buscar assinaturas no banco
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)

    // 3. Buscar na Stripe e sincronizar
    if (stripe) {
      const customers = await stripe.customers.list({
        email: email.toLowerCase().trim(),
        limit: 10
      })

      for (const customer of customers.data) {
        const stripeSubs = await stripe.subscriptions.list({
          customer: customer.id,
          limit: 10
        })

        for (const stripeSub of stripeSubs.data) {
          if (stripeSub.status === 'active') {
            // Verificar se existe no banco
            const existsInDb = subscriptions?.some(
              s => s.stripe_subscription_id === stripeSub.id
            )

            if (!existsInDb) {
              // Criar no banco
              // Mapear plan_type para valores válidos (constraint do banco: monthly, quarterly, annual)
              let planType = stripeSub.metadata?.plan_type || 'monthly'
              // Se for 'test' ou outro valor inválido, mapear para 'monthly'
              if (!['monthly', 'quarterly', 'annual'].includes(planType)) {
                console.warn(`⚠️ Plan type inválido: ${planType}, mapeando para 'monthly'`)
                planType = 'monthly'
              }
              const amount = (stripeSub.items.data[0]?.price.unit_amount || 0) / 100

              const { data: newSub, error: insertError } = await supabase
                .from('subscriptions')
                .insert({
                  user_id: user.id,
                  plan_type: planType,
                  amount: amount,
                  status: 'active',
                  stripe_subscription_id: stripeSub.id,
                  stripe_customer_id: customer.id,
                  current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
                  current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString()
                })
                .select()
                .single()

              if (!insertError && newSub) {
                fixes.push({
                  action: 'created_subscription',
                  subscription_id: newSub.id,
                  stripe_subscription_id: stripeSub.id
                })

                // Atualizar usuário
                await supabase
                  .from('users')
                  .update({
                    subscription_plan: planType,
                    subscription_status: 'active'
                  })
                  .eq('id', user.id)

                fixes.push({
                  action: 'updated_user',
                  user_id: user.id
                })
              } else {
                fixes.push({
                  action: 'failed_to_create',
                  error: insertError?.message,
                  stripe_subscription_id: stripeSub.id
                })
              }
            } else {
              // Verificar se precisa atualizar status
              const dbSub = subscriptions?.find(s => s.stripe_subscription_id === stripeSub.id)
              if (dbSub && dbSub.status !== 'active') {
                const { error: updateError } = await supabase
                  .from('subscriptions')
                  .update({
                    status: 'active',
                    current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
                    current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', dbSub.id)

                if (!updateError) {
                  fixes.push({
                    action: 'updated_subscription_status',
                    subscription_id: dbSub.id,
                    old_status: dbSub.status,
                    new_status: 'active'
                  })

                  // Atualizar usuário
                  await supabase
                    .from('users')
                    .update({
                      subscription_plan: dbSub.plan_type,
                      subscription_status: 'active'
                    })
                    .eq('id', user.id)

                  fixes.push({
                    action: 'updated_user',
                    user_id: user.id
                  })
                } else {
                  fixes.push({
                    action: 'failed_to_update',
                    error: updateError.message,
                    subscription_id: dbSub.id
                  })
                }
              }
            }
          }
        }
      }
    }

    // Buscar assinaturas atualizadas
    const { data: updatedSubs } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')

    return NextResponse.json({
      success: true,
      fixes,
      active_subscriptions: updatedSubs?.length || 0,
      message: `Correções aplicadas. ${updatedSubs?.length || 0} assinatura(s) ativa(s) encontrada(s).`
    })

  } catch (error: any) {
    console.error('❌ Erro ao aplicar correções:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao aplicar correções' },
      { status: 500 }
    )
  }
}

