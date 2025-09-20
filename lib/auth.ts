import { supabase } from './supabase'

export interface User {
  id: string
  name: string
  email: string
  specialty: string
  crm: string
  gender?: string
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
          crm: data.user.user_metadata?.crm || '000000',
          gender: data.user.user_metadata?.gender || null
        }

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
          crm: session.user.user_metadata?.crm || '000000',
          gender: session.user.user_metadata?.gender || null
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

  // Atualizar dados do usuário
  async updateUser(userId: string, userData: {
    name?: string
    email?: string
    crm?: string
    specialty?: string
    phone?: string
    gender?: string
  }): Promise<User | null> {
    try {
      console.log('Atualizando usuário:', userId, userData)
      
      // Atualizar na tabela users
      const { data, error } = await supabase
        .from('users')
        .update({
          ...userData,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        console.error('Erro ao atualizar usuário:', error.message)
        return null
      }

      // Atualizar user_metadata no Supabase Auth
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          name: userData.name,
          specialty: userData.specialty,
          crm: userData.crm,
          gender: userData.gender
        }
      })

      if (authError) {
        console.error('Erro ao atualizar metadata do usuário:', authError.message)
      }

      console.log('Usuário atualizado com sucesso:', data)
      return {
        id: data.id,
        email: data.email,
        name: data.name,
        specialty: data.specialty,
        crm: data.crm,
        gender: data.gender
      }
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error)
      return null
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
          crm: session.user.user_metadata?.crm || '000000',
          gender: session.user.user_metadata?.gender || null
        })
      } else {
        callback(null)
      }
    })

    return { data: { subscription } }
  },

  // Funções específicas para secretarias
  async createSecretariaAccount(email: string, password: string, nome: string, telefone?: string): Promise<boolean> {
    try {
      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password
      })

      if (authError) {
        console.error('Erro ao criar conta da secretaria:', authError.message)
        return false
      }

      if (authData.user) {
        // Criar registro na tabela secretarias
        const { error: secretariaError } = await supabase
          .from('secretarias')
          .insert({
            id: authData.user.id,
            nome,
            email,
            telefone,
            status: 'ativo'
          })

        if (secretariaError) {
          console.error('Erro ao criar perfil da secretaria:', secretariaError.message)
          return false
        }

        return true
      }

      return false
    } catch (error) {
      console.error('Erro ao criar conta da secretaria:', error)
      return false
    }
  },

  async loginSecretaria(email: string, password: string): Promise<any | null> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        console.error('Erro no login da secretaria:', error.message)
        return null
      }

      if (data.user) {
        // Buscar dados da secretaria
        const { data: secretariaData, error: secretariaError } = await supabase
          .from('secretarias')
          .select('*')
          .eq('email', email)
          .single()

        if (secretariaError) {
          console.error('Erro ao buscar dados da secretaria:', secretariaError.message)
          return null
        }

        return secretariaData
      }

      return null
    } catch (error) {
      console.error('Erro no login da secretaria:', error)
      return null
    }
  }
}
