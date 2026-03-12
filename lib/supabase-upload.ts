/**
 * Upload direto para Supabase Storage usando XMLHttpRequest
 * Solução do zero para resolver problemas de travamento no mobile
 */

const SUPABASE_URL = 'https://zmtwwajyhusyrugobxur.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptdHd3YWp5aHVzeXJ1Z29ieHVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMzYzNzAsImV4cCI6MjA3MjkxMjM3MH0.NC6t2w_jFWTMJjVv5FmPLouVyOVgCTBReCr0zOA2dx8'

export interface UploadProgress {
  loaded: number
  total: number
  percent: number
}

export interface UploadResult {
  success: boolean
  data?: {
    path: string
    id: string
    fullPath: string
  }
  error?: {
    message: string
    status?: number
  }
}

export interface UploadOptions {
  bucket: string
  path: string
  file: File
  contentType?: string
  onProgress?: (progress: UploadProgress) => void
  accessToken?: string
  timeout?: number
}

/**
 * Upload usando XMLHttpRequest (melhor suporte para progresso no mobile)
 */
export async function uploadFileXHR(options: UploadOptions): Promise<UploadResult> {
  const {
    bucket,
    path,
    file,
    contentType,
    onProgress,
    accessToken,
    timeout = 300000 // 5 minutos default
  } = options

  return new Promise(async (resolve) => {
    try {
      
      // Obter token ANTES de abrir o XHR
      let token: string | null = null
      if (accessToken) {
        token = accessToken
      } else if (typeof window !== 'undefined') {
        const session = localStorage.getItem('sb-auth-token')
        if (session) {
          try {
            const parsed = JSON.parse(session)
            token = parsed?.access_token || null
          } catch {
            token = null
          }
        }
      }
      
      const xhr = new XMLHttpRequest()
      // Codificar o path corretamente (cada segmento separadamente)
      const encodedPath = path.split('/').map(segment => encodeURIComponent(segment)).join('/')
      const url = `${SUPABASE_URL}/storage/v1/object/${bucket}/${encodedPath}`
      
      
      // Configurar timeout
      xhr.timeout = timeout
      
      // Progress tracking - ANTES de abrir
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percent = Math.round((e.loaded / e.total) * 100)
          onProgress({
            loaded: e.loaded,
            total: e.total,
            percent
          })
        } else if (onProgress && e.loaded > 0) {
          // Se não tiver total, usar estimativa baseada no tamanho do arquivo
          const estimatedPercent = Math.min(90, Math.round((e.loaded / file.size) * 100))
          onProgress({
            loaded: e.loaded,
            total: file.size,
            percent: estimatedPercent
          })
        }
      })
      
      // Log quando começar a enviar
      xhr.upload.addEventListener('loadstart', () => {
        if (onProgress) {
          onProgress({
            loaded: 0,
            total: file.size,
            percent: 0
          })
        }
      })
      
      // Sucesso
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText)
            resolve({
              success: true,
              data: {
                path: response.Key || path,
                id: response.Id || '',
                fullPath: response.Key || path
              }
            })
          } catch {
            // Se não conseguir parsear, assumir sucesso se status OK
            resolve({
              success: true,
              data: {
                path: path,
                id: '',
                fullPath: path
              }
            })
          }
        } else {
          let errorMessage = 'Erro ao fazer upload'
          try {
            const error = JSON.parse(xhr.responseText)
            errorMessage = error.message || error.error || errorMessage
            console.error(`[XHR-UPLOAD] ❌ Erro HTTP ${xhr.status}:`, error)
          } catch {
            errorMessage = `Erro HTTP ${xhr.status}: ${xhr.statusText}`
            console.error(`[XHR-UPLOAD] ❌ Erro HTTP ${xhr.status}: ${xhr.statusText}`)
          }
          
          resolve({
            success: false,
            error: {
              message: errorMessage,
              status: xhr.status
            }
          })
        }
      })
      
      // Erro
      xhr.addEventListener('error', (e) => {
        console.error(`[XHR-UPLOAD] ❌ Erro de rede:`, e)
        resolve({
          success: false,
          error: {
            message: 'Erro de rede ao fazer upload'
          }
        })
      })
      
      // Timeout
      xhr.addEventListener('timeout', () => {
        console.error(`[XHR-UPLOAD] ❌ Timeout após ${timeout / 1000}s`)
        resolve({
          success: false,
          error: {
            message: `Upload demorou mais de ${timeout / 1000} segundos`
          }
        })
      })
      
      // Abort
      xhr.addEventListener('abort', () => {
        console.error(`[XHR-UPLOAD] ❌ Upload cancelado`)
        resolve({
          success: false,
          error: {
            message: 'Upload cancelado'
          }
        })
      })
      
      // Abrir conexão
      xhr.open('POST', url, true)
      
      // Configurar headers
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      }
      xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY)
      xhr.setRequestHeader('x-upsert', 'false')
      
      // NÃO definir Content-Type - deixar o browser definir automaticamente
      // Isso é importante para multipart/form-data
      
      
      // Enviar arquivo
      xhr.send(file)
      
    } catch (error: any) {
      console.error(`[XHR-UPLOAD] ❌ Erro ao configurar upload:`, error)
      resolve({
        success: false,
        error: {
          message: error.message || 'Erro ao configurar upload'
        }
      })
    }
  })
}

