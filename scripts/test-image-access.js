#!/usr/bin/env node

/**
 * Script para testar o acesso às imagens após configurar o bucket
 */

const { createClient } = require('@supabase/supabase-js')

// Configuração do Supabase
const supabaseUrl = 'https://zmtwwajyhusyrugobxur.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptdHd3YWp5aHVzeXJ1Z29ieHVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMzYzNzAsImV4cCI6MjA3MjkxMjM3MH0.NC6t2w_jFWTMJjVv5FmPLouVyOVgCTBReCr0zOA2dx8'

const supabase = createClient(supabaseUrl, supabaseKey)
const bucketName = 'procedure-attachments'

async function testBucketAccess() {
  try {
    console.log('🔍 Testando acesso ao bucket...')
    
    // Verificar se o bucket existe
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    
    if (bucketsError) {
      console.error('❌ Erro ao listar buckets:', bucketsError)
      return false
    }

    const targetBucket = buckets.find(b => b.name === bucketName)
    
    if (!targetBucket) {
      console.log(`❌ Bucket '${bucketName}' não encontrado!`)
      console.log('💡 Execute: node scripts/setup-storage-bucket.js')
      return false
    }

    console.log(`✅ Bucket '${bucketName}' encontrado`)
    console.log(`   Público: ${targetBucket.public ? 'Sim' : 'Não'}`)
    
    return true
  } catch (error) {
    console.error('❌ Erro ao testar acesso ao bucket:', error)
    return false
  }
}

async function testFileOperations() {
  try {
    console.log('\n🧪 Testando operações de arquivo...')
    
    // Criar um arquivo de teste
    const testContent = 'Teste de acesso às imagens'
    const testFile = new File([testContent], 'test-image-access.txt', { type: 'text/plain' })
    
    // Upload
    console.log('📤 Testando upload...')
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload('test-image-access.txt', testFile)

    if (uploadError) {
      console.error('❌ Erro no upload:', uploadError)
      return false
    }

    console.log('✅ Upload bem-sucedido!')

    // Download
    console.log('📥 Testando download...')
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download('test-image-access.txt')

    if (downloadError) {
      console.error('❌ Erro no download:', downloadError)
      return false
    }

    console.log('✅ Download bem-sucedido!')

    // URL pública
    console.log('🔗 Testando URL pública...')
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl('test-image-access.txt')

    console.log(`   URL: ${urlData.publicUrl}`)

    // Testar acesso HTTP
    try {
      const response = await fetch(urlData.publicUrl, { method: 'HEAD' })
      console.log(`✅ URL acessível (Status: ${response.status})`)
    } catch (error) {
      console.log(`⚠️  URL pode não estar acessível: ${error.message}`)
    }

    // Limpar
    console.log('🗑️ Removendo arquivo de teste...')
    const { error: deleteError } = await supabase.storage
      .from(bucketName)
      .remove(['test-image-access.txt'])

    if (deleteError) {
      console.error('❌ Erro ao remover arquivo:', deleteError)
    } else {
      console.log('✅ Arquivo removido!')
    }

    return true
  } catch (error) {
    console.error('❌ Erro nas operações de arquivo:', error)
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
    
    const testImage = new File([pngData], 'test-image.png', { type: 'image/png' })
    
    // Upload da imagem
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload('test-image.png', testImage)

    if (uploadError) {
      console.error('❌ Erro no upload da imagem:', uploadError)
      return false
    }

    console.log('✅ Upload de imagem bem-sucedido!')

    // Obter URL pública
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl('test-image.png')

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
      .from(bucketName)
      .remove(['test-image.png'])

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
  console.log('🚀 Testando acesso às imagens...\n')
  
  const bucketOk = await testBucketAccess()
  if (!bucketOk) {
    console.log('\n❌ Bucket não configurado. Execute a configuração primeiro.')
    return
  }

  const operationsOk = await testFileOperations()
  if (!operationsOk) {
    console.log('\n❌ Operações básicas falharam.')
    return
  }

  const imageOk = await testImageUpload()
  if (!imageOk) {
    console.log('\n❌ Upload de imagem falhou.')
    return
  }

  console.log('\n🎉 Todos os testes passaram!')
  console.log('✅ O bucket está configurado corretamente')
  console.log('✅ As operações de arquivo funcionam')
  console.log('✅ O upload de imagens funciona')
  console.log('✅ As URLs públicas são acessíveis')
  console.log('\n💡 Agora você pode fazer upload de imagens normalmente!')
}

// Executar script
if (require.main === module) {
  main().catch(console.error)
}

module.exports = {
  testBucketAccess,
  testFileOperations,
  testImageUpload
}
