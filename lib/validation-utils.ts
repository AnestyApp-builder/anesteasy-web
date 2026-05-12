import { BUSINESS_RULES, UI_CONSTANTS, TECHNICAL_LIMITS } from './constants';

// Limites de upload migrados para constants.ts
export const LIMITES_UPLOAD = {
  tamanhoMaximoPorArquivo: UI_CONSTANTS.MAX_UPLOAD_SIZE_MB * 1024 * 1024,
  quantidadeMaxima: UI_CONSTANTS.MAX_FILES_COUNT
}

// Timeouts migrados para constants.ts
export const TIMEOUTS = {
  sessao: TECHNICAL_LIMITS.TIMEOUT_SESSION_MS,
  insercao: TECHNICAL_LIMITS.TIMEOUT_INSERT_MS,
  uploadArquivo: TECHNICAL_LIMITS.TIMEOUT_UPLOAD_MS,
  total: 180000
}

/**
 * Converte valor monetário de string para número
 * Suporta múltiplos formatos: R$ 1.234,56 | 1234,56 | 1.234.56 | 1234.56
 */
export function converterValorMonetario(valor: string | number | undefined | null): number {
  if (typeof valor === 'number') {
    return isNaN(valor) ? 0 : valor
  }
  
  if (!valor || typeof valor !== 'string') {
    return 0
  }
  
  // Remove tudo exceto dígitos, vírgula e ponto
  let limpo = valor.replace(/[^\d,\.]/g, '')
  
  if (!limpo) return 0
  
  // Se tem vírgula E ponto, identifica qual é decimal
  if (limpo.includes(',') && limpo.includes('.')) {
    const ultimaVirgula = limpo.lastIndexOf(',')
    const ultimoPonto = limpo.lastIndexOf('.')
    
    // Usa o último como separador decimal
    if (ultimaVirgula > ultimoPonto) {
      limpo = limpo.replace(/\./g, '').replace(',', '.')
    } else {
      limpo = limpo.replace(/,/g, '')
    }
  } else {
    // Só tem um separador
    limpo = limpo.replace(',', '.')
  }
  
  const numero = parseFloat(limpo)
  return isNaN(numero) ? 0 : numero
}

/**
 * Valida email com verificações robustas
 */
export function validarEmail(email: string | undefined | null): boolean {
  if (!email || typeof email !== 'string') {
    return false
  }
  
  const emailTrimmed = email.trim()
  if (!emailTrimmed) return false
  
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  
  if (!regex.test(emailTrimmed)) return false
  
  // Validações adicionais
  const [local, dominio] = emailTrimmed.split('@')
  
  if (!local || !dominio) return false
  
  // Local part não pode começar/terminar com ponto
  if (local.startsWith('.') || local.endsWith('.')) return false
  
  // Não pode ter pontos consecutivos
  if (local.includes('..')) return false
  
  // Domínio deve ter pelo menos um ponto
  if (!dominio.includes('.')) return false
  
  // Domínio não pode começar/terminar com ponto ou hífen
  if (dominio.startsWith('.') || dominio.endsWith('.') || 
      dominio.startsWith('-') || dominio.endsWith('-')) {
    return false
  }
  
  return true
}

/**
 * Valida data permitindo até 90 dias no futuro
 */
export function validarDataProcedimento(dataISO: string | undefined | null): { valida: boolean; erro?: string } {
  if (!dataISO || typeof dataISO !== 'string') {
    return { valida: false, erro: 'Data não informada' }
  }
  
  // Verificar formato ISO
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataISO)) {
    return { valida: false, erro: 'Formato de data inválido. Use YYYY-MM-DD' }
  }
  
  const data = new Date(dataISO)
  
  // Verificar se é uma data válida
  if (isNaN(data.getTime())) {
    return { valida: false, erro: 'Data inválida' }
  }
  
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  
  const dataLimite = new Date()
  dataLimite.setDate(dataLimite.getDate() + BUSINESS_RULES.MAX_FUTURE_DAYS)
  dataLimite.setHours(23, 59, 59, 999)
  
  // Verificar se não é muito antiga
  const dataMinima = new Date()
  dataMinima.setFullYear(dataMinima.getFullYear() - BUSINESS_RULES.MAX_PAST_YEARS)
  
  if (data < dataMinima) {
    return { valida: false, erro: `Data muito antiga. Máximo de ${BUSINESS_RULES.MAX_PAST_YEARS} anos atrás` }
  }
  
  // Verificar se não é muito futura
  if (data > dataLimite) {
    return { valida: false, erro: `Data não pode ser superior a ${BUSINESS_RULES.MAX_FUTURE_DAYS} dias no futuro` }
  }
  
  return { valida: true }
}

