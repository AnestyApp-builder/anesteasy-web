import { supabase } from './supabase'
import type { ProcedureInsert } from './types'

export type Procedure = ProcedureInsert & {
  id: string
  created_at: string
  updated_at: string
}
export type ProcedureUpdate = Partial<ProcedureInsert>

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
  // Buscar procedimentos do usuário (com limite opcional para evitar carregar tudo)
  async getProcedures(userId: string, options?: { limit?: number; offset?: number; groupId?: string }): Promise<Procedure[]> {
    try {
      const limit = options?.limit ?? 500;
      const offset = options?.offset ?? 0;
      const groupId = options?.groupId;
      
      let url = `/api/procedures/list?userId=${userId}&limit=${limit}&offset=${offset}`;
      if (groupId) url += `&groupId=${groupId}`;
      
      const response = await fetch(url);
      
      if (response.ok) {
        return await response.json();
      }

      // Fallback para Supabase direto se a API falhar
      let query = supabase
        .from('procedures')
        .select('*')
        .order('procedure_date', { ascending: false })
        .range(offset, offset + limit - 1);

      if (groupId) {
        query = query.eq('group_id', groupId);
      } else {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;
      if (error) return [];
      return data || [];
    } catch (error) {
      return [];
    }
  },

  // Buscar procedimento por ID
  async getProcedureById(id: string): Promise<Procedure | null> {
    try {
      const response = await fetch(`/api/procedures/get?id=${id}`);
      if (response.ok) {
        return await response.json();
      }

      const { data, error } = await supabase
        .from('procedures')
        .select('*')
        .eq('id', id)
        .single();

      if (error) return null;
      return data;
    } catch (error) {
      return null;
    }
  },

  // Criar novo procedimento via API (com criptografia LGPD)
  async createProcedure(procedure: ProcedureInsert): Promise<Procedure | null> {
    try {
      // 1. Obter sessão atual para ter o userId se não fornecido
      const { data: { session } } = await supabase.auth.getSession();
      const userId = procedure.user_id || session?.user?.id;

      if (!userId) {
        console.error('Erro ao criar procedimento: Usuário não autenticado');
        return null;
      }

      // 2. Chamar API de criação (que lida com criptografia/LGPD no servidor)
      const response = await fetch('/api/create-procedure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ procedureData: procedure, userId })
      });

      if (response.ok) {
        const result = await response.json();
        return result.data;
      }
      
      const errorData = await response.json();
      console.error('Erro na API de criação:', errorData);
      return null;
    } catch (error) {
      console.error('Erro ao criar procedimento:', error);
      return null;
    }
  },

  // Atualizar procedimento
  async updateProcedure(id: string, updates: ProcedureUpdate): Promise<Procedure | null> {
    try {
      const response = await fetch('/api/procedures/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, updates })
      });

      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Erro ao atualizar procedimento:', error);
      return null;
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
        
        return false
      }

      return true
    } catch (error) {
      
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
        
        return []
      }

      return data || []
    } catch (error) {
      
      return []
    }
  },

  // Buscar procedimentos por período ou grupo
  async getProceduresByDateRange(userId: string, startDate: string, endDate: string, groupId?: string): Promise<Procedure[]> {
    try {
      let query = supabase
        .from('procedures')
        .select('*')
        .order('procedure_date', { ascending: false })

      if (groupId) {
        query = query.eq('group_id', groupId)
      } else {
        query = query.eq('user_id', userId)
      }

      if (startDate) query = query.gte('procedure_date', startDate)
      if (endDate) query = query.lte('procedure_date', endDate)

      const { data, error } = await query
      if (error) {
        console.error('Erro ao buscar procedimentos por período:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Erro no serviço de procedimentos:', error)
      return []
    }
  },

  // Obter estatísticas dos procedimentos
  async getProcedureStats(userId: string, groupId?: string): Promise<{
    total: number
    completed: number
    pending: number
    cancelled: number
    sent: number
    totalValue: number
    completedValue: number
    pendingValue: number
  }> {
    try {
      let query = supabase
        .from('procedures')
        .select('id, payment_status, procedure_value, payment_method, forma_pagamento')

      if (groupId) {
        query = query.eq('group_id', groupId)
      } else {
        query = query.eq('user_id', userId)
      }

      const { data, error } = await query

      if (error) {
        
        return {
          total: 0,
          completed: 0,
          pending: 0,
          cancelled: 0,
          sent: 0,
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
        sent: 0,
        totalValue: 0,
        completedValue: 0,
        pendingValue: 0
      }

      // OTIMIZAÇÃO: Buscar todas as parcelas de uma vez (batch query)
      const procedureIds = data.map(p => p.id)
      const parcelasMap: Record<string, Parcela[]> = {}
      
      if (procedureIds.length > 0) {
        // Buscar todas as parcelas de todos os procedimentos em uma única query
        const { data: allParcelas, error: parcelasError } = await supabase
          .from('parcelas')
          .select('*')
          .in('procedure_id', procedureIds)
        
        if (!parcelasError && allParcelas) {
          // Agrupar parcelas por procedure_id
          allParcelas.forEach(parcela => {
            if (!parcelasMap[parcela.procedure_id]) {
              parcelasMap[parcela.procedure_id] = []
            }
            parcelasMap[parcela.procedure_id].push(parcela)
          })
        }
      }

      // Processar cada procedimento
      for (const procedure of data) {
        stats.totalValue += procedure.procedure_value || 0
        
        // Verificar se é procedimento parcelado
        const isParcelado = procedure.payment_method === 'Parcelado' || procedure.forma_pagamento === 'Parcelado'
        
        if (isParcelado) {
          // Para procedimentos parcelados, calcular baseado nas parcelas (usando cache)
          const parcelas = parcelasMap[procedure.id] || []
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
              // Incluir cancelled no pendingValue (não recebido)
              stats.pendingValue += procedure.procedure_value || 0
              break
            case 'sent':
              stats.sent++
              // Enviado ainda é pendente de pagamento
              stats.pendingValue += procedure.procedure_value || 0
              break
          }
        }
      }

      return stats
    } catch (error) {
      
      return {
        total: 0,
        completed: 0,
        pending: 0,
        cancelled: 0,
        sent: 0,
        totalValue: 0,
        completedValue: 0,
        pendingValue: 0
      }
    }
  },

  // Contagem rápida de procedimentos com status 'sent' para o menu
  async getSentProceduresCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('procedures')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('payment_status', 'sent')

      if (error) return 0
      return count || 0
    } catch (error) {
      return 0
    }
  },

  // Buscar parcelas de vários procedimentos em lote (Otimização para evitar N+1)
  async getParcelasBatch(procedureIds: string[]): Promise<Record<string, Parcela[]>> {
    if (!procedureIds.length) return {}
    
    try {
      const { data, error } = await supabase
        .from('parcelas')
        .select('*')
        .in('procedure_id', procedureIds)
        .order('numero_parcela', { ascending: true })

      if (error) {
        console.error('Erro ao buscar parcelas em lote:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        return {}
      }

      const map: Record<string, Parcela[]> = {}
      data?.forEach(p => {
        if (!map[p.procedure_id]) map[p.procedure_id] = []
        map[p.procedure_id].push(p)
      })
      return map
    } catch (error) {
      console.error('Erro interno ao buscar parcelas em lote:', error)
      return {}
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
        
        return []
      }

      return data || []
    } catch (error) {
      
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
      console.error('Erro interno ao criar parcelas:', error)
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
        
        return null
      }

      return data
    } catch (error) {
      
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
        
        return false
      }

      return true
    } catch (error) {
      
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
        
        return []
      }

      return data || []
    } catch (error) {
      
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
      console.error('Erro interno ao criar anexo:', error)
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
        
        return false
      }

      return true
    } catch (error) {
      
      return false
    }
  }
}
