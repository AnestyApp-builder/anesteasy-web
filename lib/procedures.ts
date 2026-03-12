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
  async getProcedures(userId: string, options?: { limit?: number; offset?: number }): Promise<Procedure[]> {
    try {
      const query = supabase
        .from('procedures')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      // Limite padrão de segurança para evitar cargas gigantes em contas antigas
      const limit = options?.limit ?? 500
      const offset = options?.offset ?? 0
      query.range(offset, offset + limit - 1)

      const { data, error } = await query

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
        
        // MOBILE FIX: Usar timeout mais curto e não bloquear se falhar
        // Se getSession travar, vamos tentar inserir mesmo assim (RLS vai validar)
        try {
          const sessionPromise = supabase.auth.getSession()
          const timeoutPromise = new Promise<{ data: { session: null }, error: { message: string } }>((resolve) => {
            setTimeout(() => {
              console.warn('⏱️ [PROCEDURE SERVICE] Timeout ao obter sessão (3 segundos) - continuando mesmo assim')
              resolve({ data: { session: null }, error: { message: 'Timeout ao obter sessão' } })
            }, 3000) // 3 segundos apenas - não bloquear
          })
          
          const { data: { session }, error: sessionError } = await Promise.race([sessionPromise, timeoutPromise])
          
          if (!sessionError && session?.user) {
            userId = session.user.id
            console.log('✅ [PROCEDURE SERVICE] Sessão válida, user_id:', userId)
          } else {
            console.warn('⚠️ [PROCEDURE SERVICE] Não foi possível obter sessão, mas continuando...')
            console.warn('⚠️ [PROCEDURE SERVICE] RLS vai validar se o user_id está correto')
          }
        } catch (sessionErr: any) {
          console.warn('⚠️ [PROCEDURE SERVICE] Erro ao obter sessão, mas continuando:', sessionErr)
          // Não retornar null - deixar RLS validar
        }
      } else {
        console.log('✅ [PROCEDURE SERVICE] Usando user_id fornecido:', userId)
      }
      
      // Se ainda não temos userId, não podemos continuar
      if (!userId) {
        console.error('❌ [PROCEDURE SERVICE] user_id não disponível após tentar obter da sessão')
        return null
      }

      // Garantir que o user_id seja válido
      if (!userId) {
        console.error('❌ [PROCEDURE SERVICE] user_id não disponível')
        return null
      }

      // Validar campos obrigatórios (com validação segura usando ?.)
      if (!procedure.procedure_date?.trim()) {
        console.error('❌ [PROCEDURE SERVICE] procedure_date é obrigatório e não pode estar vazio')
        return null
      }

      if (!procedure.procedure_name?.trim()) {
        console.error('❌ [PROCEDURE SERVICE] procedure_name é obrigatório e não pode estar vazio')
        return null
      }

      if (!procedure.procedure_type?.trim()) {
        console.error('❌ [PROCEDURE SERVICE] procedure_type é obrigatório e não pode estar vazio')
        return null
      }

      if (!procedure.patient_name?.trim()) {
        console.error('❌ [PROCEDURE SERVICE] patient_name é obrigatório e não pode estar vazio')
        return null
      }

      // Validar tecnica_anestesica se fornecida (pode ser opcional em alguns casos)
      if (procedure.tecnica_anestesica && procedure.tecnica_anestesica.trim() === '') {
        console.warn('⚠️ [PROCEDURE SERVICE] tecnica_anestesica está vazia, será definida como null')
      }

      const procedureData = {
        // Campos básicos (obrigatórios)
        procedure_name: procedure.procedure_name,
        procedure_value: procedure.procedure_value || 0,
        procedure_date: procedure.procedure_date.trim(),
        procedure_type: procedure.procedure_type,
        user_id: userId,
        
        // Campos do paciente
        patient_name: procedure.patient_name,
        patient_age: procedure.patient_age || null,
        patient_gender: procedure.patient_gender || null,
        data_nascimento: procedure.data_nascimento && procedure.data_nascimento.trim() !== '' ? procedure.data_nascimento : null,
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
        grupo_anestesico: procedure.grupo_anestesico || 'Nenhum',
        
        // Campos financeiros
        payment_status: procedure.payment_status || 'pending',
        payment_date: procedure.payment_date && procedure.payment_date.trim() !== '' ? procedure.payment_date : null,
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
      
      // Importar função de retry
      const { executarComRetry } = await import('./validation-utils')
      
      // Tentar inserção com retry automático (3 tentativas)
      let data: Procedure | null = null
      let error: any = null
      
      // REMOVIDO: Verificação de sessão duplicada antes de inserir
      // Já verificamos a sessão no início do createProcedure
      // Esta verificação estava causando timeout no mobile quando há imagens
      console.log('💾 [PROCEDURE SERVICE] Preparando para inserir no banco...')
      console.log('💾 [PROCEDURE SERVICE] Payload size:', JSON.stringify(cleanProcedureData).length, 'bytes')
      console.log('💾 [PROCEDURE SERVICE] Campos no payload:', Object.keys(cleanProcedureData).length)
      console.log('💾 [PROCEDURE SERVICE] user_id no payload:', cleanProcedureData.user_id)
      
      try {
        data = await executarComRetry(
          async () => {
            console.log('💾 [PROCEDURE SERVICE] Tentando inserir no banco...')
            console.log('💾 [PROCEDURE SERVICE] user_id no payload:', cleanProcedureData.user_id)
            
            const insertPromise = supabase
              .from('procedures')
              .insert(cleanProcedureData)
              .select()
              .single()
            
            const insertTimeoutPromise = new Promise<{ data: null, error: { code: string, message: string, details: string, hint: string } }>((resolve) => {
              setTimeout(() => {
                console.error('⏱️ [PROCEDURE SERVICE] Timeout na inserção do banco (15 segundos)')
                resolve({ 
                  data: null, 
                  error: { 
                    code: 'TIMEOUT', 
                    message: 'A inserção no banco de dados demorou mais de 15 segundos',
                    details: 'Timeout - Pode ser problema de RLS, trigger ou conexão',
                    hint: 'Verifique as políticas RLS da tabela procedures ou tente novamente'
                  } 
                })
              }, 15000) // ✅ 15 segundos (reduzido de 45s)
            })
            
            const startTime = Date.now()
            console.log('⏱️ [PROCEDURE SERVICE] Iniciando inserção no banco...')
            
            const resultado = await Promise.race([insertPromise, insertTimeoutPromise])
            
            const elapsedTime = Date.now() - startTime
            console.log(`⏱️ [PROCEDURE SERVICE] Inserção levou ${elapsedTime}ms`)
            
            if (resultado.error) {
              console.error('❌ [PROCEDURE SERVICE] Erro na inserção:', resultado.error)
              console.error('❌ [PROCEDURE SERVICE] Código do erro:', resultado.error.code)
              console.error('❌ [PROCEDURE SERVICE] Mensagem:', resultado.error.message)
              console.error('❌ [PROCEDURE SERVICE] Detalhes:', resultado.error.details)
              console.error('❌ [PROCEDURE SERVICE] Hint:', resultado.error.hint)
              
              // Log específico para erros de RLS
              if (resultado.error.code === '42501' || resultado.error.code === 'PGRST301' || resultado.error.message?.includes('RLS')) {
                console.error('🚨 [PROCEDURE SERVICE] ERRO DE RLS DETECTADO!')
                console.error('🚨 [PROCEDURE SERVICE] Verifique se a política RLS permite INSERT para authenticated users')
                console.error('🚨 [PROCEDURE SERVICE] user_id no payload:', cleanProcedureData.user_id)
              }
              
              throw resultado.error
            }
            
            if (!resultado.data) {
              console.error('❌ [PROCEDURE SERVICE] Inserção retornou null sem erro')
              console.error('❌ [PROCEDURE SERVICE] Isso pode indicar problema de RLS ou timeout')
              throw new Error('Inserção retornou null sem erro')
            }
            
            console.log('✅ [PROCEDURE SERVICE] Inserção bem-sucedida! ID:', resultado.data.id)
            console.log('✅ [PROCEDURE SERVICE] Tempo total:', elapsedTime, 'ms')
            return resultado.data
          },
          {
            tentativasMaximas: 2, // ✅ Reduzido de 3 para 2
            delayInicial: 500,    // ✅ Reduzido de 1000ms para 500ms
            multiplicadorDelay: 2,
            delayMaximo: 5000,    // ✅ Reduzido de 10000ms para 5000ms
            onRetry: (tentativa, erro) => {
              console.log(`🔄 [PROCEDURE SERVICE] Tentativa ${tentativa}/2 após erro:`, erro.message)
            },
            deveRetentar: (erro: any) => {
              // Não retentar erros de validação ou permissão
              const codigoErro = erro?.code || ''
              const errosNaoRetentaveis = ['23505', '23503', '23502', '42501', 'PGRST301']
              return !errosNaoRetentaveis.some(cod => codigoErro.includes(cod))
            }
          }
        )
      } catch (erro: any) {
        error = erro
        console.error('❌ [PROCEDURE SERVICE] Erro capturado no try/catch:', erro)
        console.error('❌ [PROCEDURE SERVICE] Tipo do erro:', erro?.constructor?.name)
        console.error('❌ [PROCEDURE SERVICE] Stack:', erro?.stack)
      }

      if (error || !data) {
        const erroFinal = error || { code: 'UNKNOWN', message: 'Erro desconhecido ao criar procedimento' }
        console.error('❌ [PROCEDURE SERVICE] Erro ao criar procedimento:', erroFinal)
        console.error('❌ [PROCEDURE SERVICE] Código:', erroFinal.code)
        console.error('❌ [PROCEDURE SERVICE] Mensagem:', erroFinal.message)
        console.error('❌ [PROCEDURE SERVICE] Detalhes:', erroFinal.details)
        console.error('❌ [PROCEDURE SERVICE] Hint:', erroFinal.hint)
        
        // Log específico para mobile quando há imagens
        console.error('❌ [PROCEDURE SERVICE] ==========================================')
        console.error('❌ [PROCEDURE SERVICE] FALHA AO CRIAR PROCEDIMENTO')
        console.error('❌ [PROCEDURE SERVICE] ==========================================')
        console.error('❌ [PROCEDURE SERVICE] Possíveis causas:')
        console.error('   1. Sessão expirada ou inválida')
        console.error('   2. Problema de RLS (Row Level Security)')
        console.error('   3. Timeout na conexão mobile')
        console.error('   4. Payload muito grande')
        console.error('❌ [PROCEDURE SERVICE] ==========================================')
        
        // Verificar erros específicos do Supabase
        if (erroFinal.code === '23505') { // Violação de constraint única
          console.error('⚠️ [PROCEDURE SERVICE] Erro: Violação de constraint única (possível duplicata)')
        } else if (erroFinal.code === '23503') { // Violação de foreign key
          console.error('⚠️ [PROCEDURE SERVICE] Erro: Violação de foreign key (secretaria_id ou user_id inválido)')
        } else if (erroFinal.code === '23502') { // Violação de NOT NULL
          console.error('⚠️ [PROCEDURE SERVICE] Erro: Campo obrigatório não preenchido')
        } else if (erroFinal.code === '42501') { // Erro de permissão
          console.error('⚠️ [PROCEDURE SERVICE] Erro: Sem permissão para inserir (problema de RLS)')
          console.error('   Verifique se o usuário tem permissão para INSERT na tabela procedures')
        } else if (erroFinal.code === 'PGRST301') { // Erro de RLS
          console.error('⚠️ [PROCEDURE SERVICE] Erro: Política RLS bloqueando a inserção')
          console.error('   Verifique as políticas RLS da tabela procedures no Supabase')
        }
        
        // Se for timeout, dar mensagem mais específica
        if (erroFinal.code === 'TIMEOUT') {
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
