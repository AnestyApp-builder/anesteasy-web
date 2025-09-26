import { supabase } from './supabase'
import { User } from './types'

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
      // Fazer login com Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (authError) {
        return null
      }

      if (authData.user) {
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

        if (userError || !userData) {
          return null
        }

        if (userData.subscription_status !== 'active') {
          return null
        }

        return {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          specialty: userData.specialty,
          crm: userData.crm || '000000',
          gender: userData.gender || null
        }
      }

      return null

    } catch (error) {
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

      // Verificar se o email já existe na tabela users
      const { data: existingUserByEmail } = await supabase
        .from('users')
        .select('email')
        .eq('email', email)
        .maybeSingle()

      if (existingUserByEmail) {
        return { success: false, message: 'Email já cadastrado' }
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
            phone: userData.phone || ''
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
      await supabase.auth.signOut()
      
    } catch (error) {
      
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

      // Verificar se status é 'active' na tabela users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('subscription_status')
        .eq('id', userId)
        .maybeSingle()

      if (userError || !userData) {
        return false
      }

      const tableActive = userData.subscription_status === 'active'
      
      return supabaseConfirmed && tableActive
    } catch (error) {
      
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

      // Verificar se status é 'active' na tabela users
      if (userData.subscription_status !== 'active') {
        return null
      }

      return {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        specialty: userData.specialty,
        crm: userData.crm || '000000',
        gender: userData.gender || null
      }
    } catch (error) {
      
      return null
    }
  },

  // Reset de senha
  async resetPassword(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://www.anesteasy.com.br/reset-password'
      })

      if (error) {
        return { success: false, message: 'Erro ao enviar email de recuperação. Tente novamente.' }
      }

      return { success: true, message: 'Email de recuperação enviado! Verifique sua caixa de entrada.' }
    } catch (error) {
      return { success: false, message: 'Erro interno. Tente novamente.' }
    }
  },

  // Atualizar senha
  async updatePassword(newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        return { success: false, message: 'Erro ao atualizar senha. Tente novamente.' }
      }

      return { success: true, message: 'Senha atualizada com sucesso!' }
    } catch (error) {
      return { success: false, message: 'Erro interno. Tente novamente.' }
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
      // Atualizar dados na tabela users
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          ...(userData.name !== undefined && { name: userData.name }),
          ...(userData.email !== undefined && { email: userData.email }),
          ...(userData.crm !== undefined && { crm: userData.crm }),
          ...(userData.specialty !== undefined && { specialty: userData.specialty }),
          ...(userData.phone !== undefined && { phone: userData.phone }),
          ...(userData.gender !== undefined && { gender: userData.gender }),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()

      if (updateError) {
        console.error('Erro ao atualizar usuário:', updateError)
        return null
      }

      if (updatedUser) {
        return {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          specialty: updatedUser.specialty,
          crm: updatedUser.crm || '000000',
          gender: updatedUser.gender || null,
          phone: updatedUser.phone || null
        }
      }

      return null
    } catch (error) {
      console.error('Erro interno ao atualizar usuário:', error)
      return null
    }
  },

  // Excluir conta do usuário
  async deleteAccount(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      // 1. Excluir dados relacionados do usuário
      const tablesToClean = [
        'procedures',
        'goals', 
        'shifts',
        'feedback',
        'secretaria_links'
      ]

      for (const table of tablesToClean) {
        await supabase
          .from(table)
          .delete()
          .eq('user_id', userId)
      }

      // 2. Excluir o usuário da tabela users
      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

      if (userError) {
        return { success: false, message: 'Erro ao excluir dados do usuário.' }
      }

      // 3. Excluir do Supabase Auth via API
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
          return { success: false, message: 'Erro ao excluir conta de autenticação.' }
        }
      } catch (apiError) {
        return { success: false, message: 'Erro ao excluir conta de autenticação.' }
      }

      return { success: true, message: 'Conta excluída com sucesso!' }
    } catch (error) {
      return { success: false, message: 'Erro interno. Tente novamente.' }
    }
  }
}