import { supabase } from '../lib/supabase'
import { validateUserAccess, validateResourceAccess, validateInputData } from '../utils/security'
import type { Report, ReportInsert, ReportUpdate } from '../lib/supabase'

export interface ReportFilters {
  startDate?: string
  endDate?: string
  reportType?: string
}

export interface MonthlyReportData {
  month: string
  totalProcedures: number
  totalRevenue: number
  paidRevenue: number
  pendingRevenue: number
  averageProcedureValue: number
  mostCommonProcedure: string
  proceduresByType: Record<string, number>
}

export interface RevenueChartData {
  date: string
  revenue: number
  procedures: number
}

export interface ProcedureTypeData {
  type: string
  count: number
  revenue: number
  percentage: number
}

class ReportsService {
  // Buscar relatórios do usuário
  async getReports(
    userId: string,
    filters?: ReportFilters,
    limit?: number,
    offset?: number
  ): Promise<{ data: Report[]; error: string | null; count?: number }> {
    try {
      // Validar acesso do usuário
      const accessValidation = await validateResourceAccess(userId);
      if (!accessValidation.isValid) {
        return { data: [], error: accessValidation.error || 'Acesso negado', count: 0 };
      }

      let query = supabase
        .from('reports')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('generated_at', { ascending: false })

      // Aplicar filtros
      if (filters?.startDate) {
        query = query.gte('start_date', filters.startDate)
      }
      if (filters?.endDate) {
        query = query.lte('end_date', filters.endDate)
      }
      if (filters?.reportType) {
        query = query.eq('report_type', filters.reportType)
      }

      // Aplicar paginação
      if (limit) {
        query = query.limit(limit)
      }
      if (offset) {
        query = query.range(offset, offset + (limit || 10) - 1)
      }

      const { data, error, count } = await query

      if (error) {
        return { data: [], error: error.message, count: 0 }
      }

      return { data: data || [], error: null, count: count || 0 }
    } catch (error) {
      return { data: [], error: 'Erro ao buscar relatórios', count: 0 }
    }
  }