/**
 * Upload usando Fetch API (fallback)
 */
export async function uploadFileFetch(options: UploadOptions): Promise<UploadResult> {
  const {
    bucket,
    path,
    file,
    contentType,
    accessToken,
    timeout = 300000
  } = options

  try {
    const url = `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`
    
    const headers: HeadersInit = {
      'apikey': SUPABASE_ANON_KEY,
      'x-upsert': 'false'
    }
    
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }
    
    if (contentType) {
      headers['Content-Type'] = contentType
    }
    
    // Criar AbortController para timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: file,
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    if (response.ok) {
      const data = await response.json().catch(() => ({}))
      return {
        success: true,
        data: {
          path: data.Key || path,
          id: data.Id || '',
          fullPath: data.Key || path
        }
      }
    } else {
      const error = await response.json().catch(() => ({}))
      return {
        success: false,
        error: {
          message: error.message || error.error || `Erro HTTP ${response.status}`,
          status: response.status
        }
      }
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return {
        success: false,
        error: {
          message: `Upload demorou mais de ${timeout / 1000} segundos`
        }
      }
    }
    
    return {
      success: false,
      error: {
        message: error.message || 'Erro desconhecido ao fazer upload'
      }
    }
  }
}

/**
 * Upload via API Route do Next.js (solução server-side - mais confiável no mobile)
 */
