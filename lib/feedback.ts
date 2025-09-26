import { supabase } from './supabase'

export interface FeedbackFormData {
  procedureId: string
  // Respostas do cirurgião
  nauseaVomito: 'Sim' | 'Não' | ''
  cefaleia: 'Sim' | 'Não' | ''
  dorLombar: 'Sim' | 'Não' | ''
  anemiaTransfusao: 'Sim' | 'Não' | ''
  // Metadados
  respondidoEm?: string
  respondidoPor?: string
}

export interface FeedbackFormLink {
  id: string
  procedureId: string
  emailCirurgiao: string
  token: string
  expiresAt: string
  respondidoEm?: string
}

export const feedbackService = {
  // Criar link para o formulário apenas (sem enviar email)
  async createFeedbackLinkOnly({ procedureId, emailCirurgiao, telefoneCirurgiao }: { 
    procedureId: string
    emailCirurgiao: string
    telefoneCirurgiao: string 
  }): Promise<string> {
    try {
      // Gerar token único
      const token = crypto.randomUUID()
      
      // Data de expiração (48 horas)
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 48)

      const { data, error } = await supabase
        .from('feedback_links')
        .insert({
          procedure_id: procedureId,
          email_cirurgiao: emailCirurgiao,
          telefone_cirurgiao: telefoneCirurgiao,
          token: token,
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single()

      if (error) throw error
      
      // Retornar a URL completa do formulário
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin
      return `${baseUrl}/feedback/${token}`
    } catch (error) {
      
      throw error
    }
  },

  // Criar link para o formulário e enviar email (função original mantida para compatibilidade)
  async createFeedbackLink(procedureId: string, emailCirurgiao: string, anesthesiologistName: string): Promise<FeedbackFormLink | null> {
    try {
      // Gerar token único
      const token = crypto.randomUUID()
      
      // Data de expiração (48 horas)
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 48)

      const { data, error } = await supabase
        .from('feedback_links')
        .insert({
          procedure_id: procedureId,
          email_cirurgiao: emailCirurgiao,
          token: token,
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single()

      if (error) throw error

      // Enviar email usando a Edge Function
      const { data: emailData, error: emailError } = await supabase.functions.invoke('send-feedback-email', {
        body: {
          to: emailCirurgiao,
          procedureId,
          token,
          anesthesiologistName
        },
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (emailError) {
        // Não falhar completamente se apenas o email falhar
      } else if (emailData) {
        }
      
      return data as FeedbackFormLink
    } catch (error) {
      
      return null
    }
  },

  // Validar token do formulário
  async validateFeedbackToken(token: string): Promise<FeedbackFormLink | null> {
    try {
       // Debug
      
      // Primeiro, buscar o link sem filtros para debug
      const { data: linkData, error: linkError } = await supabase
        .from('feedback_links')
        .select()
        .eq('token', token)
        .single()
      
       // Debug
      
      if (linkError) {
        
        return null
      }
      
      if (!linkData) {
        
        return null
      }
      
      // Verificar se já foi respondido
      if (linkData.responded_at) {
        
        return null
      }
      
      // Verificar se expirou
      const expirationDate = new Date(linkData.expires_at)
      const now = new Date()
      
      if (expirationDate < now) {
        
        return null
      }
      
       // Debug
      return linkData as FeedbackFormLink
    } catch (error) {
      
      return null
    }
  },

  // Buscar feedback de um procedimento específico
  async getFeedbackByProcedureId(procedureId: string): Promise<FeedbackFormData | null> {
    try {
      const { data, error } = await supabase
        .from('feedback_responses')
        .select(`
          nausea_vomito,
          cefaleia,
          dor_lombar,
          anemia_transfusao,
          respondido_em
        `)
        .eq('procedure_id', procedureId)
        .single()

      if (error) throw error
      
      return data ? {
        procedureId,
        nauseaVomito: data.nausea_vomito as 'Sim' | 'Não',
        cefaleia: data.cefaleia as 'Sim' | 'Não',
        dorLombar: data.dor_lombar as 'Sim' | 'Não',
        anemiaTransfusao: data.anemia_transfusao as 'Sim' | 'Não',
        respondidoEm: data.respondido_em
      } : null
    } catch (error) {
      
      return null
    }
  },

  // Verificar status do feedback
  async getFeedbackStatus(procedureId: string): Promise<{
    linkCriado: boolean
    linkExpirado: boolean
    respondido: boolean
    emailCirurgiao?: string
    dataEnvio?: string
    dataResposta?: string
  }> {
    try {
      const { data, error } = await supabase
        .from('feedback_links')
        .select('*')
        .eq('procedure_id', procedureId)
        .single()

      if (error) {
        return {
          linkCriado: false,
          linkExpirado: false,
          respondido: false
        }
      }

      const agora = new Date()
      const expirado = new Date(data.expires_at) < agora

      return {
        linkCriado: true,
        linkExpirado: expirado,
        respondido: !!data.responded_at,
        emailCirurgiao: data.email_cirurgiao,
        dataEnvio: data.created_at,
        dataResposta: data.responded_at
      }
    } catch (error) {
      
      return {
        linkCriado: false,
        linkExpirado: false,
        respondido: false
      }
    }
  },

  // Salvar respostas do formulário
  async saveFeedbackResponses(token: string, feedback: FeedbackFormData): Promise<boolean> {
    try {
      // Primeiro, validar o token
      const link = await this.validateFeedbackToken(token)
      if (!link) throw new Error('Token inválido ou expirado')

      // Iniciar transação
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('feedback_responses')
        .insert({
          feedback_link_id: link.id,
          nausea_vomito: feedback.nauseaVomito === 'Sim',
          cefaleia: feedback.cefaleia === 'Sim',
          dor_lombar: feedback.dorLombar === 'Sim',
          anemia_transfusao: feedback.anemiaTransfusao === 'Sim'
        })
        .select()
        .single()

      if (feedbackError) throw feedbackError

      // Atualizar status do link
      const { error: linkError } = await supabase
        .from('feedback_links')
        .update({
          responded_at: new Date().toISOString()
        })
        .eq('token', token)

      if (linkError) throw linkError

      return true
    } catch (error) {
      
      return false
    }
  }
}
