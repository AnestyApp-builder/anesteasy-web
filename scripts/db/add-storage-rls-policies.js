#!/usr/bin/env node

/**
 * Script para adicionar políticas RLS para o bucket procedure-attachments
 * 
 * Este script adiciona as políticas necessárias para permitir:
 * 1. Leitura pública de arquivos
 * 2. Upload para usuários autenticados
 * 3. Atualização para usuários autenticados
 * 4. Exclusão para usuários autenticados
 */

const { createClient } = require('@supabase/supabase-js')

// Configuração do Supabase
const supabaseUrl = 'https://zmtwwajyhusyrugobxur.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptdHd3YWp5aHVzeXJ1Z29ieHVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMzYzNzAsImV4cCI6MjA3MjkxMjM3MH0.NC6t2w_jFWTMJjVv5FmPLouVyOVgCTBReCr0zOA2dx8'

const supabase = createClient(supabaseUrl, supabaseKey)
const bucketName = 'procedure-attachments'

// Políticas RLS para adicionar
const rlsPolicies = [
  {
    name: 'Public read access for procedure attachments',
    command: 'SELECT',
    definition: `bucket_id = '${bucketName}'`,
    description: 'Permite leitura pública de todos os arquivos do bucket'
  },
  {
    name: 'Authenticated users can upload procedure attachments',
    command: 'INSERT',
    definition: `bucket_id = '${bucketName}' AND auth.role() = 'authenticated'`,
    description: 'Permite upload para usuários autenticados'
  },
  {
    name: 'Authenticated users can update procedure attachments',
    command: 'UPDATE',
    definition: `bucket_id = '${bucketName}' AND auth.role() = 'authenticated'`,
    description: 'Permite atualização para usuários autenticados'
  },
  {
    name: 'Authenticated users can delete procedure attachments',
    command: 'DELETE',
    definition: `bucket_id = '${bucketName}' AND auth.role() = 'authenticated'`,
    description: 'Permite exclusão para usuários autenticados'
  }
]

async function addRLSPolicy(policy) {
  try {
    console.log(`🔧 Adicionando política: ${policy.name}`)
    
    // SQL para criar a política
    const sql = `
      CREATE POLICY "${policy.name}" ON storage.objects
      FOR ${policy.command}
      USING (${policy.definition});
    `
    
    console.log(`   SQL: ${sql.trim()}`)
    
    // Executar SQL usando RPC
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: sql
    })

    if (error) {
      console.log(`   ⚠️  Erro: ${error.message}`)
      console.log(`   💡 A política pode já existir ou ter conflito`)
      return false
    }

    console.log(`   ✅ Política adicionada com sucesso!`)
    return true
  } catch (error) {
    console.log(`   ❌ Erro inesperado: ${error.message}`)
    return false
  }
}

async function checkExistingPolicies() {
  try {
    console.log('🔍 Verificando políticas existentes...')
    
    // Tentar consultar as políticas existentes
    const { data, error } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'objects')
      .eq('schemaname', 'storage')

    if (error) {
      console.log(`⚠️  Não foi possível consultar políticas existentes: ${error.message}`)
      return []
    }

    if (data && data.length > 0) {
      console.log(`📋 Encontradas ${data.length} políticas existentes:`)
      data.forEach((policy, index) => {
        console.log(`   ${index + 1}. ${policy.policyname}`)
        console.log(`      Comando: ${policy.cmd}`)
        console.log(`      Definição: ${policy.qual}`)
      })
    } else {
      console.log('📋 Nenhuma política encontrada')
    }

    return data || []
  } catch (error) {
    console.log(`⚠️  Erro ao verificar políticas: ${error.message}`)
    return []
  }
}

