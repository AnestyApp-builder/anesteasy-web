import { useState, useEffect, useCallback } from 'react';
import { reportsService } from '../services/reportsService';
import type { Report, ReportInsert, ReportUpdate, ReportFilters } from '../types';

export const useReports = (userId: string) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar relatórios
  const fetchReports = useCallback(async (filters?: ReportFilters, limit?: number, offset?: number) => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError, count } = await reportsService.getReports(
        userId,
        filters,
        limit,
        offset
      );

      if (fetchError) {
        setError(fetchError);
        return;
      }

      setReports(data);
    } catch (err) {
      setError('Erro ao buscar relatórios');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Gerar relatório mensal
  const generateMonthlyReport = useCallback(async (month: string) => {
    if (!userId) return null;

    setLoading(true);
    setError(null);

    try {
      const { data, error: generateError } = await reportsService.generateMonthlyReport(userId, month);
      
      if (generateError) {
        setError(generateError);
        return null;
      }

      return data;
    } catch (err) {
      setError('Erro ao gerar relatório mensal');
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Salvar relatório
  const saveReport = useCallback(async (reportData: ReportInsert) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: saveError } = await reportsService.saveReport(reportData);

      if (saveError) {
        setError(saveError);
        return null;
      }

      // Atualizar lista local
      setReports(prev => [data!, ...prev]);

      return data;
    } catch (err) {
      setError('Erro ao salvar relatório');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Atualizar relatório
  const updateReport = useCallback(async (reportId: string, updates: ReportUpdate) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: updateError } = await reportsService.updateReport(
        reportId,
        userId,
        updates
      );

      if (updateError) {
        setError(updateError);
        return null;
      }

      // Atualizar lista local
      setReports(prev => 
        prev.map(r => r.id === reportId ? data! : r)
      );

      return data;
    } catch (err) {
      setError('Erro ao atualizar relatório');
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Deletar relatório
  const deleteReport = useCallback(async (reportId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await reportsService.deleteReport(reportId, userId);

      if (deleteError) {
        setError(deleteError);
        return false;
      }

      // Atualizar lista local
      setReports(prev => prev.filter(r => r.id !== reportId));

      return true;
    } catch (err) {
      setError('Erro ao deletar relatório');
      return false;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Buscar dados para gráfico de receita
  const fetchRevenueChartData = useCallback(async (startDate: string, endDate: string) => {
    if (!userId) return [];

    try {
      const { data, error: chartError } = await reportsService.getRevenueChartData(
        userId,
        startDate,
        endDate
      );
      
      if (chartError) {
        setError(chartError);
        return [];
      }

      return data;
    } catch (err) {
      setError('Erro ao buscar dados do gráfico de receita');
      return [];
    }
  }, [userId]);

  // Buscar dados para gráfico de tipos de procedimentos
  const fetchProcedureTypesChartData = useCallback(async (startDate: string, endDate: string) => {
    if (!userId) return [];

    try {
      const { data, error: chartError } = await reportsService.getProcedureTypesChartData(
        userId,
        startDate,
        endDate
      );
      
      if (chartError) {
        setError(chartError);
        return [];
      }

      return data;
    } catch (err) {
      setError('Erro ao buscar dados dos tipos de procedimentos');
      return [];
    }
  }, [userId]);

  // Buscar resumo de performance
  const fetchPerformanceSummary = useCallback(async (startDate: string, endDate: string) => {
    if (!userId) return null;

    try {
      const { data, error: summaryError } = await reportsService.getPerformanceSummary(
        userId,
        startDate,
        endDate
      );
      
      if (summaryError) {
        setError(summaryError);
        return null;
      }

      return data;
    } catch (err) {
      setError('Erro ao buscar resumo de performance');
      return null;
    }
  }, [userId]);

  // Buscar relatórios recentes
  const fetchRecentReports = useCallback(async (limit: number = 5) => {
    if (!userId) return [];

    try {
      const { data, error: recentError } = await reportsService.getRecentReports(userId, limit);
      
      if (recentError) {
        setError(recentError);
        return [];
      }

      return data;
    } catch (err) {
      setError('Erro ao buscar relatórios recentes');
      return [];
    }
  }, [userId]);

  // Carregar dados iniciais
  useEffect(() => {
    if (userId) {
      fetchReports();
    }
  }, [userId, fetchReports]);

  return {
    reports,
    loading,
    error,
    fetchReports,
    generateMonthlyReport,
    saveReport,
    updateReport,
    deleteReport,
    fetchRevenueChartData,
    fetchProcedureTypesChartData,
    fetchPerformanceSummary,
    fetchRecentReports,
    clearError: () => setError(null),
  };
};
