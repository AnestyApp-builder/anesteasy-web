// Script para diagnosticar assinatura de usuário
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Ler variáveis do .env.local manualmente
const envPath = path.join(__dirname, '..', '.env.local')
let supabaseUrl, supabaseServiceKey

try {
  const envContent = fs.readFileSync(envPath, 'utf8')
  const lines = envContent.split('\n')
  
  lines.forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim().replace(/['"]/g, '')
    }
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      supabaseServiceKey = line.split('=')[1].trim().replace(/['"]/g, '')
    }
  })
} catch (error) {
  console.error('❌ Erro ao ler .env.local:', error.message)
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não configuradas')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'definida' : 'não definida')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'definida' : 'não definida')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkUserSubscription(email) {
  console.log('🔍 Verificando assinatura para:', email)
  console.log('=' .repeat(60))

  try {
    // 1. Buscar usuário
    console.log('\n📋 1. Buscando usuário no banco...')
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
    console.log('   - ID:', user.id)
    console.log('   - Nome:', user.name)
    console.log('   - Email:', user.email)
    console.log('   - Plano:', user.subscription_plan || 'nenhum')
    console.log('   - Status:', user.subscription_status || 'inactive')
    console.log('   - Trial até:', user.trial_ends_at || 'sem trial')
    console.log('   - Meses grátis:', user.free_months || 0)

    // 2. Buscar assinaturas no banco
    console.log('\n📋 2. Buscando assinaturas no banco...')
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (subError) {
      console.error('❌ Erro ao buscar assinaturas:', subError.message)
    } else if (!subscriptions || subscriptions.length === 0) {
      console.log('⚠️ Nenhuma assinatura encontrada no banco')
    } else {
      console.log(`✅ ${subscriptions.length} assinatura(s) encontrada(s):`)
      subscriptions.forEach((sub, idx) => {
        console.log(`\n   Assinatura ${idx + 1}:`)
        console.log('   - ID:', sub.id)
        console.log('   - Plano:', sub.plan_type)
        console.log('   - Status:', sub.status)
        console.log('   - Valor:', `R$ ${sub.amount}`)
        console.log('   - Stripe Sub ID:', sub.stripe_subscription_id)
        console.log('   - Período:', sub.current_period_start, 'até', sub.current_period_end)
        console.log('   - Criada em:', sub.created_at)
        
        // Verificar se está expirada
        if (sub.current_period_end) {
          const now = new Date()
          const endDate = new Date(sub.current_period_end)
          if (endDate < now) {
            console.log('   ⚠️ EXPIRADA em', endDate.toLocaleString('pt-BR'))
          } else {
            const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))
            console.log(`   ✅ Válida por mais ${daysLeft} dia(s)`)
          }
        }
      })
    }

    // 3. Verificar assinaturas ativas
    console.log('\n📋 3. Verificando assinaturas ATIVAS...')
    const { data: activeSubs } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (!activeSubs || activeSubs.length === 0) {
      console.log('❌ Nenhuma assinatura ATIVA encontrada')
    } else {
      console.log(`✅ ${activeSubs.length} assinatura(s) ATIVA(S):`)
      activeSubs.forEach(sub => {
        console.log(`   - ${sub.plan_type} (R$ ${sub.amount}) até ${sub.current_period_end}`)
      })
    }

    // 4. Verificar período de trial
    console.log('\n📋 4. Verificando período de trial...')
    if (user.trial_ends_at) {
      const trialEnd = new Date(user.trial_ends_at)
      const now = new Date()
      const freeMonths = user.free_months || 0
      
      if (freeMonths > 0) {
        const adjustedTrialEnd = new Date(trialEnd)
        adjustedTrialEnd.setMonth(adjustedTrialEnd.getMonth() + freeMonths)
        
        if (adjustedTrialEnd > now) {
          const daysLeft = Math.ceil((adjustedTrialEnd - now) / (1000 * 60 * 60 * 24))
          console.log(`✅ Trial ativo com ${freeMonths} mês(es) grátis - ${daysLeft} dia(s) restantes`)
        } else {
          console.log('⚠️ Trial expirado')
        }
      } else if (trialEnd > now) {
        const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24))
        console.log(`✅ Trial ativo - ${daysLeft} dia(s) restantes`)
      } else {
        console.log('⚠️ Trial expirado em', trialEnd.toLocaleString('pt-BR'))
      }
    } else {
      console.log('ℹ️ Usuário sem período de trial')
    }

    // 5. Resumo
    console.log('\n' + '='.repeat(60))
    console.log('📊 RESUMO DO ACESSO')
    console.log('='.repeat(60))
    
    const hasActiveSub = activeSubs && activeSubs.length > 0
    const hasValidTrial = user.trial_ends_at && new Date(user.trial_ends_at) > new Date()
    
    if (hasActiveSub) {
      console.log('✅ ACESSO: LIBERADO (Assinatura Ativa)')
    } else if (hasValidTrial) {
      console.log('✅ ACESSO: LIBERADO (Trial Ativo)')
    } else {
      console.log('❌ ACESSO: BLOQUEADO (Sem assinatura ativa ou trial)')
      console.log('\n💡 POSSÍVEIS CAUSAS:')
      console.log('   1. Pagamento não foi processado')
      console.log('   2. Webhook do Stripe não foi recebido')
      console.log('   3. Assinatura expirou')
      console.log('   4. Trial acabou')
    }

  } catch (error) {
    console.error('❌ Erro:', error.message)
  }
}

// Executar
const email = process.argv[2] || 'felipemakermoney@gmail.com'
checkUserSubscription(email).then(() => process.exit(0))

