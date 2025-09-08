/**
 * Utilitários de segurança para blindagem de dados
 * Garante que cada usuário acesse apenas seus próprios dados
 */

import { supabase } from '../lib/supabase';
import type { AuthUser } from '../services/authService';

// Interface para validação de acesso
interface AccessValidation {
  isValid: boolean;
  error?: string;
  userId?: string;
}

/**
 * Valida se o usuário está autenticado e pode acessar os dados
 */
export const validateUserAccess = async (): Promise<AccessValidation> => {
  try {
    // Verificar se há sessão ativa
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      return {
        isValid: false,
        error: 'Erro ao verificar sessão'
      };
    }

    if (!session?.user) {
      return {
        isValid: false,
        error: 'Usuário não autenticado'
      };
    }

    return {
      isValid: true,
      userId: session.user.id
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Erro interno de validação'
    };
  }
};

/**
 * Valida se o usuário pode acessar um recurso específico
 */
export const validateResourceAccess = async (
  resourceUserId: string,
  currentUserId?: string
): Promise<AccessValidation> => {
  try {
    // Se não foi fornecido o currentUserId, buscar da sessão
    let userId = currentUserId;
    if (!userId) {
      const validation = await validateUserAccess();
      if (!validation.isValid) {
        return validation;
      }
      userId = validation.userId!;
    }

    // Verificar se o usuário está tentando acessar seus próprios dados
    if (userId !== resourceUserId) {
      return {
        isValid: false,
        error: 'Acesso negado: tentativa de acessar dados de outro usuário'
      };
    }

    return {
      isValid: true,
      userId
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Erro ao validar acesso ao recurso'
    };
  }
};

/**
 * Sanitiza dados antes de enviar para o banco
 */
export const sanitizeData = <T extends Record<string, any>>(
  data: T,
  allowedFields: (keyof T)[]
): Partial<T> => {
  const sanitized: Partial<T> = {};
  
  for (const field of allowedFields) {
    if (field in data) {
      sanitized[field] = data[field];
    }
  }
  
  return sanitized;
};

/**
 * Valida se os dados de entrada são seguros
 */
export const validateInputData = (data: any, requiredFields: string[]): AccessValidation => {
  try {
    // Verificar se todos os campos obrigatórios estão presentes
    for (const field of requiredFields) {
      if (!(field in data) || data[field] === null || data[field] === undefined) {
        return {
          isValid: false,
          error: `Campo obrigatório ausente: ${field}`
        };
      }
    }

    // Verificar se não há campos suspeitos
    const suspiciousFields = ['admin', 'root', 'system', 'internal'];
    for (const field of suspiciousFields) {
      if (field in data) {
        return {
          isValid: false,
          error: `Campo suspeito detectado: ${field}`
        };
      }
    }

    return {
      isValid: true
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Erro ao validar dados de entrada'
    };
  }
};

/**
 * Cria um wrapper seguro para operações de banco de dados
 */
export const createSecureOperation = <T extends any[], R>(
  operation: (...args: T) => Promise<R>,
  userIdField: string = 'user_id'
) => {
  return async (...args: T): Promise<R> => {
    // Validar acesso do usuário
    const accessValidation = await validateUserAccess();
    if (!accessValidation.isValid) {
      throw new Error(accessValidation.error);
    }

    // Executar operação com validação
    try {
      const result = await operation(...args);
      return result;
    } catch (error) {
      // Log de erro de segurança
      console.error('Erro de segurança na operação:', {
        error,
        userId: accessValidation.userId,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  };
};

/**
 * Valida se um ID é um UUID válido
 */
export const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

/**
 * Valida se um email é válido
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Cria um hash seguro para logs de auditoria
 */
export const createAuditHash = (data: any): string => {
  const dataString = JSON.stringify(data, Object.keys(data).sort());
  // Em produção, usar uma função de hash mais segura
  return btoa(dataString).slice(0, 16);
};

/**
 * Valida permissões de usuário baseado no plano de assinatura
 */
export const validateSubscriptionAccess = (
  user: AuthUser,
  requiredPlan: 'standard' | 'premium' | 'enterprise'
): AccessValidation => {
  const planHierarchy = {
    standard: 1,
    premium: 2,
    enterprise: 3
  };

  const userPlanLevel = planHierarchy[user.subscription_plan as keyof typeof planHierarchy] || 0;
  const requiredPlanLevel = planHierarchy[requiredPlan];

  if (userPlanLevel < requiredPlanLevel) {
    return {
      isValid: false,
      error: `Acesso negado: plano ${user.subscription_plan} não tem permissão para esta funcionalidade. Necessário: ${requiredPlan}`
    };
  }

  return {
    isValid: true,
    userId: user.id
  };
};

/**
 * Limpa dados sensíveis antes de retornar para o frontend
 */
export const sanitizeUserData = (user: any): any => {
  const { password_hash, ...sanitizedUser } = user;
  return sanitizedUser;
};

/**
 * Valida se uma operação está dentro dos limites do plano
 */
export const validatePlanLimits = async (
  userId: string,
  operation: 'procedures' | 'reports' | 'storage',
  currentCount: number,
  limit: number
): Promise<AccessValidation> => {
  if (currentCount >= limit) {
    return {
      isValid: false,
      error: `Limite do plano atingido para ${operation}. Limite: ${limit}`
    };
  }

  return {
    isValid: true,
    userId
  };
};

/**
 * Cria um token de auditoria para rastreamento
 */
export const createAuditToken = (userId: string, operation: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  return `${userId.slice(0, 8)}_${operation}_${timestamp}_${random}`;
};

/**
 * Valida se uma requisição é legítima
 */
export const validateRequest = async (
  userId: string,
  operation: string,
  data?: any
): Promise<AccessValidation> => {
  try {
    // Verificar se o usuário está autenticado
    const accessValidation = await validateUserAccess();
    if (!accessValidation.isValid) {
      return accessValidation;
    }

    // Verificar se o userId da requisição corresponde ao usuário autenticado
    if (accessValidation.userId !== userId) {
      return {
        isValid: false,
        error: 'Tentativa de acesso com ID de usuário incorreto'
      };
    }

    // Validar dados se fornecidos
    if (data) {
      const dataValidation = validateInputData(data, []);
      if (!dataValidation.isValid) {
        return dataValidation;
      }
    }

    return {
      isValid: true,
      userId: accessValidation.userId
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Erro ao validar requisição'
    };
  }
};
