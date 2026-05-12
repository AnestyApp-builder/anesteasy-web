import { createClient } from '@supabase/supabase-js';
import { BUSINESS_RULES } from '../constants';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export interface SubscriptionCheckResult {
  has_access: boolean;
  status: 'active' | 'trial' | 'inactive';
  trial_days_left: number;
  trial_ends_at: string | null;
  free_months: number;
  plan_type: string | null;
  subscription_status?: string | null;
}

/**
 * Serviço responsável por gerenciar regras de assinatura e acesso (Trial/Active).
 * Centraliza a verificação de permissões do usuário.
 */
export const subscriptionService = {
  /**
   * Verifica se o usuário tem acesso ao sistema (Trial ativo ou Assinatura paga).
   * 
   * @param userId ID do usuário no Supabase
   * @returns Objeto com status de acesso, dias restantes de trial e tipo de plano
   */
  async checkUserSubscription(userId: string): Promise<SubscriptionCheckResult> {
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Configuração do servidor incompleta');
    }

    // 1. Buscar usuário — tentar com trial_ends_at; se falhar, usar só created_at
    let user: { created_at: string; subscription_plan: string | null; subscription_status: string | null; trial_ends_at?: string | null; free_months?: number | null } | null = null

    const { data: fullUser, error: fullError } = await supabaseAdmin
      .from('users')
      .select('created_at, subscription_plan, subscription_status, trial_ends_at, free_months')
      .eq('id', userId)
      .single();

    if (!fullError && fullUser) {
      user = fullUser as any
    } else {
      // Fallback: colunas novas podem não existir no DB — tentar só as básicas
      const { data: basicUser, error: basicError } = await supabaseAdmin
        .from('users')
        .select('created_at, subscription_plan, subscription_status')
        .eq('id', userId)
        .single();
      if (basicError || !basicUser) throw new Error('Usuário não encontrado');
      user = basicUser as any
    }

    if (!user) throw new Error('Usuário não encontrado');

    // 2. Buscar assinatura ativa
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('status, current_period_end, plan_type')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 3. Lógica de Decisão
    const now = new Date();

    // Possui assinatura ativa e não expirada
    if (sub && sub.status === 'active' && new Date(sub.current_period_end) > now) {
      return {
        has_access: true,
        status: 'active',
        trial_days_left: 0,
        trial_ends_at: user.trial_ends_at || null,
        free_months: user.free_months || 0,
        plan_type: sub.plan_type,
        subscription_status: 'active'
      };
    }

    // Verificar Trial — usar trial_ends_at se disponível, senão calcular de created_at
    const trialDays = BUSINESS_RULES.TRIAL_DAYS || 7;
    let trialEndDate: Date;
    const trialEndsAtRaw = user.trial_ends_at;
    const freeMonths: number = user.free_months || 0;

    if (trialEndsAtRaw) {
      trialEndDate = new Date(trialEndsAtRaw);
    } else {
      trialEndDate = new Date(new Date(user.created_at).getTime() + trialDays * 24 * 60 * 60 * 1000);
    }

    // Acrescentar meses grátis
    if (freeMonths > 0) {
      trialEndDate = new Date(trialEndDate.getTime() + freeMonths * 30 * 24 * 60 * 60 * 1000);
    }

    const diffTime = trialEndDate.getTime() - now.getTime();
    const trialDaysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    if (trialDaysLeft > 0) {
      return {
        has_access: true,
        status: 'trial',
        trial_days_left: trialDaysLeft,
        trial_ends_at: trialEndsAtRaw || null,
        free_months: freeMonths,
        plan_type: user.subscription_plan,
        subscription_status: user.subscription_status
      };
    }

    // Sem acesso
    return {
      has_access: false,
      status: 'inactive',
      trial_days_left: 0,
      trial_ends_at: trialEndsAtRaw || null,
      free_months: freeMonths,
      plan_type: user.subscription_plan,
      subscription_status: user.subscription_status
    };
  }
};
