import { supabase } from '../lib/supabase'
import { validateUserAccess, validateResourceAccess, validateInputData, createSecureOperation } from '../utils/security'
import type { Procedure, ProcedureInsert, ProcedureUpdate } from '../lib/supabase'

export interface ProcedureFilters {
  startDate?: string
  endDate?: string
  procedureType?: string
  paymentStatus?: string
  hospital?: string
  search?: string
}

export interface ProcedureStats {
  total: number
  totalValue: number
  paidValue: number
  pendingValue: number
  averageValue: number
  thisMonth: number
  thisMonthValue: number
}

export interface ProcedureWithPayment extends Procedure {
  payment?: {
    id: string
    amount: number
    payment_method: string
    payment_date: string
    payment_status: string
  }
}

class ProceduresService {
  // Buscar procedimentos do usuário
  async getProcedures(
    userId: string,
    filters?: ProcedureFilters,
    limit?: number,
    offset?: number
  ): Promise<{ data: Procedure[]; error: string | null; count?: number }> {
    try {
      // Validar acesso do usuário
      const accessValidation = await validateResourceAccess(userId);
      if (!accessValidation.isValid) {
        return { data: [], error: accessValidation.error || 'Acesso negado', count: 0 };
      }

      let query = supabase
        .from('procedures')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('procedure_date', { ascending: false })

      // Aplicar filtros
      if (filters?.startDate) {
        query = query.gte('procedure_date', filters.startDate)
      }
      if (filters?.endDate) {
        query = query.lte('procedure_date', filters.endDate)
      }
      if (filters?.procedureType) {
        query = query.eq('procedure_type', filters.procedureType)
      }
      if (filters?.paymentStatus) {
        query = query.eq('payment_status', filters.paymentStatus)
      }
      if (filters?.hospital) {
        query = query.ilike('hospital_clinic', `%${filters.hospital}%`)
      }
      if (filters?.search) {
        query = query.or(`procedure_name.ilike.%${filters.search}%,patient_name.ilike.%${filters.search}%`)
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
      return { data: [], error: 'Erro ao buscar procedimentos', count: 0 }
    }
  }

  // Buscar procedimento por ID
  async getProcedureById(procedureId: string, userId: string): Promise<{ data: Procedure | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('procedures')
        .select('*')
        .eq('id', procedureId)
        .eq('user_id', userId)
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error: 'Erro ao buscar procedimento' }
    }
  }

  // Criar novo procedimento
  async createProcedure(procedureData: ProcedureInsert): Promise<{ data: Procedure | null; error: string | null }> {
    try {
      // Validar acesso do usuário
      const accessValidation = await validateResourceAccess(procedureData.user_id);
      if (!accessValidation.isValid) {
        return { data: null, error: accessValidation.error || 'Acesso negado' };
      }

      // Validar dados de entrada
      const requiredFields = ['user_id', 'procedure_name', 'procedure_type', 'procedure_date', 'procedure_value'];
      const dataValidation = validateInputData(procedureData, requiredFields);
      if (!dataValidation.isValid) {
        return { data: null, error: dataValidation.error || 'Dados inválidos' };
      }

      const { data, error } = await supabase
        .from('procedures')
        .insert(procedureData)
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error: 'Erro ao criar procedimento' }
    }
  }

  // Atualizar procedimento
  async updateProcedure(
    procedureId: string,
    userId: string,
    updates: ProcedureUpdate
  ): Promise<{ data: Procedure | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('procedures')
        .update(updates)
        .eq('id', procedureId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error: 'Erro ao atualizar procedimento' }
    }
  }

  // Deletar procedimento
  async deleteProcedure(procedureId: string, userId: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('procedures')
        .delete()
        .eq('id', procedureId)
        .eq('user_id', userId)

      if (error) {
        return { error: error.message }
      }

      return { error: null }
    } catch (error) {
      return { error: 'Erro ao deletar procedimento' }
    }
  }

  // Obter estatísticas dos procedimentos
  async getProcedureStats(userId: string): Promise<{ data: ProcedureStats | null; error: string | null }> {
    try {
      const { data, error } = await supabase.rpc('get_user_stats', {
        user_uuid: userId
      })

      if (error) {
        return { data: null, error: error.message }
      }

      const stats = data as any
      const procedureStats: ProcedureStats = {
        total: stats.total_procedures || 0,
        totalValue: stats.total_revenue || 0,
        paidValue: stats.total_revenue || 0, // Ajustar conforme necessário
        pendingValue: 0, // Calcular baseado nos procedimentos pendentes
        averageValue: stats.average_procedure_value || 0,
        thisMonth: stats.this_month_procedures || 0,
        thisMonthValue: stats.this_month_revenue || 0,
      }

      return { data: procedureStats, error: null }
    } catch (error) {
      return { data: null, error: 'Erro ao buscar estatísticas' }
    }
  }

  // Buscar procedimentos por período
  async getProceduresByPeriod(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<{ data: Procedure[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('procedures')
        .select('*')
        .eq('user_id', userId)
        .gte('procedure_date', startDate)
        .lte('procedure_date', endDate)
        .order('procedure_date', { ascending: false })

      if (error) {
        return { data: [], error: error.message }
      }

      return { data: data || [], error: null }
    } catch (error) {
      return { data: [], error: 'Erro ao buscar procedimentos por período' }
    }
  }

  // Buscar tipos de procedimentos únicos
  async getProcedureTypes(userId: string): Promise<{ data: string[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('procedures')
        .select('procedure_type')
        .eq('user_id', userId)
        .not('procedure_type', 'is', null)

      if (error) {
        return { data: [], error: error.message }
      }

      const types = [...new Set(data?.map(p => p.procedure_type) || [])]
      return { data: types, error: null }
    } catch (error) {
      return { data: [], error: 'Erro ao buscar tipos de procedimentos' }
    }
  }

  // Buscar hospitais/clínicas únicos
  async getHospitals(userId: string): Promise<{ data: string[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('procedures')
        .select('hospital_clinic')
        .eq('user_id', userId)
        .not('hospital_clinic', 'is', null)

      if (error) {
        return { data: [], error: error.message }
      }

      const hospitals = [...new Set(data?.map(p => p.hospital_clinic).filter(Boolean) || [])]
      return { data: hospitals, error: null }
    } catch (error) {
      return { data: [], error: 'Erro ao buscar hospitais' }
    }
  }

  // Marcar procedimento como pago
  async markAsPaid(
    procedureId: string,
    userId: string,
    paymentData: {
      payment_date: string
      payment_method: string
    }
  ): Promise<{ data: Procedure | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('procedures')
        .update({
          payment_status: 'paid',
          payment_date: paymentData.payment_date,
          payment_method: paymentData.payment_method,
        })
        .eq('id', procedureId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error: 'Erro ao marcar como pago' }
    }
  }

  // Buscar procedimentos recentes
  async getRecentProcedures(userId: string, limit: number = 5): Promise<{ data: Procedure[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('procedures')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        return { data: [], error: error.message }
      }

      return { data: data || [], error: null }
    } catch (error) {
      return { data: [], error: 'Erro ao buscar procedimentos recentes' }
    }
  }
}

export const proceduresService = new ProceduresService()
