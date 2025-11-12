#!/usr/bin/env node

/**
 * Script de monitoramento para verificar arquivos corrompidos no Supabase Storage
 * 
 * Este script pode ser executado periodicamente para detectar novos arquivos corrompidos
 * e alertar sobre problemas de upload.
 */

const { createClient } = require('@supabase/supabase-js')

// Funções utilitárias (copiadas para evitar dependência de TypeScript)
function getCorrectMimeType(filename) {
  const ext = filename.toLowerCase().split('.').pop()
  
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'gif':
      return 'image/gif'
    case 'webp':
      return 'image/webp'
    case 'bmp':
      return 'image/bmp'
    case 'svg':
      return 'image/svg+xml'
    case 'ico':
      return 'image/x-icon'
    case 'tiff':
    case 'tif':
      return 'image/tiff'
    case 'pdf':
      return 'application/pdf'
    case 'doc':
      return 'application/msword'
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    case 'xls':
      return 'application/vnd.ms-excel'
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    case 'txt':
      return 'text/plain'
    case 'csv':
      return 'text/csv'
    case 'zip':
      return 'application/zip'
    case 'mp4':
      return 'video/mp4'
    case 'mp3':
      return 'audio/mpeg'
    default:
      return 'application/octet-stream'
  }
}

function isImageFile(filename) {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.ico', '.tiff', '.tif']
  return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext))
}

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

async function checkForCorruptedFiles() {
  try {
    console.log('🔍 Verificando arquivos corrompidos...')
    
    const { data: files, error } = await supabase.storage
      .from(bucketName)
      .list('', {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'desc' }
      })

    if (error) {
      console.error('❌ Erro ao listar arquivos:', error)
      return { corrupted: [], stats: { total: 0, corrupted: 0, healthy: 0 } }
    }

    const corruptedFiles = []
    const imageFiles = []
    const allFiles = files || []

    // Filtrar apenas arquivos de imagem
    for (const file of allFiles) {
      if (isImageFile(file.name)) {
        imageFiles.push(file)
        
        const currentMimeType = file.metadata?.mimetype || 'unknown'
        const expectedMimeType = getCorrectMimeType(file.name)
        
        if (currentMimeType !== expectedMimeType) {
          corruptedFiles.push({
            name: file.name,
            path: file.name,
            size: file.metadata?.size || 0,
            currentMimeType,
            expectedMimeType,
            lastModified: file.updated_at || file.created_at || ''
          })
        }
      }
    }

    const stats = {
      total: imageFiles.length,
      corrupted: corruptedFiles.length,
      healthy: imageFiles.length - corruptedFiles.length
    }

    return { corrupted: corruptedFiles, stats }
  } catch (error) {
    console.error('❌ Erro ao verificar arquivos corrompidos:', error)
    return { corrupted: [], stats: { total: 0, corrupted: 0, healthy: 0 } }
  }
}

async function generateReport() {
  const { corrupted, stats } = await checkForCorruptedFiles()
  
  console.log('\n📊 Relatório de Monitoramento de Arquivos')
  console.log('=' .repeat(50))
  console.log(`📁 Total de imagens: ${stats.total}`)
  console.log(`✅ Arquivos saudáveis: ${stats.healthy}`)
  console.log(`❌ Arquivos corrompidos: ${stats.corrupted}`)
  
  if (stats.corrupted > 0) {
    console.log('\n⚠️  ARQUIVOS CORROMPIDOS ENCONTRADOS:')
    console.log('-'.repeat(50))
    
    corrupted.forEach((file, index) => {
      console.log(`${index + 1}. ${file.name}`)
      console.log(`   Tamanho: ${formatFileSize(file.size)}`)
      console.log(`   Tipo atual: ${file.currentMimeType}`)
      console.log(`   Tipo esperado: ${file.expectedMimeType}`)
      console.log(`   Modificado: ${new Date(file.lastModified).toLocaleString('pt-BR')}`)
      console.log('')
    })
    
    console.log('💡 Execute o script de correção:')
    console.log('   node scripts/fix-corrupted-images.js')
    
    // Retornar código de erro para scripts de CI/CD
    process.exit(1)
  } else {
    console.log('\n✅ Todos os arquivos estão saudáveis!')
    process.exit(0)
  }
}

// Função principal
async function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  switch (command) {
    case '--report':
      await generateReport()
      break
      
    case '--check':
      const { corrupted, stats } = await checkForCorruptedFiles()
      
      if (corrupted.length === 0) {
        console.log('✅ Nenhum arquivo corrompido encontrado!')
        console.log(`📊 Estatísticas: ${stats.total} total, ${stats.healthy} saudáveis`)
      } else {
        console.log(`❌ ${corrupted.length} arquivos corrompidos encontrados!`)
        console.log('Execute --report para ver detalhes')
      }
      break
      
    default:
      console.log(`
🔍 Script de Monitoramento de Arquivos Corrompidos

Uso:
  node scripts/monitor-corrupted-files.js --check     # Verificação rápida
  node scripts/monitor-corrupted-files.js --report    # Relatório detalhado

Exemplos:
  node scripts/monitor-corrupted-files.js --check
  node scripts/monitor-corrupted-files.js --report

Este script pode ser usado em:
  - CI/CD pipelines
  - Cron jobs para monitoramento
  - Verificação manual
      `)
  }
}

// Executar script
if (require.main === module) {
  main().catch(console.error)
}

module.exports = {
  checkForCorruptedFiles,
  generateReport
}
