import { supabase } from './supabase'
import { authService } from './auth'
import type { Tables, TablesInsert, TablesUpdate } from './supabase'

export type Secretaria = Tables<'secretarias'>
export type SecretariaInsert = TablesInsert<'secretarias'>
export type SecretariaUpdate = TablesUpdate<'secretarias'>

export type AnestesistaSecretaria = Tables<'anestesista_secretaria'>
export type AnestesistaSecretariaInsert = TablesInsert<'anestesista_secretaria'>

export type ProcedureLog = Tables<'procedure_logs'>
export type ProcedureLogInsert = TablesInsert<'procedure_logs'>

export type Notification = Tables<'notifications'>
export type NotificationInsert = TablesInsert<'notifications'>

export const secretariaService = {
  // Criar ou vincular secretaria
  async createOrLinkSecretaria(
    anestesistaId: string,
    email: string,
    nome?: string,
    telefone?: string
  ): Promise<{ secretaria: Secretaria; isNew: boolean } | null> {
    try {
      // Verificar se a secretaria já existe
      const { data: existingSecretaria, error: searchError } = await supabase
        .from('secretarias')
        .select('*')
        .eq('email', email)
        .single()

      let secretaria: Secretaria
      let isNew = false

      if (searchError && searchError.code === 'PGRST116') {
        // Secretaria não existe, criar nova
        if (!nome) {
          throw new Error('Nome é obrigatório para criar nova secretaria')
        }

        // Gerar senha temporária
        const tempPassword = Math.random().toString(36).slice(-8) + 'A1!'
        
        // Criar conta da secretaria
        const accountCreated = await authService.createSecretariaAccount(email, tempPassword, nome, telefone)
        
        if (!accountCreated) {
          console.error('Erro ao criar conta da secretaria')
          return null
        }

        // Buscar a secretaria criada
        const { data: newSecretaria, error: fetchError } = await supabase
          .from('secretarias')
          .select('*')
          .eq('email', email)
          .single()

        if (fetchError || !newSecretaria) {
          console.error('Erro ao buscar secretaria criada:', fetchError)
          return null
        }

        secretaria = newSecretaria
        isNew = true
      } else if (searchError) {
        console.error('Erro ao buscar secretaria:', searchError)
        return null
      } else {
        // Secretaria já existe
        secretaria = existingSecretaria
      }

      // Verificar se já existe vinculação
      const { data: existingLink, error: linkError } = await supabase
        .from('anestesista_secretaria')
        .select('*')
        .eq('anestesista_id', anestesistaId)
        .eq('secretaria_id', secretaria.id)
        .single()

      if (linkError && linkError.code === 'PGRST116') {
        // Criar vinculação
        const { error: insertLinkError } = await supabase
          .from('anestesista_secretaria')
          .insert({
            anestesista_id: anestesistaId,
            secretaria_id: secretaria.id
          })

        if (insertLinkError) {
          console.error('Erro ao vincular secretaria:', insertLinkError)
          return null
        }
      } else if (linkError) {
        console.error('Erro ao verificar vinculação:', linkError)
        return null
      }

      return { secretaria, isNew }
    } catch (error) {
      console.error('Erro no serviço de secretaria:', error)
      return null
    }
  },

  // Obter secretaria vinculada ao anestesista
  async getSecretariaByAnestesista(anestesistaId: string): Promise<Secretaria | null> {
    try {
      const { data, error } = await supabase
        .from('anestesista_secretaria')
        .select(`
          secretarias (
            id,
            nome,
            email,
            telefone,
            data_cadastro,
            status,
            created_at,
            updated_at
          )
        `)
        .eq('anestesista_id', anestesistaId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Nenhuma secretaria vinculada
        }
        console.error('Erro ao buscar secretaria:', error)
        return null
      }

      return data.secretarias[0] || null
    } catch (error) {
      console.error('Erro ao buscar secretaria:', error)
      return null
    }
  },

  // Desvincular secretaria
  async unlinkSecretaria(anestesistaId: string, secretariaId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('anestesista_secretaria')
        .delete()
        .eq('anestesista_id', anestesistaId)
        .eq('secretaria_id', secretariaId)

      if (error) {
        console.error('Erro ao desvincular secretaria:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Erro ao desvincular secretaria:', error)
      return false
    }
  },

  // Obter procedimentos da secretaria
  async getProcedimentosBySecretaria(secretariaId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('procedures')
        .select(`
          *,
          users (
            id,
            name,
            email
          )
        `)
        .eq('secretaria_id', secretariaId)
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

  // Atualizar procedimento (com log)
  async updateProcedure(
    procedureId: string,
    updates: any,
    changedBy: { id: string; type: 'anestesista' | 'secretaria'; name: string }
  ): Promise<boolean> {
    try {
      // Obter dados atuais do procedimento
      const { data: currentProcedure, error: fetchError } = await supabase
        .from('procedures')
        .select('*')
        .eq('id', procedureId)
        .single()

      if (fetchError) {
        console.error('Erro ao buscar procedimento:', fetchError)
        return false
      }

      // Atualizar procedimento
      const { error: updateError } = await supabase
        .from('procedures')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', procedureId)

      if (updateError) {
        console.error('Erro ao atualizar procedimento:', updateError)
        return false
      }

      // Criar logs das alterações
      const logs: ProcedureLogInsert[] = []
      for (const [field, newValue] of Object.entries(updates)) {
        const oldValue = currentProcedure[field as keyof typeof currentProcedure]
        if (oldValue !== newValue) {
          logs.push({
            procedure_id: procedureId,
            changed_by_id: changedBy.id,
            changed_by_type: changedBy.type,
            changed_by_name: changedBy.name,
            field_name: field,
            old_value: oldValue ? String(oldValue) : null,
            new_value: newValue ? String(newValue) : null
          })
        }
      }

      if (logs.length > 0) {
        const { error: logError } = await supabase
          .from('procedure_logs')
          .insert(logs)

        if (logError) {
          console.error('Erro ao criar logs:', logError)
        }

        // Criar notificação se foi alterado por secretaria
        if (changedBy.type === 'secretaria') {
          await this.createNotification(
            currentProcedure.user_id,
            'Procedimento Alterado',
            `A secretaria ${changedBy.name} alterou o procedimento ${currentProcedure.patient_name || procedureId}.`
          )
        }
      }

      return true
    } catch (error) {
      console.error('Erro ao atualizar procedimento:', error)
      return false
    }
  },

  // Criar notificação
  async createNotification(
    userId: string,
    title: string,
    message: string,
    type: string = 'info'
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title,
          message,
          type
        })

      if (error) {
        console.error('Erro ao criar notificação:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Erro ao criar notificação:', error)
      return false
    }
  },

  // Obter notificações do usuário
  async getNotifications(userId: string, unreadOnly: boolean = false): Promise<Notification[]> {
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (unreadOnly) {
        query = query.eq('is_read', false)
      }

      const { data, error } = await query

      if (error) {
        console.error('Erro ao buscar notificações:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Erro ao buscar notificações:', error)
      return []
    }
  },

  // Marcar notificação como lida
  async markNotificationAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

      if (error) {
        console.error('Erro ao marcar notificação como lida:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error)
      return false
    }
  },

  // Obter logs de um procedimento
  async getProcedureLogs(procedureId: string): Promise<ProcedureLog[]> {
    try {
      const { data, error } = await supabase
        .from('procedure_logs')
        .select('*')
        .eq('procedure_id', procedureId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erro ao buscar logs:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Erro ao buscar logs:', error)
      return []
    }
  }
}