export async function uploadViaAPIRoute(options: UploadOptions): Promise<UploadResult> {
  const {
    path,
    file,
    onProgress
  } = options

  try {
    
    // MOBILE FIX: Verificar se o arquivo é válido
    if (!file || file.size === 0) {
      console.error(`[API-ROUTE-UPLOAD] ❌ Arquivo inválido ou vazio`)
      return {
        success: false,
        error: {
          message: `Arquivo inválido ou vazio (${file?.size || 0} bytes)`
        }
      }
    }
    
    // Extrair userId do path (formato: userId/temp-id/filename)
    const userId = path.split('/')[0]
    
    if (!userId) {
      return {
        success: false,
        error: {
          message: 'Não foi possível identificar o usuário no caminho do arquivo'
        }
      }
    }

    // Criar FormData
    const formData = new FormData()
    formData.append('file', file)
    formData.append('userId', userId)
    formData.append('filePath', path)


    // Progresso inicial
    if (onProgress) {
      onProgress({ loaded: 0, total: file.size, percent: 5 })
    }

    // MOBILE FIX: Usar fetch com timeout como fallback se XHR falhar
    // Tentar XHR primeiro (melhor progresso)
    const xhrResult = await new Promise<UploadResult | null>((resolve) => {
      try {
        const xhr = new XMLHttpRequest()
        let resolved = false
        let lastProgressUpdate = Date.now()
        let simulatedProgress = 5
        
        // Fallback: atualizar progresso periodicamente se não houver atualizações
        const progressInterval = setInterval(() => {
          if (!resolved && onProgress) {
            const timeSinceLastUpdate = Date.now() - lastProgressUpdate
            // Se não houver atualização em 2 segundos, incrementar progresso gradualmente
            if (timeSinceLastUpdate > 2000 && simulatedProgress < 90) {
              simulatedProgress = Math.min(90, simulatedProgress + 2)
              onProgress({
                loaded: (simulatedProgress / 100) * file.size,
                total: file.size,
                percent: simulatedProgress
              })
            }
          }
        }, 1000) // Verificar a cada segundo
        
        // Timeout de 60 segundos
        const timeoutId = setTimeout(() => {
          clearInterval(progressInterval)
          if (!resolved) {
            resolved = true
            console.warn(`[API-ROUTE-UPLOAD] ⏱️ XHR timeout - tentando fetch...`)
            xhr.abort()
            resolve(null) // Retorna null para tentar fetch
          }
        }, 60000)
        
        // Progresso real do upload
        xhr.upload.addEventListener('progress', (e) => {
          if (onProgress) {
            lastProgressUpdate = Date.now() // Atualizar timestamp da última atualização
            if (e.lengthComputable) {
              const uploadPercent = Math.round((e.loaded / e.total) * 100)
              const adjustedPercent = 5 + Math.round((uploadPercent * 85) / 100)
              simulatedProgress = adjustedPercent // Atualizar progresso simulado
              onProgress({
                loaded: e.loaded,
                total: e.total,
                percent: Math.min(90, adjustedPercent)
              })
            } else if (e.loaded > 0) {
              // Se não tiver total computável, usar estimativa baseada no tamanho do arquivo
              const estimatedPercent = Math.min(90, Math.round((e.loaded / file.size) * 100))
              simulatedProgress = estimatedPercent
              onProgress({
                loaded: e.loaded,
                total: file.size,
                percent: Math.max(5, estimatedPercent)
              })
            }
          }
        })
        
        // Evento loadstart para garantir que o progresso seja atualizado imediatamente
        xhr.upload.addEventListener('loadstart', () => {
          lastProgressUpdate = Date.now()
          if (onProgress) {
            onProgress({
              loaded: 0,
              total: file.size,
              percent: 5
            })
          }
        })

        xhr.addEventListener('load', () => {
          clearTimeout(timeoutId)
          clearInterval(progressInterval)
          if (resolved) return
          resolved = true
          
          
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const result = JSON.parse(xhr.responseText)
              
              if (result.success && result.data) {
                if (onProgress) {
                  onProgress({ loaded: file.size, total: file.size, percent: 100 })
                }
                resolve({
                  success: true,
                  data: {
                    path: result.data.path || path,
                    id: result.data.id || '',
                    fullPath: result.data.fullPath || path
                  }
                })
              } else {
                console.error(`[API-ROUTE-UPLOAD] ❌ Erro na resposta:`, result.error)
                resolve({
                  success: false,
                  error: {
                    message: result.error || 'Erro desconhecido',
                    status: xhr.status
                  }
                })
              }
            } catch (e) {
              console.error(`[API-ROUTE-UPLOAD] ❌ Erro ao parsear resposta:`, e)
              resolve({
                success: false,
                error: {
                  message: 'Erro ao processar resposta do servidor',
                  status: xhr.status
                }
              })
            }
          } else {
            let errorMessage = `Erro HTTP ${xhr.status}`
            try {
              const error = JSON.parse(xhr.responseText)
              errorMessage = error.error || errorMessage
            } catch {}
            console.error(`[API-ROUTE-UPLOAD] ❌ Erro HTTP:`, errorMessage)
            resolve({
              success: false,
              error: {
                message: errorMessage,
                status: xhr.status
              }
            })
          }
        })

        xhr.addEventListener('error', (e) => {
          clearTimeout(timeoutId)
          clearInterval(progressInterval)
          if (resolved) return
          resolved = true
          console.error(`[API-ROUTE-UPLOAD] ❌ XHR error:`, e)
          resolve(null) // Tentar fetch
        })

        xhr.addEventListener('timeout', () => {
          clearTimeout(timeoutId)
          clearInterval(progressInterval)
          if (resolved) return
          resolved = true
          console.warn(`[API-ROUTE-UPLOAD] ⏱️ XHR timeout nativo`)
          resolve(null) // Tentar fetch
        })

        xhr.open('POST', '/api/upload-procedure-file')
        xhr.timeout = 60000
        xhr.send(formData)
      } catch (e) {
        console.error(`[API-ROUTE-UPLOAD] ❌ Erro ao criar XHR:`, e)
        resolve(null)
      }
    })
    
    // Se XHR funcionou, retornar resultado
    if (xhrResult !== null) {
      return xhrResult
    }
    
    // FALLBACK: Usar fetch se XHR falhou
    
    const fetchFormData = new FormData()
    fetchFormData.append('file', file)
    fetchFormData.append('userId', userId)
    fetchFormData.append('filePath', path)
    
    const response = await fetch('/api/upload-procedure-file', {
      method: 'POST',
      body: fetchFormData
    })
    
    
    if (response.ok) {
      const result = await response.json()
      
      if (result.success && result.data) {
        if (onProgress) {
          onProgress({ loaded: file.size, total: file.size, percent: 100 })
        }
        return {
          success: true,
          data: {
            path: result.data.path || path,
            id: result.data.id || '',
            fullPath: result.data.fullPath || path
          }
        }
      } else {
        return {
          success: false,
          error: {
            message: result.error || 'Erro desconhecido',
            status: response.status
          }
        }
      }
    } else {
      const errorText = await response.text()
      console.error(`[API-ROUTE-UPLOAD] ❌ Fetch error:`, errorText)
      return {
        success: false,
        error: {
          message: `Erro HTTP ${response.status}: ${errorText}`,
          status: response.status
        }
      }
    }
  } catch (error: any) {
    console.error(`[API-ROUTE-UPLOAD] ❌ Erro fatal:`, error)
    return {
      success: false,
      error: {
        message: error.message || 'Erro ao fazer upload via API route'
      }
    }
  }
}

