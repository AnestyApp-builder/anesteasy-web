/**
 * Script para criar conta de administrador
 * 
 * IMPORTANTE: Este script deve ser executado apenas uma vez para criar o primeiro admin.
 * Contas admin subsequentes devem ser criadas manualmente via código.
 * 
 * Uso:
 * 1. Configure as variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
 * 2. Execute: npx ts-node scripts/create-admin-user.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zmtwwajyhusyrugobxur.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseServiceKey) {
  console.error('❌ Erro: SUPABASE_SERVICE_ROLE_KEY não configurada')
  console.error('Configure a variável de ambiente antes de executar este script')
  process.exit(1)
}

async function createAdminUser() {
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  // CONFIGURE AQUI OS DADOS DO ADMIN
  const adminEmail = 'admin@anesteasy.com'
  const adminPassword = '123456789'
  const adminName = 'Administrador do Sistema'

  console.log('🔐 Criando conta de administrador...')
  console.log(`📧 Email: ${adminEmail}`)
  console.log('⚠️  ATENÇÃO: Certifique-se de alterar a senha padrão após o primeiro login!')

  try {
    // Criar usuário no Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true, // Confirmar email automaticamente
      user_metadata: {
        name: adminName,
        role: 'admin',
        is_system_admin: true
      }
    })

    if (authError) {
      console.error('❌ Erro ao criar usuário no Auth:', authError)
      return
    }

    if (!authData.user) {
      console.error('❌ Usuário não foi criado')
      return
    }

    console.log('✅ Usuário criado no Supabase Auth:', authData.user.id)

    // Criar/atualizar registro na tabela users
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: authData.user.id,
        email: adminEmail,
        name: adminName,
        role: 'admin',
        is_system_admin: true,
        created_by_admin: false, // Primeiro admin não foi criado por outro admin
        specialty: 'Administração',
        crm: '000000',
        password_hash: '', // Não armazenamos hash, o Supabase Auth gerencia
        subscription_plan: 'admin',
        subscription_status: 'active'
      }, {
        onConflict: 'id'
      })
      .select()
      .single()

    if (userError) {
      console.error('❌ Erro ao criar registro na tabela users:', userError)
      console.error('⚠️  O usuário foi criado no Auth, mas não na tabela users')
      console.error('⚠️  Você precisará atualizar manualmente a tabela users')
      return
    }

    console.log('✅ Registro criado na tabela users')
    console.log('')
    console.log('🎉 Conta de administrador criada com sucesso!')
    console.log('')
    console.log('📝 Próximos passos:')
    console.log(`   1. Acesse: /super-admin-login-x872k20`)
    console.log(`   2. Faça login com: ${adminEmail}`)
    console.log(`   3. ALTERE A SENHA IMEDIATAMENTE após o primeiro login!`)
    console.log('')
    console.log('⚠️  IMPORTANTE:')
    console.log('   - Mantenha as credenciais em local seguro')
    console.log('   - Não compartilhe este script com pessoas não autorizadas')
    console.log('   - Revise as permissões RLS da tabela users')

  } catch (error) {
    console.error('❌ Erro ao criar conta admin:', error)
  }
}

// Executar
createAdminUser()
  .then(() => {
    console.log('✅ Script concluído')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error)
    process.exit(1)
  })

