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
    console.log('🚀 [SECRETARIAS] Iniciando createOrLinkSecretaria')
    console.log('📧 Email:', email)
    console.log('👤 Nome:', nome)
    console.log('📞 Telefone:', telefone)
    
    try {
      // REGRA: Verificar se o email já existe como anestesista (users)
      console.log('🔍 [SECRETARIAS] Verificando se email já é anestesista...')
      const { data: existingAnestesista } = await supabase
        .from('users')
        .select('email')
        .eq('email', email)
        .maybeSingle()

      if (existingAnestesista) {
        console.error('❌ [SECRETARIAS] Email já cadastrado como anestesista')
        throw new Error('Este email já está cadastrado como anestesista. Um email de anestesista não pode ser usado como secretária.')
      }
      
      console.log('✅ [SECRETARIAS] Email não é anestesista, continuando...')

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
        console.log('🆕 [SECRETARIAS] Secretária não existe, criando nova...')
        
        if (!nome) {
          console.error('❌ [SECRETARIAS] Nome é obrigatório')
          throw new Error('Nome é obrigatório para criar nova secretaria')
        }

        // Gerar senha temporária
        const tempPassword = Math.random().toString(36).slice(-8) + 'A1!'
        
        console.log('🔑 [SECRETARIAS] Senha temporária gerada:', tempPassword)
        
        // Criar conta da secretaria
        const accountResult = await authService.createSecretariaAccount(email, tempPassword, nome, telefone)
        
        if (!accountResult.success) {
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

        // Enviar email de boas-vindas com a senha temporária
        // IMPORTANTE: Não falhar a criação se o email falhar - apenas logar o erro
        console.log('═══════════════════════════════════════════════════════')
        console.log('📧 TENTANDO ENVIAR EMAIL DE BOAS-VINDAS')
        console.log('═══════════════════════════════════════════════════════')
        console.log(`Email: ${email}`)
        console.log(`Nome: ${nome}`)
        console.log(`Senha Temporária: ${tempPassword}`)
        console.log('═══════════════════════════════════════════════════════')
        
        try {
          console.log('🔄 Chamando API /api/send-secretaria-welcome...')
          const emailResponse = await fetch('/api/send-secretaria-welcome', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: email,
              nome: nome,
              senhaTemporaria: tempPassword
            })
          })

          console.log(`📡 Resposta da API: Status ${emailResponse.status}`)

          if (!emailResponse.ok) {
            const errorData = await emailResponse.json().catch(() => ({}))
            console.error('❌ ERRO ao enviar email de boas-vindas:')
            console.error('Status:', emailResponse.status)
            console.error('Erro:', errorData)
            console.log('═══════════════════════════════════════════════════════')
            console.log('⚠️ A secretária foi criada, mas o email não foi enviado.')
            console.log('⚠️ Configure SMTP_USER e SMTP_PASS na Edge Function do Supabase.')
            console.log('═══════════════════════════════════════════════════════')
            // Não lançar erro - apenas logar
            // A secretária já foi criada, então continuamos mesmo se o email falhar
          } else {
            const responseData = await emailResponse.json().catch(() => ({}))
            console.log('📦 Dados da resposta:', responseData)
            
            if (!responseData.success) {
              console.error('⚠️ EMAIL NÃO ENVIADO:')
              console.error('Erro:', responseData.error || 'Erro desconhecido')
              console.error('Mensagem:', responseData.message || 'Sem mensagem')
              console.error('Detalhes:', responseData.details || 'Sem detalhes')
              console.log('═══════════════════════════════════════════════════════')
              console.log('⚠️ Configure SMTP_USER e SMTP_PASS na Edge Function do Supabase.')
              console.log('═══════════════════════════════════════════════════════')
              // Não lançar erro - apenas logar
            } else {
              console.log('✅ EMAIL ENVIADO COM SUCESSO!')
              console.log('✅ A secretária receberá um email com a senha temporária.')
              console.log('═══════════════════════════════════════════════════════')
            }
          }
        } catch (emailError) {
          console.error('❌ ERRO ao enviar email (não bloqueia criação):')
          console.error('Erro:', emailError)
          console.log('═══════════════════════════════════════════════════════')
          console.log('⚠️ A secretária foi criada, mas houve erro ao enviar email.')
          console.log('═══════════════════════════════════════════════════════')
          // Não lançar erro - a secretária já foi criada
          // O email pode ser enviado manualmente depois se necessário
        }

        secretaria = newSecretaria
        isNew = true
      } else if (searchError) {
        
        return null
      } else {
        // Secretaria já existe
        secretaria = existingSecretaria
        console.log('ℹ️ [SECRETARIAS] Secretária já existe, apenas vinculando...')
        console.log('⚠️ [SECRETARIAS] Não será enviado email de nova senha para secretaria existente.')
        console.log('⚠️ [SECRETARIAS] Use a função resendTempPassword() se precisar reenviar a senha.')
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
          
          return null
        }
      } else if (linkError) {
        
        return null
      }

      return { secretaria, isNew }
    } catch (error) {
      
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
        .maybeSingle()

      if (error) {
        return null // Nenhuma secretaria vinculada
      }

      if (!data) {
        
        return null
      }

      
      return data.secretarias || null
    } catch (error) {
      
      return null
    }
  },

  // Reenviar senha temporária para secretaria existente
  async resendTempPassword(
    secretariaId: string,
    email: string,
    nome: string
  ): Promise<{ success: boolean; message: string; tempPassword?: string }> {
    console.log('🔄 [SECRETARIAS] Reenviando senha temporária...')
    console.log(`📧 Email: ${email}`)
    console.log(`👤 Nome: ${nome}`)
    
    try {
      // Gerar nova senha temporária
      const tempPassword = Math.random().toString(36).slice(-8) + 'A1!'
      
      console.log('🔑 [SECRETARIAS] Nova senha temporária gerada:', tempPassword)
      
      // Atualizar senha no Supabase Auth usando Admin API
      // Nota: Isso requer permissões de service role
      try {
        const response = await fetch('/api/reset-secretaria-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            secretariaId: secretariaId,
            newPassword: tempPassword
          })
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error('❌ Erro ao atualizar senha:', errorData)
          return { 
            success: false, 
            message: 'Erro ao atualizar senha. Verifique se a API está configurada.' 
          }
        }
      } catch (apiError) {
        console.error('❌ Erro ao chamar API de atualização de senha:', apiError)
        // Continuar mesmo se a API falhar - vamos tentar enviar o email com a senha antiga
      }

      // Enviar email com a nova senha
      console.log('═══════════════════════════════════════════════════════')
      console.log('📧 TENTANDO ENVIAR EMAIL COM NOVA SENHA TEMPORÁRIA')
      console.log('═══════════════════════════════════════════════════════')
      console.log(`Email: ${email}`)
      console.log(`Nome: ${nome}`)
      console.log(`Nova Senha Temporária: ${tempPassword}`)
      console.log('═══════════════════════════════════════════════════════')
      
      try {
        const emailResponse = await fetch('/api/send-secretaria-welcome', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email,
            nome: nome,
            senhaTemporaria: tempPassword,
            isResend: true
          })
        })

        if (!emailResponse.ok) {
          const errorData = await emailResponse.json().catch(() => ({}))
          console.error('❌ ERRO ao enviar email:', errorData)
          return { 
            success: false, 
            message: 'Erro ao enviar email. Verifique a configuração SMTP.',
            tempPassword: tempPassword // Retornar senha mesmo se email falhar
          }
        }

        const responseData = await emailResponse.json().catch(() => ({}))
        
        if (!responseData.success) {
          console.error('⚠️ EMAIL NÃO ENVIADO:', responseData)
          return { 
            success: false, 
            message: 'Email não enviado. Verifique a configuração SMTP.',
            tempPassword: tempPassword
          }
        }

        console.log('✅ EMAIL ENVIADO COM SUCESSO!')
        return { 
          success: true, 
          message: 'Nova senha temporária enviada por email!',
          tempPassword: tempPassword
        }
      } catch (emailError) {
        console.error('❌ ERRO ao enviar email:', emailError)
        return { 
          success: false, 
          message: 'Erro ao enviar email. Verifique a configuração SMTP.',
          tempPassword: tempPassword
        }
      }
    } catch (error) {
      console.error('❌ Erro interno ao reenviar senha:', error)
      return { success: false, message: 'Erro interno. Tente novamente.' }
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

      // Nota: Não limpamos secretaria_id dos procedimentos para manter histórico
      // A validação de vínculo garante que a secretaria não pode mais editar procedimentos

      return true
    } catch (error) {
      console.error('Erro ao desvincular secretaria:', error)
      return false
    }
  },

  // Obter procedimentos da secretaria
  async getProcedimentosBySecretaria(secretariaId: string): Promise<any[]> {
    try {
      // Primeiro, buscar anestesistas vinculados
      const { data: linksData, error: linksError } = await supabase
        .from('anestesista_secretaria')
        .select('anestesista_id')
        .eq('secretaria_id', secretariaId)

      if (linksError) {
        console.error('Erro ao buscar vínculos:', linksError)
        return []
      }

      const anestesistasIds = linksData?.map(link => link.anestesista_id) || []
      
      let proceduresData: any[] = []

      // Buscar procedimentos dos anestesistas vinculados
      if (anestesistasIds.length > 0) {
        const { data: proceduresByAnestesista, error: proceduresError1 } = await supabase
          .from('procedures')
          .select(`
            *,
            users (
              id,
              name,
              email
            )
          `)
          .in('user_id', anestesistasIds)
          .order('procedure_date', { ascending: false })

        if (proceduresError1) {
          console.error('Erro ao buscar procedimentos por anestesista:', proceduresError1)
        } else {
          proceduresData = proceduresByAnestesista || []
        }
      }

      // Também buscar procedimentos com secretaria_id específico
      const { data: proceduresBySecretaria, error: proceduresError2 } = await supabase
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

      if (proceduresError2) {
        console.error('Erro ao buscar procedimentos por secretaria:', proceduresError2)
      } else {
        // Combinar resultados e remover duplicatas
        const existingIds = new Set(proceduresData.map(p => p.id))
        const additionalProcedures = (proceduresBySecretaria || []).filter(p => !existingIds.has(p.id))
        proceduresData = [...proceduresData, ...additionalProcedures]
      }

      // Ordenar por data novamente após combinar
      proceduresData.sort((a, b) => {
        const dateA = new Date(a.procedure_date).getTime()
        const dateB = new Date(b.procedure_date).getTime()
        return dateB - dateA
      })

      return proceduresData
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

      // Se for secretaria, verificar se ainda está vinculada ao anestesista
      if (changedBy.type === 'secretaria') {
        const { data: linkData, error: linkError } = await supabase
          .from('anestesista_secretaria')
          .select('*')
          .eq('secretaria_id', changedBy.id)
          .eq('anestesista_id', currentProcedure.user_id)
          .maybeSingle()

        if (linkError || !linkData) {
          console.error('Secretaria não está mais vinculada ao anestesista')
          return false
        }
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
        // Verificar se é erro de permissão RLS
        if (updateError.code === '42501' || updateError.message?.includes('permission')) {
          console.error('Erro de permissão RLS - verifique as políticas no Supabase')
        }
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
        // Verificar se é erro de permissão RLS
        if (error.code === '42501' || error.message?.includes('permission')) {
          console.error('Erro de permissão RLS ao criar notificação - verifique as políticas no Supabase')
        }
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
        
        return []
      }

      return data || []
    } catch (error) {
      
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
        
        return false
      }

      return true
    } catch (error) {
      
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
        
        return []
      }

      return data || []
    } catch (error) {
      
      return []
    }
  }
}
