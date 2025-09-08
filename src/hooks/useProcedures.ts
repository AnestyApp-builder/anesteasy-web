import { useState, useEffect, useCallback } from 'react';
import { proceduresService } from '../services/proceduresService';
import type { Procedure, ProcedureInsert, ProcedureUpdate, ProcedureFilters, ProcedureStats } from '../types';

export const useProcedures = (userId: string) => {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ProcedureStats | null>(null);

  // Buscar procedimentos
  const fetchProcedures = useCallback(async (filters?: ProcedureFilters, limit?: number, offset?: number) => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError, count } = await proceduresService.getProcedures(
        userId,
        filters,
        limit,
        offset
      );

      if (fetchError) {
        setError(fetchError);
        return;
      }

      setProcedures(data);
    } catch (err) {
      setError('Erro ao buscar procedimentos');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Buscar estatísticas
  const fetchStats = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error: statsError } = await proceduresService.getProcedureStats(userId);
      
      if (statsError) {
        setError(statsError);
        return;
      }

      setStats(data);
    } catch (err) {
      setError('Erro ao buscar estatísticas');
    }
  }, [userId]);

  // Criar procedimento
  const createProcedure = useCallback(async (procedureData: ProcedureInsert) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: createError } = await proceduresService.createProcedure(procedureData);

      if (createError) {
        setError(createError);
        return null;
      }

      // Atualizar lista local
      setProcedures(prev => [data!, ...prev]);
      
      // Atualizar estatísticas
      await fetchStats();

      return data;
    } catch (err) {
      setError('Erro ao criar procedimento');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchStats]);

  // Atualizar procedimento
  const updateProcedure = useCallback(async (procedureId: string, updates: ProcedureUpdate) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: updateError } = await proceduresService.updateProcedure(
        procedureId,
        userId,
        updates
      );

      if (updateError) {
        setError(updateError);
        return null;
      }

      // Atualizar lista local
      setProcedures(prev => 
        prev.map(p => p.id === procedureId ? data! : p)
      );

      // Atualizar estatísticas
      await fetchStats();

      return data;
    } catch (err) {
      setError('Erro ao atualizar procedimento');
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId, fetchStats]);

  // Deletar procedimento
  const deleteProcedure = useCallback(async (procedureId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await proceduresService.deleteProcedure(procedureId, userId);

      if (deleteError) {
        setError(deleteError);
        return false;
      }

      // Atualizar lista local
      setProcedures(prev => prev.filter(p => p.id !== procedureId));

      // Atualizar estatísticas
      await fetchStats();

      return true;
    } catch (err) {
      setError('Erro ao deletar procedimento');
      return false;
    } finally {
      setLoading(false);
    }
  }, [userId, fetchStats]);

  // Marcar como pago
  const markAsPaid = useCallback(async (procedureId: string, paymentData: { payment_date: string; payment_method: string }) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: markError } = await proceduresService.markAsPaid(
        procedureId,
        userId,
        paymentData
      );

      if (markError) {
        setError(markError);
        return null;
      }

      // Atualizar lista local
      setProcedures(prev => 
        prev.map(p => p.id === procedureId ? data! : p)
      );

      // Atualizar estatísticas
      await fetchStats();

      return data;
    } catch (err) {
      setError('Erro ao marcar como pago');
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId, fetchStats]);

  // Buscar procedimentos recentes
  const fetchRecentProcedures = useCallback(async (limit: number = 5) => {
    if (!userId) return;

    try {
      const { data, error: recentError } = await proceduresService.getRecentProcedures(userId, limit);
      
      if (recentError) {
        setError(recentError);
        return [];
      }

      return data;
    } catch (err) {
      setError('Erro ao buscar procedimentos recentes');
      return [];
    }
  }, [userId]);

  // Buscar tipos de procedimentos
  const fetchProcedureTypes = useCallback(async () => {
    if (!userId) return [];

    try {
      const { data, error: typesError } = await proceduresService.getProcedureTypes(userId);
      
      if (typesError) {
        setError(typesError);
        return [];
      }

      return data;
    } catch (err) {
      setError('Erro ao buscar tipos de procedimentos');
      return [];
    }
  }, [userId]);

  // Buscar hospitais
  const fetchHospitals = useCallback(async () => {
    if (!userId) return [];

    try {
      const { data, error: hospitalsError } = await proceduresService.getHospitals(userId);
      
      if (hospitalsError) {
        setError(hospitalsError);
        return [];
      }

      return data;
    } catch (err) {
      setError('Erro ao buscar hospitais');
      return [];
    }
  }, [userId]);

  // Carregar dados iniciais
  useEffect(() => {
    if (userId) {
      fetchProcedures();
      fetchStats();
    }
  }, [userId, fetchProcedures, fetchStats]);

  return {
    procedures,
    stats,
    loading,
    error,
    fetchProcedures,
    fetchStats,
    createProcedure,
    updateProcedure,
    deleteProcedure,
    markAsPaid,
    fetchRecentProcedures,
    fetchProcedureTypes,
    fetchHospitals,
    clearError: () => setError(null),
  };
};
