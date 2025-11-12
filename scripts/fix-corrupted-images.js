#!/usr/bin/env node

/**
 * Script para corrigir imagens corrompidas no Supabase Storage
 * 
 * Este script:
 * 1. Lista todos os arquivos no storage
 * 2. Identifica arquivos de imagem com tipo MIME incorreto
 * 3. Baixa, corrige e re-upload com tipo MIME correto
 * 4. Atualiza os registros no banco de dados
 * 5. Remove os arquivos originais corrompidos
 */

const { createClient } = require('@supabase/supabase-js')

// Configuração do Supabase (usando as credenciais do projeto)
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

// Funções para detectar tipo MIME real baseado nos magic numbers
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
          corruptedFiles.push({
            name: file.name,
            path: file.name,
            size: file.metadata?.size || 0,
            currentMimeType,
            expectedMimeType: getExpectedMimeType(file.name),
            lastModified: file.updated_at || file.created_at || ''
          })
        }
      }
    }

    return corruptedFiles
  } catch (error) {
    console.error('❌ Erro ao buscar arquivos corrompidos:', error)
    return []
  }
}

async function fixCorruptedFile(filePath) {
  try {
    console.log(`🔄 Corrigindo arquivo: ${filePath}`)
    
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

    console.log(`✅ Arquivo corrigido: ${newPath}`)
    return {
      success: true,
      originalPath: filePath,
      newPath: newPath,
      recoveredMimeType: realMimeType
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

async function removeOriginalFiles(recoveryResults) {
  console.log('🗑️ Removendo arquivos originais corrompidos...')
  
  for (const result of recoveryResults) {
    if (result.success) {
      try {
        await supabase.storage
          .from(bucketName)
          .remove([result.originalPath])
        console.log(`✅ Arquivo original removido: ${result.originalPath}`)
      } catch (error) {
        console.error('❌ Erro ao remover arquivo original:', error)
      }
    }
  }
}

// Função principal
async function main() {
  console.log('🚀 Iniciando correção de imagens corrompidas...\n')
  
  // 1. Encontrar arquivos corrompidos
  const corruptedFiles = await findCorruptedFiles()
  
  if (corruptedFiles.length === 0) {
    console.log('✅ Nenhum arquivo corrompido encontrado!')
    return
  }

  console.log(`📋 Encontrados ${corruptedFiles.length} arquivos corrompidos:\n`)
  
  corruptedFiles.forEach((file, index) => {
    console.log(`${index + 1}. ${file.name}`)
    console.log(`   Tamanho: ${formatFileSize(file.size)}`)
    console.log(`   Tipo atual: ${file.currentMimeType}`)
    console.log(`   Tipo esperado: ${file.expectedMimeType}`)
    console.log(`   Modificado: ${new Date(file.lastModified).toLocaleString('pt-BR')}`)
    console.log('')
  })

  // 2. Corrigir arquivos
  console.log('🔄 Iniciando correção dos arquivos...\n')
  
  const results = []
  
  for (const file of corruptedFiles) {
    const result = await fixCorruptedFile(file.path)
    results.push(result)
    
    // Pequena pausa para evitar rate limiting
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  // 3. Atualizar registros no banco de dados
  await updateDatabaseRecords(results)

  // 4. Remover arquivos originais (opcional - descomente se quiser)
  // await removeOriginalFiles(results)

  // 5. Mostrar resumo
  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length

  console.log('\n📊 Resumo da correção:')
  console.log(`✅ Sucessos: ${successful}`)
  console.log(`❌ Falhas: ${failed}`)
  console.log(`📋 Total: ${results.length}`)

  if (failed > 0) {
    console.log('\n❌ Arquivos com erro:')
    results.filter(r => !r.success).forEach(result => {
      console.log(`   ${result.originalPath}: ${result.error}`)
    })
  }

  if (successful > 0) {
    console.log('\n🎉 Correção concluída com sucesso!')
    console.log('📝 Os arquivos originais foram mantidos por segurança.')
    console.log('💡 Para removê-los, descomente a linha no código.')
  }
}

// Executar script
if (require.main === module) {
  main().catch(console.error)
}

module.exports = {
  findCorruptedFiles,
  fixCorruptedFile,
  updateDatabaseRecords,
  removeOriginalFiles
}
