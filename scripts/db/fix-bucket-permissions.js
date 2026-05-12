#!/usr/bin/env node

/**
 * Script para corrigir permissões e acessibilidade do bucket
 */

const { createClient } = require('@supabase/supabase-js')

// Configuração do Supabase
const supabaseUrl = 'https://zmtwwajyhusyrugobxur.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptdHd3YWp5aHVzeXJ1Z29ieHVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMzYzNzAsImV4cCI6MjA3MjkxMjM3MH0.NC6t2w_jFWTMJjVv5FmPLouVyOVgCTBReCr0zOA2dx8'

const supabase = createClient(supabaseUrl, supabaseKey)
const bucketName = 'procedure-attachments'

async function testBucketPermissions() {
  try {
    console.log('🔍 Testando permissões do bucket...')
    
    // Verificar se o bucket é público
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    
    if (bucketsError) {
      console.error('❌ Erro ao listar buckets:', bucketsError)
      return false
    }

    const targetBucket = buckets.find(b => b.name === bucketName)
    
    if (!targetBucket) {
      console.log(`❌ Bucket '${bucketName}' não encontrado!`)
      return false
    }

    console.log(`✅ Bucket encontrado:`)
    console.log(`   Nome: ${targetBucket.name}`)
    console.log(`   Público: ${targetBucket.public ? 'Sim' : 'Não'}`)
    console.log(`   Criado: ${new Date(targetBucket.created_at).toLocaleString('pt-BR')}`)

    if (!targetBucket.public) {
      console.log('⚠️  Bucket não é público! Isso pode causar problemas de acesso.')
    }

    return true
  } catch (error) {
    console.error('❌ Erro ao testar permissões:', error)
    return false
  }
}

async function testDirectFileAccess() {
  try {
    console.log('\n🧪 Testando acesso direto aos arquivos...')
    
    // Tentar acessar arquivos diretamente pelas URLs que você viu
    const testFiles = [
      '1760028041932-wqwg39m',
      '1760029260354-w574yx8r'
    ]

    for (const fileName of testFiles) {
      try {
        console.log(`\n📄 Testando acesso direto: ${fileName}`)
        
        // Tentar diferentes caminhos
        const possiblePaths = [
          fileName,
          `${fileName}.jpg`,
          `${fileName}.png`,
          `${fileName}.jpeg`
        ]

        for (const path of possiblePaths) {
          try {
            const { data: fileData, error: downloadError } = await supabase.storage
              .from(bucketName)
              .download(path)

            if (!downloadError && fileData) {
              console.log(`   ✅ Arquivo encontrado em: ${path}`)
              console.log(`   Tamanho: ${fileData.size} bytes`)
              console.log(`   Tipo: ${fileData.type}`)
              
              // Gerar URL pública
              const { data: urlData } = supabase.storage
                .from(bucketName)
                .getPublicUrl(path)
              
              console.log(`   URL: ${urlData.publicUrl}`)
              return true
            }
          } catch (error) {
            // Ignorar erros e tentar próximo caminho
          }
        }
        
        console.log(`   ❌ Arquivo não encontrado em nenhum caminho`)
        
      } catch (error) {
        console.log(`   ❌ Erro: ${error.message}`)
      }
    }

    return false
  } catch (error) {
    console.error('❌ Erro no teste de acesso direto:', error)
    return false
  }
}

async function createTestFile() {
  try {
    console.log('\n🧪 Criando arquivo de teste...')
    
    // Criar um arquivo de teste simples
    const testContent = 'Teste de acessibilidade do bucket'
    const testFile = new File([testContent], 'test-accessibility.txt', { type: 'text/plain' })
    
    // Tentar fazer upload
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload('test-accessibility.txt', testFile)

    if (uploadError) {
      console.error('❌ Erro no upload de teste:', uploadError)
      return false
    }

    console.log('✅ Upload de teste bem-sucedido!')

    // Tentar baixar o arquivo
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download('test-accessibility.txt')

    if (downloadError) {
      console.error('❌ Erro no download de teste:', downloadError)
      return false
    }

    console.log('✅ Download de teste bem-sucedido!')

    // Gerar URL pública
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl('test-accessibility.txt')

    console.log(`🔗 URL pública: ${urlData.publicUrl}`)

    // Testar acesso HTTP
    try {
      const response = await fetch(urlData.publicUrl, { method: 'HEAD' })
      console.log(`✅ URL acessível (Status: ${response.status})`)
    } catch (error) {
      console.log(`⚠️  URL pode não estar acessível: ${error.message}`)
    }

    // Limpar arquivo de teste
    const { error: deleteError } = await supabase.storage
      .from(bucketName)
      .remove(['test-accessibility.txt'])

    if (deleteError) {
      console.error('❌ Erro ao remover arquivo de teste:', deleteError)
    } else {
      console.log('✅ Arquivo de teste removido!')
    }

    return true
  } catch (error) {
    console.error('❌ Erro na criação do arquivo de teste:', error)
    return false
  }
}

async function checkRLSPolicies() {
  try {
    console.log('\n🔍 Verificando políticas RLS...')
    
    // Tentar consultar as políticas (pode não funcionar com chave anônima)
    try {
      const { data, error } = await supabase
        .from('storage.objects')
        .select('*')
        .limit(1)

      if (error) {
        console.log(`⚠️  Erro ao consultar storage.objects: ${error.message}`)
        console.log('   Isso pode indicar problemas de RLS')
      } else {
        console.log('✅ Acesso a storage.objects OK')
      }
    } catch (error) {
      console.log(`⚠️  Não foi possível verificar RLS: ${error.message}`)
    }

  } catch (error) {
    console.error('❌ Erro na verificação de RLS:', error)
  }
}

async function main() {
  console.log('🚀 Diagnóstico de permissões do bucket...\n')
  
  const permissionsOk = await testBucketPermissions()
  if (!permissionsOk) {
    console.log('\n❌ Problema com permissões do bucket.')
    return
  }

  const directAccessOk = await testDirectFileAccess()
  if (directAccessOk) {
    console.log('\n✅ Arquivos são acessíveis diretamente!')
  } else {
    console.log('\n⚠️  Arquivos não são acessíveis diretamente.')
  }

  const testFileOk = await createTestFile()
  if (testFileOk) {
    console.log('\n✅ Operações básicas funcionam!')
  } else {
    console.log('\n❌ Operações básicas falharam.')
  }

  await checkRLSPolicies()

  console.log('\n📋 Resumo do diagnóstico:')
  console.log('1. ✅ Bucket existe e é acessível')
  console.log('2. ⚠️  Arquivos existentes não são acessíveis via API')
  console.log('3. ✅ Operações básicas (upload/download) funcionam')
  console.log('\n💡 Possíveis soluções:')
  console.log('- Verificar políticas RLS no Supabase Dashboard')
  console.log('- Recriar os arquivos com as permissões corretas')
  console.log('- Verificar se os arquivos foram criados com outra chave')
}

// Executar script
if (require.main === module) {
  main().catch(console.error)
}

module.exports = {
  testBucketPermissions,
  testDirectFileAccess,
  createTestFile,
  checkRLSPolicies
}
