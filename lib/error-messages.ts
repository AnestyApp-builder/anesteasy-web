/**
 * Utilitário para converter erros técnicos em mensagens amigáveis
 * Tarefa #4 - Melhorar Mensagens de Erro com Contexto
 */

export interface ErrorMessage {
  message: string
  action?: string
  variant?: 'error' | 'warning' | 'info'
}

/**
 * Converte erros do Supabase, API e rede em mensagens contextuais
 */
export function getErrorMessage(error: any): ErrorMessage {
  // Se o erro for null ou undefined, retornar mensagem padrão
  if (!error) {
    return {
      message: 'Ocorreu um erro inesperado ao processar sua solicitação.',
      action: 'Tente novamente ou entre em contato com o suporte se o problema persistir.',
      variant: 'error'
    }
  }

  // Erros do Supabase (PostgreSQL)
  if (error?.code === '23505') {
    return {
      message: 'Este registro já existe no sistema.',
      action: 'Verifique se você não está tentando criar um duplicado.',
      variant: 'warning'
    }
  }

  if (error?.code === 'PGRST116') {
    return {
      message: 'Não foi possível encontrar o registro solicitado.',
      action: 'Recarregue a página ou tente novamente.',
      variant: 'warning'
    }
  }

  if (error?.code === '42501') {
    return {
      message: 'Você não tem permissão para realizar esta ação.',
      action: 'Verifique suas credenciais ou entre em contato com o suporte.',
      variant: 'error'
    }
  }

  // Erros de timeout
  if (error?.code === 'TIMEOUT' || error?.message?.includes('timeout')) {
    return {
      message: 'A operação demorou mais do que o esperado.',
      action: 'Verifique sua conexão com a internet e tente novamente.',
      variant: 'error'
    }
  }

  // Erros de rede (fetch)
  if (error?.message?.includes('fetch') || error?.message?.includes('network')) {
    return {
      message: 'Não foi possível conectar com o servidor.',
      action: 'Verifique sua conexão com a internet e tente novamente.',
      variant: 'error'
    }
  }

  // Erros de autenticação
  if (error?.message?.includes('401') || 
      error?.message?.includes('Unauthorized') ||
      error?.message?.includes('Refresh Token') ||
      error?.message?.includes('session expired')) {
    return {
      message: 'Sua sessão expirou.',
      action: 'Faça login novamente para continuar.',
      variant: 'warning'
    }
  }

  // Erros 403 - Forbidden
  if (error?.message?.includes('403') || error?.message?.includes('Forbidden')) {
    return {
      message: 'Você não tem permissão para acessar este recurso.',
      action: 'Entre em contato com o administrador se acredita que isso é um erro.',
      variant: 'error'
    }
  }

  // Erros 404 - Not Found
  if (error?.message?.includes('404') || error?.message?.includes('Not Found')) {
    return {
      message: 'Recurso não encontrado.',
      action: 'O item que você está procurando pode ter sido removido ou não existe.',
      variant: 'warning'
    }
  }

  // Erros 500 - Internal Server Error
  if (error?.message?.includes('500') || error?.message?.includes('Internal Server')) {
    return {
      message: 'Ocorreu um erro no servidor.',
      action: 'Nossa equipe foi notificada. Tente novamente em alguns instantes.',
      variant: 'error'
    }
  }

  // Erros de validação
  if (error?.message?.includes('validation') || error?.message?.includes('invalid')) {
    return {
      message: 'Os dados fornecidos são inválidos.',
      action: 'Verifique os campos do formulário e tente novamente.',
      variant: 'warning'
    }
  }

  // Erros de Stripe
  if (error?.type === 'StripeCardError' || error?.code?.startsWith('card_')) {
    return {
      message: 'Erro no cartão de crédito.',
      action: 'Verifique os dados do cartão e tente novamente.',
      variant: 'error'
    }
  }

  if (error?.code === 'resource_missing') {
    return {
      message: 'Recurso de pagamento não encontrado.',
      action: 'Tente novamente ou entre em contato com o suporte.',
      variant: 'error'
    }
  }

  // Padrão - mensagem genérica
  // Garantir que sempre retorne uma mensagem válida
  const errorMessage = error?.message || error?.toString() || 'Ocorreu um erro inesperado.'
  
  // Se a mensagem for "undefined" ou vazia, usar mensagem padrão
  const finalMessage = (errorMessage === 'undefined' || errorMessage.trim() === '') 
    ? 'Ocorreu um erro inesperado ao processar sua solicitação.'
    : errorMessage

  return {
    message: finalMessage,
    action: 'Tente novamente ou entre em contato com o suporte se o problema persistir.',
    variant: 'error'
  }
}

/**
 * Extrai uma mensagem curta para usar em toasts
 */
export function getShortErrorMessage(error: any): string {
  const errorMsg = getErrorMessage(error)
  return errorMsg.message
}

/**
 * Formata mensagens de erro para exibição completa (com ação)
 */
export function getFullErrorMessage(error: any): { title: string; description: string; variant: 'success' | 'error' | 'warning' | 'info' } {
  const errorMsg = getErrorMessage(error)
  return {
    title: errorMsg.message,
    description: errorMsg.action || '',
    variant: errorMsg.variant || 'error'
  }
}

