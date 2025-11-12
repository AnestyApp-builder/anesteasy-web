#!/usr/bin/env node

/**
 * Script para recuperar imagens corrompidas baseado nos registros do banco de dados
 * 
 * Uso:
 * node scripts/recover-from-database.js --stats                    # Mostrar estatísticas
 * node scripts/recover-from-database.js --list                     # Listar anexos corrompidos
 * node scripts/recover-from-database.js --recover-all              # Recuperar todos os anexos corrompidos
 * node scripts/recover-from-database.js --recover-attachment <id>  # Recuperar anexo específico
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

function extractFilePathFromUrl(url) {
  try {
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

async function findImageAttachments() {
  try {
    console.log('🔍 Buscando anexos de imagem no banco de dados...')
    
    const { data: attachments, error } = await supabase
      .from('procedure_attachments')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Erro ao buscar anexos:', error)
      return []
    }

    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']
    
    return (attachments || []).filter(attachment => {
      const hasImageExtension = imageExtensions.some(ext => 
        attachment.file_name.toLowerCase().endsWith(ext)
      )
      
      return hasImageExtension || attachment.file_type.startsWith('image/')
    })
  } catch (error) {
    console.error('❌ Erro ao buscar anexos de imagem:', error)
    return []
  }
}

async function findCorruptedAttachments() {
  const allAttachments = await findImageAttachments()
  
  return allAttachments.filter(attachment => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']
    const hasImageExtension = imageExtensions.some(ext => 
      attachment.file_name.toLowerCase().endsWith(ext)
    )
    
    return hasImageExtension && !attachment.file_type.startsWith('image/')
  })
}

async function getAttachmentStats() {
  const allAttachments = await findImageAttachments()
  const corruptedAttachments = await findCorruptedAttachments()
  
  return {
    total: allAttachments.length,
    corrupted: corruptedAttachments.length,
    healthy: allAttachments.length - corruptedAttachments.length,
    corruptedList: corruptedAttachments
  }
}

async function recoverAttachment(attachment) {
  try {
    console.log(`🔄 Recuperando anexo: ${attachment.file_name} (ID: ${attachment.id})`)
    
    // 1. Extrair caminho do arquivo da URL
    const filePath = extractFilePathFromUrl(attachment.file_url)
    
    if (!filePath) {
      return {
        success: false,
        attachmentId: attachment.id,
        originalUrl: attachment.file_url,
        error: 'Não foi possível extrair o caminho do arquivo da URL'
      }
    }

    // 2. Baixar o arquivo original
    const { data: originalFile, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(filePath)

    if (downloadError || !originalFile) {
      return {
        success: false,
        attachmentId: attachment.id,
        originalUrl: attachment.file_url,
        error: `Erro ao baixar arquivo: ${downloadError?.message}`
      }
    }

    // 3. Detectar o tipo MIME real
    const realMimeType = await detectRealMimeType(filePath)
    console.log(`📋 Tipo MIME detectado: ${realMimeType}`)

    // 4. Criar um novo arquivo com o tipo MIME correto
    const correctedFile = new File([originalFile], originalFile.name, {
      type: realMimeType
    })

    // 5. Gerar novo nome para evitar conflitos
    const pathParts = filePath.split('/')
    const fileName = pathParts[pathParts.length - 1]
    const nameWithoutExt = fileName.split('.')[0]
    const ext = fileName.split('.').pop()
    const newFileName = `${nameWithoutExt}-recovered.${ext}`
    const newPath = pathParts.slice(0, -1).concat(newFileName).join('/')

    // 6. Fazer upload do arquivo corrigido
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(newPath, correctedFile, {
        contentType: realMimeType,
        upsert: true
      })

    if (uploadError) {
      return {
        success: false,
        attachmentId: attachment.id,
        originalUrl: attachment.file_url,
        error: `Erro ao fazer upload: ${uploadError.message}`
      }
    }

    // 7. Obter URL pública do novo arquivo
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(newPath)

    // 8. Atualizar registro no banco de dados
    const { error: updateError } = await supabase
      .from('procedure_attachments')
      .update({
        file_url: urlData.publicUrl,
        file_type: realMimeType,
        updated_at: new Date().toISOString()
      })
      .eq('id', attachment.id)

    if (updateError) {
      return {
        success: false,
        attachmentId: attachment.id,
        originalUrl: attachment.file_url,
        error: `Erro ao atualizar banco de dados: ${updateError.message}`
      }
    }

    console.log(`✅ Anexo recuperado: ${attachment.file_name}`)
    return {
      success: true,
      attachmentId: attachment.id,
      originalUrl: attachment.file_url,
      newUrl: urlData.publicUrl,
      recoveredMimeType: realMimeType
    }
  } catch (error) {
    return {
      success: false,
      attachmentId: attachment.id,
      originalUrl: attachment.file_url,
      error: `Erro interno: ${error}`
    }
  }
}

// Função principal
async function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  switch (command) {
    case '--stats':
      const stats = await getAttachmentStats()
      
      console.log('\n📊 Estatísticas dos Anexos:\n')
      console.log(`📁 Total de imagens: ${stats.total}`)
      console.log(`❌ Corrompidas: ${stats.corrupted}`)
      console.log(`✅ Saudáveis: ${stats.healthy}`)
      
      if (stats.corrupted > 0) {
        console.log(`\n📋 Anexos corrompidos encontrados:`)
        stats.corruptedList.forEach((attachment, index) => {
          console.log(`${index + 1}. ${attachment.file_name}`)
          console.log(`   ID: ${attachment.id}`)
          console.log(`   Tamanho: ${formatFileSize(attachment.file_size)}`)
          console.log(`   Tipo atual: ${attachment.file_type}`)
          console.log(`   Tipo esperado: ${getExpectedMimeType(attachment.file_name)}`)
          console.log(`   Procedimento: ${attachment.procedure_id}`)
          console.log('')
        })
      }
      break

    case '--list':
      const corruptedAttachments = await findCorruptedAttachments()
      
      if (corruptedAttachments.length === 0) {
        console.log('✅ Nenhum anexo corrompido encontrado!')
        return
      }

      console.log(`\n📋 Encontrados ${corruptedAttachments.length} anexos corrompidos:\n`)
      
      corruptedAttachments.forEach((attachment, index) => {
        console.log(`${index + 1}. ${attachment.file_name}`)
        console.log(`   ID: ${attachment.id}`)
        console.log(`   Tamanho: ${formatFileSize(attachment.file_size)}`)
        console.log(`   Tipo atual: ${attachment.file_type}`)
        console.log(`   Tipo esperado: ${getExpectedMimeType(attachment.file_name)}`)
        console.log(`   Procedimento: ${attachment.procedure_id}`)
        console.log(`   Criado: ${new Date(attachment.created_at).toLocaleString('pt-BR')}`)
        console.log('')
      })
      break

    case '--recover-attachment':
      const attachmentId = args[1]
      if (!attachmentId) {
        console.error('❌ ID do anexo é obrigatório')
        process.exit(1)
      }

      // Buscar anexo específico
      const { data: attachment, error } = await supabase
        .from('procedure_attachments')
        .select('*')
        .eq('id', attachmentId)
        .single()

      if (error || !attachment) {
        console.error('❌ Anexo não encontrado:', error?.message)
        process.exit(1)
      }

      const singleResult = await recoverAttachment(attachment)
      
      if (singleResult.success) {
        console.log('✅ Anexo recuperado com sucesso!')
        console.log(`   Nova URL: ${singleResult.newUrl}`)
      } else {
        console.error('❌ Erro ao recuperar anexo:', singleResult.error)
      }
      break

    case '--recover-all':
      console.log('🚀 Iniciando recuperação de todos os anexos corrompidos...\n')
      
      const allCorruptedAttachments = await findCorruptedAttachments()
      
      if (allCorruptedAttachments.length === 0) {
        console.log('✅ Nenhum anexo corrompido encontrado!')
        return
      }

      console.log(`📋 Encontrados ${allCorruptedAttachments.length} anexos para recuperar\n`)

      const allResults = []
      
      for (const attachment of allCorruptedAttachments) {
        const result = await recoverAttachment(attachment)
        allResults.push(result)
        
        // Pequena pausa para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      // Mostrar resumo
      const successful = allResults.filter(r => r.success).length
      const failed = allResults.filter(r => !r.success).length

      console.log('\n📊 Resumo da recuperação:')
      console.log(`✅ Sucessos: ${successful}`)
      console.log(`❌ Falhas: ${failed}`)
      console.log(`📋 Total: ${allResults.length}`)

      if (failed > 0) {
        console.log('\n❌ Anexos com erro:')
        allResults.filter(r => !r.success).forEach(result => {
          console.log(`   ID ${result.attachmentId}: ${result.error}`)
        })
      }
      break

    default:
      console.log(`
🔧 Script de Recuperação Baseado no Banco de Dados

Uso:
  node scripts/recover-from-database.js --stats                    # Mostrar estatísticas
  node scripts/recover-from-database.js --list                     # Listar anexos corrompidos
  node scripts/recover-from-database.js --recover-all              # Recuperar todos os anexos corrompidos
  node scripts/recover-from-database.js --recover-attachment <id>  # Recuperar anexo específico

Exemplos:
  node scripts/recover-from-database.js --stats
  node scripts/recover-from-database.js --list
  node scripts/recover-from-database.js --recover-attachment "123e4567-e89b-12d3-a456-426614174000"
  node scripts/recover-from-database.js --recover-all
      `)
  }
}

// Executar script
if (require.main === module) {
  main().catch(console.error)
}

module.exports = {
  findImageAttachments,
  findCorruptedAttachments,
  getAttachmentStats,
  recoverAttachment
}
