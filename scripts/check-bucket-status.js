#!/usr/bin/env node

/**
 * Script para verificar o status do bucket e permissões
 */

const { createClient } = require('@supabase/supabase-js')

// Configuração do Supabase
const supabaseUrl = 'https://zmtwwajyhusyrugobxur.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptdHd3YWp5aHVzeXJ1Z29ieHVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMzYzNzAsImV4cCI6MjA3MjkxMjM3MH0.NC6t2w_jFWTMJjVv5FmPLouVyOVgCTBReCr0zOA2dx8'

const supabase = createClient(supabaseUrl, supabaseKey)
const bucketName = 'procedure-attachments'

async function checkBucketStatus() {
  try {
    console.log('🔍 Verificando status do bucket...')
    
    // Tentar listar buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    
    if (bucketsError) {
      console.error('❌ Erro ao listar buckets:', bucketsError)
      return
    }

    console.log('📁 Buckets disponíveis:')
    buckets.forEach(bucket => {
      console.log(`   - ${bucket.name} (${bucket.public ? 'público' : 'privado'})`)
    })

    // Verificar se o bucket específico existe
    const targetBucket = buckets.find(b => b.name === bucketName)
    
    if (!targetBucket) {
      console.log(`\n❌ Bucket '${bucketName}' não encontrado!`)
      console.log('💡 Você precisa criar o bucket no Supabase Dashboard')
      return
    }

    console.log(`\n✅ Bucket '${bucketName}' encontrado`)
    console.log(`   Público: ${targetBucket.public ? 'Sim' : 'Não'}`)
    console.log(`   Criado: ${new Date(targetBucket.created_at).toLocaleString('pt-BR')}`)

    // Tentar listar arquivos com diferentes parâmetros
    console.log('\n🔍 Tentando listar arquivos...')
    
    const { data: files, error: filesError } = await supabase.storage
      .from(bucketName)
      .list('', {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'desc' }
      })

    if (filesError) {
      console.error('❌ Erro ao listar arquivos:', filesError)
      
      // Tentar com parâmetros diferentes
      console.log('\n🔄 Tentando com parâmetros diferentes...')
      
      const { data: files2, error: filesError2 } = await supabase.storage
        .from(bucketName)
        .list('')

      if (filesError2) {
        console.error('❌ Erro persistente:', filesError2)
      } else {
        console.log(`✅ Sucesso! Encontrados ${files2.length} arquivos`)
        files2.forEach((file, index) => {
          console.log(`   ${index + 1}. ${file.name}`)
        })
      }
    } else {
      console.log(`✅ Sucesso! Encontrados ${files.length} arquivos`)
      if (files.length > 0) {
        files.forEach((file, index) => {
          console.log(`   ${index + 1}. ${file.name}`)
        })
      } else {
        console.log('   (Bucket vazio)')
      }
    }

  } catch (error) {
    console.error('❌ Erro inesperado:', error)
  }
}

async function testBucketOperations() {
  try {
    console.log('\n🧪 Testando operações do bucket...')
    
    // Testar upload de um arquivo pequeno
    const testContent = 'Teste de upload'
    const testFile = new File([testContent], 'test.txt', { type: 'text/plain' })
    
    console.log('📤 Tentando fazer upload de teste...')
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload('test-upload.txt', testFile)

    if (uploadError) {
      console.error('❌ Erro no upload:', uploadError)
    } else {
      console.log('✅ Upload de teste bem-sucedido!')
      
      // Tentar baixar o arquivo
      console.log('📥 Tentando baixar o arquivo...')
      
      const { data: downloadData, error: downloadError } = await supabase.storage
        .from(bucketName)
        .download('test-upload.txt')

      if (downloadError) {
        console.error('❌ Erro no download:', downloadError)
      } else {
        console.log('✅ Download de teste bem-sucedido!')
      }

      // Limpar arquivo de teste
      console.log('🗑️ Removendo arquivo de teste...')
      
      const { error: deleteError } = await supabase.storage
        .from(bucketName)
        .remove(['test-upload.txt'])

      if (deleteError) {
        console.error('❌ Erro ao remover arquivo de teste:', deleteError)
      } else {
        console.log('✅ Arquivo de teste removido!')
      }
    }

  } catch (error) {
    console.error('❌ Erro no teste de operações:', error)
  }
}

async function checkDatabaseConnection() {
  try {
    console.log('\n🗄️ Verificando conexão com o banco de dados...')
    
    const { data, error } = await supabase
      .from('procedure_attachments')
      .select('count')
      .limit(1)

    if (error) {
      console.error('❌ Erro na conexão com o banco:', error)
    } else {
      console.log('✅ Conexão com o banco de dados OK')
    }

    // Verificar se a tabela existe e tem dados
    const { data: attachments, error: attachmentsError } = await supabase
      .from('procedure_attachments')
      .select('*')
      .limit(5)

    if (attachmentsError) {
      console.error('❌ Erro ao consultar anexos:', attachmentsError)
    } else {
      console.log(`✅ Tabela 'procedure_attachments' encontrada`)
      console.log(`   Registros encontrados: ${attachments.length}`)
      
      if (attachments.length > 0) {
        console.log('   Primeiros registros:')
        attachments.forEach((att, index) => {
          console.log(`     ${index + 1}. ${att.file_name} (${att.file_url})`)
        })
      }
    }

  } catch (error) {
    console.error('❌ Erro na verificação do banco:', error)
  }
}

// Função principal
async function main() {
  console.log('🚀 Verificação completa do sistema...\n')
  
  await checkBucketStatus()
  await testBucketOperations()
  await checkDatabaseConnection()
  
  console.log('\n✅ Verificação concluída!')
}

// Executar script
if (require.main === module) {
  main().catch(console.error)
}

module.exports = {
  checkBucketStatus,
  testBucketOperations,
  checkDatabaseConnection
}
