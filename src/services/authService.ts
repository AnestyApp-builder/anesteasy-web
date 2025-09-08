import { supabase } from '../lib/supabase'
import type { User, UserInsert, UserUpdate } from '../lib/supabase'

export interface AuthUser {
  id: string
  email: string
  name: string
  specialty: string
  crm?: string
  phone?: string
  avatar_url?: string
  subscription_plan?: string
  subscription_status?: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  name: string
  specialty?: string
  crm?: string
  phone?: string
}

export interface AuthResponse {
  user: AuthUser | null
  error: string | null
}

class AuthService {
  // Login com email e senha
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      })

      if (error) {
        return { user: null, error: error.message }
      }

      if (!data.user) {
        return { user: null, error: 'Usuário não encontrado' }
      }

      // Buscar dados do usuário na tabela users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single()

      if (userError) {
        return { user: null, error: 'Erro ao buscar dados do usuário' }
      }

      // Atualizar último login
      await supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', data.user.id)

      return { user: userData, error: null }
    } catch (error) {
      return { user: null, error: 'Erro interno do servidor' }
    }
  }

  // Registro de novo usuário
  async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
      })

      if (authError) {
        return { user: null, error: authError.message }
      }

      if (!authData.user) {
        return { user: null, error: 'Erro ao criar usuário' }
      }

      // Criar registro na tabela users
      const newUser: UserInsert = {
        id: authData.user.id,
        email: userData.email,
        password_hash: '', // Será gerenciado pelo Supabase Auth
        name: userData.name,
        specialty: userData.specialty || 'Anestesiologia',
        crm: userData.crm,
        phone: userData.phone,
        subscription_plan: 'standard',
        subscription_status: 'trial',
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 dias
      }

      const { data: user, error: userError } = await supabase
        .from('users')
        .insert(newUser)
        .select()
        .single()

      if (userError) {
        // Se falhar ao criar na tabela users, deletar do auth
        await supabase.auth.admin.deleteUser(authData.user.id)
        return { user: null, error: 'Erro ao criar perfil do usuário' }
      }

      // Criar configurações padrão do usuário
      await supabase
        .from('user_settings')
        .insert({
          user_id: authData.user.id,
          currency: 'BRL',
          date_format: 'DD/MM/YYYY',
          time_format: '24h',
          language: 'pt-BR',
          theme: 'light',
          default_procedure_duration: 60,
          auto_backup: true,
          backup_frequency: 'daily',
        })

      return { user, error: null }
    } catch (error) {
      return { user: null, error: 'Erro interno do servidor' }
    }
  }

  // Logout
  async logout(): Promise<{ error: string | null }> {
    try {
      console.log('AuthService: Iniciando signOut do Supabase...');
      const { error } = await supabase.auth.signOut()
      console.log('AuthService: signOut concluído, error:', error);
      return { error: error?.message || null }
    } catch (error) {
      console.error('AuthService: Erro no signOut:', error);
      return { error: 'Erro ao fazer logout' }
    }
  }

  // Recuperar senha
  async resetPassword(email: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      return { error: error?.message || null }
    } catch (error) {
      return { error: 'Erro ao enviar email de recuperação' }
    }
  }

  // Atualizar senha
  async updatePassword(newPassword: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })
      return { error: error?.message || null }
    } catch (error) {
      return { error: 'Erro ao atualizar senha' }
    }
  }

  // Obter usuário atual
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return null

      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) return null

      return userData
    } catch (error) {
      return null
    }
  }

  // Atualizar perfil do usuário
  async updateProfile(userId: string, updates: Partial<UserUpdate>): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        return { user: null, error: error.message }
      }

      return { user: data, error: null }
    } catch (error) {
      return { user: null, error: 'Erro ao atualizar perfil' }
    }
  }

  // Verificar se usuário está autenticado
  async isAuthenticated(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      return !!session
    } catch (error) {
      return false
    }
  }

  // Escutar mudanças de autenticação
  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const user = await this.getCurrentUser()
        callback(user)
      } else {
        callback(null)
      }
    })
  }
}

export const authService = new AuthService()
