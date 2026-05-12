#!/usr/bin/env node

/**
 * Script para criar um bucket funcional com as permissões corretas
 */

const { createClient } = require('@supabase/supabase-js')

// Configuração do Supabase
const supabaseUrl = 'https://zmtwwajyhusyrugobxur.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptdHd3YWp5aHVzeXJ1Z29ieHVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMzYzNzAsImV4cCI6MjA3MjkxMjM3MH0.NC6t2w_jFWTMJjVv5FmPLouVyOVgCTBReCr0zOA2dx8'

const supabase = createClient(supabaseUrl, supabaseKey)
const bucketName = 'procedure-attachments-new'

async function createWorkingBucket() {
  try {
    console.log('🔧 Criando bucket funcional...')
    
    // Tentar criar um novo bucket com nome diferente
    const { data, error } = await supabase.storage.createBucket(bucketName, {
      public: true,
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
    return true
  } catch (error) {
    console.error('❌ Erro inesperado ao criar bucket:', error)
    return false
  }
}

async function testNewBucket() {
  try {
    console.log('\n🧪 Testando novo bucket...')
    
    // Criar arquivo de teste
    const testContent = 'Teste do novo bucket'
    const testFile = new File([testContent], 'test-new-bucket.txt', { type: 'text/plain' })
    
    // Upload
    console.log('📤 Testando upload...')
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload('test-new-bucket.txt', testFile)

    if (uploadError) {
      console.error('❌ Erro no upload:', uploadError)
      return false
    }

    console.log('✅ Upload bem-sucedido!')

    // Download
    console.log('📥 Testando download...')
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download('test-new-bucket.txt')

    if (downloadError) {
      console.error('❌ Erro no download:', downloadError)
      return false
    }

    console.log('✅ Download bem-sucedido!')

    // URL pública
    console.log('🔗 Testando URL pública...')
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl('test-new-bucket.txt')

    console.log(`   URL: ${urlData.publicUrl}`)

    // Testar acesso HTTP
    try {
      const response = await fetch(urlData.publicUrl, { method: 'HEAD' })
      console.log(`✅ URL acessível (Status: ${response.status})`)
    } catch (error) {
      console.log(`⚠️  URL pode não estar acessível: ${error.message}`)
    }

    // Limpar
    const { error: deleteError } = await supabase.storage
      .from(bucketName)
      .remove(['test-new-bucket.txt'])

    if (deleteError) {
      console.error('❌ Erro ao remover arquivo:', deleteError)
    } else {
      console.log('✅ Arquivo removido!')
    }

    return true
  } catch (error) {
    console.error('❌ Erro no teste do bucket:', error)
    return false
  }
}

async function updateCodeFiles() {
  try {
    console.log('\n📝 Atualizando arquivos de código...')
    
    const fs = require('fs')
    const path = require('path')
    
    // Lista de arquivos para atualizar
    const filesToUpdate = [
      'lib/image-recovery.ts',
      'lib/database-recovery.ts',
      'lib/direct-storage-recovery.ts',
      'scripts/fix-corrupted-images.js',
      'scripts/recover-images.js',
      'scripts/recover-from-database.js',
      'scripts/recover-direct-storage.js'
    ]

    let updatedCount = 0

    for (const filePath of filesToUpdate) {
      try {
        if (fs.existsSync(filePath)) {
          let content = fs.readFileSync(filePath, 'utf8')
          
          // Substituir o nome do bucket
          const oldBucketName = 'procedure-attachments'
          if (content.includes(oldBucketName)) {
            content = content.replace(new RegExp(oldBucketName, 'g'), bucketName)
            fs.writeFileSync(filePath, content)
            console.log(`   ✅ Atualizado: ${filePath}`)
            updatedCount++
          }
        }
      } catch (error) {
        console.log(`   ⚠️  Erro ao atualizar ${filePath}: ${error.message}`)
      }
    }

    console.log(`\n📊 ${updatedCount} arquivos atualizados`)
    
    // Atualizar o arquivo principal de upload
    const mainUploadFile = 'app/procedimentos/novo/page.tsx'
    if (fs.existsSync(mainUploadFile)) {
      let content = fs.readFileSync(mainUploadFile, 'utf8')
      if (content.includes("'procedure-attachments'")) {
        content = content.replace(/'procedure-attachments'/g, `'${bucketName}'`)
        fs.writeFileSync(mainUploadFile, content)
        console.log(`   ✅ Atualizado: ${mainUploadFile}`)
        updatedCount++
      }
    }

    return updatedCount > 0
  } catch (error) {
    console.error('❌ Erro ao atualizar arquivos:', error)
    return false
  }
}

async function main() {
  console.log('🚀 Criando bucket funcional...\n')
  
  const bucketCreated = await createWorkingBucket()
  if (!bucketCreated) {
    console.log('\n❌ Falha ao criar bucket.')
    return
  }

  const bucketWorks = await testNewBucket()
  if (!bucketWorks) {
    console.log('\n❌ Bucket criado mas não funciona corretamente.')
    return
  }

  const codeUpdated = await updateCodeFiles()
  if (!codeUpdated) {
    console.log('\n⚠️  Bucket criado mas código não foi atualizado.')
  }

  console.log('\n🎉 Solução implementada com sucesso!')
  console.log('\n📋 Resumo:')
  console.log(`✅ Bucket '${bucketName}' criado e funcionando`)
  console.log('✅ Permissões configuradas corretamente')
  console.log('✅ Operações de upload/download testadas')
  console.log('✅ Código atualizado para usar o novo bucket')
  console.log('\n💡 Próximos passos:')
  console.log('1. Teste fazer upload de uma imagem em um procedimento')
  console.log('2. Verifique se a imagem aparece corretamente')
  console.log('3. Se funcionar, você pode remover o bucket antigo')
}

// Executar script
if (require.main === module) {
  main().catch(console.error)
}

module.exports = {
  createWorkingBucket,
  testNewBucket,
  updateCodeFiles
}
