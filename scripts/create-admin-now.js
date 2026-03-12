/**
 * Script rápido para criar conta admin
 * Execute: node scripts/create-admin-now.js
 * 
 * IMPORTANTE: Configure SUPABASE_SERVICE_ROLE_KEY como variável de ambiente
 * Windows: $env:SUPABASE_SERVICE_ROLE_KEY="sua-key"
 * Linux/Mac: export SUPABASE_SERVICE_ROLE_KEY="sua-key"
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Tentar ler .env.local se existir
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  })
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zmtwwajyhusyrugobxur.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseServiceKey) {
  console.error('❌ Erro: SUPABASE_SERVICE_ROLE_KEY não configurada')
  console.error('Configure no arquivo .env.local:')
  console.error('SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key')
  process.exit(1)
}

async function createAdmin() {
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  const adminEmail = 'admin@anesteasy.com'
  const adminPassword = '123456789'
  const adminName = 'Administrador do Sistema'

  console.log('🔐 Criando conta de administrador...')
  console.log(`📧 Email: ${adminEmail}`)

  try {
    // Verificar se já existe
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id, email, role, is_system_admin')
      .eq('email', adminEmail)
      .maybeSingle()

    if (existing && existing.role === 'admin' && existing.is_system_admin) {
      console.log('✅ Conta admin já existe!')
      console.log(`   Email: ${adminEmail}`)
      return
    }

    // Criar no Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        name: adminName,
        role: 'admin',
        is_system_admin: true
      }
    })

    if (authError) {
      console.error('❌ Erro ao criar no Auth:', authError.message)
      return
    }

    if (!authData.user) {
      console.error('❌ Usuário não criado')
      return
    }

    console.log('✅ Usuário criado no Auth:', authData.user.id)

    // Criar na tabela users
    const { error: userError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: authData.user.id,
        email: adminEmail,
        name: adminName,
        role: 'admin',
        is_system_admin: true,
        created_by_admin: false,
        specialty: 'Administração',
        crm: '000000',
        password_hash: '',
        subscription_plan: 'admin',
        subscription_status: 'active'
      }, { onConflict: 'id' })

    if (userError) {
      console.error('❌ Erro na tabela users:', userError.message)
      return
    }

    console.log('✅ Conta admin criada com sucesso!')
    console.log('')
    console.log('📝 Credenciais:')
    console.log(`   Email: ${adminEmail}`)
    console.log(`   Senha: ${adminPassword}`)
    console.log('')
    console.log('🔗 Acesse: /super-admin-login-x872k20')
    console.log('⚠️  ALTERE A SENHA após o primeiro login!')

  } catch (error) {
    console.error('❌ Erro:', error.message)
  }
}

createAdmin()

