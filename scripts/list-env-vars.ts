/**
 * Script para listar todas as variáveis de ambiente necessárias
 * Execute: npx tsx scripts/list-env-vars.ts
 */

const requiredVars = {
  // Supabase (OBRIGATÓRIAS)
  'NEXT_PUBLIC_SUPABASE_URL': {
    description: 'URL do projeto Supabase',
    example: 'https://zmtwwajyhusyrugobxur.supabase.co',
    required: true,
    where: 'https://app.supabase.com/project/zmtwwajyhusyrugobxur/settings/api'
  },
  'SUPABASE_SERVICE_ROLE_KEY': {
    description: 'Service Role Key do Supabase (CRÍTICA para uploads)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    required: true,
    where: 'https://app.supabase.com/project/zmtwwajyhusyrugobxur/settings/api'
  },
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': {
    description: 'Anon Key do Supabase (opcional, tem fallback)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    required: false,
    where: 'https://app.supabase.com/project/zmtwwajyhusyrugobxur/settings/api'
  },

  // Stripe (OBRIGATÓRIAS para pagamentos)
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY': {
    description: 'Stripe Publishable Key',
    example: 'pk_live_... ou pk_test_...',
    required: true,
    where: 'https://dashboard.stripe.com/apikeys'
  },
  'STRIPE_SECRET_KEY': {
    description: 'Stripe Secret Key',
    example: 'sk_live_... ou sk_test_...',
    required: true,
    where: 'https://dashboard.stripe.com/apikeys'
  },
  'STRIPE_WEBHOOK_SECRET': {
    description: 'Stripe Webhook Secret',
    example: 'whsec_...',
    required: true,
    where: 'https://dashboard.stripe.com/webhooks'
  },
  'STRIPE_PRICE_ID_MONTHLY': {
    description: 'Stripe Price ID - Plano Mensal',
    example: 'price_...',
    required: true,
    where: 'https://dashboard.stripe.com/products'
  },
  'STRIPE_PRICE_ID_QUARTERLY': {
    description: 'Stripe Price ID - Plano Trimestral',
    example: 'price_...',
    required: true,
    where: 'https://dashboard.stripe.com/products'
  },
  'STRIPE_PRICE_ID_ANNUAL': {
    description: 'Stripe Price ID - Plano Anual',
    example: 'price_...',
    required: true,
    where: 'https://dashboard.stripe.com/products'
  },
  'STRIPE_PRICE_ID_DAILY': {
    description: 'Stripe Price ID - Plano Diário (opcional)',
    example: 'price_...',
    required: false,
    where: 'https://dashboard.stripe.com/products'
  },

  // URLs
  'NEXT_PUBLIC_BASE_URL': {
    description: 'URL base da aplicação',
    example: 'https://anesteasy.com.br',
    required: true,
    where: 'Sua URL de produção'
  },

  // OpenAI (OPCIONAL - para IA)
  'OPENAI_API_KEY': {
    description: 'OpenAI API Key (para extração de dados)',
    example: 'sk-...',
    required: false,
    where: 'https://platform.openai.com/api-keys'
  },

  // Google Vision (OPCIONAL - para OCR)
  'GOOGLE_APPLICATION_CREDENTIALS': {
    description: 'Caminho para credenciais do Google Vision',
    example: './keys/google-vision.json',
    required: false,
    where: 'https://console.cloud.google.com/apis/credentials'
  },
  'GOOGLE_APPLICATION_CREDENTIALS_JSON': {
    description: 'JSON das credenciais do Google Vision (string)',
    example: '{"type":"service_account",...}',
    required: false,
    where: 'https://console.cloud.google.com/apis/credentials'
  },
  'GOOGLE_VISION_API_KEY': {
    description: 'API Key do Google Vision',
    example: 'AIza...',
    required: false,
    where: 'https://console.cloud.google.com/apis/credentials'
  },

  // Email (OPCIONAL)
  'RESEND_API_KEY': {
    description: 'Resend API Key (para envio de emails)',
    example: 're_...',
    required: false,
    where: 'https://resend.com/api-keys'
  },
  'SMTP_HOST': {
    description: 'SMTP Host (alternativa ao Resend)',
    example: 'smtp.gmail.com',
    required: false,
    where: 'Configurações do seu provedor de email'
  },
  'SMTP_PORT': {
    description: 'SMTP Port',
    example: '587',
    required: false,
    where: 'Configurações do seu provedor de email'
  },
  'SMTP_USER': {
    description: 'SMTP User',
    example: 'seu-email@gmail.com',
    required: false,
    where: 'Configurações do seu provedor de email'
  },
  'SMTP_PASSWORD': {
    description: 'SMTP Password',
    example: 'sua-senha-app',
    required: false,
    where: 'Configurações do seu provedor de email'
  },
  'SMTP_FROM': {
    description: 'Email remetente',
    example: 'noreply@anesteasy.com.br',
    required: false,
    where: 'Seu email de envio'
  }
}

console.log('🔐 VARIÁVEIS DE AMBIENTE NECESSÁRIAS PARA VERCEL\n')
console.log('=' .repeat(80))
console.log('\n')

// Separar obrigatórias e opcionais
const required = Object.entries(requiredVars).filter(([_, info]) => info.required)
const optional = Object.entries(requiredVars).filter(([_, info]) => !info.required)

console.log('✅ OBRIGATÓRIAS:\n')
required.forEach(([key, info]) => {
  console.log(`📌 ${key}`)
  console.log(`   Descrição: ${info.description}`)
  console.log(`   Exemplo: ${info.example}`)
  console.log(`   Onde obter: ${info.where}`)
  console.log('')
})

console.log('\n' + '='.repeat(80) + '\n')

console.log('⚙️ OPCIONAIS:\n')
optional.forEach(([key, info]) => {
  console.log(`📌 ${key}`)
  console.log(`   Descrição: ${info.description}`)
  console.log(`   Exemplo: ${info.example}`)
  console.log(`   Onde obter: ${info.where}`)
  console.log('')
})

console.log('\n' + '='.repeat(80) + '\n')
console.log('📋 COMANDOS PARA ADICIONAR NA VERCEL (via CLI):\n')
console.log('vercel env add NEXT_PUBLIC_SUPABASE_URL production')
console.log('vercel env add SUPABASE_SERVICE_ROLE_KEY production')
console.log('vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production')
console.log('vercel env add STRIPE_SECRET_KEY production')
console.log('vercel env add STRIPE_WEBHOOK_SECRET production')
console.log('vercel env add STRIPE_PRICE_ID_MONTHLY production')
console.log('vercel env add STRIPE_PRICE_ID_QUARTERLY production')
console.log('vercel env add STRIPE_PRICE_ID_ANNUAL production')
console.log('vercel env add NEXT_PUBLIC_BASE_URL production')
console.log('\n💡 Dica: Configure todas para "Production, Preview, Development"\n')

