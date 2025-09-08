import { supabase } from '../lib/supabase'
import { validateUserAccess, validateResourceAccess, validateInputData } from '../utils/security'
import type { Payment, PaymentInsert, PaymentUpdate } from '../lib/supabase'

export interface PaymentFilters {
  startDate?: string
  endDate?: string
  paymentType?: string
  paymentMethod?: string
  paymentStatus?: string
  search?: string
}

export interface PaymentStats {
  total: number
  totalAmount: number
  completedAmount: number
  pendingAmount: number
  failedAmount: number
  thisMonth: number
  thisMonthAmount: number
}

export interface PaymentWithProcedure extends Payment {
  procedure?: {
    id: string
    procedure_name: string
    procedure_type: string
    procedure_date: string
    patient_name: string
  }
}

class PaymentsService {
  // Buscar pagamentos do usuário
  async getPayments(
    userId: string,
    filters?: PaymentFilters,
    limit?: number,
    offset?: number
  ): Promise<{ data: Payment[]; error: string | null; count?: number }> {
    try {
      // Validar acesso do usuário
      const accessValidation = await validateResourceAccess(userId);
      if (!accessValidation.isValid) {
        return { data: [], error: accessValidation.error || 'Acesso negado', count: 0 };
      }

      let query = supabase
        .from('payments')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      // Aplicar filtros
      if (filters?.startDate) {
        query = query.gte('payment_date', filters.startDate)
      }
      if (filters?.endDate) {
        query = query.lte('payment_date', filters.endDate)
      }
      if (filters?.paymentType) {
        query = query.eq('payment_type', filters.paymentType)
      }
      if (filters?.paymentMethod) {
        query = query.eq('payment_method', filters.paymentMethod)
      }
      if (filters?.paymentStatus) {
        query = query.eq('payment_status', filters.paymentStatus)
      }
      if (filters?.search) {
        query = query.ilike('description', `%${filters.search}%`)
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
      return { data: [], error: 'Erro ao buscar pagamentos', count: 0 }
    }
  }

  // Buscar pagamentos com dados do procedimento
  async getPaymentsWithProcedures(
    userId: string,
    filters?: PaymentFilters,
    limit?: number,
    offset?: number
  ): Promise<{ data: PaymentWithProcedure[]; error: string | null; count?: number }> {
    try {
      let query = supabase
        .from('payments')
        .select(`
          *,
          procedure:procedures(
            id,
            procedure_name,
            procedure_type,
            procedure_date,
            patient_name
          )
        `, { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      // Aplicar filtros
      if (filters?.startDate) {
        query = query.gte('payment_date', filters.startDate)
      }
      if (filters?.endDate) {
        query = query.lte('payment_date', filters.endDate)
      }
      if (filters?.paymentType) {
        query = query.eq('payment_type', filters.paymentType)
      }
      if (filters?.paymentMethod) {
        query = query.eq('payment_method', filters.paymentMethod)
      }
      if (filters?.paymentStatus) {
        query = query.eq('payment_status', filters.paymentStatus)
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
      return { data: [], error: 'Erro ao buscar pagamentos', count: 0 }
    }
  }

  // Buscar pagamento por ID
  async getPaymentById(paymentId: string, userId: string): Promise<{ data: Payment | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .eq('user_id', userId)
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error: 'Erro ao buscar pagamento' }
    }
  }

  // Criar novo pagamento
  async createPayment(paymentData: PaymentInsert): Promise<{ data: Payment | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .insert(paymentData)
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error: 'Erro ao criar pagamento' }
    }
  }

