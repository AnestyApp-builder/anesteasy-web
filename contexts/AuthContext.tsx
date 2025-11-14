'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { authService, User } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { isSecretaria } from '@/lib/user-utils'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isEmailConfirmed: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  register: (email: string, password: string, userData: { name: string; specialty: string; crm: string }) => Promise<{ success: boolean; message: string }>
  logout: () => Promise<void>
  updateUser: (userData: { name?: string; email?: string; crm?: string; specialty?: string; phone?: string; gender?: string }) => Promise<boolean>
  deleteAccount: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isEmailConfirmed, setIsEmailConfirmed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    let mounted = true
    let loadingTimeout: NodeJS.Timeout | null = null

    // Timeout de segurança - sempre finalizar loading após 5 segundos
    loadingTimeout = setTimeout(() => {
      if (mounted) {
        console.warn('⚠️ [AUTH] Timeout de segurança - finalizando loading')
        setIsLoading(false)
      }
    }, 5000)

    // Função para carregar dados do usuário
    const loadUser = async (session: any) => {
      if (!mounted || !session?.user) {
        if (mounted) {
          setIsLoading(false)
          if (loadingTimeout) clearTimeout(loadingTimeout)
        }
        return
      }

      try {
        console.log('👤 [AUTH] Carregando usuário:', session.user.id)
        
        // Verificar se é secretária - se for, ignorar (com timeout muito curto)
        // Secretárias usam SecretariaAuthContext, não este contexto
        try {
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), 1000) // Timeout muito curto
          })
          
          // Tentar verificar por ID primeiro
          let isSec = false
          try {
            const isSecPromise = isSecretaria(session.user.id)
            isSec = await Promise.race([isSecPromise, timeoutPromise]) as boolean
          } catch (e) {
            // Se der timeout, tentar por email (mais rápido às vezes)
            try {
              const { data } = await supabase
                .from('secretarias')
                .select('id')
                .eq('email', session.user.email)
                .maybeSingle()
              isSec = !!data
            } catch (emailError) {
              // Se ainda der erro, continuar como anestesista
            }
          }
          
          if (isSec) {
            console.log('👩‍💼 [AUTH] É secretária, ignorando (usa SecretariaAuthContext)')
            if (mounted) {
              setUser(null)
              setIsEmailConfirmed(false)
              setIsLoading(false)
              if (loadingTimeout) clearTimeout(loadingTimeout)
            }
            return
          }
        } catch (error) {
          // Silenciar erro - continuar normalmente como anestesista
        }

        // Buscar dados do usuário (com timeout curto)
        let userData = null
        try {
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), 2000) // Timeout curto
          })
          const userDataPromise = supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle()
          
          const result = await Promise.race([userDataPromise, timeoutPromise]) as any
          if (result && !result.error && result.data) {
            userData = result.data
          }
        } catch (error) {
          // Se der timeout, continuar sem dados - vamos criar dados básicos
          console.warn('⚠️ [AUTH] Timeout ao buscar dados do usuário, usando dados básicos')
        }

        if (!userData) {
          console.log('⚠️ [AUTH] Usuário não encontrado na tabela, criando dados básicos')
          // Se o usuário está autenticado mas não existe na tabela, criar dados básicos
          const basicUser = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário',
            specialty: session.user.user_metadata?.specialty || 'Anestesiologia',
            crm: session.user.user_metadata?.crm || '000000',
            gender: session.user.user_metadata?.gender || null,
            phone: session.user.user_metadata?.phone || null
          }
          
          if (mounted) {
            setUser(basicUser)
            setIsEmailConfirmed(!!session.user.email_confirmed_at)
            localStorage.setItem('currentUser', JSON.stringify(basicUser))
            localStorage.setItem('isEmailConfirmed', (!!session.user.email_confirmed_at).toString())
            console.log('✅ [AUTH] Usuário básico criado')
            setIsLoading(false)
            if (loadingTimeout) clearTimeout(loadingTimeout)
          }
          return
        }

        const emailConfirmed = !!session.user.email_confirmed_at
        
        const currentUser = {
          id: session.user.id,
          email: session.user.email || userData.email || '',
          name: userData.name || session.user.user_metadata?.name || 'Usuário',
          specialty: userData.specialty || session.user.user_metadata?.specialty || 'Anestesiologia',
          crm: userData.crm || session.user.user_metadata?.crm || '000000',
          gender: userData.gender || null,
          phone: userData.phone || null
        }

        if (mounted) {
          setUser(currentUser)
          setIsEmailConfirmed(emailConfirmed)
          localStorage.setItem('currentUser', JSON.stringify(currentUser))
          localStorage.setItem('isEmailConfirmed', emailConfirmed.toString())
          console.log('✅ [AUTH] Usuário carregado')
          setIsLoading(false)
          if (loadingTimeout) clearTimeout(loadingTimeout)
        }
      } catch (error) {
        console.error('❌ [AUTH] Erro ao carregar usuário:', error)
        if (mounted) {
          setUser(null)
          setIsEmailConfirmed(false)
          setIsLoading(false)
          if (loadingTimeout) clearTimeout(loadingTimeout)
        }
      }
    }

    // Listener de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      console.log('🔔 [AUTH] Evento:', event)

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await loadUser(session)
      } else if (event === 'SIGNED_OUT') {
        if (mounted) {
          setUser(null)
          setIsEmailConfirmed(false)
          setIsLoading(false)
        }
        localStorage.removeItem('currentUser')
        localStorage.removeItem('isEmailConfirmed')
      }
    })

    // Verificar sessão inicial com timeout
    const init = async () => {
      try {
        // Timeout de 3 segundos para evitar travamento
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout na verificação de autenticação')), 3000)
        })

        const sessionPromise = supabase.auth.getSession()
        let session = null
        
        try {
          const result = await Promise.race([
            sessionPromise,
            timeoutPromise
          ]) as any
          session = result?.data?.session || null
        } catch (error) {
          // Se der timeout, continuar sem sessão
          console.warn('⚠️ [AUTH] Timeout ao buscar sessão, continuando sem autenticação')
          session = null
        }

        await loadUser(session)
      } catch (error) {
        console.error('❌ [AUTH] Erro na inicialização:', error)
        if (mounted) {
          setUser(null)
          setIsEmailConfirmed(false)
          setIsLoading(false)
        }
      }
    }

    init()

    return () => {
      mounted = false
      if (loadingTimeout) clearTimeout(loadingTimeout)
      subscription.unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('🔐 [AUTH] Login:', email)
      
      const user = await authService.login(email, password)
      
      if (user) {
        const emailConfirmed = await authService.isEmailConfirmed(user.id)
        
        setUser(user)
        setIsEmailConfirmed(emailConfirmed)
        localStorage.setItem('currentUser', JSON.stringify(user))
        localStorage.setItem('isEmailConfirmed', emailConfirmed.toString())
        
        console.log('✅ [AUTH] Login bem-sucedido')
        return true
      }
      
      return false
    } catch (error) {
      console.error('❌ [AUTH] Erro no login:', error)
      return false
    }
  }

  const register = async (
    email: string,
    password: string,
    userData: { name: string; specialty: string; crm: string }
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const result = await authService.register(email, password, userData)
      return result
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Erro ao criar conta'
      }
    }
  }

  const logout = async () => {
    try {
      console.log('🚪 [AUTH] Logout')
      
      await supabase.auth.signOut()
      
      setUser(null)
      setIsEmailConfirmed(false)
      localStorage.removeItem('currentUser')
      localStorage.removeItem('isEmailConfirmed')
      
      router.push('/login')
    } catch (error) {
      console.error('❌ [AUTH] Erro no logout:', error)
    }
  }

  const updateUser = async (userData: {
    name?: string
    email?: string
    crm?: string
    specialty?: string
    phone?: string
    gender?: string
  }): Promise<boolean> => {
    if (!user) return false

    try {
      const success = await authService.updateUser(user.id, userData)
      
      if (success) {
        const updatedUser = { ...user, ...userData }
        setUser(updatedUser)
        localStorage.setItem('currentUser', JSON.stringify(updatedUser))
        return true
      }
      
      return false
    } catch (error) {
      console.error('❌ [AUTH] Erro ao atualizar usuário:', error)
      return false
    }
  }

  const deleteAccount = async (): Promise<boolean> => {
    if (!user) return false

    try {
      const success = await authService.deleteAccount(user.id)
      
      if (success) {
        setUser(null)
        setIsEmailConfirmed(false)
        localStorage.removeItem('currentUser')
        localStorage.removeItem('isEmailConfirmed')
        router.push('/')
        return true
      }
      
      return false
    } catch (error) {
      console.error('❌ [AUTH] Erro ao deletar conta:', error)
      return false
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isEmailConfirmed,
        isLoading,
        login,
        register,
        logout,
        updateUser,
        deleteAccount
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}
