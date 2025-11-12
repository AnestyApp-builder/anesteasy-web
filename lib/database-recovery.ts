import { supabase } from './supabase'

export interface DatabaseAttachment {
  id: string
  procedure_id: string
  file_name: string
  file_size: number
  file_type: string
  file_url: string
  uploaded_at?: string
  created_at?: string
  updated_at?: string
}

export interface DatabaseRecoveryResult {
  success: boolean
  attachmentId: string
  originalUrl: string
  newUrl?: string
  error?: string
  recoveredMimeType?: string
}

export class DatabaseRecoveryService {
  private bucketName = 'procedure-attachments'

  /**
   * Busca todos os anexos de imagem no banco de dados
   */
  async findImageAttachments(): Promise<DatabaseAttachment[]> {
    try {
      const { data: attachments, error } = await supabase
        .from('procedure_attachments')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erro ao buscar anexos:', error)
        return []
      }

      // Filtrar apenas anexos de imagem
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']
      
      return (attachments || []).filter(attachment => {
        const hasImageExtension = imageExtensions.some(ext => 
          attachment.file_name.toLowerCase().endsWith(ext)
        )
        
        // Incluir se tem extensão de imagem OU se o tipo MIME indica imagem
        return hasImageExtension || attachment.file_type.startsWith('image/')
      })
    } catch (error) {
      console.error('Erro ao buscar anexos de imagem:', error)
      return []
    }
  }

  /**
   * Identifica anexos com tipo MIME incorreto
   */
  async findCorruptedAttachments(): Promise<DatabaseAttachment[]> {
    const allAttachments = await this.findImageAttachments()
    
    return allAttachments.filter(attachment => {
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']
      const hasImageExtension = imageExtensions.some(ext => 
        attachment.file_name.toLowerCase().endsWith(ext)
      )
      
      // Se tem extensão de imagem mas tipo MIME não é de imagem
      return hasImageExtension && !attachment.file_type.startsWith('image/')
    })
  }

  /**
   * Extrai o caminho do arquivo da URL
   */
  private extractFilePathFromUrl(url: string): string | null {
    try {
      // URL do Supabase Storage: https://zmtwwajyhusyrugobxur.supabase.co/storage/v1/object/public/procedure-attachments/path/to/file.jpg
      const urlParts = url.split('/storage/v1/object/public/')
      if (urlParts.length === 2) {
        const pathPart = urlParts[1]
        // Remove o nome do bucket do início
        const bucketPrefix = `${this.bucketName}/`
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

  /**
   * Detecta o tipo MIME real do arquivo
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
   * Recupera um anexo específico do banco de dados
   */
  async recoverAttachment(attachment: DatabaseAttachment): Promise<DatabaseRecoveryResult> {
    try {
      // 1. Extrair caminho do arquivo da URL
      const filePath = this.extractFilePathFromUrl(attachment.file_url)
      
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
        .from(this.bucketName)
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
      const realMimeType = await this.detectRealMimeType(filePath)

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
        .from(this.bucketName)
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
        .from(this.bucketName)
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

  /**
   * Recupera múltiplos anexos
   */
  async recoverMultipleAttachments(attachments: DatabaseAttachment[]): Promise<DatabaseRecoveryResult[]> {
    const results: DatabaseRecoveryResult[] = []
    
    for (const attachment of attachments) {
      const result = await this.recoverAttachment(attachment)
      results.push(result)
      
      // Pequena pausa para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 200))
    }
    
    return results
  }

  /**
   * Remove arquivos originais após recuperação bem-sucedida
   */
  async removeOriginalFiles(results: DatabaseRecoveryResult[]): Promise<void> {
    for (const result of results) {
      if (result.success) {
        try {
          const filePath = this.extractFilePathFromUrl(result.originalUrl)
          if (filePath) {
            await supabase.storage
              .from(this.bucketName)
              .remove([filePath])
          }
        } catch (error) {
          console.error('Erro ao remover arquivo original:', error)
        }
      }
    }
  }

  /**
   * Estatísticas dos anexos
   */
  async getAttachmentStats(): Promise<{
    total: number
    corrupted: number
    healthy: number
    corruptedList: DatabaseAttachment[]
  }> {
    const allAttachments = await this.findImageAttachments()
    const corruptedAttachments = await this.findCorruptedAttachments()
    
    return {
      total: allAttachments.length,
      corrupted: corruptedAttachments.length,
      healthy: allAttachments.length - corruptedAttachments.length,
      corruptedList: corruptedAttachments
    }
  }
}

export const databaseRecoveryService = new DatabaseRecoveryService()