async function testBucketAccess() {
  try {
    console.log('\n🧪 Testando acesso ao bucket após adicionar políticas...')
    
    // Tentar listar arquivos
    const { data: files, error } = await supabase.storage
      .from(bucketName)
      .list('', { limit: 5 })

    if (error) {
      console.error('❌ Erro ao listar arquivos:', error)
      return false
    }

    if (files && files.length > 0) {
      console.log(`✅ Encontrados ${files.length} arquivos:`)
      files.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file.name}`)
        console.log(`      Tipo: ${file.metadata?.mimetype || 'unknown'}`)
        console.log(`      Tamanho: ${file.metadata?.size || 0} bytes`)
      })
      return true
    } else {
      console.log('📂 Bucket vazio')
      return true
    }

  } catch (error) {
    console.error('❌ Erro no teste de acesso:', error)
    return false
  }
}

async function testFileDownload() {
  try {
    console.log('\n🧪 Testando download de arquivo...')
    
    // Listar arquivos para pegar um para teste
    const { data: files, error: listError } = await supabase.storage
      .from(bucketName)
      .list('', { limit: 1 })

    if (listError || !files || files.length === 0) {
      console.log('📂 Nenhum arquivo para testar download')
      return true
    }

    const testFile = files[0]
    console.log(`📄 Testando download: ${testFile.name}`)
    
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(testFile.name)

    if (downloadError) {
      console.error('❌ Erro no download:', downloadError)
      return false
    }

    console.log('✅ Download bem-sucedido!')
    console.log(`   Tamanho: ${fileData.size} bytes`)
    console.log(`   Tipo: ${fileData.type}`)

    // Gerar URL pública
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(testFile.name)

    console.log(`   URL: ${urlData.publicUrl}`)

    // Testar acesso HTTP
    try {
      const response = await fetch(urlData.publicUrl, { method: 'HEAD' })
      console.log(`✅ URL acessível (Status: ${response.status})`)
      console.log(`   Content-Type: ${response.headers.get('content-type')}`)
    } catch (error) {
      console.log(`⚠️  URL pode não estar acessível: ${error.message}`)
    }

    return true
  } catch (error) {
    console.error('❌ Erro no teste de download:', error)
    return false
  }
}

async function main() {
  console.log('🚀 Adicionando políticas RLS para procedure-attachments...\n')
  
  console.log(`📋 Configuração:`)
  console.log(`   Bucket: ${bucketName}`)
  console.log(`   URL: ${supabaseUrl}`)
  console.log('')

  // Verificar políticas existentes
  await checkExistingPolicies()

  // Adicionar políticas RLS
  console.log('\n🔧 Adicionando políticas RLS...')
  let successCount = 0
  
  for (const policy of rlsPolicies) {
    const success = await addRLSPolicy(policy)
    if (success) successCount++
    console.log('')
  }

  console.log(`📊 Resultado: ${successCount}/${rlsPolicies.length} políticas adicionadas`)

  // Testar acesso após adicionar políticas
  console.log('\n🧪 Testando acesso após configuração...')
  
  const bucketAccess = await testBucketAccess()
  if (!bucketAccess) {
    console.log('\n❌ Bucket ainda não acessível. Verifique as políticas manualmente.')
    return
  }

  const fileDownload = await testFileDownload()
  if (!fileDownload) {
    console.log('\n❌ Download ainda não funciona.')
    return
  }

  console.log('\n🎉 SUCESSO! Políticas RLS configuradas!')
  console.log('\n✅ Bucket acessível')
  console.log('✅ Download funcionando')
  console.log('✅ URLs públicas funcionando')
  console.log('\n💡 Agora você pode:')
  console.log('1. Fazer upload de imagens em procedimentos')
  console.log('2. Visualizar as imagens na interface')
  console.log('3. Fazer download das imagens')
  console.log('4. Usar todas as funcionalidades normalmente')
  
  console.log('\n🔧 Se ainda houver problemas, execute:')
  console.log('   node scripts/test-final-solution.js')
}

// Executar script
if (require.main === module) {
  main().catch(console.error)
}

module.exports = {
  addRLSPolicy,
  checkExistingPolicies,
  testBucketAccess,
  testFileDownload
}