/**
 * Valida campos vazios de forma segura
 */
export function validarCampoObrigatorio(
  valor: string | undefined | null, 
  nomeCampo: string
): { valido: boolean; erro?: string } {
  if (!valor || typeof valor !== 'string' || !valor.trim()) {
    return { 
      valido: false, 
      erro: `${nomeCampo} é obrigatório` 
    }
  }
  
  return { valido: true }
}

/**
 * Valida arquivos antes do upload
 */
export function validarArquivos(arquivos: File[]): { valido: boolean; erro?: string } {
  if (arquivos.length === 0) {
    return { valido: true } // Nenhum arquivo é válido (opcional)
  }
  
  // Validar quantidade máxima
  if (arquivos.length > LIMITES_UPLOAD.quantidadeMaxima) {
    return { 
      valido: false, 
      erro: `Máximo de ${LIMITES_UPLOAD.quantidadeMaxima} arquivos permitido` 
    }
  }
  
  for (const arquivo of arquivos) {
    // Validar tipo
    const tiposPermitidos = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    if (!tiposPermitidos.includes(arquivo.type) && 
        !arquivo.name.toLowerCase().endsWith('.pdf') &&
        !arquivo.name.toLowerCase().endsWith('.jpg') &&
        !arquivo.name.toLowerCase().endsWith('.jpeg') &&
        !arquivo.name.toLowerCase().endsWith('.png')) {
      return { 
        valido: false, 
        erro: `Arquivo "${arquivo.name}" tem tipo não permitido. Use PDF, JPEG ou PNG` 
      }
    }
    
    // Validar se o arquivo não está vazio
    if (arquivo.size === 0) {
      return {
        valido: false,
        erro: `Arquivo "${arquivo.name}" está vazio`
      }
    }
    
    // Removidas todas as validações de tamanho
  }
  
  return { valido: true }
}

/**
 * Executa função com retry automático
 */
export async function executarComRetry<T>(
  fn: () => Promise<T>,
  opcoes: {
    tentativasMaximas?: number
    delayInicial?: number
    multiplicadorDelay?: number
    delayMaximo?: number
    onRetry?: (tentativa: number, erro: Error) => void
    deveRetentar?: (erro: any) => boolean
  } = {}
): Promise<T> {
  const {
    tentativasMaximas = 3,
    delayInicial = 1000,
    multiplicadorDelay = 2,
    delayMaximo = 10000,
    onRetry,
    deveRetentar
  } = opcoes
  
  let ultimoErro: Error | null = null
  
  for (let tentativa = 1; tentativa <= tentativasMaximas; tentativa++) {
    try {
      const resultado = await fn()
      return resultado
    } catch (erro) {
      ultimoErro = erro as Error
      
      // Verificar se deve retentar
      if (deveRetentar && !deveRetentar(erro)) {
        throw erro // Não retry
      }
      
      // Erros que NÃO devem ser retentados por padrão
      const codigoErro = (erro as any)?.code || (erro as any)?.message || ''
      const errosNaoRetentaveis = [
        '23505', // Duplicação
        '23503', // Foreign key
        '42501', // Permissão
        'PGRST301', // RLS
        'validation_error',
        'auth_error'
      ]
      
      if (errosNaoRetentaveis.some(cod => codigoErro.includes(cod))) {
        throw erro // Não retry
      }
      
      // Se não for a última tentativa, aguardar antes de tentar novamente
      if (tentativa < tentativasMaximas) {
        if (onRetry) {
          onRetry(tentativa, erro as Error)
        }
        
        // Backoff exponencial
        const delay = Math.min(
          delayInicial * Math.pow(multiplicadorDelay, tentativa - 1),
          delayMaximo
        )
        
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  throw new Error(
    `Falha após ${tentativasMaximas} tentativas: ${ultimoErro?.message || 'Erro desconhecido'}`
  )
}

/**
 * Formata tamanho de arquivo para exibição
 */
export function formatarTamanhoArquivo(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const tamanhos = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + tamanhos[i]
}


