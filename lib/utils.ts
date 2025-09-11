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

export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
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
