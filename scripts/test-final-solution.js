#!/usr/bin/env node

/**
 * Script para testar a solução final após configurar as políticas RLS
 */

const { createClient } = require('@supabase/supabase-js')

// Configuração do Supabase
const supabaseUrl = 'https://zmtwwajyhusyrugobxur.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptdHd3YWp5aHVzeXJ1Z29ieHVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMzYzNzAsImV4cCI6MjA3MjkxMjM3MH0.NC6t2w_jFWTMJjVv5FmPLouVyOVgCTBReCr0zOA2dx8'

const supabase = createClient(supabaseUrl, supabaseKey)

// ⚠️ IMPORTANTE: Atualize este nome com o nome real do bucket
const BUCKET_NAME = 'procedure-attachments' // Substitua pelo nome real

async function testBucketAccess() {
  try {
    console.log(`🔍 Testando acesso ao bucket: ${BUCKET_NAME}`)
    
    // Tentar listar arquivos
    const { data: files, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list('', { limit: 10 })

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
      return true // Bucket vazio não é erro
    }

  } catch (error) {
    console.error('❌ Erro no teste de acesso:', error)
    return false
  }
}

async function testFileDownload() {
  try {
    console.log('\n🧪 Testando download de arquivos...')
    
    // Primeiro, listar arquivos para pegar um para teste
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list('', { limit: 5 })

    if (listError || !files || files.length === 0) {
      console.log('📂 Nenhum arquivo para testar download')
      return true
    }

    // Testar download do primeiro arquivo
    const testFile = files[0]
    console.log(`📄 Testando download: ${testFile.name}`)
    
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(BUCKET_NAME)
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
      .from(BUCKET_NAME)
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
    const testFile = new File([testContent], 'test-rls-config.txt', { type: 'text/plain' })
    
    // Upload
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload('test-rls-config.txt', testFile)

    if (uploadError) {
      console.error('❌ Erro no upload:', uploadError)
      return false
    }

    console.log('✅ Upload bem-sucedido!')

    // Download para verificar
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from(BUCKET_NAME)
      .download('test-rls-config.txt')

    if (downloadError) {
      console.error('❌ Erro no download após upload:', downloadError)
      return false
    }

    console.log('✅ Download após upload bem-sucedido!')

    // Limpar arquivo de teste
    const { error: deleteError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(['test-rls-config.txt'])

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

async function testImageUpload() {
  try {
    console.log('\n🖼️ Testando upload de imagem...')
    
    // Criar uma imagem de teste simples (1x1 pixel PNG)
    const pngData = new Uint8Array([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 pixel
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, // IHDR data
      0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
      0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // IDAT data
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82 // IEND chunk
    ])
    
    const testImage = new File([pngData], 'test-image-rls.png', { type: 'image/png' })
    
    // Upload da imagem
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload('test-image-rls.png', testImage)

    if (uploadError) {
      console.error('❌ Erro no upload da imagem:', uploadError)
      return false
    }

    console.log('✅ Upload de imagem bem-sucedido!')

    // Gerar URL pública
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl('test-image-rls.png')

    console.log(`   URL da imagem: ${urlData.publicUrl}`)

    // Testar acesso à imagem
    try {
      const response = await fetch(urlData.publicUrl, { method: 'HEAD' })
      console.log(`✅ Imagem acessível (Status: ${response.status})`)
      console.log(`   Content-Type: ${response.headers.get('content-type')}`)
    } catch (error) {
      console.log(`⚠️  Imagem pode não estar acessível: ${error.message}`)
    }

    // Limpar
    const { error: deleteError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(['test-image-rls.png'])

    if (deleteError) {
      console.error('❌ Erro ao remover imagem:', deleteError)
    } else {
      console.log('✅ Imagem removida!')
    }

    return true
  } catch (error) {
    console.error('❌ Erro no teste de imagem:', error)
    return false
  }
}

async function main() {
  console.log('🚀 Testando solução final...\n')
  
  console.log(`📋 Configuração atual:`)
  console.log(`   Bucket: ${BUCKET_NAME}`)
  console.log(`   URL: ${supabaseUrl}`)
  console.log('')
  
  const bucketAccess = await testBucketAccess()
  if (!bucketAccess) {
    console.log('\n❌ Bucket não acessível. Verifique as políticas RLS.')
    return
  }

  const fileDownload = await testFileDownload()
  if (!fileDownload) {
    console.log('\n❌ Download de arquivos falhou.')
    return
  }

  const fileUpload = await testFileUpload()
  if (!fileUpload) {
    console.log('\n❌ Upload de arquivos falhou.')
    return
  }

  const imageUpload = await testImageUpload()
  if (!imageUpload) {
    console.log('\n❌ Upload de imagens falhou.')
    return
  }

  console.log('\n🎉 TODOS OS TESTES PASSARAM!')
  console.log('\n✅ Solução implementada com sucesso!')
  console.log('✅ Bucket acessível')
  console.log('✅ Download funcionando')
  console.log('✅ Upload funcionando')
  console.log('✅ Upload de imagens funcionando')
  console.log('\n💡 Agora você pode:')
  console.log('1. Fazer upload de imagens em procedimentos')
  console.log('2. Visualizar as imagens na interface')
  console.log('3. Fazer download das imagens')
  console.log('4. Usar todas as funcionalidades normalmente')
}

// Executar script
if (require.main === module) {
  main().catch(console.error)
}

module.exports = {
  testBucketAccess,
  testFileDownload,
  testFileUpload,
  testImageUpload
}
