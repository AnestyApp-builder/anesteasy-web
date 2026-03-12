/**
 * Script para diagnosticar e corrigir problemas de assinatura
 * Uso: npx ts-node scripts/fix-user-subscription.ts <email>
 */

import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || ''

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não configuradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
  typescript: true,
}) : null

async function fixUserSubscription(email: string) {
  console.log(`\n🔍 Diagnosticando assinatura para: ${email}\n`)

  // 1. Buscar usuário no banco
  console.log('1️⃣ Buscando usuário no banco...')
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle()

  if (userError || !user) {
    console.error('❌ Usuário não encontrado:', userError?.message)
    return
  }

  console.log('✅ Usuário encontrado:')
  console.log(`   ID: ${user.id}`)
  console.log(`   Nome: ${user.name}`)
  console.log(`   Email: ${user.email}`)
  console.log(`   Subscription Plan: ${user.subscription_plan || 'N/A'}`)
  console.log(`   Subscription Status: ${user.subscription_status || 'N/A'}`)
  console.log(`   Trial Ends At: ${user.trial_ends_at || 'N/A'}`)

  // 2. Buscar assinaturas no banco
  console.log('\n2️⃣ Buscando assinaturas no banco...')
  const { data: subscriptions, error: subError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (subError) {
    console.error('❌ Erro ao buscar assinaturas:', subError.message)
  } else {
    console.log(`✅ Encontradas ${subscriptions?.length || 0} assinatura(s) no banco:`)
    subscriptions?.forEach((sub, index) => {
      console.log(`\n   Assinatura ${index + 1}:`)
      console.log(`   - ID: ${sub.id}`)
      console.log(`   - Status: ${sub.status}`)
      console.log(`   - Plan Type: ${sub.plan_type}`)
      console.log(`   - Amount: R$ ${sub.amount || 0}`)
      console.log(`   - Stripe Subscription ID: ${sub.stripe_subscription_id || 'N/A'}`)
      console.log(`   - Stripe Customer ID: ${sub.stripe_customer_id || 'N/A'}`)
      console.log(`   - Current Period Start: ${sub.current_period_start || 'N/A'}`)
      console.log(`   - Current Period End: ${sub.current_period_end || 'N/A'}`)
      console.log(`   - Created At: ${sub.created_at || 'N/A'}`)
    })
  }

  // 3. Buscar customer na Stripe
  if (!stripe) {
    console.log('\n⚠️ Stripe não configurado, pulando verificação no Stripe')
  } else {
    console.log('\n3️⃣ Buscando customer na Stripe...')
    const customers = await stripe.customers.list({
      email: email.toLowerCase().trim(),
      limit: 10
    })

    if (customers.data.length === 0) {
      console.log('⚠️ Nenhum customer encontrado na Stripe')
    } else {
      console.log(`✅ Encontrados ${customers.data.length} customer(s) na Stripe:`)
      
      for (const customer of customers.data) {
        console.log(`\n   Customer ID: ${customer.id}`)
        console.log(`   Email: ${customer.email}`)
        console.log(`   Created: ${new Date(customer.created * 1000).toISOString()}`)
        
        // Buscar subscriptions do customer
        const stripeSubscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          limit: 10
        })

        console.log(`   Subscriptions: ${stripeSubscriptions.data.length}`)
        
        for (const stripeSub of stripeSubscriptions.data) {
          console.log(`\n   📋 Subscription ${stripeSub.id}:`)
          console.log(`   - Status: ${stripeSub.status}`)
          console.log(`   - Plan Type: ${stripeSub.metadata?.plan_type || 'N/A'}`)
          console.log(`   - Amount: R$ ${(stripeSub.items.data[0]?.price.unit_amount || 0) / 100}`)
          console.log(`   - Current Period Start: ${new Date(stripeSub.current_period_start * 1000).toISOString()}`)
          console.log(`   - Current Period End: ${new Date(stripeSub.current_period_end * 1000).toISOString()}`)
          console.log(`   - Created: ${new Date(stripeSub.created * 1000).toISOString()}`)
          
          // Verificar se existe no banco
          const existsInDb = subscriptions?.some(
            sub => sub.stripe_subscription_id === stripeSub.id
          )
          
          if (!existsInDb && stripeSub.status === 'active') {
            console.log(`   ⚠️ ATENÇÃO: Subscription ativa no Stripe mas não encontrada no banco!`)
            
            // Criar no banco
            const planType = stripeSub.metadata?.plan_type || 'monthly'
            const amount = (stripeSub.items.data[0]?.price.unit_amount || 0) / 100
            
            console.log(`\n   🔧 Criando assinatura no banco...`)
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

            if (insertError) {
              console.error(`   ❌ Erro ao criar assinatura:`, insertError.message)
            } else {
              console.log(`   ✅ Assinatura criada no banco: ${newSub.id}`)
              
              // Atualizar usuário
              await supabase
                .from('users')
                .update({
                  subscription_plan: planType,
                  subscription_status: 'active'
                })
                .eq('id', user.id)
              
              console.log(`   ✅ Usuário atualizado`)
            }
          } else if (existsInDb) {
            const dbSub = subscriptions?.find(sub => sub.stripe_subscription_id === stripeSub.id)
            if (dbSub && dbSub.status !== 'active' && stripeSub.status === 'active') {
              console.log(`   ⚠️ ATENÇÃO: Subscription ativa no Stripe mas inativa no banco!`)
              
              console.log(`\n   🔧 Atualizando status da assinatura...`)
              const { error: updateError } = await supabase
                .from('subscriptions')
                .update({
                  status: 'active',
                  current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
                  current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
                  updated_at: new Date().toISOString()
                })
                .eq('id', dbSub.id)

              if (updateError) {
                console.error(`   ❌ Erro ao atualizar:`, updateError.message)
              } else {
                console.log(`   ✅ Status atualizado para 'active'`)
                
                // Atualizar usuário
                await supabase
                  .from('users')
                  .update({
                    subscription_plan: dbSub.plan_type,
                    subscription_status: 'active'
                  })
                  .eq('id', user.id)
                
                console.log(`   ✅ Usuário atualizado`)
              }
            }
          }
        }
      }
    }
  }

  // 4. Verificar assinaturas ativas no banco
  console.log('\n4️⃣ Verificando assinaturas ativas no banco...')
  const { data: activeSubs } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')

  if (!activeSubs || activeSubs.length === 0) {
    console.log('⚠️ Nenhuma assinatura ativa encontrada no banco')
  } else {
    console.log(`✅ ${activeSubs.length} assinatura(s) ativa(s) encontrada(s)`)
    activeSubs.forEach((sub, index) => {
      console.log(`\n   Assinatura Ativa ${index + 1}:`)
      console.log(`   - ID: ${sub.id}`)
      console.log(`   - Plan Type: ${sub.plan_type}`)
      console.log(`   - Amount: R$ ${sub.amount || 0}`)
      console.log(`   - Period End: ${sub.current_period_end || 'N/A'}`)
    })
  }

  console.log('\n✅ Diagnóstico concluído!\n')
}

// Executar script
const email = process.argv[2]

if (!email) {
  console.error('❌ Uso: npx ts-node scripts/fix-user-subscription.ts <email>')
  process.exit(1)
}

fixUserSubscription(email)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Erro:', error)
    process.exit(1)
  })

