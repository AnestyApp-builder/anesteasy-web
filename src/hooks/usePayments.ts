import { useState, useEffect, useCallback } from 'react';
import { paymentsService } from '../services/paymentsService';
import type { Payment, PaymentInsert, PaymentUpdate, PaymentFilters, PaymentStats } from '../types';

export const usePayments = (userId: string) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<PaymentStats | null>(null);

  // Buscar pagamentos
  const fetchPayments = useCallback(async (filters?: PaymentFilters, limit?: number, offset?: number) => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError, count } = await paymentsService.getPayments(
        userId,
        filters,
        limit,
        offset
      );

      if (fetchError) {
        setError(fetchError);
        return;
      }

      setPayments(data);
    } catch (err) {
      setError('Erro ao buscar pagamentos');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Buscar pagamentos com procedimentos
  const fetchPaymentsWithProcedures = useCallback(async (filters?: PaymentFilters, limit?: number, offset?: number) => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError, count } = await paymentsService.getPaymentsWithProcedures(
        userId,
        filters,
        limit,
        offset
      );

      if (fetchError) {
        setError(fetchError);
        return;
      }

      return { data, count };
    } catch (err) {
      setError('Erro ao buscar pagamentos');
      return { data: [], count: 0 };
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Buscar estatísticas
  const fetchStats = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error: statsError } = await paymentsService.getPaymentStats(userId);
      
      if (statsError) {
        setError(statsError);
        return;
      }

      setStats(data);
    } catch (err) {
      setError('Erro ao buscar estatísticas de pagamentos');
    }
  }, [userId]);

  // Criar pagamento
  const createPayment = useCallback(async (paymentData: PaymentInsert) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: createError } = await paymentsService.createPayment(paymentData);

      if (createError) {
        setError(createError);
        return null;
      }

      // Atualizar lista local
      setPayments(prev => [data!, ...prev]);
      
      // Atualizar estatísticas
      await fetchStats();

      return data;
    } catch (err) {
      setError('Erro ao criar pagamento');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchStats]);

  // Atualizar pagamento
  const updatePayment = useCallback(async (paymentId: string, updates: PaymentUpdate) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: updateError } = await paymentsService.updatePayment(
        paymentId,
        userId,
        updates
      );

      if (updateError) {
        setError(updateError);
        return null;
      }

      // Atualizar lista local
      setPayments(prev => 
        prev.map(p => p.id === paymentId ? data! : p)
      );

      // Atualizar estatísticas
      await fetchStats();

      return data;
    } catch (err) {
      setError('Erro ao atualizar pagamento');
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId, fetchStats]);

  // Deletar pagamento
  const deletePayment = useCallback(async (paymentId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await paymentsService.deletePayment(paymentId, userId);

      if (deleteError) {
        setError(deleteError);
        return false;
      }

      // Atualizar lista local
      setPayments(prev => prev.filter(p => p.id !== paymentId));

      // Atualizar estatísticas
      await fetchStats();

      return true;
    } catch (err) {
      setError('Erro ao deletar pagamento');
      return false;
    } finally {
      setLoading(false);
    }
  }, [userId, fetchStats]);

  // Marcar como concluído
  const markAsCompleted = useCallback(async (paymentId: string, paymentDate?: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: markError } = await paymentsService.markAsCompleted(
        paymentId,
        userId,
        paymentDate
      );

      if (markError) {
        setError(markError);
        return null;
      }

      // Atualizar lista local
      setPayments(prev => 
        prev.map(p => p.id === paymentId ? data! : p)
      );

      // Atualizar estatísticas
      await fetchStats();

      return data;
    } catch (err) {
      setError('Erro ao marcar como concluído');
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId, fetchStats]);

  // Buscar pagamentos pendentes
  const fetchPendingPayments = useCallback(async () => {
    if (!userId) return [];

    try {
      const { data, error: pendingError } = await paymentsService.getPendingPayments(userId);
      
      if (pendingError) {
        setError(pendingError);
        return [];
      }

      return data;
    } catch (err) {
      setError('Erro ao buscar pagamentos pendentes');
      return [];
    }
  }, [userId]);

  // Buscar pagamentos recentes
  const fetchRecentPayments = useCallback(async (limit: number = 5) => {
    if (!userId) return [];

    try {
      const { data, error: recentError } = await paymentsService.getRecentPayments(userId, limit);
      
      if (recentError) {
        setError(recentError);
        return [];
      }

      return data;
    } catch (err) {
      setError('Erro ao buscar pagamentos recentes');
      return [];
    }
  }, [userId]);

  // Buscar métodos de pagamento
  const fetchPaymentMethods = useCallback(async () => {
    if (!userId) return [];

    try {
      const { data, error: methodsError } = await paymentsService.getPaymentMethods(userId);
      
      if (methodsError) {
        setError(methodsError);
        return [];
      }

      return data;
    } catch (err) {
      setError('Erro ao buscar métodos de pagamento');
      return [];
    }
  }, [userId]);

  // Buscar pagamentos por período
  const fetchPaymentsByPeriod = useCallback(async (startDate: string, endDate: string) => {
    if (!userId) return [];

    try {
      const { data, error: periodError } = await paymentsService.getPaymentsByPeriod(
        userId,
        startDate,
        endDate
      );
      
      if (periodError) {
        setError(periodError);
        return [];
      }

      return data;
    } catch (err) {
      setError('Erro ao buscar pagamentos por período');
      return [];
    }
  }, [userId]);

  // Carregar dados iniciais
  useEffect(() => {
    if (userId) {
      fetchPayments();
      fetchStats();
    }
  }, [userId, fetchPayments, fetchStats]);

  return {
    payments,
    stats,
    loading,
    error,
    fetchPayments,
    fetchPaymentsWithProcedures,
    fetchStats,
    createPayment,
    updatePayment,
    deletePayment,
    markAsCompleted,
    fetchPendingPayments,
    fetchRecentPayments,
    fetchPaymentMethods,
    fetchPaymentsByPeriod,
    clearError: () => setError(null),
  };
};
