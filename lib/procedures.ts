import { supabase, Database } from './supabase'

export type Procedure = Database['public']['Tables']['procedures']['Row']
export type ProcedureInsert = Database['public']['Tables']['procedures']['Insert']
export type ProcedureUpdate = Database['public']['Tables']['procedures']['Update']

export interface Parcela {
  id?: string
  procedure_id: string
  numero_parcela: number
  valor_parcela: number
  recebida: boolean
  data_recebimento: string | null
  created_at?: string
  updated_at?: string
}

export interface ProcedureAttachment {
  id?: string
  procedure_id: string
  file_name: string
  file_size: number
  file_type: string
  file_url: string
  uploaded_at?: string
  created_at?: string
  updated_at?: string
}

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
        .order('created_at', { ascending: false })

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
      // Verificar se há sessão ativa
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        console.error('Usuário não autenticado')
        return null
      }

      // Garantir que o user_id seja o mesmo da sessão
      const procedureData = {
        ...procedure,
        user_id: session.user.id
      }


      const { data, error } = await supabase
        .from('procedures')
        .insert(procedureData)
        .select()
        .single()

      if (error) {
        console.error('Erro ao criar procedimento:', error)
        console.error('Detalhes do erro:', error.message, error.details, error.hint)
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
        .select('id, payment_status, procedure_value, payment_method, forma_pagamento')
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

      // Processar cada procedimento
      for (const procedure of data) {
        stats.totalValue += procedure.procedure_value || 0
        
        // Verificar se é procedimento parcelado
        const isParcelado = procedure.payment_method === 'Parcelado' || procedure.forma_pagamento === 'Parcelado'
        
        if (isParcelado) {
          // Para procedimentos parcelados, calcular baseado nas parcelas
          const parcelas = await this.getParcelas(procedure.id)
          const parcelasRecebidas = parcelas.filter(p => p.recebida)
          const valorRecebido = parcelasRecebidas.reduce((sum, p) => sum + (p.valor_parcela || 0), 0)
          const valorPendente = (procedure.procedure_value || 0) - valorRecebido
          
          if (valorRecebido > 0) {
            stats.completed++
            stats.completedValue += valorRecebido
          }
          
          if (valorPendente > 0) {
            stats.pending++
            stats.pendingValue += valorPendente
          }
        } else {
          // Para procedimentos não parcelados, usar lógica original
          switch (procedure.payment_status) {
            case 'paid':
              stats.completed++
              stats.completedValue += procedure.procedure_value || 0
              break
            case 'pending':
              stats.pending++
              stats.pendingValue += procedure.procedure_value || 0
              break
            case 'cancelled':
              stats.cancelled++
              break
          }
        }
      }

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
  },

  // Funções para gerenciar parcelas
  async getParcelas(procedureId: string): Promise<Parcela[]> {
    try {
      const { data, error } = await supabase
        .from('parcelas')
        .select('*')
        .eq('procedure_id', procedureId)
        .order('numero_parcela', { ascending: true })

      if (error) {
        console.error('Erro ao buscar parcelas:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Erro ao buscar parcelas:', error)
      return []
    }
  },

  async createParcelas(parcelas: Omit<Parcela, 'id' | 'created_at' | 'updated_at'>[]): Promise<Parcela[]> {
    try {
      const { data, error } = await supabase
        .from('parcelas')
        .insert(parcelas)
        .select()

      if (error) {
        console.error('Erro ao criar parcelas:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Erro ao criar parcelas:', error)
      return []
    }
  },

  async updateParcela(id: string, updates: Partial<Parcela>): Promise<Parcela | null> {
    try {
      const { data, error } = await supabase
        .from('parcelas')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Erro ao atualizar parcela:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Erro ao atualizar parcela:', error)
      return null
    }
  },

  async deleteParcelas(procedureId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('parcelas')
        .delete()
        .eq('procedure_id', procedureId)

      if (error) {
        console.error('Erro ao deletar parcelas:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Erro ao deletar parcelas:', error)
      return false
    }
  },

  // Funções para gerenciar anexos
  async getAttachments(procedureId: string): Promise<ProcedureAttachment[]> {
    try {
      const { data, error } = await supabase
        .from('procedure_attachments')
        .select('*')
        .eq('procedure_id', procedureId)
        .order('uploaded_at', { ascending: false })

      if (error) {
        console.error('Erro ao buscar anexos:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Erro ao buscar anexos:', error)
      return []
    }
  },

  async createAttachment(attachment: Omit<ProcedureAttachment, 'id' | 'created_at' | 'updated_at'>): Promise<ProcedureAttachment | null> {
    try {
      const { data, error } = await supabase
        .from('procedure_attachments')
        .insert(attachment)
        .select()
        .single()

      if (error) {
        console.error('Erro ao criar anexo:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Erro ao criar anexo:', error)
      return null
    }
  },

  async deleteAttachment(attachmentId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('procedure_attachments')
        .delete()
        .eq('id', attachmentId)

      if (error) {
        console.error('Erro ao deletar anexo:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Erro ao deletar anexo:', error)
      return false
    }
  }
}
