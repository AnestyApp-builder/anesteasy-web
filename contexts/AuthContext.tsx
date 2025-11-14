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

    // Função para carregar dados do usuário
    const loadUser = async (session: any) => {
      if (!mounted || !session?.user) {
        if (mounted) setIsLoading(false)
        return
      }

      try {
        console.log('👤 [AUTH] Carregando usuário:', session.user.id)
        
        // Verificar se é secretária - se for, ignorar
        const isSec = await isSecretaria(session.user.id)
        if (isSec) {
          console.log('👩‍💼 [AUTH] É secretária, ignorando')
          if (mounted) {
            setUser(null)
            setIsEmailConfirmed(false)
            setIsLoading(false)
          }
          return
        }

        // Buscar dados do usuário
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle()

        if (!userData) {
          console.log('⚠️ [AUTH] Usuário não encontrado na tabela')
          if (mounted) {
            setUser(null)
            setIsEmailConfirmed(false)
            setIsLoading(false)
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
        }
      } catch (error) {
        console.error('❌ [AUTH] Erro ao carregar usuário:', error)
        if (mounted) {
          setUser(null)
          setIsEmailConfirmed(false)
          setIsLoading(false)
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

    // Verificar sessão inicial
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
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
