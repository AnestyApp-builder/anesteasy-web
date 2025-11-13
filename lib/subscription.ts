import { supabase } from './supabase'
import { isSecretaria } from './user-utils'

export interface Subscription {
  id: string
  user_id: string
  plan_type: 'monthly' | 'quarterly' | 'annual'
  amount: number
  status: 'pending' | 'active' | 'cancelled' | 'expired' | 'suspended'
  pagarme_subscription_id: string | null
  pagarme_customer_id: string | null
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
    // Secretárias não precisam de assinatura
    const isSec = await isSecretaria(userId)
    if (isSec) {
      return true
    }

    // PRIMEIRO: Verificar período de teste gratuito (7 dias + meses grátis)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('trial_ends_at, created_at, free_months')
      .eq('id', userId)
      .maybeSingle()

    if (!userError && userData) {
      const now = new Date()
      
      // Calcular data base do término do teste (7 dias iniciais)
      let trialEndsAt = userData.trial_ends_at 
        ? new Date(userData.trial_ends_at)
        : userData.created_at 
          ? new Date(new Date(userData.created_at).getTime() + 7 * 24 * 60 * 60 * 1000) // Fallback: created_at + 7 dias
          : null

      // Adicionar meses grátis se houver (cada mês = 30 dias)
      const freeMonths = userData.free_months || 0
      if (trialEndsAt && freeMonths > 0) {
        trialEndsAt = new Date(trialEndsAt.getTime() + (freeMonths * 30 * 24 * 60 * 60 * 1000))
        console.log(`✅ [SUBSCRIPTION] Usuário tem ${freeMonths} ${freeMonths === 1 ? 'mês grátis' : 'meses grátis'} adicionais`)
      }

      if (trialEndsAt && now <= trialEndsAt) {
        // Usuário está dentro do período de teste gratuito (incluindo meses grátis)
        console.log('✅ [SUBSCRIPTION] Usuário está no período de teste gratuito')
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
      console.error('Erro ao verificar assinatura:', error)
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
    console.error('Erro ao verificar assinatura:', error)
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
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle()

    if (error) {
      console.error('Erro ao obter assinatura:', error)
      return null
    }

    return data as Subscription | null
  } catch (error) {
    console.error('Erro ao obter assinatura:', error)
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
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao obter assinaturas:', error)
      return []
    }

    return (data || []) as Subscription[]
  } catch (error) {
    console.error('Erro ao obter assinaturas:', error)
    return []
  }
}

