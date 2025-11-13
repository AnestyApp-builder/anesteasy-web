/**
 * Lógica de verificação de acesso à plataforma baseada em assinatura
 * Implementa regras de negócio para acesso, cancelamento e mudanças de plano
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabaseAdmin = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

export interface SubscriptionAccess {
  hasAccess: boolean
  reason?: string
  subscriptionStatus?: string
  expiresAt?: string
  daysRemaining?: number
}

/**
 * Verifica se o usuário tem acesso à plataforma
 * Regras:
 * 1. PRIMEIRO: Verificar período de teste (7 dias gratuitos para contas novas)
 * 2. Status 'active' → tem acesso até current_period_end
 * 3. Status 'cancelled' → tem acesso até current_period_end (cancelamento no fim do período)
 * 4. Status 'pending' → tem acesso limitado
 * 5. Status 'expired' ou 'suspended' → sem acesso
 */
export async function checkSubscriptionAccess(userId: string): Promise<SubscriptionAccess> {
  if (!supabaseAdmin) {
    return { hasAccess: false, reason: 'Sistema de verificação não configurado' }
  }

  try {
    // PRIMEIRO: Verificar período de teste gratuito
    const { data: userData, error: userError } = await supabaseAdmin
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
      }

      if (trialEndsAt && now <= trialEndsAt) {
        // Usuário está dentro do período de teste (incluindo meses grátis)
        const daysRemaining = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        const reasonText = freeMonths > 0 
          ? `Período gratuito (${daysRemaining} ${daysRemaining === 1 ? 'dia restante' : 'dias restantes'} - ${freeMonths} ${freeMonths === 1 ? 'mês grátis' : 'meses grátis'} incluídos)`
          : `Período de teste gratuito (${daysRemaining} ${daysRemaining === 1 ? 'dia restante' : 'dias restantes'})`
        
        return {
          hasAccess: true,
          reason: reasonText,
          subscriptionStatus: 'trial',
          expiresAt: trialEndsAt.toISOString(),
          daysRemaining: daysRemaining > 0 ? daysRemaining : 0
        }
      } else if (trialEndsAt && now > trialEndsAt) {
        // Período de teste expirado (incluindo meses grátis), verificar se tem assinatura ativa
        // Continuar com a verificação de assinatura abaixo
      }
    }

    // Verificar assinatura ativa
    const { data: subscription, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !subscription) {
      // Se não tem assinatura e o período de teste expirou, sem acesso
      if (userData?.trial_ends_at) {
        const trialEndsAt = new Date(userData.trial_ends_at)
        if (new Date() > trialEndsAt) {
          return { 
            hasAccess: false, 
            reason: 'Período de teste expirado. É necessário assinar um plano para continuar usando a plataforma.',
            subscriptionStatus: 'trial_expired'
          }
        }
      }
      return { hasAccess: false, reason: 'Nenhuma assinatura encontrada e período de teste expirado' }
    }

    const now = new Date()
    const periodEnd = subscription.current_period_end 
      ? new Date(subscription.current_period_end) 
      : null

    // Calcular dias restantes
    const daysRemaining = periodEnd 
      ? Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0

    // Regra 1: Assinatura ativa → acesso garantido até fim do período
    if (subscription.status === 'active') {
      if (periodEnd && now <= periodEnd) {
        return {
          hasAccess: true,
          subscriptionStatus: 'active',
          expiresAt: subscription.current_period_end || undefined,
          daysRemaining: daysRemaining > 0 ? daysRemaining : 0
        }
      } else {
        return {
          hasAccess: false,
          reason: 'Período de assinatura expirado',
          subscriptionStatus: 'expired'
        }
      }
    }

    // Regra 2: Assinatura cancelada → acesso até fim do período atual
    if (subscription.status === 'cancelled') {
      if (periodEnd && now <= periodEnd) {
        return {
          hasAccess: true,
          reason: 'Acesso mantido até fim do período atual (assinatura cancelada)',
          subscriptionStatus: 'cancelled',
          expiresAt: subscription.current_period_end || undefined,
          daysRemaining: daysRemaining > 0 ? daysRemaining : 0
        }
      } else {
        return {
          hasAccess: false,
          reason: 'Período de acesso expirado após cancelamento',
          subscriptionStatus: 'cancelled'
        }
      }
    }

    // Regra 3: Assinatura pendente → acesso limitado
    if (subscription.status === 'pending') {
      return {
        hasAccess: true,
        reason: 'Aguardando confirmação do pagamento',
        subscriptionStatus: 'pending',
        expiresAt: subscription.current_period_end || undefined
      }
    }

    // Regra 4: Outros status → sem acesso
    return {
      hasAccess: false,
      reason: `Assinatura com status: ${subscription.status}`,
      subscriptionStatus: subscription.status
    }

  } catch (error) {
    console.error('Erro ao verificar acesso:', error)
    return { hasAccess: false, reason: 'Erro ao verificar assinatura' }
  }
}

/**
 * Calcula dias de uso da plataforma desde a criação da assinatura
 */
export async function calculateDaysUsed(subscriptionId: string): Promise<number> {
  if (!supabaseAdmin) return 0

  try {
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('created_at, current_period_start')
      .eq('id', subscriptionId)
      .maybeSingle()

    if (!subscription) return 0

    const startDate = subscription.current_period_start 
      ? new Date(subscription.current_period_start)
      : new Date(subscription.created_at)
    
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - startDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    return diffDays
  } catch (error) {
    console.error('Erro ao calcular dias de uso:', error)
    return 0
  }
}

/**
 * Verifica se o usuário é elegível para reembolso (< 8 dias de uso)
 */
export async function checkRefundEligibility(subscriptionId: string): Promise<{
  eligible: boolean
  daysUsed: number
  reason?: string
}> {
  const daysUsed = await calculateDaysUsed(subscriptionId)
  
  if (daysUsed < 8) {
    return {
      eligible: true,
      daysUsed,
      reason: `Usuário utilizou a plataforma por ${daysUsed} dias (menos de 8 dias)`
    }
  }

  return {
    eligible: false,
    daysUsed,
    reason: `Usuário utilizou a plataforma por ${daysUsed} dias (mínimo de 8 dias para reembolso)`
  }
}

/**
 * Atualiza os dias de uso na assinatura
 */
export async function updateDaysUsed(subscriptionId: string): Promise<void> {
  if (!supabaseAdmin) return

  try {
    const daysUsed = await calculateDaysUsed(subscriptionId)
    
    await supabaseAdmin
      .from('subscriptions')
      .update({ days_used: daysUsed })
      .eq('id', subscriptionId)
  } catch (error) {
    console.error('Erro ao atualizar dias de uso:', error)
  }
}

