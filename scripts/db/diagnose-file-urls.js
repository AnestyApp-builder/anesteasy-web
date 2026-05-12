#!/usr/bin/env node

/**
 * Script para diagnosticar problemas com URLs de arquivos no Supabase Storage
 * 
 * Este script verifica:
 * 1. URLs dos anexos no banco de dados
 * 2. Se os arquivos existem no storage
 * 3. Se as URLs estão corretas
 * 4. Se há problemas de permissão
 */

const { createClient } = require('@supabase/supabase-js')

// Configuração do Supabase
const supabaseUrl = 'https://zmtwwajyhusyrugobxur.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptdHd3YWp5aHVzeXJ1Z29ieHVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMzYzNzAsImV4cCI6MjA3MjkxMjM3MH0.NC6t2w_jFWTMJjVv5FmPLouVyOVgCTBReCr0zOA2dx8'

const supabase = createClient(supabaseUrl, supabaseKey)
const bucketName = 'procedure-attachments'

// Funções auxiliares
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function extractFilePathFromUrl(url) {
  try {
    // URL do Supabase Storage: https://zmtwwajyhusyrugobxur.supabase.co/storage/v1/object/public/procedure-attachments/path/to/file.jpg
    const urlParts = url.split('/storage/v1/object/public/')
    if (urlParts.length === 2) {
      const pathPart = urlParts[1]
      const bucketPrefix = `${bucketName}/`
      if (pathPart.startsWith(bucketPrefix)) {
        return pathPart.substring(bucketPrefix.length)
      }
    }
    return null
  } catch (error) {
    console.error('Erro ao extrair caminho da URL:', error)
    return null
  }
}

