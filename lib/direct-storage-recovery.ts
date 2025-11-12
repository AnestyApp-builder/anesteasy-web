import { supabase } from './supabase'

export interface StorageFile {
  name: string
  id: string
  updated_at: string
  created_at: string
  last_accessed_at: string
  metadata: {
    eTag: string
    size: number
    mimetype: string
    cacheControl: string
    lastModified: string
    contentLength: number
    httpStatusCode: number
  }
}

export interface DirectRecoveryResult {
  success: boolean
  originalPath: string
  newPath?: string
  error?: string
  recoveredMimeType?: string
  originalMimeType?: string
  fileSize?: number
}

export class DirectStorageRecoveryService {
  private bucketName = 'procedure-attachments'

  /**
   * Lista todos os arquivos no storage e identifica os corrompidos
   */
  async findCorruptedFiles(): Promise<StorageFile[]> {
    try {
      const { data: files, error } = await supabase.storage
        .from(this.bucketName)
        .list('', {
          limit: 1000,
          sortBy: { column: 'created_at', order: 'desc' }
        })

      if (error) {
        console.error('Erro ao listar arquivos:', error)
        return []
      }

      const corruptedFiles: StorageFile[] = []
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
            corruptedFiles.push(file as StorageFile)
          }
        }
      }

      return corruptedFiles
    } catch (error) {
      console.error('Erro ao buscar arquivos corrompidos:', error)
      return []
    }
  }

  /**
   * Detecta o tipo MIME real do arquivo baixando e analisando o conteúdo
   */
  async detectRealMimeType(filePath: string): Promise<string> {
    try {
      const { data: fileData, error } = await supabase.storage
        .from(this.bucketName)
        .download(filePath)

      if (error || !fileData) {
        return 'application/octet-stream'
      }

      // Ler os primeiros bytes para detectar o tipo real
      const arrayBuffer = await fileData.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer.slice(0, 12))

      // Verificar assinaturas de arquivo (magic numbers)
      if (this.isJPEG(uint8Array)) return 'image/jpeg'
      if (this.isPNG(uint8Array)) return 'image/png'
      if (this.isGIF(uint8Array)) return 'image/gif'
      if (this.isWebP(uint8Array)) return 'image/webp'
      if (this.isBMP(uint8Array)) return 'image/bmp'

      // Se não conseguir detectar, usar baseado na extensão
      return this.getExpectedMimeType(filePath)
    } catch (error) {
      console.error('Erro ao detectar tipo MIME:', error)
      return this.getExpectedMimeType(filePath)
    }
  }

  /**
   * Determina o tipo MIME esperado baseado na extensão do arquivo
   */
  private getExpectedMimeType(filename: string): string {
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
        return 'image/jpeg' // fallback
    }
  }

  /**
   * Verifica se o arquivo é JPEG baseado nos magic numbers
   */
  private isJPEG(bytes: Uint8Array): boolean {
    return bytes.length >= 3 && 
           bytes[0] === 0xFF && 
           bytes[1] === 0xD8 && 
           bytes[2] === 0xFF
  }

  /**
   * Verifica se o arquivo é PNG baseado nos magic numbers
   */
  private isPNG(bytes: Uint8Array): boolean {
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

  /**
   * Verifica se o arquivo é GIF baseado nos magic numbers
   */
  private isGIF(bytes: Uint8Array): boolean {
    return bytes.length >= 6 &&
           ((bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) ||
            (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46))
  }

  /**
   * Verifica se o arquivo é WebP baseado nos magic numbers
   */
  private isWebP(bytes: Uint8Array): boolean {
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

  /**
   * Verifica se o arquivo é BMP baseado nos magic numbers
   */
  private isBMP(bytes: Uint8Array): boolean {
    return bytes.length >= 2 &&
           bytes[0] === 0x42 &&
           bytes[1] === 0x4D
  }

  /**
   * Recupera um arquivo corrompido diretamente do storage
   * Esta é a abordagem mais eficiente: baixa, detecta tipo real, re-upload com metadados corretos
   */
  async recoverFileDirectly(filePath: string): Promise<DirectRecoveryResult> {
    try {
      console.log(`🔄 Recuperando arquivo diretamente: ${filePath}`)
      
      // 1. Baixar o arquivo original
      const { data: originalFile, error: downloadError } = await supabase.storage
        .from(this.bucketName)
        .download(filePath)

      if (downloadError || !originalFile) {
        return {
          success: false,
          originalPath: filePath,
          error: `Erro ao baixar arquivo: ${downloadError?.message}`
        }
      }

      // 2. Detectar o tipo MIME real
      const realMimeType = await this.detectRealMimeType(filePath)
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

      // 5. Fazer upload do arquivo corrigido com metadados corretos
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.bucketName)
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

  /**
   * Recupera múltiplos arquivos diretamente do storage
   */
  async recoverMultipleFilesDirectly(filePaths: string[]): Promise<DirectRecoveryResult[]> {
    const results: DirectRecoveryResult[] = []
    
    for (const filePath of filePaths) {
      const result = await this.recoverFileDirectly(filePath)
      results.push(result)
      
      // Pequena pausa para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 300))
    }
    
    return results
  }

  /**
   * Atualiza os registros no banco de dados com as novas URLs
   */
  async updateDatabaseRecords(recoveryResults: DirectRecoveryResult[]): Promise<void> {
    console.log('🗄️ Atualizando registros no banco de dados...')
    
    for (const result of recoveryResults) {
      if (result.success && result.newPath) {
        try {
          // Obter URL pública do novo arquivo
          const { data: urlData } = supabase.storage
            .from(this.bucketName)
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

  /**
   * Remove arquivos originais corrompidos após recuperação bem-sucedida
   */
  async removeOriginalFiles(recoveryResults: DirectRecoveryResult[]): Promise<void> {
    console.log('🗑️ Removendo arquivos originais corrompidos...')
    
    for (const result of recoveryResults) {
      if (result.success) {
        try {
          await supabase.storage
            .from(this.bucketName)
            .remove([result.originalPath])
          console.log(`✅ Arquivo original removido: ${result.originalPath}`)
        } catch (error) {
          console.error('❌ Erro ao remover arquivo original:', error)
        }
      }
    }
  }

  /**
   * Estatísticas dos arquivos no storage
   */
  async getStorageStats(): Promise<{
    total: number
    corrupted: number
    healthy: number
    corruptedList: StorageFile[]
  }> {
    const allFiles = await this.findCorruptedFiles()
    const corruptedFiles = allFiles.filter(file => {
      const currentMimeType = file.metadata?.mimetype || 'unknown'
      return !currentMimeType.startsWith('image/')
    })
    
    return {
      total: allFiles.length,
      corrupted: corruptedFiles.length,
      healthy: allFiles.length - corruptedFiles.length,
      corruptedList: corruptedFiles
    }
  }

  /**
   * Verifica se um arquivo específico está corrompido
   */
  async checkFileStatus(filePath: string): Promise<{
    isCorrupted: boolean
    currentMimeType: string
    expectedMimeType: string
    realMimeType?: string
  }> {
    try {
      const { data: fileData, error } = await supabase.storage
        .from(this.bucketName)
        .download(filePath)

      if (error || !fileData) {
        return {
          isCorrupted: false,
          currentMimeType: 'unknown',
          expectedMimeType: this.getExpectedMimeType(filePath)
        }
      }

      const currentMimeType = fileData.type
      const expectedMimeType = this.getExpectedMimeType(filePath)
      const realMimeType = await this.detectRealMimeType(filePath)
      
      return {
        isCorrupted: !currentMimeType.startsWith('image/'),
        currentMimeType,
        expectedMimeType,
        realMimeType
      }
    } catch (error) {
      return {
        isCorrupted: false,
        currentMimeType: 'error',
        expectedMimeType: this.getExpectedMimeType(filePath)
      }
    }
  }
}

export const directStorageRecoveryService = new DirectStorageRecoveryService()
