/**
 * Logger utilitário que só loga em desenvolvimento
 * Remove todos os logs em produção para evitar vazamento de informações
 */

const isDevelopment = process.env.NODE_ENV === 'development'

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args)
    }
  },
  error: (...args: any[]) => {
    // Erros críticos sempre logam, mas sem informações sensíveis
    if (isDevelopment) {
      console.error(...args)
    } else {
      // Em produção, apenas logar erros críticos sem detalhes sensíveis
      const sanitized = args.map(arg => {
        if (typeof arg === 'string') {
          // Remover tokens, emails, senhas, etc
          return arg
            .replace(/Bearer\s+[\w-]+/gi, 'Bearer [REDACTED]')
            .replace(/password[=:]\s*[\w]+/gi, 'password=[REDACTED]')
            .replace(/token[=:]\s*[\w-]+/gi, 'token=[REDACTED]')
            .replace(/email[=:]\s*[\w@.-]+/gi, 'email=[REDACTED]')
        }
        return arg
      })
      console.error(...sanitized)
    }
  },
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args)
    }
  },
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args)
    }
  },
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args)
    }
  }
}

// Exportar função helper para substituir console.log facilmente
export default logger

