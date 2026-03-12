// Script para adicionar 1 dia à assinatura manualmente
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
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function addDailyToSubscription(email) {
  console.log('🔧 Adicionando 1 dia à assinatura de:', email)
  console.log('=' .repeat(60))

  try {
    // 1. Buscar usuário
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()

    if (userError || !user) {
      console.error('❌ Usuário não encontrado')
      return
    }

    console.log('✅ Usuário encontrado:', user.name)

    // 2. Buscar assinatura mais recente
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!subscription) {
      console.error('❌ Nenhuma assinatura encontrada')
      return
    }

    console.log('\n📋 Assinatura atual:')
    console.log('   - ID:', subscription.id)
    console.log('   - Status:', subscription.status)
    console.log('   - Período atual:', subscription.current_period_end)

    // 3. Calcular novo período
    const now = new Date()
    let baseDate = subscription.current_period_end ? new Date(subscription.current_period_end) : now

    // Se expirou, começar de agora
    if (baseDate < now) {
      console.log('   ⚠️ Período expirado, reiniciando de agora')
      baseDate = now
    }

    const newEnd = new Date(baseDate.getTime() + 24 * 60 * 60 * 1000) // +1 dia
    const newStart = subscription.status === 'active' ? subscription.current_period_start : now.toISOString()

    console.log('\n📅 Novo período:')
    console.log('   - Início:', newStart)
    console.log('   - Fim:', newEnd.toISOString())

    // 4. Atualizar assinatura
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        current_period_start: newStart,
        current_period_end: newEnd.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id)

    if (updateError) {
      console.error('❌ Erro ao atualizar:', updateError.message)
      return
    }

    // 5. Atualizar usuário
    await supabase
      .from('users')
      .update({
        subscription_plan: 'monthly',
        subscription_status: 'active'
      })
      .eq('id', user.id)

    console.log('\n✅ SUCESSO!')
    console.log('   - 1 dia adicionado à assinatura')
    console.log('   - Status: active')
    console.log('   - Válido até:', newEnd.toLocaleString('pt-BR'))

  } catch (error) {
    console.error('❌ Erro:', error.message)
  }
}

// Executar
const email = process.argv[2] || 'felipemakermoney@gmail.com'
addDailyToSubscription(email).then(() => process.exit(0))

