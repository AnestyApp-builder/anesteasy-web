#!/usr/bin/env node

/**
 * Script para encontrar o nome real do bucket
 */

const { createClient } = require('@supabase/supabase-js')

// Configuração do Supabase
const supabaseUrl = 'https://zmtwwajyhusyrugobxur.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptdHd3YWp5aHVzeXJ1Z29ieHVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMzYzNzAsImV4cCI6MjA3MjkxMjM3MH0.NC6t2w_jFWTMJjVv5FmPLouVyOVgCTBReCr0zOA2dx8'

const supabase = createClient(supabaseUrl, supabaseKey)

async function findBuckets() {
  try {
    console.log('🔍 Listando todos os buckets disponíveis...')
    
    const { data: buckets, error } = await supabase.storage.listBuckets()
    
    if (error) {
      console.error('❌ Erro ao listar buckets:', error)
      return
    }

    console.log(`📁 Encontrados ${buckets.length} buckets:`)
    
    buckets.forEach((bucket, index) => {
      console.log(`\n${index + 1}. ${bucket.name}`)
      console.log(`   Público: ${bucket.public ? 'Sim' : 'Não'}`)
      console.log(`   Criado: ${new Date(bucket.created_at).toLocaleString('pt-BR')}`)
      console.log(`   ID: ${bucket.id}`)
    })

    // Verificar se há algum bucket que pode conter as imagens
    const possibleBuckets = buckets.filter(b => 
      b.name.includes('procedure') || 
      b.name.includes('attachment') ||
      b.name.includes('image') ||
      b.name.includes('file')
    )

    if (possibleBuckets.length > 0) {
      console.log('\n🎯 Buckets que podem conter as imagens:')
      possibleBuckets.forEach(bucket => {
        console.log(`   - ${bucket.name} (${bucket.public ? 'público' : 'privado'})`)
      })
    }

    // Testar cada bucket para ver se tem arquivos
    console.log('\n🔍 Verificando conteúdo de cada bucket...')
    
    for (const bucket of buckets) {
      try {
        console.log(`\n📁 Verificando bucket: ${bucket.name}`)
        
        const { data: files, error: filesError } = await supabase.storage
          .from(bucket.name)
          .list('', { limit: 10 })

        if (filesError) {
          console.log(`   ❌ Erro: ${filesError.message}`)
        } else if (files && files.length > 0) {
          console.log(`   ✅ Encontrados ${files.length} arquivos:`)
          files.forEach((file, index) => {
            console.log(`      ${index + 1}. ${file.name}`)
            console.log(`         Tipo: ${file.metadata?.mimetype || 'unknown'}`)
            console.log(`         Tamanho: ${file.metadata?.size || 0} bytes`)
          })
        } else {
          console.log(`   📂 Bucket vazio`)
        }
      } catch (error) {
        console.log(`   ❌ Erro inesperado: ${error.message}`)
      }
    }

  } catch (error) {
    console.error('❌ Erro na busca de buckets:', error)
  }
}

async function main() {
  console.log('🚀 Buscando buckets disponíveis...\n')
  
  await findBuckets()
  
  console.log('\n✅ Busca concluída!')
}

// Executar script
if (require.main === module) {
  main().catch(console.error)
}

module.exports = {
  findBuckets
}
