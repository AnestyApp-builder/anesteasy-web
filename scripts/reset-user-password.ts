/**
 * Script para resetar senha de um usuário específico
 * Uso: npx tsx scripts/reset-user-password.ts <userId> <newPassword>
 * 
 * Exemplo:
 * npx tsx scripts/reset-user-password.ts bfc1646b-0f90-4676-a0c7-589d4110a944 Fa180495
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

// Função para carregar .env.local manualmente
function loadEnv() {
  try {
    const envPath = join(process.cwd(), '.env.local')
    const envContent = readFileSync(envPath, 'utf-8')
    const envVars: Record<string, string> = {}
    
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '')
          envVars[key.trim()] = value.trim()
        }
      }
    })
    
    return envVars
  } catch (error) {
    console.warn('⚠️  Não foi possível carregar .env.local, usando variáveis de ambiente do sistema')
    return {}
  }
}

// Carregar variáveis de ambiente
const envVars = loadEnv()
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || envVars.NEXT_PUBLIC_SUPABASE_URL || 'https://zmtwwajyhusyrugobxur.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || envVars.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local')
  process.exit(1)
}

// Criar cliente admin
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function resetUserPassword(userId: string, newPassword: string) {
  try {
    console.log('🔄 Resetando senha do usuário...')
    console.log(`   User ID: ${userId}`)
    console.log(`   Nova senha: ${newPassword}`)

    // Validar tamanho mínimo
    if (newPassword.length < 6) {
      console.error('❌ Erro: A senha deve ter pelo menos 6 caracteres')
      process.exit(1)
    }

    // Atualizar senha usando Admin API
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword
    })

    if (error) {
      console.error('❌ Erro ao atualizar senha:', error.message)
      process.exit(1)
    }

    console.log('✅ Senha atualizada com sucesso!')
    console.log(`   Email: ${data.user.email}`)
    console.log(`   ID: ${data.user.id}`)
    console.log('')
    console.log('📧 Informe a usuária que a senha foi resetada.')
    
  } catch (error: any) {
    console.error('❌ Erro interno:', error.message)
    process.exit(1)
  }
}

// Obter argumentos da linha de comando
const userId = process.argv[2]
const newPassword = process.argv[3]

if (!userId || !newPassword) {
  console.error('❌ Uso: npx tsx scripts/reset-user-password.ts <userId> <newPassword>')
  console.error('')
  console.error('Exemplo:')
  console.error('  npx tsx scripts/reset-user-password.ts bfc1646b-0f90-4676-a0c7-589d4110a944 Fa180495')
  process.exit(1)
}

// Executar
resetUserPassword(userId, newPassword)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Erro fatal:', error)
    process.exit(1)
  })

