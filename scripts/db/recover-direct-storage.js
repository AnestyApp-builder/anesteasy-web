#!/usr/bin/env node

/**
 * Script para recuperação direta de imagens corrompidas do Supabase Storage
 * 
 * Esta abordagem é mais eficiente pois trabalha diretamente com o storage
 * sem precisar consultar o banco de dados primeiro.
 * 
 * Uso:
 * node scripts/recover-direct-storage.js --stats                    # Mostrar estatísticas do storage
 * node scripts/recover-direct-storage.js --list                     # Listar arquivos corrompidos
 * node scripts/recover-direct-storage.js --check <path>             # Verificar status de um arquivo
 * node scripts/recover-direct-storage.js --recover-all              # Recuperar todos os arquivos corrompidos
 * node scripts/recover-direct-storage.js --recover-file <path>      # Recuperar arquivo específico
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

function getExpectedMimeType(filename) {
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
    default:
      return 'image/jpeg'
  }
}

function isJPEG(bytes) {
  return bytes.length >= 3 && 
         bytes[0] === 0xFF && 
         bytes[1] === 0xD8 && 
         bytes[2] === 0xFF
}

function isPNG(bytes) {
  return bytes.length >= 8 &&
         bytes[0] === 0x89 &&
         bytes[1] === 0x50 &&
         bytes[2] === 0x4E &&
         bytes[3] === 0x47 &&
         bytes[4] === 0x0D &&
         bytes[5] === 0x0A &&
         bytes[6] === 0x1A &&
         bytes[7] === 0x0A
}

function isGIF(bytes) {
  return bytes.length >= 6 &&
         ((bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) ||
          (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46))
}

function isWebP(bytes) {
  return bytes.length >= 12 &&
         bytes[0] === 0x52 &&
         bytes[1] === 0x49 &&
         bytes[2] === 0x46 &&
         bytes[3] === 0x46 &&
         bytes[8] === 0x57 &&
         bytes[9] === 0x45 &&
         bytes[10] === 0x42 &&
         bytes[11] === 0x50
}

function isBMP(bytes) {
  return bytes.length >= 2 &&
         bytes[0] === 0x42 &&
         bytes[1] === 0x4D
}

async function detectRealMimeType(filePath) {
  try {
    const { data: fileData, error } = await supabase.storage
      .from(bucketName)
      .download(filePath)

    if (error || !fileData) {
      return 'application/octet-stream'
    }

    const arrayBuffer = await fileData.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer.slice(0, 12))

    if (isJPEG(uint8Array)) return 'image/jpeg'
    if (isPNG(uint8Array)) return 'image/png'
    if (isGIF(uint8Array)) return 'image/gif'
    if (isWebP(uint8Array)) return 'image/webp'
    if (isBMP(uint8Array)) return 'image/bmp'

    return getExpectedMimeType(filePath)
  } catch (error) {
    console.error('Erro ao detectar tipo MIME:', error)
    return getExpectedMimeType(filePath)
  }
}

async function findCorruptedFiles() {
  try {
    console.log('🔍 Buscando arquivos corrompidos no storage...')
    
    const { data: files, error } = await supabase.storage
      .from(bucketName)
      .list('', {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'desc' }
      })

    if (error) {
      console.error('❌ Erro ao listar arquivos:', error)
      return []
    }

    const corruptedFiles = []
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']

    for (const file of files || []) {
      // Verificar se é um arquivo de imagem baseado na extensão
      const hasImageExtension = imageExtensions.some(ext => 
        file.name.toLowerCase().endsWith(ext)
      )

      if (hasImageExtension) {
        // Verificar se o tipo MIME está incorreto
        const currentMimeType = file.metadata?.mimetype || 'unknown'
        
        if (!currentMimeType.startsWith('image/')) {
          corruptedFiles.push(file)
        }
      }
    }

    return corruptedFiles
  } catch (error) {
    console.error('❌ Erro ao buscar arquivos corrompidos:', error)
    return []
  }
}

async function getStorageStats() {
  const corruptedFiles = await findCorruptedFiles()
  
  // Para obter o total, precisamos listar todos os arquivos
  const { data: allFiles, error } = await supabase.storage
    .from(bucketName)
    .list('', { limit: 1000 })

  if (error) {
    console.error('❌ Erro ao obter estatísticas:', error)
    return { total: 0, corrupted: 0, healthy: 0 }
  }

  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']
  const imageFiles = (allFiles || []).filter(file => 
    imageExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
  )

  return {
    total: imageFiles.length,
    corrupted: corruptedFiles.length,
    healthy: imageFiles.length - corruptedFiles.length
  }
}

async function checkFileStatus(filePath) {
  try {
    console.log(`🔍 Verificando status do arquivo: ${filePath}`)
    
    const { data: fileData, error } = await supabase.storage
      .from(bucketName)
      .download(filePath)

    if (error || !fileData) {
      console.log('❌ Arquivo não encontrado ou erro ao baixar')
      return
    }

    const currentMimeType = fileData.type
    const expectedMimeType = getExpectedMimeType(filePath)
    const realMimeType = await detectRealMimeType(filePath)
    
    console.log(`📋 Status do arquivo: ${filePath}`)
    console.log(`   Tipo atual: ${currentMimeType}`)
    console.log(`   Tipo esperado: ${expectedMimeType}`)
    console.log(`   Tipo real detectado: ${realMimeType}`)
    console.log(`   Tamanho: ${formatFileSize(fileData.size)}`)
    console.log(`   Corrompido: ${!currentMimeType.startsWith('image/') ? 'Sim' : 'Não'}`)
    
  } catch (error) {
    console.error('❌ Erro ao verificar arquivo:', error)
  }
}

async function recoverFileDirectly(filePath) {
  try {
    console.log(`🔄 Recuperando arquivo diretamente: ${filePath}`)
    
    // 1. Baixar o arquivo original
    const { data: originalFile, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(filePath)

    if (downloadError || !originalFile) {
      return {
        success: false,
        originalPath: filePath,
        error: `Erro ao baixar arquivo: ${downloadError?.message}`
      }
    }

    // 2. Detectar o tipo MIME real
    const realMimeType = await detectRealMimeType(filePath)
    console.log(`📋 Tipo MIME detectado: ${realMimeType}`)

    // 3. Criar um novo arquivo com o tipo MIME correto
    const correctedFile = new File([originalFile], originalFile.name, {
      type: realMimeType
    })

    // 4. Gerar novo nome para evitar conflitos
    const pathParts = filePath.split('/')
    const fileName = pathParts[pathParts.length - 1]
    const nameWithoutExt = fileName.split('.')[0]
    const ext = fileName.split('.').pop()
    const newFileName = `${nameWithoutExt}-fixed.${ext}`
    const newPath = pathParts.slice(0, -1).concat(newFileName).join('/')

    // 5. Fazer upload do arquivo corrigido
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(newPath, correctedFile, {
        contentType: realMimeType,
        upsert: true
      })

    if (uploadError) {
      return {
        success: false,
        originalPath: filePath,
        error: `Erro ao fazer upload: ${uploadError.message}`
      }
    }

    console.log(`✅ Arquivo recuperado: ${newPath}`)
    return {
      success: true,
      originalPath: filePath,
      newPath: newPath,
      recoveredMimeType: realMimeType,
      originalMimeType: originalFile.type,
      fileSize: originalFile.size
    }
  } catch (error) {
    return {
      success: false,
      originalPath: filePath,
      error: `Erro interno: ${error}`
    }
  }
}

async function updateDatabaseRecords(recoveryResults) {
  console.log('🗄️ Atualizando registros no banco de dados...')
  
  for (const result of recoveryResults) {
    if (result.success && result.newPath) {
      try {
        // Obter URL pública do novo arquivo
        const { data: urlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(result.newPath)

        // Buscar anexos que referenciam o arquivo original
        const { data: attachments, error: selectError } = await supabase
          .from('procedure_attachments')
          .select('*')
          .like('file_url', `%${result.originalPath}%`)

        if (selectError) {
          console.error('❌ Erro ao buscar anexos:', selectError)
          continue
        }

        // Atualizar cada anexo encontrado
        for (const attachment of attachments || []) {
          const { error: updateError } = await supabase
            .from('procedure_attachments')
            .update({
              file_url: urlData.publicUrl,
              file_type: result.recoveredMimeType || attachment.file_type,
              updated_at: new Date().toISOString()
            })
            .eq('id', attachment.id)

          if (updateError) {
            console.error('❌ Erro ao atualizar anexo:', updateError)
          } else {
            console.log(`✅ Anexo atualizado: ${attachment.id}`)
          }
        }
      } catch (error) {
        console.error('❌ Erro ao atualizar registros do banco:', error)
      }
    }
  }
}

// Função principal
async function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  switch (command) {
    case '--stats':
      const stats = await getStorageStats()
      
      console.log('\n📊 Estatísticas do Storage:\n')
      console.log(`📁 Total de imagens: ${stats.total}`)
      console.log(`❌ Corrompidas: ${stats.corrupted}`)
      console.log(`✅ Saudáveis: ${stats.healthy}`)
      
      if (stats.corrupted > 0) {
        console.log(`\n⚠️  ${stats.corrupted} arquivos precisam ser recuperados`)
      } else {
        console.log(`\n✅ Todos os arquivos estão saudáveis!`)
      }
      break

    case '--list':
      const corruptedFiles = await findCorruptedFiles()
      
      if (corruptedFiles.length === 0) {
        console.log('✅ Nenhum arquivo corrompido encontrado!')
        return
      }

      console.log(`\n📋 Encontrados ${corruptedFiles.length} arquivos corrompidos:\n`)
      
      corruptedFiles.forEach((file, index) => {
        console.log(`${index + 1}. ${file.name}`)
        console.log(`   ID: ${file.id}`)
        console.log(`   Tamanho: ${formatFileSize(file.metadata?.size || 0)}`)
        console.log(`   Tipo atual: ${file.metadata?.mimetype || 'unknown'}`)
        console.log(`   Tipo esperado: ${getExpectedMimeType(file.name)}`)
        console.log(`   Modificado: ${new Date(file.updated_at).toLocaleString('pt-BR')}`)
        console.log('')
      })
      break

    case '--check':
      const filePath = args[1]
      if (!filePath) {
        console.error('❌ Caminho do arquivo é obrigatório')
        process.exit(1)
      }

      await checkFileStatus(filePath)
      break

    case '--recover-file':
      const singleFilePath = args[1]
      if (!singleFilePath) {
        console.error('❌ Caminho do arquivo é obrigatório')
        process.exit(1)
      }

      const singleResult = await recoverFileDirectly(singleFilePath)
      
      if (singleResult.success) {
        await updateDatabaseRecords([singleResult])
        console.log('✅ Arquivo recuperado com sucesso!')
        console.log(`   Nova URL: ${singleResult.newPath}`)
      } else {
        console.error('❌ Erro ao recuperar arquivo:', singleResult.error)
      }
      break

    case '--recover-all':
      console.log('🚀 Iniciando recuperação direta de todos os arquivos corrompidos...\n')
      
      const allCorruptedFiles = await findCorruptedFiles()
      
      if (allCorruptedFiles.length === 0) {
        console.log('✅ Nenhum arquivo corrompido encontrado!')
        return
      }

      console.log(`📋 Encontrados ${allCorruptedFiles.length} arquivos para recuperar\n`)

      const allResults = []
      
      for (const file of allCorruptedFiles) {
        const result = await recoverFileDirectly(file.name)
        allResults.push(result)
        
        // Pequena pausa para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      // Atualizar registros no banco de dados
      await updateDatabaseRecords(allResults)

      // Mostrar resumo
      const successful = allResults.filter(r => r.success).length
      const failed = allResults.filter(r => !r.success).length

      console.log('\n📊 Resumo da recuperação direta:')
      console.log(`✅ Sucessos: ${successful}`)
      console.log(`❌ Falhas: ${failed}`)
      console.log(`📋 Total: ${allResults.length}`)

      if (failed > 0) {
        console.log('\n❌ Arquivos com erro:')
        allResults.filter(r => !r.success).forEach(result => {
          console.log(`   ${result.originalPath}: ${result.error}`)
        })
      }
      break

    default:
      console.log(`
🔧 Script de Recuperação Direta do Storage

Esta abordagem trabalha diretamente com o Supabase Storage para máxima eficiência.

Uso:
  node scripts/recover-direct-storage.js --stats                    # Mostrar estatísticas do storage
  node scripts/recover-direct-storage.js --list                     # Listar arquivos corrompidos
  node scripts/recover-direct-storage.js --check <path>             # Verificar status de um arquivo
  node scripts/recover-direct-storage.js --recover-all              # Recuperar todos os arquivos corrompidos
  node scripts/recover-direct-storage.js --recover-file <path>      # Recuperar arquivo específico

Exemplos:
  node scripts/recover-direct-storage.js --stats
  node scripts/recover-direct-storage.js --list
  node scripts/recover-direct-storage.js --check "user123/proc456/image.jpg"
  node scripts/recover-direct-storage.js --recover-file "user123/proc456/image.jpg"
  node scripts/recover-direct-storage.js --recover-all

Vantagens desta abordagem:
  ✅ Trabalha diretamente com o storage
  ✅ Mais eficiente para grandes volumes
  ✅ Não depende do banco de dados
  ✅ Análise completa de todos os arquivos
      `)
  }
}

// Executar script
if (require.main === module) {
  main().catch(console.error)
}

module.exports = {
  findCorruptedFiles,
  getStorageStats,
  checkFileStatus,
  recoverFileDirectly,
  updateDatabaseRecords
}
