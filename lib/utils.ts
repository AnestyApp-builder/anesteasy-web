import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return ''
  
  let dateObj: Date
  
  if (typeof date === 'string') {
    // Se for uma string no formato ISO (YYYY-MM-DD), criar data no timezone local
    // para evitar problemas de timezone que fazem a data aparecer um dia antes
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      // Formato ISO sem hora: criar no timezone local
      const [year, month, day] = date.split('-').map(Number)
      dateObj = new Date(year, month - 1, day)
    } else if (/^\d{4}-\d{2}-\d{2}T/.test(date)) {
      // Formato ISO com hora: usar diretamente mas ajustar para timezone local
      const dateOnly = date.split('T')[0]
      const [year, month, day] = dateOnly.split('-').map(Number)
      dateObj = new Date(year, month - 1, day)
    } else {
      // Outros formatos: tentar criar normalmente
      dateObj = new Date(date)
    }
  } else {
    dateObj = date
  }
  
  // Verificar se a data é válida
  if (isNaN(dateObj.getTime())) {
    return ''
  }
  
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo' // Forçar timezone do Brasil
  }).format(dateObj)
}

export function formatDateTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(dateObj)
}

export function formatTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(dateObj)
}

export function formatShiftDates(startDate: string | Date, endDate: string | Date): string {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate
  
  const startDay = start.getDate()
  const startMonth = start.getMonth() + 1
  const endDay = end.getDate()
  const endMonth = end.getMonth() + 1
  
  // Se for o mesmo dia (plantão diurno)
  if (startDay === endDay && startMonth === endMonth) {
    return `${startDay.toString().padStart(2, '0')}/${startMonth.toString().padStart(2, '0')}`
  }
  
  // Se for plantão noturno (cruza a meia-noite)
  return `${startDay.toString().padStart(2, '0')}/${startMonth.toString().padStart(2, '0')} ao ${endDay.toString().padStart(2, '0')}/${endMonth.toString().padStart(2, '0')}`
}

// Função para obter saudação baseada no horário
export function getTimeBasedGreeting(): string {
  const hour = new Date().getHours()
  
  if (hour >= 5 && hour < 12) {
    return 'Bom dia'
  } else if (hour >= 12 && hour < 18) {
    return 'Boa tarde'
  } else {
    return 'Boa noite'
  }
}

// Função para obter título baseado no sexo
export function getGenderTitle(gender?: string | null): string {
  if (!gender) return 'Dr.'
  
  const genderLower = gender.toLowerCase()
  if (genderLower === 'feminino' || genderLower === 'female' || genderLower === 'f') {
    return 'Dra.'
  }
  return 'Dr.'
}

// Função para gerar saudação completa
export function getFullGreeting(name?: string, gender?: string | null): string {
  const greeting = getTimeBasedGreeting()
  const title = getGenderTitle(gender)
  const userName = name || 'Usuário'
  
  return `${greeting}, ${title} ${userName}`
}

// Funções para feedback tátil (vibração)
export function triggerHapticFeedback(type: 'light' | 'medium' | 'heavy' = 'light'): void {
  // Verifica se o navegador suporta a API de vibração
  if ('vibrate' in navigator) {
    switch (type) {
      case 'light':
        navigator.vibrate(10) // Vibração sutil de 10ms
        break
      case 'medium':
        navigator.vibrate(20) // Vibração média de 20ms
        break
      case 'heavy':
        navigator.vibrate([50, 10, 50]) // Vibração dupla de 50ms com pausa de 10ms
        break
    }
  }
}

// Função para feedback tátil em botões
export function handleButtonPress(callback?: () => void, feedbackType: 'light' | 'medium' | 'heavy' = 'light'): void {
  triggerHapticFeedback(feedbackType)
  if (callback) {
    callback()
  }
}

// Função para feedback tátil em cards clicáveis
export function handleCardPress(callback?: () => void): void {
  triggerHapticFeedback('light')
  if (callback) {
    callback()
  }
}

// Função para validar CPF
export function validateCPF(cpf: string): boolean {
  // Remove caracteres não numéricos
  const cleanCPF = cpf.replace(/\D/g, '')
  
  // Verifica se tem 11 dígitos
  if (cleanCPF.length !== 11) {
    return false
  }
  
  // Verifica se todos os dígitos são iguais (CPF inválido)
  if (/^(\d)\1{10}$/.test(cleanCPF)) {
    return false
  }
  
  // Validação dos dígitos verificadores
  let sum = 0
  let remainder
  
  // Valida primeiro dígito verificador
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) {
    return false
  }
  
  // Valida segundo dígito verificador
  sum = 0
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleanCPF.substring(10, 11))) {
    return false
  }
  
  return true
}

// Função para formatar CPF (XXX.XXX.XXX-XX)
export function formatCPF(cpf: string): string {
  const cleanCPF = cpf.replace(/\D/g, '')
  if (cleanCPF.length !== 11) {
    return cpf // Retorna o valor original se não tiver 11 dígitos
  }
  return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

/**
 * Wrapper global para fetch com timeout padrão de 7s e retry automático
 * @param url URL da requisição
 * @param options Opções do fetch (incluindo timeout customizado)
 * @returns Response da requisição
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number; maxRetries?: number } = {}
): Promise<Response> {
  const {
    timeout = 7000, // 7 segundos padrão
    maxRetries = 2, // 2 tentativas padrão
    ...fetchOptions
  } = options

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      let timeoutId: NodeJS.Timeout | null = null

      // Configurar timeout apenas se não for 0 ou negativo
      if (timeout > 0) {
        timeoutId = setTimeout(() => {
          controller.abort()
        }, timeout)
      }

      try {
        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal
        })
        
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        
        return response
      } catch (error: any) {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        
        // Se for erro de abort (timeout), criar erro mais descritivo
        if (error.name === 'AbortError' || error.message === 'The user aborted a request.') {
          throw new Error(`Timeout após ${timeout}ms ao buscar ${url}`)
        }
        
        throw error
      }
    } catch (error: any) {
      lastError = error

      // Se não for a última tentativa, aguardar antes de tentar novamente
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 500)) // 500ms entre tentativas
        continue
      }

      // Última tentativa falhou, lançar erro
      throw error
    }
  }

  throw lastError || new Error(`Erro ao buscar ${url} após ${maxRetries} tentativas`)
}

/**
 * Executa uma função com retry automático em caso de timeout ou erro
 * @param fn Função assíncrona a ser executada
 * @param options Opções de retry (maxRetries, timeout, delay)
 * @returns Resultado da função ou lança erro após todas as tentativas
 */
export async function retryWithTimeout<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    timeout?: number
    delay?: number
    onRetry?: (attempt: number, error: Error) => void
  } = {}
): Promise<T> {
  const {
    maxRetries = 2, // Reduzido de 3 para 2
    timeout = 7000, // Padronizado para 7 segundos
    delay = 500, // Reduzido de 1000 para 500ms
    onRetry
  } = options

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Criar promise de timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), timeout)
      })

      // Race entre a função e o timeout
      const result = await Promise.race([fn(), timeoutPromise])
      return result
    } catch (error: any) {
      lastError = error

      // Se não for a última tentativa, aguardar antes de tentar novamente
      if (attempt < maxRetries) {
        if (onRetry) {
          onRetry(attempt, error)
        }
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }

      // Última tentativa falhou, lançar erro
      throw error
    }
  }

  // Nunca deveria chegar aqui, mas TypeScript exige
  throw lastError || new Error('Erro desconhecido no retry')
}