/**
 * Script para corrigir status de assinatura
 * Uso: node scripts/fix-subscription-status.js <email>
 */

const email = process.argv[2]

if (!email) {
  console.error('❌ Uso: node scripts/fix-subscription-status.js <email>')
  process.exit(1)
}

async function fixSubscription() {
  try {
    console.log(`\n🔧 Corrigindo assinatura para: ${email}\n`)

    // Chamar API de correção
    const response = await fetch('http://localhost:3000/api/debug/subscription/fix', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('❌ Erro:', data.error || 'Erro desconhecido')
      if (data.details) {
        console.error('📋 Detalhes:', data.details)
      }
      process.exit(1)
    }

    console.log('✅ Correções aplicadas com sucesso!\n')
    console.log('📋 Ações realizadas:')
    data.fixes.forEach((fix, index) => {
      console.log(`   ${index + 1}. ${fix.action}`)
      if (fix.subscription_id) {
        console.log(`      - Subscription ID: ${fix.subscription_id}`)
      }
      if (fix.stripe_subscription_id) {
        console.log(`      - Stripe Subscription ID: ${fix.stripe_subscription_id}`)
      }
      if (fix.error) {
        console.log(`      - Erro: ${fix.error}`)
      }
    })

    console.log(`\n✅ Assinaturas ativas: ${data.active_subscriptions}`)
    console.log(`\n${data.message}\n`)

  } catch (error) {
    console.error('❌ Erro ao executar correção:', error.message)
    console.error('\n💡 Certifique-se de que o servidor está rodando em http://localhost:3000')
    process.exit(1)
  }
}

fixSubscription()

