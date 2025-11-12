#!/usr/bin/env node

/**
 * Script para testar diferentes nomes de bucket
 */

const { createClient } = require('@supabase/supabase-js')

// Configuração do Supabase
const supabaseUrl = 'https://zmtwwajyhusyrugobxur.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptdHd3YWp5aHVzeXJ1Z29ieHVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMzYzNzAsImV4cCI6MjA3MjkxMjM3MH0.NC6t2w_jFWTMJjVv5FmPLouVyOVgCTBReCr0zOA2dx8'

const supabase = createClient(supabaseUrl, supabaseKey)

// Possíveis nomes de bucket baseados na imagem
const possibleBucketNames = [
  'procedure-attachments',
  'procedure-attach',
  'attachments',
  'files',
  'images',
  'uploads',
  'storage'
]

async function testBucketName(bucketName) {
  try {
    console.log(`🔍 Testando bucket: ${bucketName}`)
    
    // Tentar listar arquivos
    const { data: files, error } = await supabase.storage
      .from(bucketName)
      .list('', { limit: 10 })

    if (error) {
      console.log(`   ❌ Erro: ${error.message}`)
      return false
    }

    if (files && files.length > 0) {
      console.log(`   ✅ Encontrados ${files.length} arquivos:`)
      files.forEach((file, index) => {
        console.log(`      ${index + 1}. ${file.name}`)
        console.log(`         Tipo: ${file.metadata?.mimetype || 'unknown'}`)
        console.log(`         Tamanho: ${file.metadata?.size || 0} bytes`)
      })
      return true
    } else {
      console.log(`   📂 Bucket vazio`)
      return false
    }

  } catch (error) {
    console.log(`   ❌ Erro inesperado: ${error.message}`)
    return false
  }
}

async function testSpecificFiles(bucketName) {
  try {
    console.log(`\n🧪 Testando arquivos específicos no bucket: ${bucketName}`)
    
    // Arquivos que você viu na interface
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
          
          return true
        }
      } catch (error) {
        console.log(`   ❌ Erro: ${error.message}`)
      }
    }

    return false
  } catch (error) {
    console.error('❌ Erro no teste de arquivos específicos:', error)
    return false
  }
}

async function main() {
  console.log('🚀 Testando diferentes nomes de bucket...\n')
  
  let foundBucket = null
  
  for (const bucketName of possibleBucketNames) {
    const hasFiles = await testBucketName(bucketName)
    if (hasFiles) {
      foundBucket = bucketName
      break
    }
  }

  if (foundBucket) {
    console.log(`\n🎯 Bucket encontrado: ${foundBucket}`)
    
    // Testar arquivos específicos
    const filesAccessible = await testSpecificFiles(foundBucket)
    
    if (filesAccessible) {
      console.log('\n✅ Arquivos são acessíveis!')
      console.log('\n💡 Para corrigir o código, atualize o nome do bucket para:')
      console.log(`   const bucketName = '${foundBucket}'`)
    } else {
      console.log('\n⚠️  Bucket encontrado mas arquivos não são acessíveis')
      console.log('   Pode ser um problema de permissões RLS')
    }
  } else {
    console.log('\n❌ Nenhum bucket com arquivos encontrado')
    console.log('💡 Possíveis soluções:')
    console.log('1. Verificar se o bucket existe no Supabase Dashboard')
    console.log('2. Verificar permissões RLS')
    console.log('3. Usar Service Role Key para acessar')
  }
}

// Executar script
if (require.main === module) {
  main().catch(console.error)
}

module.exports = {
  testBucketName,
  testSpecificFiles
}
