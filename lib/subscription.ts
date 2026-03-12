import { supabase } from './supabase'
import { isSecretaria } from './user-utils'
import logger from './logger'

export interface Subscription {
  id: string
  user_id: string
  plan_type: 'monthly' | 'quarterly' | 'annual'
  amount: number
  status: 'pending' | 'active' | 'cancelled' | 'expired' | 'suspended'
  stripe_subscription_id: string | null
  stripe_customer_id: string | null
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  cancelled_at: string | null
  created_at: string
  updated_at: string
}

/**
 * Verifica se um usuário tem assinatura ativa ou está no período de teste
 * Secretárias sempre retornam true (não precisam pagar)
 * @param userId ID do usuário
 * @returns true se tiver assinatura ativa, estiver no período de teste ou for secretária
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  try {
    if (!supabase) {
      return false
    }

    // Secretárias não precisam de assinatura
    const isSec = await isSecretaria(userId)
    if (isSec) {
      return true
    }

    // Tentar usar API route primeiro (bypass RLS) com timeout
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        // Criar AbortController para timeout de 5 segundos
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

        try {
          const response = await fetch('/api/subscription/check', {
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            },
            signal: controller.signal
          })

          clearTimeout(timeoutId)

          if (response.ok) {
            const data = await response.json()
            if (data.hasAccess === true) {
              return true
            }
          }
        } catch (fetchError: any) {
          clearTimeout(timeoutId)
          // Se for abort (timeout), relançar como timeout
          if (fetchError.name === 'AbortError') {
            throw new Error('Timeout')
          }
          throw fetchError
        }
      }
    } catch (apiError: any) {
      // Se for timeout, continuar com fallback
      if (apiError.message === 'Timeout' || apiError.name === 'AbortError' || apiError.message?.includes('timeout')) {
        // Continuar com fallback
      }
    }

    // Fallback: Verificar período de teste gratuito (7 dias + meses grátis)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('trial_ends_at, created_at, free_months')
      .eq('id', userId)
      .maybeSingle()

    if (userError) {
      // Se houver erro de RLS, tentar retornar true temporariamente para não bloquear
      if (userError.message?.includes('permission') || userError.message?.includes('policy')) {
        return true
      }
    }

    if (!userError && userData) {
      const now = new Date()
      const freeMonths = userData.free_months || 0
      
      // Calcular data base do término do teste
      // Se trial_ends_at existe, usar ele como base
      // Se não existe, calcular a partir de created_at + 7 dias
      let trialEndsAt: Date | null = null
      
      if (userData.trial_ends_at) {
        // Usar trial_ends_at como base
        trialEndsAt = new Date(userData.trial_ends_at)
      } else if (userData.created_at) {
        // Calcular a partir de created_at + 7 dias
        trialEndsAt = new Date(new Date(userData.created_at).getTime() + 7 * 24 * 60 * 60 * 1000)
      }

      // Adicionar meses grátis se houver (cada mês = 30 dias)
      if (trialEndsAt && freeMonths > 0) {
        trialEndsAt = new Date(trialEndsAt.getTime() + (freeMonths * 30 * 24 * 60 * 60 * 1000))
      }

      if (trialEndsAt && now <= trialEndsAt) {
        // Usuário está dentro do período de teste gratuito (incluindo meses grátis)
        return true
      }
    }

    // Verificar assinatura ativa
    const { data, error } = await supabase
      .from('subscriptions')
      .select('id, status, current_period_end')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle()

    if (error) {
      logger.error('Erro ao verificar assinatura:', error)
      return false
    }

    if (!data) {
      // Sem assinatura ativa e período de teste expirado
      return false
    }

    // Verificar se a assinatura não expirou
    const periodEnd = new Date(data.current_period_end)
    const now = new Date()
    
    if (periodEnd < now) {
      // Assinatura expirada, atualizar status
      await supabase
        .from('subscriptions')
        .update({ status: 'expired' })
        .eq('id', data.id)

      await supabase
        .from('users')
        .update({ subscription_status: 'inactive' })
        .eq('id', userId)

      return false
    }

    return true
  } catch (error) {
    logger.error('Erro ao verificar assinatura:', error)
    return false
  }
}

/**
 * Obtém a assinatura ativa de um usuário
 * @param userId ID do usuário
 * @returns Assinatura ativa ou null
 */
export async function getActiveSubscription(userId: string): Promise<Subscription | null> {
  try {
    if (!supabase) {
      return null
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle()

    if (error) {
      logger.error('Erro ao obter assinatura:', error)
      return null
    }

    return data as Subscription | null
  } catch (error) {
    logger.error('Erro ao obter assinatura:', error)
    return null
  }
}

/**
 * Obtém todas as assinaturas de um usuário
 * @param userId ID do usuário
 * @returns Lista de assinaturas
 */
export async function getUserSubscriptions(userId: string): Promise<Subscription[]> {
  try {
    if (!supabase) {
      return []
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Erro ao obter assinaturas:', error)
      return []
    }

    return (data || []) as Subscription[]
  } catch (error) {
    logger.error('Erro ao obter assinaturas:', error)
    return []
  }
}

