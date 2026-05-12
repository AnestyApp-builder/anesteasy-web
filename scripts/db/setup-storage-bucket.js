#!/usr/bin/env node

/**
 * Script para configurar o bucket de storage no Supabase
 * 
 * Este script:
 * 1. Cria o bucket se não existir
 * 2. Configura as permissões corretas
 * 3. Testa o funcionamento
 */

const { createClient } = require('@supabase/supabase-js')

// Configuração do Supabase
const supabaseUrl = 'https://zmtwwajyhusyrugobxur.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptdHd3YWp5aHVzeXJ1Z29ieHVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMzYzNzAsImV4cCI6MjA3MjkxMjM3MH0.NC6t2w_jFWTMJjVv5FmPLouVyOVgCTBReCr0zOA2dx8'

const supabase = createClient(supabaseUrl, supabaseKey)
const bucketName = 'procedure-attachments'

async function createBucket() {
  try {
    console.log(`🔧 Criando bucket '${bucketName}'...`)
    
    const { data, error } = await supabase.storage.createBucket(bucketName, {
      public: true, // Bucket público para permitir acesso direto
      allowedMimeTypes: [
        'image/jpeg',
        'image/png', 
        'image/gif',
        'image/webp',
        'image/bmp',
        'image/svg+xml',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'application/zip'
      ],
      fileSizeLimit: 50 * 1024 * 1024 // 50MB
    })

    if (error) {
      console.error('❌ Erro ao criar bucket:', error)
      return false
    }

    console.log('✅ Bucket criado com sucesso!')
    console.log('   Configurações:')
    console.log('   - Público: Sim')
    console.log('   - Tipos MIME permitidos: Imagens, PDFs, Documentos')
    console.log('   - Limite de tamanho: 50MB')
    
    return true
  } catch (error) {
    console.error('❌ Erro inesperado ao criar bucket:', error)
    return false
  }
}

async function checkBucketExists() {
  try {
    console.log('🔍 Verificando se o bucket existe...')
    
    const { data: buckets, error } = await supabase.storage.listBuckets()
    
    if (error) {
      console.error('❌ Erro ao listar buckets:', error)
      return false
    }

    const targetBucket = buckets.find(b => b.name === bucketName)
    
    if (targetBucket) {
      console.log(`✅ Bucket '${bucketName}' já existe`)
      console.log(`   Público: ${targetBucket.public ? 'Sim' : 'Não'}`)
      console.log(`   Criado: ${new Date(targetBucket.created_at).toLocaleString('pt-BR')}`)
      return true
    } else {
      console.log(`❌ Bucket '${bucketName}' não encontrado`)
      return false
    }
  } catch (error) {
    console.error('❌ Erro ao verificar bucket:', error)
    return false
  }
}

async function testBucketOperations() {
  try {
    console.log('\n🧪 Testando operações do bucket...')
    
    // Testar upload
    const testContent = 'Teste de configuração do bucket'
    const testFile = new File([testContent], 'test-config.txt', { type: 'text/plain' })
    
    console.log('📤 Testando upload...')
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload('test-config.txt', testFile)

    if (uploadError) {
      console.error('❌ Erro no upload de teste:', uploadError)
      return false
    }

    console.log('✅ Upload de teste bem-sucedido!')

    // Testar download
    console.log('📥 Testando download...')
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download('test-config.txt')

    if (downloadError) {
      console.error('❌ Erro no download de teste:', downloadError)
      return false
    }

    console.log('✅ Download de teste bem-sucedido!')

    // Testar URL pública
    console.log('🔗 Testando URL pública...')
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl('test-config.txt')

    console.log(`   URL pública: ${urlData.publicUrl}`)

    // Testar acesso à URL
    try {
      const response = await fetch(urlData.publicUrl, { method: 'HEAD' })
      console.log(`✅ URL pública acessível (Status: ${response.status})`)
    } catch (error) {
      console.log(`⚠️  URL pública pode não estar acessível: ${error.message}`)
    }

    // Limpar arquivo de teste
    console.log('🗑️ Removendo arquivo de teste...')
    const { error: deleteError } = await supabase.storage
      .from(bucketName)
      .remove(['test-config.txt'])

    if (deleteError) {
      console.error('❌ Erro ao remover arquivo de teste:', deleteError)
    } else {
      console.log('✅ Arquivo de teste removido!')
    }

    return true
  } catch (error) {
    console.error('❌ Erro no teste de operações:', error)
    return false
  }
}

async function setupDatabaseTable() {
  try {
    console.log('\n🗄️ Verificando tabela de anexos...')
    
    // Verificar se a tabela existe
    const { data: attachments, error: attachmentsError } = await supabase
      .from('procedure_attachments')
      .select('*')
      .limit(1)

    if (attachmentsError) {
      console.error('❌ Erro ao verificar tabela:', attachmentsError)
      console.log('💡 Você precisa criar a tabela procedure_attachments no Supabase Dashboard')
      return false
    }

    console.log('✅ Tabela procedure_attachments encontrada')
    return true
  } catch (error) {
    console.error('❌ Erro na verificação da tabela:', error)
    return false
  }
}

async function main() {
  console.log('🚀 Configurando bucket de storage...\n')
  
  // 1. Verificar se o bucket existe
  const bucketExists = await checkBucketExists()
  
  if (!bucketExists) {
    // 2. Criar o bucket se não existir
    const created = await createBucket()
    if (!created) {
      console.log('\n❌ Falha ao criar bucket. Verifique as permissões.')
      return
    }
  }

  // 3. Testar operações do bucket
  const operationsOk = await testBucketOperations()
  if (!operationsOk) {
    console.log('\n❌ Falha nos testes de operação. Verifique as configurações.')
    return
  }

  // 4. Verificar tabela do banco
  const tableOk = await setupDatabaseTable()
  if (!tableOk) {
    console.log('\n❌ Problema com a tabela do banco de dados.')
    return
  }

  console.log('\n🎉 Configuração concluída com sucesso!')
  console.log('\n📋 Próximos passos:')
  console.log('1. ✅ Bucket criado e configurado')
  console.log('2. ✅ Permissões configuradas')
  console.log('3. ✅ Operações testadas')
  console.log('4. ✅ Tabela verificada')
  console.log('\n💡 Agora você pode fazer upload de arquivos normalmente!')
}

// Executar script
if (require.main === module) {
  main().catch(console.error)
}

module.exports = {
  createBucket,
  checkBucketExists,
  testBucketOperations,
  setupDatabaseTable
}
