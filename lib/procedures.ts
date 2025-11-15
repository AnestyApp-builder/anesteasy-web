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
  // Buscar todos os procedimentos do usuário
  async getProcedures(userId: string): Promise<Procedure[]> {
    try {
      const { data, error } = await supabase
        .from('procedures')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        
        return []
      }

      return data || []
    } catch (error) {
      
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
        
        return null
      }

      return data
    } catch (error) {
      
      return null
    }
  },

  // Criar novo procedimento
  async createProcedure(procedure: ProcedureInsert): Promise<Procedure | null> {
    try {
      console.log('🔍 [PROCEDURE SERVICE] Iniciando createProcedure...')
      
      // Usar user_id do procedure se disponível, senão tentar obter da sessão com timeout
      let userId = procedure.user_id
      
      if (!userId) {
        console.log('🔍 [PROCEDURE SERVICE] user_id não fornecido, tentando obter da sessão...')
        
        // Adicionar timeout para getSession para evitar travamento
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise<{ data: { session: null }, error: { message: string } }>((resolve) => {
          setTimeout(() => {
            console.error('⏱️ [PROCEDURE SERVICE] Timeout ao obter sessão (5 segundos)')
            resolve({ data: { session: null }, error: { message: 'Timeout ao obter sessão' } })
          }, 5000) // 5 segundos para getSession
        })
        
        const { data: { session }, error: sessionError } = await Promise.race([sessionPromise, timeoutPromise])
        
        if (sessionError) {
          console.error('❌ [PROCEDURE SERVICE] Erro ao verificar sessão:', sessionError)
          return null
        }
        
        if (!session?.user) {
          console.error('❌ [PROCEDURE SERVICE] Nenhuma sessão ativa')
          return null
        }

        userId = session.user.id
        console.log('✅ [PROCEDURE SERVICE] Sessão válida, user_id:', userId)
      } else {
        console.log('✅ [PROCEDURE SERVICE] Usando user_id fornecido:', userId)
      }

      // Garantir que o user_id seja válido
      if (!userId) {
        console.error('❌ [PROCEDURE SERVICE] user_id não disponível')
        return null
      }

      const procedureData = {
        // Campos básicos (obrigatórios)
        procedure_name: procedure.procedure_name,
        procedure_value: procedure.procedure_value || 0,
        procedure_date: procedure.procedure_date,
        procedure_type: procedure.procedure_type,
        user_id: userId,
        
        // Campos do paciente
        patient_name: procedure.patient_name,
        patient_age: procedure.patient_age || null,
        patient_gender: procedure.patient_gender || null,
        data_nascimento: procedure.data_nascimento,
        convenio: procedure.convenio || null,
        carteirinha: procedure.carteirinha || null,
        
        // Campos da equipe
        anesthesiologist_name: procedure.anesthesiologist_name || null,
        nome_cirurgiao: procedure.nome_cirurgiao || null,
        surgeon_name: procedure.nome_cirurgiao || procedure.surgeon_name || null, // Sincronizar nome_cirurgiao e surgeon_name
        especialidade_cirurgiao: procedure.especialidade_cirurgiao || null,
        hospital_clinic: procedure.hospital_clinic || null,
        nome_equipe: procedure.nome_equipe || null,
        
        // Campos de horário e duração
        horario: procedure.horario || null,
        procedure_time: procedure.horario || procedure.procedure_time || null, // Sincronizar horario e procedure_time
        duracao_minutos: procedure.duracao_minutos || null,
        duration_minutes: procedure.duracao_minutos || null, // Sincronizar duracao_minutos e duration_minutes
        
        // Campos de anestesia
        tipo_anestesia: procedure.tecnica_anestesica || null,
        tecnica_anestesica: procedure.tecnica_anestesica || null,
        codigo_tssu: procedure.codigo_tssu || null,
        
        // Campos financeiros
        payment_status: procedure.payment_status || 'pending',
        payment_date: procedure.payment_date || null,
        forma_pagamento: procedure.forma_pagamento || null,
        observacoes_financeiras: procedure.observacoes_financeiras || null,
        secretaria_id: procedure.secretaria_id && procedure.secretaria_id.trim() !== '' ? procedure.secretaria_id : null,
        numero_parcelas: procedure.numero_parcelas || null,
        parcelas_recebidas: procedure.parcelas_recebidas || 0,
        
        // Campo para observações gerais
        notes: procedure.observacoes_procedimento || null,
        observacoes_procedimento: procedure.observacoes_procedimento || null,
        
        // Campos específicos de procedimentos (salvos nas colunas corretas)
        sangramento: procedure.sangramento || null,
        nausea_vomito: procedure.nausea_vomito || null,
        dor: procedure.dor || null,
        
        // Campos de procedimentos obstétricos
        acompanhamento_antes: procedure.acompanhamento_antes || null,
        tipo_parto: procedure.tipo_parto || null,
        tipo_cesariana: procedure.tipo_cesariana || null,
        indicacao_cesariana: procedure.indicacao_cesariana || null,
        descricao_indicacao_cesariana: procedure.descricao_indicacao_cesariana || null,
        retencao_placenta: procedure.retencao_placenta || null,
        laceracao_presente: procedure.laceracao_presente || null,
        grau_laceracao: procedure.grau_laceracao || null,
        hemorragia_puerperal: procedure.hemorragia_puerperal || null,
        transfusao_realizada: procedure.transfusao_realizada || null,
        
        // Campos de feedback
        feedback_solicitado: procedure.feedback_solicitado || false,
        email_cirurgiao: procedure.email_cirurgiao || null,
        telefone_cirurgiao: procedure.telefone_cirurgiao || null
        // Removido fichas_anestesicas - não é mais usado e pode causar problemas
      }

      console.log('📦 [PROCEDURE SERVICE] Dados preparados para inserção:', {
        procedure_name: procedureData.procedure_name,
        procedure_value: procedureData.procedure_value,
        user_id: procedureData.user_id,
        patient_name: procedureData.patient_name,
        hasSecretaria: !!procedureData.secretaria_id
      })

      console.log('💾 [PROCEDURE SERVICE] Inserindo no banco de dados...')
      console.log('   Tamanho dos dados:', JSON.stringify(procedureData).length, 'bytes')
      
      // Limpar campos undefined para evitar problemas
      const cleanProcedureData = Object.fromEntries(
        Object.entries(procedureData).filter(([_, value]) => value !== undefined)
      )
      
      console.log('🧹 [PROCEDURE SERVICE] Dados limpos (sem undefined):', Object.keys(cleanProcedureData).length, 'campos')
      
      // Tentar inserção com timeout mais curto primeiro (20 segundos)
      // Se falhar, pode ser problema de RLS ou trigger
      const insertPromise = supabase
        .from('procedures')
        .insert(cleanProcedureData)
        .select()
        .single()
      
      const insertTimeoutPromise = new Promise<{ data: null, error: { code: string, message: string, details: string, hint: string } }>((resolve) => {
        setTimeout(() => {
          console.error('⏱️ [PROCEDURE SERVICE] Timeout na inserção do banco (20 segundos)')
          resolve({ 
            data: null, 
            error: { 
              code: 'TIMEOUT', 
              message: 'A inserção no banco de dados demorou mais de 20 segundos',
              details: 'Timeout - Pode ser problema de RLS, trigger ou conexão',
              hint: 'Verifique as políticas RLS da tabela procedures ou tente novamente'
            } 
          })
        }, 20000) // 20 segundos para inserção (reduzido para detectar problema mais rápido)
      })
      
      const { data, error } = await Promise.race([insertPromise, insertTimeoutPromise])

      if (error) {
        console.error('❌ [PROCEDURE SERVICE] Erro ao criar procedimento:', error)
        console.error('   Código:', error.code)
        console.error('   Mensagem:', error.message)
        console.error('   Detalhes:', error.details)
        console.error('   Hint:', error.hint)
        
        // Se for timeout, dar mensagem mais específica
        if (error.code === 'TIMEOUT') {
          console.error('⏱️ [PROCEDURE SERVICE] A inserção no banco está demorando muito. Isso pode indicar:')
          console.error('   1. Problema de conexão com o Supabase')
          console.error('   2. Banco de dados sobrecarregado')
          console.error('   3. Trigger ou função no banco demorando')
          console.error('   4. ⚠️ PROBLEMA COM RLS (Row Level Security) - VERIFICAR POLÍTICAS DA TABELA procedures')
          console.error('   5. ⚠️ Verificar se o user_id tem permissão para INSERT na tabela procedures')
          console.error('')
          console.error('🔧 SOLUÇÃO SUGERIDA:')
          console.error('   Verifique no Supabase SQL Editor se há políticas RLS na tabela procedures')
          console.error('   que permitam INSERT para usuários autenticados.')
          console.error('   Exemplo de política necessária:')
          console.error('   CREATE POLICY "Users can insert their own procedures" ON procedures')
          console.error('   FOR INSERT WITH CHECK (auth.uid() = user_id);')
        }
        
        return null
      }

      if (!data) {
        console.error('❌ [PROCEDURE SERVICE] Inserção retornou null sem erro')
        return null
      }

      console.log('✅ [PROCEDURE SERVICE] Procedimento criado com sucesso! ID:', data.id)
      return data
    } catch (error: any) {
      console.error('❌ [PROCEDURE SERVICE] Erro interno ao criar procedimento:', error)
      console.error('   Tipo:', error?.constructor?.name)
      console.error('   Mensagem:', error?.message)
      console.error('   Stack:', error?.stack)
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
        
        return null
      }

      return data
    } catch (error) {
      
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
        
        return []
      }

      return data || []
    } catch (error) {
      
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
