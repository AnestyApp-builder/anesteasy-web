#!/usr/bin/env node

/**
 * Script para configurar RLS manualmente
 * 
 * Este script fornece as instruções SQL e testa o acesso
 */

const { createClient } = require('@supabase/supabase-js')

// Configuração do Supabase
const supabaseUrl = 'https://zmtwwajyhusyrugobxur.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptdHd3YWp5aHVzeXJ1Z29ieHVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMzYzNzAsImV4cCI6MjA3MjkxMjM3MH0.NC6t2w_jFWTMJjVv5FmPLouVyOVgCTBReCr0zOA2dx8'

const supabase = createClient(supabaseUrl, supabaseKey)
const bucketName = 'procedure-attachments'

function displaySQLInstructions() {
  console.log('📋 INSTRUÇÕES SQL PARA ADICIONAR POLÍTICAS RLS')
  console.log('=' .repeat(60))
  console.log('')
  console.log('1. Acesse: https://app.supabase.com')
  console.log('2. Vá para: SQL Editor')
  console.log('3. Execute os seguintes comandos SQL:')
  console.log('')
  
  const policies = [
    {
      name: 'Public read access for procedure attachments',
      sql: `CREATE POLICY "Public read access for procedure attachments" ON storage.objects
FOR SELECT
USING (bucket_id = '${bucketName}');`
    },
    {
      name: 'Authenticated users can upload procedure attachments',
      sql: `CREATE POLICY "Authenticated users can upload procedure attachments" ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = '${bucketName}' AND auth.role() = 'authenticated');`
    },
    {
      name: 'Authenticated users can update procedure attachments',
      sql: `CREATE POLICY "Authenticated users can update procedure attachments" ON storage.objects
FOR UPDATE
USING (bucket_id = '${bucketName}' AND auth.role() = 'authenticated');`
    },
    {
      name: 'Authenticated users can delete procedure attachments',
      sql: `CREATE POLICY "Authenticated users can delete procedure attachments" ON storage.objects
FOR DELETE
USING (bucket_id = '${bucketName}' AND auth.role() = 'authenticated');`
    }
  ]

  policies.forEach((policy, index) => {
    console.log(`-- Política ${index + 1}: ${policy.name}`)
    console.log(policy.sql)
    console.log('')
  })

  console.log('4. Após executar os comandos, execute este script novamente para testar')
  console.log('')
}

async function testCurrentAccess() {
  try {
    console.log('🧪 Testando acesso atual ao bucket...')
    
    // Tentar listar arquivos
    const { data: files, error } = await supabase.storage
      .from(bucketName)
      .list('', { limit: 10 })

    if (error) {
      console.error('❌ Erro ao listar arquivos:', error)
      console.log('   Isso indica que as políticas RLS precisam ser configuradas')
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
      console.log('📂 Bucket vazio ou sem acesso')
      return false
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
      return false
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

async function testFileUpload() {
  try {
    console.log('\n🧪 Testando upload de arquivo...')
    
    // Criar arquivo de teste
    const testContent = 'Teste de upload após configuração RLS'
    const testFile = new File([testContent], 'test-rls-manual.txt', { type: 'text/plain' })
    
    // Upload
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload('test-rls-manual.txt', testFile)

    if (uploadError) {
      console.error('❌ Erro no upload:', uploadError)
      return false
    }

    console.log('✅ Upload bem-sucedido!')

    // Limpar arquivo de teste
    const { error: deleteError } = await supabase.storage
      .from(bucketName)
      .remove(['test-rls-manual.txt'])

    if (deleteError) {
      console.error('❌ Erro ao remover arquivo de teste:', deleteError)
    } else {
      console.log('✅ Arquivo de teste removido!')
    }

    return true
  } catch (error) {
    console.error('❌ Erro no teste de upload:', error)
    return false
  }
}

async function main() {
  console.log('🚀 Configuração Manual de RLS para procedure-attachments\n')
  
  console.log(`📋 Configuração:`)
  console.log(`   Bucket: ${bucketName}`)
  console.log(`   URL: ${supabaseUrl}`)
  console.log('')

  // Testar acesso atual
  const currentAccess = await testCurrentAccess()
  
  if (!currentAccess) {
    console.log('\n❌ Acesso ao bucket não está funcionando')
    console.log('💡 Você precisa configurar as políticas RLS manualmente')
    console.log('')
    displaySQLInstructions()
    return
  }

  // Se o acesso está funcionando, testar outras operações
  console.log('\n✅ Acesso ao bucket funcionando!')
  
  const downloadWorks = await testFileDownload()
  const uploadWorks = await testFileUpload()
  
  if (downloadWorks && uploadWorks) {
    console.log('\n🎉 SUCESSO! Todas as operações funcionando!')
    console.log('\n✅ Bucket acessível')
    console.log('✅ Download funcionando')
    console.log('✅ Upload funcionando')
    console.log('\n💡 Agora você pode:')
    console.log('1. Fazer upload de imagens em procedimentos')
    console.log('2. Visualizar as imagens na interface')
    console.log('3. Fazer download das imagens')
    console.log('4. Usar todas as funcionalidades normalmente')
  } else {
    console.log('\n⚠️  Algumas operações não estão funcionando')
    console.log('💡 Verifique as políticas RLS no Supabase Dashboard')
  }
}

// Executar script
if (require.main === module) {
  main().catch(console.error)
}

module.exports = {
  displaySQLInstructions,
  testCurrentAccess,
  testFileDownload,
  testFileUpload
}
