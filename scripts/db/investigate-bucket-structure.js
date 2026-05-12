#!/usr/bin/env node

/**
 * Script para investigar a estrutura real do bucket
 * e identificar por que as imagens não aparecem
 */

const { createClient } = require('@supabase/supabase-js')

// Configuração do Supabase
const supabaseUrl = 'https://zmtwwajyhusyrugobxur.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptdHd3YWp5aHVzeXJ1Z29ieHVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMzYzNzAsImV4cCI6MjA3MjkxMjM3MH0.NC6t2w_jFWTMJjVv5FmPLouVyOVgCTBReCr0zOA2dx8'

const supabase = createClient(supabaseUrl, supabaseKey)
const bucketName = 'procedure-attachments'

async function investigateBucketStructure() {
  try {
    console.log('🔍 Investigando estrutura do bucket...')
    
    // Listar arquivos na raiz
    const { data: rootFiles, error: rootError } = await supabase.storage
      .from(bucketName)
      .list('', {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'desc' }
      })

    if (rootError) {
      console.error('❌ Erro ao listar arquivos na raiz:', rootError)
      return
    }

    console.log(`📁 Arquivos na raiz: ${rootFiles.length}`)
    
    if (rootFiles.length > 0) {
      console.log('\n📋 Arquivos encontrados:')
      rootFiles.forEach((file, index) => {
        console.log(`${index + 1}. ${file.name}`)
        console.log(`   Tipo: ${file.metadata?.mimetype || 'unknown'}`)
        console.log(`   Tamanho: ${file.metadata?.size || 0} bytes`)
        console.log(`   Modificado: ${new Date(file.updated_at).toLocaleString('pt-BR')}`)
        console.log('')
      })
    }

    // Verificar se há pastas (baseado nos nomes que você mostrou)
    const folderNames = [
      '15ab6060-8131-408b-be81-e604ee073cc0',
      '47dbbd79-d299-4dee-93b',
      'bfc1646b-0f90-4676-a0c7',
      '5c7ae6c5-eb15-400f-814d',
      '7cb38a0f-4c07-4a52-869a',
      '874d084a-9679-405a-b52',
      '8d79e3d5-f4d7-431d-8687',
      'ac5fd7cd-c1b3-40e1-947a'
    ]

    console.log('🔍 Verificando pastas específicas...')
    
    for (const folderName of folderNames) {
      try {
        console.log(`\n📁 Verificando pasta: ${folderName}`)
        
        const { data: folderFiles, error: folderError } = await supabase.storage
          .from(bucketName)
          .list(folderName, {
            limit: 100
          })

        if (folderError) {
          console.log(`   ❌ Erro: ${folderError.message}`)
        } else if (folderFiles && folderFiles.length > 0) {
          console.log(`   ✅ Encontrados ${folderFiles.length} arquivos:`)
          folderFiles.forEach((file, index) => {
            console.log(`      ${index + 1}. ${file.name}`)
            console.log(`         Tipo: ${file.metadata?.mimetype || 'unknown'}`)
            console.log(`         Tamanho: ${file.metadata?.size || 0} bytes`)
          })
        } else {
          console.log(`   📂 Pasta vazia ou não acessível`)
        }
      } catch (error) {
        console.log(`   ❌ Erro inesperado: ${error.message}`)
      }
    }

  } catch (error) {
    console.error('❌ Erro na investigação:', error)
  }
}

async function testSpecificFileAccess() {
  try {
    console.log('\n🧪 Testando acesso a arquivos específicos...')
    
    // Testar alguns arquivos que você mencionou
    const testFiles = [
      '1760028041932-wqwg39m',
      '1760029260354-w574yx8r'
    ]

    for (const fileName of testFiles) {
      try {
        console.log(`\n📄 Testando: ${fileName}`)
        
        // Tentar baixar o arquivo
        const { data: fileData, error: downloadError } = await supabase.storage
          .from(bucketName)
          .download(fileName)

        if (downloadError) {
          console.log(`   ❌ Erro no download: ${downloadError.message}`)
        } else if (fileData) {
          console.log(`   ✅ Arquivo encontrado!`)
          console.log(`   Tamanho: ${fileData.size} bytes`)
          console.log(`   Tipo: ${fileData.type}`)
          
          // Gerar URL pública
          const { data: urlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(fileName)
          
          console.log(`   URL: ${urlData.publicUrl}`)
          
          // Testar acesso HTTP
          try {
            const response = await fetch(urlData.publicUrl, { method: 'HEAD' })
            console.log(`   Status HTTP: ${response.status}`)
            console.log(`   Content-Type: ${response.headers.get('content-type')}`)
          } catch (error) {
            console.log(`   ❌ Erro HTTP: ${error.message}`)
          }
        }
      } catch (error) {
        console.log(`   ❌ Erro inesperado: ${error.message}`)
      }
    }

  } catch (error) {
    console.error('❌ Erro no teste de acesso:', error)
  }
}

async function checkDatabaseRecords() {
  try {
    console.log('\n🗄️ Verificando registros no banco de dados...')
    
    const { data: attachments, error } = await supabase
      .from('procedure_attachments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('❌ Erro ao buscar anexos:', error)
      return
    }

    console.log(`📋 Encontrados ${attachments.length} registros no banco:`)
    
    if (attachments.length > 0) {
      attachments.forEach((attachment, index) => {
        console.log(`\n${index + 1}. ${attachment.file_name}`)
        console.log(`   ID: ${attachment.id}`)
        console.log(`   URL: ${attachment.file_url}`)
        console.log(`   Tipo: ${attachment.file_type}`)
        console.log(`   Tamanho: ${attachment.file_size} bytes`)
        console.log(`   Procedimento: ${attachment.procedure_id}`)
        console.log(`   Criado: ${new Date(attachment.created_at).toLocaleString('pt-BR')}`)
      })
    } else {
      console.log('   (Nenhum registro encontrado)')
    }

  } catch (error) {
    console.error('❌ Erro na verificação do banco:', error)
  }
}

async function main() {
  console.log('🚀 Investigação completa da estrutura do bucket...\n')
  
  await investigateBucketStructure()
  await testSpecificFileAccess()
  await checkDatabaseRecords()
  
  console.log('\n✅ Investigação concluída!')
}

// Executar script
if (require.main === module) {
  main().catch(console.error)
}

module.exports = {
  investigateBucketStructure,
  testSpecificFileAccess,
  checkDatabaseRecords
}
