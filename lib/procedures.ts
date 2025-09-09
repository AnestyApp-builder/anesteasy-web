import { supabase, Database } from './supabase'

export type Procedure = Database['public']['Tables']['procedures']['Row']
export type ProcedureInsert = Database['public']['Tables']['procedures']['Insert']
export type ProcedureUpdate = Database['public']['Tables']['procedures']['Update']

export interface ProcedureWithUser extends Procedure {
  user: {
    name: string
    email: string
  }
}

export const procedureService = {
  // Buscar todos os procedimentos do usuário
  async getProcedures(userId: string): Promise<Procedure[]> {
    try {
      const { data, error } = await supabase
        .from('procedures')
        .select('*')
        .eq('user_id', userId)
        .order('procedure_date', { ascending: false })

      if (error) {
        console.error('Erro ao buscar procedimentos:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Erro ao buscar procedimentos:', error)
      return []
    }
  },

  // Buscar procedimento por ID
  async getProcedureById(id: string): Promise<Procedure | null> {
    try {
      const { data, error } = await supabase
        .from('procedures')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Erro ao buscar procedimento:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Erro ao buscar procedimento:', error)
      return null
    }
  },

  // Criar novo procedimento
  async createProcedure(procedure: ProcedureInsert): Promise<Procedure | null> {
    try {
      const { data, error } = await supabase
        .from('procedures')
        .insert(procedure)
        .select()
        .single()

      if (error) {
        console.error('Erro ao criar procedimento:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Erro ao criar procedimento:', error)
      return null
    }
  },

  // Atualizar procedimento
  async updateProcedure(id: string, updates: ProcedureUpdate): Promise<Procedure | null> {
    try {
      const { data, error } = await supabase
        .from('procedures')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Erro ao atualizar procedimento:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Erro ao atualizar procedimento:', error)
      return null
    }
  },

  // Deletar procedimento
  async deleteProcedure(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('procedures')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Erro ao deletar procedimento:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Erro ao deletar procedimento:', error)
      return false
    }
  },

  // Buscar procedimentos por status
  async getProceduresByStatus(userId: string, status: 'pending' | 'paid' | 'cancelled'): Promise<Procedure[]> {
    try {
      const { data, error } = await supabase
        .from('procedures')
        .select('*')
        .eq('user_id', userId)
        .eq('payment_status', status)
        .order('procedure_date', { ascending: false })

      if (error) {
        console.error('Erro ao buscar procedimentos por status:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Erro ao buscar procedimentos por status:', error)
      return []
    }
  },

  // Buscar procedimentos por período
  async getProceduresByDateRange(userId: string, startDate: string, endDate: string): Promise<Procedure[]> {
    try {
      const { data, error } = await supabase
        .from('procedures')
        .select('*')
        .eq('user_id', userId)
        .gte('procedure_date', startDate)
        .lte('procedure_date', endDate)
        .order('procedure_date', { ascending: false })

      if (error) {
        console.error('Erro ao buscar procedimentos por período:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Erro ao buscar procedimentos por período:', error)
      return []
    }
  },

  // Obter estatísticas dos procedimentos
  async getProcedureStats(userId: string): Promise<{
    total: number
    completed: number
    pending: number
    cancelled: number
    totalValue: number
    completedValue: number
    pendingValue: number
  }> {
    try {
      const { data, error } = await supabase
        .from('procedures')
        .select('payment_status, procedure_value')
        .eq('user_id', userId)

      if (error) {
        console.error('Erro ao buscar estatísticas:', error)
        return {
          total: 0,
          completed: 0,
          pending: 0,
          cancelled: 0,
          totalValue: 0,
          completedValue: 0,
          pendingValue: 0
        }
      }

      const stats = {
        total: data.length,
        completed: 0,
        pending: 0,
        cancelled: 0,
        totalValue: 0,
        completedValue: 0,
        pendingValue: 0
      }

      data.forEach(procedure => {
        stats.totalValue += procedure.procedure_value
        
        switch (procedure.payment_status) {
          case 'paid':
            stats.completed++
            stats.completedValue += procedure.procedure_value
            break
          case 'pending':
            stats.pending++
            stats.pendingValue += procedure.procedure_value
            break
          case 'cancelled':
            stats.cancelled++
            break
        }
      })

      return stats
    } catch (error) {
      console.error('Erro ao calcular estatísticas:', error)
      return {
        total: 0,
        completed: 0,
        pending: 0,
        cancelled: 0,
        totalValue: 0,
        completedValue: 0,
        pendingValue: 0
      }
    }
  }
}