  // Atualizar pagamento
  async updatePayment(
    paymentId: string,
    userId: string,
    updates: PaymentUpdate
  ): Promise<{ data: Payment | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .update(updates)
        .eq('id', paymentId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error: 'Erro ao atualizar pagamento' }
    }
  }

  // Deletar pagamento
  async deletePayment(paymentId: string, userId: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentId)
        .eq('user_id', userId)

      if (error) {
        return { error: error.message }
      }

      return { error: null }
    } catch (error) {
      return { error: 'Erro ao deletar pagamento' }
    }
  }

  // Obter estatísticas dos pagamentos
  async getPaymentStats(userId: string): Promise<{ data: PaymentStats | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('amount, payment_status, payment_date')
        .eq('user_id', userId)

      if (error) {
        return { data: null, error: error.message }
      }

      const payments = data || []
      const now = new Date()
      const thisMonth = now.getMonth()
      const thisYear = now.getFullYear()

      const stats: PaymentStats = {
        total: payments.length,
        totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
        completedAmount: payments
          .filter(p => p.payment_status === 'completed')
          .reduce((sum, p) => sum + p.amount, 0),
        pendingAmount: payments
          .filter(p => p.payment_status === 'pending')
          .reduce((sum, p) => sum + p.amount, 0),
        failedAmount: payments
          .filter(p => p.payment_status === 'failed')
          .reduce((sum, p) => sum + p.amount, 0),
        thisMonth: payments.filter(p => {
          if (!p.payment_date) return false
          const paymentDate = new Date(p.payment_date)
          return paymentDate.getMonth() === thisMonth && paymentDate.getFullYear() === thisYear
        }).length,
        thisMonthAmount: payments
          .filter(p => {
            if (!p.payment_date) return false
            const paymentDate = new Date(p.payment_date)
            return paymentDate.getMonth() === thisMonth && paymentDate.getFullYear() === thisYear
          })
          .reduce((sum, p) => sum + p.amount, 0),
      }

      return { data: stats, error: null }
    } catch (error) {
      return { data: null, error: 'Erro ao buscar estatísticas de pagamentos' }
    }
  }

  // Buscar pagamentos por período
  async getPaymentsByPeriod(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<{ data: Payment[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', userId)
        .gte('payment_date', startDate)
        .lte('payment_date', endDate)
        .order('payment_date', { ascending: false })

      if (error) {
        return { data: [], error: error.message }
      }

      return { data: data || [], error: null }
    } catch (error) {
      return { data: [], error: 'Erro ao buscar pagamentos por período' }
    }
  }

  // Buscar pagamentos pendentes
  async getPendingPayments(userId: string): Promise<{ data: Payment[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', userId)
        .eq('payment_status', 'pending')
        .order('due_date', { ascending: true })

      if (error) {
        return { data: [], error: error.message }
      }

      return { data: data || [], error: null }
    } catch (error) {
      return { data: [], error: 'Erro ao buscar pagamentos pendentes' }
    }
  }

  // Marcar pagamento como concluído
  async markAsCompleted(
    paymentId: string,
    userId: string,
    paymentDate?: string
  ): Promise<{ data: Payment | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .update({
          payment_status: 'completed',
          payment_date: paymentDate || new Date().toISOString(),
        })
        .eq('id', paymentId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error: 'Erro ao marcar como concluído' }
    }
  }

  // Buscar métodos de pagamento únicos
  async getPaymentMethods(userId: string): Promise<{ data: string[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('payment_method')
        .eq('user_id', userId)
        .not('payment_method', 'is', null)

      if (error) {
        return { data: [], error: error.message }
      }

      const methods = [...new Set(data?.map(p => p.payment_method) || [])]
      return { data: methods, error: null }
    } catch (error) {
      return { data: [], error: 'Erro ao buscar métodos de pagamento' }
    }
  }

  // Buscar pagamentos recentes
  async getRecentPayments(userId: string, limit: number = 5): Promise<{ data: Payment[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        return { data: [], error: error.message }
      }

      return { data: data || [], error: null }
    } catch (error) {
      return { data: [], error: 'Erro ao buscar pagamentos recentes' }
    }
  }
}

export const paymentsService = new PaymentsService()
