/**
 * Script para deletar todas as secretarias do banco de dados
 * 
 * USO:
 * 1. Configure as variáveis de ambiente do Supabase
 * 2. Execute: npx tsx scripts/delete-all-secretarias.ts
 * 
 * ATENÇÃO: Este script irá deletar TODAS as secretarias!
 */

import { createClient } from '@supabase/supabase-js'

// Configurações do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Criar cliente com permissões de service role (bypass RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function deleteAllSecretarias() {
  console.log('🚀 Iniciando deleção de todas as secretarias...')
  console.log('═══════════════════════════════════════════════════════')

  try {
    // 1. Buscar todas as secretarias para exibir antes de deletar
    console.log('📋 Buscando secretarias existentes...')
    const { data: secretarias, error: fetchError } = await supabase
      .from('secretarias')
      .select('id, email, nome')

    if (fetchError) {
      console.error('❌ Erro ao buscar secretarias:', fetchError)
      return
    }

    if (!secretarias || secretarias.length === 0) {
      console.log('✅ Nenhuma secretaria encontrada no banco de dados.')
      return
    }

    console.log(`📊 Encontradas ${secretarias.length} secretaria(s):`)
    secretarias.forEach((s, index) => {
      console.log(`   ${index + 1}. ${s.nome} (${s.email}) - ID: ${s.id}`)
    })
    console.log('')

    // 2. Deletar todas as vinculações primeiro
    console.log('🔗 Deletando vinculações de anestesistas...')
    const { error: unlinkError } = await supabase
      .from('anestesista_secretaria')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Deletar todos

    if (unlinkError) {
      console.error('❌ Erro ao deletar vinculações:', unlinkError)
      return
    }
    console.log('✅ Vinculações deletadas com sucesso!')
    console.log('')

    // 3. Deletar todas as secretarias
    console.log('🗑️  Deletando secretarias...')
    const { error: deleteError } = await supabase
      .from('secretarias')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Deletar todos

    if (deleteError) {
      console.error('❌ Erro ao deletar secretarias:', deleteError)
      return
    }

    console.log('✅ Todas as secretarias foram deletadas com sucesso!')
    console.log('═══════════════════════════════════════════════════════')
    console.log('')
    console.log('⚠️  NOTA: Os usuários do Supabase Auth ainda existem.')
    console.log('⚠️  Para deletá-los também, use o painel do Supabase ou a API Admin.')
    console.log('')

  } catch (error) {
    console.error('❌ Erro inesperado:', error)
  }
}

// Executar script
deleteAllSecretarias()
  .then(() => {
    console.log('✅ Script concluído!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error)
    process.exit(1)
  })