async function checkAttachmentUrls() {
  try {
    console.log('🔍 Verificando URLs dos anexos no banco de dados...')
    
    const { data: attachments, error } = await supabase
      .from('procedure_attachments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50) // Limitar para não sobrecarregar

    if (error) {
      console.error('❌ Erro ao buscar anexos:', error)
      return []
    }

    console.log(`📋 Encontrados ${attachments.length} anexos para verificar\n`)

    const results = []

    for (const attachment of attachments || []) {
      console.log(`🔍 Verificando: ${attachment.file_name}`)
      
      const filePath = extractFilePathFromUrl(attachment.file_url)
      
      if (!filePath) {
        console.log(`❌ URL inválida: ${attachment.file_url}`)
        results.push({
          attachment,
          status: 'invalid_url',
          error: 'URL inválida'
        })
        continue
      }

      console.log(`   Caminho extraído: ${filePath}`)

      // Verificar se o arquivo existe no storage
      try {
        const { data: fileData, error: downloadError } = await supabase.storage
          .from(bucketName)
          .download(filePath)

        if (downloadError) {
          console.log(`❌ Erro ao baixar arquivo: ${downloadError.message}`)
          results.push({
            attachment,
            status: 'download_error',
            error: downloadError.message,
            filePath
          })
        } else if (fileData) {
          console.log(`✅ Arquivo encontrado: ${formatFileSize(fileData.size)}`)
          results.push({
            attachment,
            status: 'ok',
            filePath,
            fileSize: fileData.size,
            mimeType: fileData.type
          })
        }
      } catch (error) {
        console.log(`❌ Erro inesperado: ${error.message}`)
        results.push({
          attachment,
          status: 'unexpected_error',
          error: error.message,
          filePath
        })
      }

      console.log('')
    }

    return results
  } catch (error) {
    console.error('❌ Erro ao verificar URLs dos anexos:', error)
    return []
  }
}

async function checkStorageStructure() {
  try {
    console.log('🔍 Verificando estrutura do storage...')
    
    const { data: files, error } = await supabase.storage
      .from(bucketName)
      .list('', {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' }
      })

    if (error) {
      console.error('❌ Erro ao listar arquivos do storage:', error)
      return
    }

    console.log(`📁 Encontrados ${files.length} arquivos no storage:\n`)

    files.forEach((file, index) => {
      console.log(`${index + 1}. ${file.name}`)
      console.log(`   Tamanho: ${formatFileSize(file.metadata?.size || 0)}`)
      console.log(`   Tipo: ${file.metadata?.mimetype || 'unknown'}`)
      console.log(`   Modificado: ${new Date(file.updated_at).toLocaleString('pt-BR')}`)
      console.log('')
    })
  } catch (error) {
    console.error('❌ Erro ao verificar estrutura do storage:', error)
  }
}

async function testPublicUrlGeneration() {
  try {
    console.log('🔍 Testando geração de URLs públicas...')
    
    // Listar alguns arquivos para testar
    const { data: files, error } = await supabase.storage
      .from(bucketName)
      .list('', { limit: 5 })

    if (error) {
      console.error('❌ Erro ao listar arquivos:', error)
      return
    }

    for (const file of files || []) {
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(file.name)

      console.log(`📄 Arquivo: ${file.name}`)
      console.log(`🔗 URL pública: ${urlData.publicUrl}`)
      
      // Testar se a URL é acessível
      try {
        const response = await fetch(urlData.publicUrl, { method: 'HEAD' })
        console.log(`✅ Status HTTP: ${response.status}`)
        console.log(`📋 Content-Type: ${response.headers.get('content-type')}`)
      } catch (error) {
        console.log(`❌ Erro ao acessar URL: ${error.message}`)
      }
      console.log('')
    }
  } catch (error) {
    console.error('❌ Erro ao testar URLs públicas:', error)
  }
}

async function generateReport(results) {
  console.log('\n📊 RELATÓRIO DE DIAGNÓSTICO')
  console.log('=' .repeat(50))
  
  const statusCounts = results.reduce((acc, result) => {
    acc[result.status] = (acc[result.status] || 0) + 1
    return acc
  }, {})

  console.log('📈 Estatísticas:')
  Object.entries(statusCounts).forEach(([status, count]) => {
    const emoji = status === 'ok' ? '✅' : '❌'
    console.log(`   ${emoji} ${status}: ${count}`)
  })

  const problems = results.filter(r => r.status !== 'ok')
  
  if (problems.length > 0) {
    console.log('\n⚠️  PROBLEMAS ENCONTRADOS:')
    console.log('-'.repeat(50))
    
    problems.forEach((problem, index) => {
      console.log(`${index + 1}. ${problem.attachment.file_name}`)
      console.log(`   Status: ${problem.status}`)
      console.log(`   Erro: ${problem.error}`)
      console.log(`   URL: ${problem.attachment.file_url}`)
      if (problem.filePath) {
        console.log(`   Caminho: ${problem.filePath}`)
      }
      console.log('')
    })
  } else {
    console.log('\n✅ Todos os anexos estão funcionando corretamente!')
  }
}

// Função principal
async function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  switch (command) {
    case '--urls':
      const results = await checkAttachmentUrls()
      await generateReport(results)
      break
      
    case '--storage':
      await checkStorageStructure()
      break
      
    case '--test-urls':
      await testPublicUrlGeneration()
      break
      
    case '--full':
      console.log('🚀 Executando diagnóstico completo...\n')
      
      await checkStorageStructure()
      console.log('\n' + '='.repeat(50) + '\n')
      
      const results2 = await checkAttachmentUrls()
      await generateReport(results2)
      
      console.log('\n' + '='.repeat(50) + '\n')
      await testPublicUrlGeneration()
      break
      
    default:
      console.log(`
🔍 Script de Diagnóstico de URLs de Arquivos

Uso:
  node scripts/diagnose-file-urls.js --urls        # Verificar URLs dos anexos
  node scripts/diagnose-file-urls.js --storage     # Verificar estrutura do storage
  node scripts/diagnose-file-urls.js --test-urls   # Testar geração de URLs
  node scripts/diagnose-file-urls.js --full        # Diagnóstico completo

Exemplos:
  node scripts/diagnose-file-urls.js --full
  node scripts/diagnose-file-urls.js --urls
      `)
  }
}

// Executar script
if (require.main === module) {
  main().catch(console.error)
}

module.exports = {
  checkAttachmentUrls,
  checkStorageStructure,
  testPublicUrlGeneration
}