/**
 * Função principal de upload - USA API ROUTE por padrão (mais confiável no mobile)
 */
export async function uploadToSupabaseStorage(
  options: UploadOptions
): Promise<UploadResult> {
  // SEMPRE usar API route no mobile (mais confiável)
  // Fallback para XHR apenas se API route falhar
  try {
    return await uploadViaAPIRoute(options)
  } catch (error: any) {
    console.warn(`[UPLOAD] API route falhou, tentando XHR:`, error)
    // Fallback para XHR se API route falhar
    if (typeof XMLHttpRequest !== 'undefined') {
      return uploadFileXHR(options)
    } else {
      return uploadFileFetch(options)
    }
  }
}

/**
 * Obter URL pública do arquivo
 */
export function getPublicUrl(bucket: string, path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`
}

/**
 * Verificar se arquivo existe no storage
 */
export async function checkFileExists(
  bucket: string,
  path: string,
  accessToken?: string
): Promise<boolean> {
  try {
    const url = `${SUPABASE_URL}/storage/v1/object/info/${bucket}/${path}`
    
    const headers: HeadersInit = {
      'apikey': SUPABASE_ANON_KEY
    }
    
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }
    
    const response = await fetch(url, {
      method: 'HEAD',
      headers
    })
    
    return response.ok
  } catch {
    return false
  }
}

