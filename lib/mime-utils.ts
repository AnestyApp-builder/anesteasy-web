/**
 * Utilitários para detecção e correção de tipos MIME
 */

/**
 * Determina o tipo MIME correto baseado na extensão do arquivo
 */
export function getCorrectMimeType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop()
  
  switch (ext) {
    // Imagens
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
    
    // Documentos
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
    case 'ppt':
      return 'application/vnd.ms-powerpoint'
    case 'pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    
    // Texto
    case 'txt':
      return 'text/plain'
    case 'csv':
      return 'text/csv'
    case 'html':
      return 'text/html'
    case 'css':
      return 'text/css'
    case 'js':
      return 'application/javascript'
    case 'json':
      return 'application/json'
    case 'xml':
      return 'application/xml'
    
    // Arquivos compactados
    case 'zip':
      return 'application/zip'
    case 'rar':
      return 'application/x-rar-compressed'
    case '7z':
      return 'application/x-7z-compressed'
    case 'tar':
      return 'application/x-tar'
    case 'gz':
      return 'application/gzip'
    
    // Vídeos
    case 'mp4':
      return 'video/mp4'
    case 'avi':
      return 'video/x-msvideo'
    case 'mov':
      return 'video/quicktime'
    case 'wmv':
      return 'video/x-ms-wmv'
    case 'flv':
      return 'video/x-flv'
    case 'webm':
      return 'video/webm'
    
    // Áudios
    case 'mp3':
      return 'audio/mpeg'
    case 'wav':
      return 'audio/wav'
    case 'ogg':
      return 'audio/ogg'
    case 'aac':
      return 'audio/aac'
    case 'flac':
      return 'audio/flac'
    
    default:
      return 'application/octet-stream'
  }
}

/**
 * Verifica se um arquivo é uma imagem baseado na extensão
 */
export function isImageFile(filename: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.ico', '.tiff', '.tif']
  return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext))
}

/**
 * Verifica se um arquivo é um documento baseado na extensão
 */
export function isDocumentFile(filename: string): boolean {
  const documentExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv']
  return documentExtensions.some(ext => filename.toLowerCase().endsWith(ext))
}

/**
 * Verifica se um arquivo é um vídeo baseado na extensão
 */
export function isVideoFile(filename: string): boolean {
  const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm']
  return videoExtensions.some(ext => filename.toLowerCase().endsWith(ext))
}

/**
 * Verifica se um arquivo é um áudio baseado na extensão
 */
export function isAudioFile(filename: string): boolean {
  const audioExtensions = ['.mp3', '.wav', '.ogg', '.aac', '.flac']
  return audioExtensions.some(ext => filename.toLowerCase().endsWith(ext))
}

/**
 * Cria um arquivo com o tipo MIME correto preservando o conteúdo binário
 * IMPORTANTE: Esta função SEMPRE retorna o arquivo original para evitar corrupção
 * O tipo MIME correto deve ser passado no contentType do upload, não no File
 */
export async function createFileWithCorrectMimeType(originalFile: File): Promise<File> {
  // SEMPRE retornar o arquivo original sem modificações
  // Isso garante que o conteúdo binário seja preservado 100%
  // O tipo MIME correto será passado no contentType do upload
  return originalFile
}

/**
 * Valida se o tipo MIME do arquivo está correto
 */
export function validateMimeType(filename: string, mimeType: string): boolean {
  const expectedMimeType = getCorrectMimeType(filename)
  return mimeType === expectedMimeType
}

/**
 * Obtém informações sobre o arquivo incluindo validação de tipo MIME
 */
export function getFileInfo(file: File) {
  const correctMimeType = getCorrectMimeType(file.name)
  const isCorrect = validateMimeType(file.name, file.type)
  
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    correctType: correctMimeType,
    isCorrect,
    isImage: isImageFile(file.name),
    isDocument: isDocumentFile(file.name),
    isVideo: isVideoFile(file.name),
    isAudio: isAudioFile(file.name)
  }
}
