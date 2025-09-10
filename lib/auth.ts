import { supabase } from './supabase'

export interface User {
  id: string
  name: string
  email: string
  specialty: string
  crm: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

export const authService = {
  // Login com Supabase Auth
  async login(email: string, password: string): Promise<User | null> {
    try {
      console.log('Tentando fazer login com:', email)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        console.error('Erro no login:', error.message)
        return null
      }

      if (data.user) {
        // Usar dados da sessão do Supabase Auth
        const userData = {
          id: data.user.id,
          email: data.user.email || email,
          name: data.user.user_metadata?.name || 'Usuário',
          specialty: data.user.user_metadata?.specialty || 'Anestesiologia',
          crm: data.user.user_metadata?.crm || '000000'
        }

        console.log('Login bem-sucedido:', userData)
        return userData
      }

      return null
    } catch (error) {
      console.error('Erro no login:', error)
      return null
    }
  },

  // Registro com Supabase Auth
  async register(email: string, password: string, userData: {
    name: string
    specialty: string
    crm: string
  }): Promise<User | null> {
    try {
      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password
      })

      if (authError) {
        console.error('Erro no registro:', authError.message)
        return null
      }

      if (authData.user) {
        // Criar registro na tabela users
        const { data: userDataResult, error: userError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email,
            name: userData.name,
            specialty: userData.specialty,
            crm: userData.crm
          })
          .select()
          .single()

        if (userError) {
          console.error('Erro ao criar perfil do usuário:', userError.message)
          return null
        }

        return userDataResult
      }

      return null
    } catch (error) {
      console.error('Erro no registro:', error)
      return null
    }
  },

  // Logout
  async logout(): Promise<void> {
    try {
      await supabase.auth.signOut()
      console.log('Logout realizado')
    } catch (error) {
      console.error('Erro no logout:', error)
    }
  },

  // Obter usuário atual
  async getCurrentUser(): Promise<User | null> {
    try {
      // Verificar se há sessão ativa no Supabase
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        // Usar apenas dados da sessão do Supabase Auth
        return {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || 'Usuário',
          specialty: session.user.user_metadata?.specialty || 'Anestesiologia',
          crm: session.user.user_metadata?.crm || '000000'
        }
      }
      return null
    } catch (error) {
      console.error('Erro ao obter usuário atual:', error)
      return null
    }
  },

  // Verificar se está autenticado
  async isAuthenticated(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      return !!session?.user
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error)
      return false
    }
  },

  // Escutar mudanças de autenticação
  onAuthStateChange(callback: (user: User | null) => void) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Usar dados da sessão do Supabase Auth
        callback({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || 'Usuário',
          specialty: session.user.user_metadata?.specialty || 'Anestesiologia',
          crm: session.user.user_metadata?.crm || '000000'
        })
      } else {
        callback(null)
      }
    })

    return { data: { subscription } }
  }
}