  // Buscar relatório por ID
  async getReportById(reportId: string, userId: string): Promise<{ data: Report | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('id', reportId)
        .eq('user_id', userId)
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error: 'Erro ao buscar relatório' }
    }
  }

  // Gerar relatório mensal
  async generateMonthlyReport(
    userId: string,
    month: string
  ): Promise<{ data: MonthlyReportData | null; error: string | null }> {
    try {
      const { data, error } = await supabase.rpc('generate_monthly_report', {
        user_uuid: userId,
        report_month: month
      })

      if (error) {
        return { data: null, error: error.message }
      }

      const reportData = data as any
      const monthlyReport: MonthlyReportData = {
        month: reportData.month,
        totalProcedures: reportData.total_procedures || 0,
        totalRevenue: reportData.total_revenue || 0,
        paidRevenue: reportData.paid_revenue || 0,
        pendingRevenue: reportData.pending_revenue || 0,
        averageProcedureValue: reportData.average_procedure_value || 0,
        mostCommonProcedure: reportData.most_common_procedure || '',
        proceduresByType: reportData.procedures_by_type || {},
      }

      return { data: monthlyReport, error: null }
    } catch (error) {
      return { data: null, error: 'Erro ao gerar relatório mensal' }
    }
  }

  // Salvar relatório gerado
  async saveReport(reportData: ReportInsert): Promise<{ data: Report | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('reports')
        .insert(reportData)
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error: 'Erro ao salvar relatório' }
    }
  }

  // Atualizar relatório
  async updateReport(
    reportId: string,
    userId: string,
    updates: ReportUpdate
  ): Promise<{ data: Report | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('reports')
        .update(updates)
        .eq('id', reportId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error: 'Erro ao atualizar relatório' }
    }
  }

  // Deletar relatório
  async deleteReport(reportId: string, userId: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportId)
        .eq('user_id', userId)

      if (error) {
        return { error: error.message }
      }

      return { error: null }
    } catch (error) {
      return { error: 'Erro ao deletar relatório' }
    }
  }

  // Obter dados para gráfico de receita
  async getRevenueChartData(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<{ data: RevenueChartData[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('procedures')
        .select('procedure_date, procedure_value, payment_status')
        .eq('user_id', userId)
        .gte('procedure_date', startDate)
        .lte('procedure_date', endDate)
        .order('procedure_date', { ascending: true })

      if (error) {
        return { data: [], error: error.message }
      }

      // Agrupar por data
      const groupedData = (data || []).reduce((acc, procedure) => {
        const date = procedure.procedure_date
        if (!acc[date]) {
          acc[date] = { date, revenue: 0, procedures: 0 }
        }
        acc[date].procedures += 1
        if (procedure.payment_status === 'paid') {
          acc[date].revenue += procedure.procedure_value
        }
        return acc
      }, {} as Record<string, RevenueChartData>)

      const chartData = Object.values(groupedData)
      return { data: chartData, error: null }
    } catch (error) {
      return { data: [], error: 'Erro ao buscar dados do gráfico' }
    }
  }

  // Obter dados para gráfico de tipos de procedimentos
  async getProcedureTypesChartData(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<{ data: ProcedureTypeData[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('procedures')
        .select('procedure_type, procedure_value')
        .eq('user_id', userId)
        .gte('procedure_date', startDate)
        .lte('procedure_date', endDate)

      if (error) {
        return { data: [], error: error.message }
      }

      // Agrupar por tipo
      const groupedData = (data || []).reduce((acc, procedure) => {
        const type = procedure.procedure_type
        if (!acc[type]) {
          acc[type] = { type, count: 0, revenue: 0 }
        }
        acc[type].count += 1
        acc[type].revenue += procedure.procedure_value
        return acc
      }, {} as Record<string, Omit<ProcedureTypeData, 'percentage'>>)

      const totalCount = Object.values(groupedData).reduce((sum, item) => sum + item.count, 0)
      const chartData: ProcedureTypeData[] = Object.values(groupedData).map(item => ({
        ...item,
        percentage: totalCount > 0 ? (item.count / totalCount) * 100 : 0
      }))

      return { data: chartData, error: null }
    } catch (error) {
      return { data: [], error: 'Erro ao buscar dados dos tipos de procedimentos' }
    }
  }

  // Obter resumo de performance
  async getPerformanceSummary(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<{ data: any; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('procedures')
        .select('*')
        .eq('user_id', userId)
        .gte('procedure_date', startDate)
        .lte('procedure_date', endDate)

      if (error) {
        return { data: null, error: error.message }
      }

      const procedures = data || []
      const totalProcedures = procedures.length
      const totalRevenue = procedures.reduce((sum, p) => sum + p.procedure_value, 0)
      const paidProcedures = procedures.filter(p => p.payment_status === 'paid')
      const paidRevenue = paidProcedures.reduce((sum, p) => sum + p.procedure_value, 0)
      const averageValue = totalProcedures > 0 ? totalRevenue / totalProcedures : 0
      const paymentRate = totalProcedures > 0 ? (paidProcedures.length / totalProcedures) * 100 : 0

      const summary = {
        totalProcedures,
        totalRevenue,
        paidRevenue,
        pendingRevenue: totalRevenue - paidRevenue,
        averageValue,
        paymentRate,
        mostCommonType: this.getMostCommonType(procedures),
        busiestDay: this.getBusiestDay(procedures),
        averageDuration: this.getAverageDuration(procedures),
      }

      return { data: summary, error: null }
    } catch (error) {
      return { data: null, error: 'Erro ao gerar resumo de performance' }
    }
  }

  // Métodos auxiliares
  private getMostCommonType(procedures: any[]): string {
    const types = procedures.reduce((acc, p) => {
      acc[p.procedure_type] = (acc[p.procedure_type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(types).reduce((a, b) => types[a[0]] > types[b[0]] ? a : b)[0] || ''
  }

  private getBusiestDay(procedures: any[]): string {
    const days = procedures.reduce((acc, p) => {
      const day = new Date(p.procedure_date).toLocaleDateString('pt-BR', { weekday: 'long' })
      acc[day] = (acc[day] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(days).reduce((a, b) => days[a[0]] > days[b[0]] ? a : b)[0] || ''
  }

  private getAverageDuration(procedures: any[]): number {
    const durations = procedures
      .filter(p => p.duration_minutes)
      .map(p => p.duration_minutes)
    
    return durations.length > 0 
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
      : 0
  }

  // Buscar relatórios recentes
  async getRecentReports(userId: string, limit: number = 5): Promise<{ data: Report[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', userId)
        .order('generated_at', { ascending: false })
        .limit(limit)

      if (error) {
        return { data: [], error: error.message }
      }

      return { data: data || [], error: null }
    } catch (error) {
      return { data: [], error: 'Erro ao buscar relatórios recentes' }
    }
  }
}

export const reportsService = new ReportsService()
