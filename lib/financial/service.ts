import { supabase } from '../supabase';
import { FinancialSummary } from './types';
import { Procedure } from '../procedures';
import { BUSINESS_RULES } from '../constants';

export const financialService = {
  /**
   * Obtém procedimentos não enviados para cobrança (pendentes)
   * Agora retornamos todos os pendentes recentes (menos de 30 dias)
   */
  async getPendingProcedures(userId: string) {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - BUSINESS_RULES.LATE_PAYMENT_THRESHOLD_DAYS);

    const { data, error } = await supabase
      .from('procedures')
      .select('*')
      .eq('user_id', userId)
      .eq('payment_status', 'pending')
      .gte('created_at', thresholdDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pending procedures:', error);
      return [];
    }

    return data as Procedure[];
  },

  /**
   * Obtém procedimentos com atraso grave (> 30 dias e não enviado/pago)
   */
  async getLatePayments(userId: string) {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - BUSINESS_RULES.LATE_PAYMENT_THRESHOLD_DAYS);

    const { data, error } = await supabase
      .from('procedures')
      .select('*')
      .eq('user_id', userId)
      .eq('payment_status', 'pending')
      .lt('created_at', thresholdDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching late payments:', error);
      return [];
    }

    return data as Procedure[];
  },

  /**
   * Obtém procedimentos próximos do vencimento (5 dias)
   */
  async getNearPayments(userId: string) {
    const today = new Date();
    const nearThreshold = new Date();
    nearThreshold.setDate(today.getDate() + BUSINESS_RULES.NEAR_PAYMENT_DAYS);

    const todayStr = today.toISOString().split('T')[0];
    const thresholdStr = nearThreshold.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('procedures')
      .select('*')
      .eq('user_id', userId)
      .neq('payment_status', 'paid')
      .gte('expected_payment_date', todayStr)
      .lte('expected_payment_date', thresholdStr)
      .order('expected_payment_date', { ascending: true });

    if (error) {
      console.error('Error fetching near payments:', error);
      return [];
    }

    return data as Procedure[];
  },

  /**
   * Gera o resumo financeiro completo
   */
  async getFinancialSummary(userId: string, period: 'weekly' | 'monthly' | 'custom' = 'monthly', customRange?: { start: string, end: string }): Promise<FinancialSummary> {
    let query = supabase
      .from('procedures')
      .select('procedure_value, payment_status, created_at, paid_at, expected_payment_date')
      .eq('user_id', userId);

    if (period === 'weekly') {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      query = query.gte('created_at', lastWeek.toISOString());
    } else if (period === 'monthly') {
      const lastMonth = new Date();
      lastMonth.setDate(lastMonth.getDate() - 30);
      query = query.gte('created_at', lastMonth.toISOString());
    } else if (customRange) {
      query = query.gte('created_at', customRange.start).lte('created_at', customRange.end);
    }

    const { data, error } = await query;

    if (error || !data) {
      return {
        totalProduced: 0,
        totalReceived: 0,
        totalPending: 0,
        totalLate: 0,
        procedureCount: 0,
        averageReceiptDays: 0
      };
    }

    const today = new Date().toISOString().split('T')[0];
    
    let totalProduced = 0;
    let totalReceived = 0;
    let totalPending = 0;
    let totalLate = 0;
    let paidCount = 0;
    let totalDaysToPay = 0;

    data.forEach(p => {
      const value = p.procedure_value || 0;
      totalProduced += value;

      if (p.payment_status === 'paid') {
        totalReceived += value;
        if (p.paid_at && p.created_at) {
          const created = new Date(p.created_at);
          const paid = new Date(p.paid_at);
          const diff = Math.ceil((paid.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
          if (diff > 0) {
            totalDaysToPay += diff;
            paidCount++;
          }
        }
      } else {
        totalPending += value;
        if (p.expected_payment_date && p.expected_payment_date < today) {
          totalLate += value;
        }
      }
    });

    return {
      totalProduced,
      totalReceived,
      totalPending,
      totalLate,
      procedureCount: data.length,
      averageReceiptDays: paidCount > 0 ? Math.round(totalDaysToPay / paidCount) : 0
    };
  }
};
