import { supabase } from './supabase'
import { User } from './types'
import logger from './logger'

export interface AuthState {
  user: User | null
  isLoading: boolean
}

// Cache para prevenir múltiplas tentativas de registro
const registrationAttempts = new Map<string, number>()

export const authService = {
  // Login usando Supabase Auth com validação dupla
  async login(email: string, password: string): Promise<User | null> {
    try {
      // Normalizar email (trim e lowercase)
      const normalizedEmail = email.trim().toLowerCase()
      
      // Limpar qualquer sessão existente antes de tentar login
      try {
        await supabase.auth.signOut()
      } catch (signOutError) {
        // Ignorar erros no signOut
      }
      
      // Fazer login com Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password
      })

      if (authError) {
        logger.error('Erro no login:', authError.message)
        
        // Limpar qualquer sessão corrompida
        try {
          await supabase.auth.signOut()
        } catch (signOutError) {
          // Ignorar erro
        }
        
        return null
      }

      if (!authData?.user) {
        return null
      }

      // Verificar se email foi confirmado no Supabase Auth
      if (!authData.user.email_confirmed_at) {
        return null
      }

      // Buscar dados do usuário na tabela users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle()

      if (userError) {
        logger.error('Erro ao buscar usuário:', userError.message)
        return null
      }

      if (!userData) {
        // Tentar criar o registro automaticamente se não existir
        
        try {
          const { data: newUserData, error: createError } = await supabase
            .from('users')
            .insert({
              id: authData.user.id,
              email: authData.user.email || '',
              name: authData.user.user_metadata?.name || 'Usuário',
              specialty: authData.user.user_metadata?.specialty || 'Anestesiologia',
              crm: authData.user.user_metadata?.crm || '000000',
              gender: authData.user.user_metadata?.gender || null,
              phone: authData.user.user_metadata?.phone || null,
              cpf: authData.user.user_metadata?.cpf || null,
              password_hash: '',
              subscription_plan: 'premium',
              subscription_status: 'active'
            })
            .select()
            .single()

          if (createError) {
            logger.error('Erro ao criar registro:', createError.message)
            return null
          }

          if (newUserData) {
            // Atualizar last_login_at usando API route (bypassa RLS e evita recursão infinita)
            try {
              const updateResponse = await fetch('/api/admin/update-login-time', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: authData.user.id })
              })
              
              // Não bloquear login se falhar
            } catch (error) {
              // Não bloquear login se falhar
            }
            
            return {
              id: newUserData.id,
              email: newUserData.email,
              name: newUserData.name,
              specialty: newUserData.specialty,
              crm: newUserData.crm || '000000',
              gender: newUserData.gender || null
            }
          }
        } catch (createError) {
          logger.error('Erro ao tentar criar registro:', createError)
          return null
        }
        
        return null
      }

      // Atualizar last_login_at usando API route (bypassa RLS e evita recursão infinita)
      try {
        const updateResponse = await fetch('/api/admin/update-login-time', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: authData.user.id })
        })
        // Não bloquear login se falhar
      } catch (error) {
        // Não bloquear login se falhar
      }

      const user = {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        specialty: userData.specialty,
        crm: userData.crm || '000000',
        gender: userData.gender || null
      }

      return user

    } catch (error) {
      logger.error('Erro interno no login:', error)
      return null
    }
  },

  // Registro com confirmação de email usando Supabase Auth
  async register(email: string, password: string, userData: {
    name: string
    specialty: string
    crm: string
    gender: string
    phone: string
    cpf: string
  }): Promise<{ success: boolean; message: string; user?: User }> {
    try {
      // Verificar se há tentativas recentes para este email
      const now = Date.now()
      const lastAttempt = registrationAttempts.get(email) || 0
      const timeDiff = now - lastAttempt
      
      // Bloquear se a última tentativa foi há menos de 30 segundos
      if (timeDiff < 30000) {
        const remainingTime = Math.ceil((30000 - timeDiff) / 1000)
        return { 
          success: false, 
          message: `Aguarde ${remainingTime} segundos antes de tentar novamente para evitar rate limit.` 
        }
      }
      
      // Registrar tentativa atual
      registrationAttempts.set(email, now)
      
      // Limpar tentativas antigas (mais de 5 minutos)
      for (const [key, timestamp] of registrationAttempts.entries()) {
        if (now - timestamp > 300000) {
          registrationAttempts.delete(key)
        }
      }

      // REGRA: Verificar se o email já existe como anestesista (users)
      const { data: existingUserByEmail } = await supabase
        .from('users')
        .select('email')
        .eq('email', email)
        .maybeSingle()

      if (existingUserByEmail) {
        return { success: false, message: 'Email já cadastrado' }
      }

      // REGRA: Verificar se o email já existe como secretária (secretarias)
      const { data: existingSecretaria } = await supabase
        .from('secretarias')
        .select('email')
        .eq('email', email)
        .maybeSingle()

      if (existingSecretaria) {
        return { success: false, message: 'Este email já está cadastrado como secretária. Um email de secretária não pode ser usado como anestesista.' }
      }

      // Verificar se o CRM já existe
      if (userData.crm) {
        const { data: existingUserByCrm } = await supabase
          .from('users')
          .select('crm')
          .eq('crm', userData.crm)
          .maybeSingle()

        if (existingUserByCrm) {
          return { success: false, message: 'CRM já cadastrado' }
        }
      }

      // Verificar se o CPF já existe na tabela users
      if (userData.cpf) {
        const { data: existingUserByCpf } = await supabase
          .from('users')
          .select('cpf')
          .eq('cpf', userData.cpf)
          .maybeSingle()

        if (existingUserByCpf) {
          return { success: false, message: 'CPF já cadastrado' }
        }
        
        // CRÍTICO: Verificar se CPF existe na tabela secretarias
        const { data: existingSecretariaByCpf } = await supabase
          .from('secretarias')
          .select('cpf')
          .eq('cpf', userData.cpf)
          .maybeSingle()
        
        if (existingSecretariaByCpf) {
          return { success: false, message: 'CPF já cadastrado como secretária. Um CPF de secretária não pode ser usado como anestesista.' }
        }
      }

      // FLUXO CORRETO: Criar no Supabase Auth primeiro, depois confirmar email
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: 'https://anesteasy.com.br/auth/confirm?next=/login&type=signup',
          data: {
            name: userData.name,
            specialty: userData.specialty || 'Anestesiologia',
            crm: userData.crm || '',
            gender: userData.gender || '',
            phone: userData.phone || '',
            cpf: userData.cpf || ''
          }
        }
      })

      if (authError) {
        
        // Tratar erros específicos
        if (authError.message.includes('User already registered')) {
          return { success: false, message: 'Email já cadastrado' }
        } else if (authError.message.includes('Password')) {
          return { success: false, message: 'Senha deve ter pelo menos 6 caracteres' }
        } else if (authError.message.includes('Email')) {
          return { success: false, message: 'Email inválido' }
        } else if (authError.message.includes('rate limit') || authError.message.includes('Error sending confirmation email')) {
          return { success: false, message: 'Muitas tentativas. Aguarde alguns minutos e tente novamente. Configure o SMTP personalizado no Supabase para resolver definitivamente.' }
        }
        
        return { success: false, message: 'Erro ao criar conta. Tente novamente.' }
      }

      if (authData.user) {

        // NÃO criar na tabela users ainda - será criado apenas após confirmação de email
        // O usuário será criado na tabela users quando clicar no link de confirmação

        return {
          success: true,
          message: 'Conta criada com sucesso! Verifique seu email para confirmar a conta.',
          user: {
            id: authData.user.id,
            email: authData.user.email || email,
            name: userData.name,
            specialty: userData.specialty || 'Anestesiologia',
            crm: userData.crm || '000000',
            gender: userData.gender || null
          }
        }
      }
      return { success: false, message: 'Erro ao criar conta. Tente novamente.' }
    } catch (error) {
      return { success: false, message: 'Erro interno. Tente novamente.' }
    }
  },

  // Logout
  async logout(): Promise<void> {
    try {
      // Fazer signOut no Supabase Auth
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        logger.error('Erro ao fazer signOut:', error)
        // Continuar mesmo com erro para garantir limpeza
      }
      
      // Limpar sessão local também
      // O Supabase pode manter alguns dados em cache, então forçamos limpeza
      if (typeof window !== 'undefined') {
        // Limpar todos os dados do Supabase do localStorage
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') || key.includes('supabase')) {
            localStorage.removeItem(key)
          }
        })
      }
    } catch (error) {
      logger.error('Erro ao fazer logout:', error)
      // Continuar mesmo com erro
    }
  },

  // Verificar se email foi confirmado (validação dupla)
  async isEmailConfirmed(userId: string): Promise<boolean> {
    try {
      // Buscar dados do usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.getUser()

      if (authError || !authData.user) {
        return false
      }

      // Verificar se o email foi confirmado no Supabase Auth
      const supabaseConfirmed = !!authData.user.email_confirmed_at
      
      if (!supabaseConfirmed) {
        return false
      }

      // Verificar se usuário existe na tabela users (não verificar subscription_status)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, subscription_status')
        .eq('id', userId)
        .maybeSingle()

      if (userError) {
        return false
      }

      if (!userData) {
        return false
      }
      
      // Retornar true se email foi confirmado e usuário existe (não verificar subscription_status)
      return supabaseConfirmed
    } catch (error) {
      logger.error('Erro ao verificar email confirmado:', error)
      return false
    }
  },

  // Obter usuário atual
  async getCurrentUser(): Promise<User | null> {
    try {

      // Verificar sessão atual no Supabase Auth
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session?.user) {
        return null
      }

      // Verificar se o email foi confirmado no Supabase Auth
      if (!session.user.email_confirmed_at) {
        return null
      }

      // Buscar dados do usuário na tabela users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle()

      if (userError || !userData) {
        return null
      }

      // Verificar subscription_status - se não for 'active', ainda permitir
      // A validação de acesso será feita nas rotas protegidas

      return {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        specialty: userData.specialty,
        crm: userData.crm || '000000',
        gender: userData.gender || null
      }
    } catch (error) {
      logger.error('Erro ao obter usuário atual:', error)
      return null
    }
  },

  // Reset de senha (funciona para anestesistas e secretarias)
  async resetPassword(email: string): Promise<{ success: boolean; message: string }> {
    try {
      // IMPORTANTE: Por segurança, sempre retornamos sucesso mesmo se o email não existir
      // Isso evita que atacantes descubram quais emails estão registrados no sistema
      
      // Verificar se é uma secretaria para usar redirect correto
      // Mas não expor se o email existe ou não
      let redirectTo = 'https://www.anesteasy.com.br/reset-password'
      
      try {
        const { data: secretaria } = await supabase
          .from('secretarias')
          .select('id')
          .eq('email', email)
          .maybeSingle()

        if (secretaria) {
          redirectTo = 'https://www.anesteasy.com.br/reset-password?type=secretaria'
        }
      } catch (error) {
        // Ignorar erro na verificação de secretaria, continuar com redirect padrão
        logger.error('Erro ao verificar secretaria:', error)
      }

      // Tentar enviar email de recuperação
      // O Supabase pode não enviar email se o usuário não existir, mas não vamos expor isso
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo
      })

      // SEMPRE retornar sucesso para não revelar se o email existe ou não
      // Esta é uma prática de segurança padrão para evitar information disclosure
      // Se o email não existir, simplesmente não será enviado email, mas o usuário não saberá disso
      return { 
        success: true, 
        message: 'Se o email estiver cadastrado, você receberá um link de recuperação em breve. Verifique sua caixa de entrada e pasta de spam.' 
      }
    } catch (error) {
      logger.error('Erro interno ao resetar senha:', error)
      // Mesmo em caso de erro, retornar mensagem genérica de sucesso por segurança
      return { 
        success: true, 
        message: 'Se o email estiver cadastrado, você receberá um link de recuperação em breve. Verifique sua caixa de entrada e pasta de spam.' 
      }
    }
  },

  // Atualizar senha
  async updatePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      // Primeiro, verificar se a senha atual está correta
      // Obtendo o email do usuário atual
      const { data: { user: authUser }, error: getUserError } = await supabase.auth.getUser()
      
      if (getUserError || !authUser?.email) {
        return { success: false, message: 'Erro ao verificar autenticação. Faça login novamente.' }
      }
      
      // Verificar se a senha atual está correta fazendo um signIn
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: authUser.email,
        password: currentPassword
      })
      
      if (signInError) {
        if (signInError.message?.includes('Invalid login credentials')) {
          return { success: false, message: 'Senha atual incorreta. Verifique e tente novamente.' }
        }
        return { success: false, message: 'Erro ao verificar senha atual. Tente novamente.' }
      }
      
      // Agora atualizar para a nova senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) {
        logger.error('Erro ao atualizar senha:', updateError.message)
        return { success: false, message: `Erro ao atualizar senha: ${updateError.message || 'Tente novamente.'}` }
      }
      
      return { success: true, message: 'Senha atualizada com sucesso!' }
    } catch (error) {
      logger.error('Erro interno ao atualizar senha:', error)
      return { success: false, message: `Erro interno: ${error instanceof Error ? error.message : 'Tente novamente.'}` }
    }
  },

  // Atualizar dados do usuário
  async updateUser(userId: string, userData: { 
    name?: string; 
    email?: string; 
    crm?: string; 
    specialty?: string; 
    phone?: string; 
    gender?: string 
  }): Promise<User | null> {
    try {
      // Se o email está sendo atualizado, também atualizar no Supabase Auth
      if (userData.email !== undefined) {
        const { error: authUpdateError } = await supabase.auth.updateUser({
          email: userData.email
        })
        
        if (authUpdateError) {
          logger.error('Erro ao atualizar email:', authUpdateError.message)
        }
      }
      
      // Preparar dados para atualização (remover campos undefined)
      const updateData: any = {
        updated_at: new Date().toISOString()
      }
      
      if (userData.name !== undefined) updateData.name = userData.name
      if (userData.email !== undefined) updateData.email = userData.email
      if (userData.crm !== undefined) updateData.crm = userData.crm
      if (userData.specialty !== undefined) updateData.specialty = userData.specialty
      if (userData.phone !== undefined) updateData.phone = userData.phone
      if (userData.gender !== undefined) updateData.gender = userData.gender
      
      // Atualizar dados na tabela users
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single()

      if (updateError) {
        logger.error('Erro ao atualizar usuário:', updateError.message)
        return null
      }

      if (updatedUser) {
        const user: User = {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          specialty: updatedUser.specialty,
          crm: updatedUser.crm || '000000',
          gender: updatedUser.gender || null,
          phone: updatedUser.phone || null
        }
        return user
      }

      return null
    } catch (error) {
      logger.error('Erro interno ao atualizar usuário:', error)
      return null
    }
  },

  // Criar conta de secretaria (usado quando anestesista vincula uma secretaria)
  async createSecretariaAccount(
    email: string,
    password: string,
    nome: string,
    telefone?: string,
    cpf?: string
  ): Promise<{ success: boolean; tempPassword?: string }> {
    try {
      // REGRA: Verificar se o email já existe como anestesista (users)
      const { data: existingAnestesista } = await supabase
        .from('users')
        .select('email')
        .eq('email', email)
        .maybeSingle()

      if (existingAnestesista) {
        return { success: false }
      }

      // Verificar se o email já existe na tabela secretarias
      const { data: existingSecretaria } = await supabase
        .from('secretarias')
        .select('email')
        .eq('email', email)
        .maybeSingle()

      if (existingSecretaria) {
        return { success: false }
      }

      // Verificar se o CPF já existe na tabela secretarias
      if (cpf) {
        const { data: existingSecretariaByCpf } = await supabase
          .from('secretarias')
          .select('cpf')
          .eq('cpf', cpf)
          .maybeSingle()

        if (existingSecretariaByCpf) {
          return { success: false }
        }
      }

      // Criar conta no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: 'https://anesteasy.com.br/auth/confirm?next=/secretaria/login&type=signup',
          data: {
            name: nome,
            phone: telefone || '',
            cpf: cpf || '',
            role: 'secretaria'
          }
        }
      })

      if (authError) {
        logger.error('Erro ao criar conta de autenticação:', authError.message)
        return { success: false }
      }

      if (!authData.user) {
        return { success: false }
      }

      // CRÍTICO: Verificar e remover qualquer registro incorreto na tabela users
      // Garantir que secretária NÃO existe na tabela users
      const { data: existingUserIncorrect } = await supabase
        .from('users')
        .select('id')
        .eq('id', authData.user.id)
        .maybeSingle()
      
      if (existingUserIncorrect) {
        await supabase
          .from('users')
          .delete()
          .eq('id', authData.user.id)
      }

      // Criar registro na tabela secretarias
      // IMPORTANTE: Secretária deve existir APENAS na tabela secretarias
      const { error: secretariaError } = await supabase
        .from('secretarias')
        .insert({
          id: authData.user.id,
          email: email,
          nome: nome,
          telefone: telefone || null,
          cpf: cpf || null,
          data_cadastro: new Date().toISOString()
        })

      if (secretariaError) {
        logger.error('Erro ao criar registro na tabela secretarias:', secretariaError.message)
        
        // Se o erro for de constraint de status, tentar valores alternativos
        if (secretariaError.code === '23514' && secretariaError.message?.includes('status')) {
          // Tentar com valores alternativos comuns
          const statusValues = ['ativo', 'Ativo', 'ATIVO', 'pendente', 'Pendente']
          
          for (const statusValue of statusValues) {
            const { error: retryError } = await supabase
              .from('secretarias')
              .insert({
                id: authData.user.id,
                email: email,
                nome: nome,
                telefone: telefone || null,
                cpf: cpf || null,
                status: statusValue,
                data_cadastro: new Date().toISOString()
              })
            
            if (!retryError) {
              return { success: true, tempPassword: password }
            }
          }
        }
        
        return { success: false }
      }

      return { success: true, tempPassword: password }
    } catch (error) {
      console.error('Erro interno ao criar conta de secretaria:', error)
      return { success: false }
    }
  },

  // Excluir conta do usuário
  async deleteAccount(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Verificar se é secretaria ou anestesista
      const { isSecretaria } = await import('@/lib/user-utils')
      const isSecretariaUser = await isSecretaria(userId)

      if (isSecretariaUser) {
        // É SECRETARIA - excluir da tabela secretarias e relacionamentos
        
        // 1. Excluir relacionamentos
        await supabase
          .from('anestesista_secretaria')
          .delete()
          .eq('secretaria_id', userId)
        
        await supabase
          .from('secretaria_link_requests')
          .delete()
          .eq('secretaria_id', userId)
        
        // 2. Excluir procedimentos vinculados à secretaria
        await supabase
          .from('procedures')
          .delete()
          .eq('secretaria_id', userId)

        // 3. Excluir da tabela secretarias
        const { error: secretariaError } = await supabase
          .from('secretarias')
          .delete()
          .eq('id', userId)

        if (secretariaError) {
          logger.error('Erro ao excluir secretaria:', secretariaError.message)
          return { success: false, message: 'Erro ao excluir dados da secretaria.' }
        }
      } else {
        // É ANESTESISTA - excluir da tabela users e relacionamentos
        
        // 1. Excluir dados relacionados do usuário
        const tablesToClean = [
          'procedures',
          'goals', 
          'shifts',
          'feedback',
          'secretaria_links',
          'anestesista_secretaria' // Relacionamentos com secretarias
        ]

        for (const table of tablesToClean) {
          await supabase
            .from(table)
            .delete()
            .eq('user_id', userId)
        }

        // 2. Excluir solicitações de vinculação
        await supabase
          .from('secretaria_link_requests')
          .delete()
          .eq('anestesista_id', userId)

        // 3. Excluir o usuário da tabela users
        const { error: userError } = await supabase
          .from('users')
          .delete()
          .eq('id', userId)

        if (userError) {
          logger.error('Erro ao excluir anestesista:', userError.message)
          return { success: false, message: 'Erro ao excluir dados do usuário.' }
        }
      }

      // 4. Excluir do Supabase Auth via API (para ambos os tipos)
      try {
        const response = await fetch('/api/delete-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId }),
        })

        const result = await response.json()

        if (!response.ok) {
          logger.error('Erro ao excluir do Auth:', result)
          return { success: false, message: 'Erro ao excluir conta de autenticação.' }
        }
      } catch (apiError) {
        logger.error('Erro na API de exclusão:', apiError)
        return { success: false, message: 'Erro ao excluir conta de autenticação.' }
      }

      return { success: true, message: 'Conta excluída com sucesso!' }
    } catch (error) {
      logger.error('Erro interno ao excluir conta:', error)
      return { success: false, message: 'Erro interno. Tente novamente.' }
    }
  }
}