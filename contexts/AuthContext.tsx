'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { authService, User } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

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

    const checkUser = async () => {
      try {
        
        
        // Verificar sessão atual primeiro
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          
        }
        
        
        
        if (session?.user) {
          
          
          // Buscar dados do usuário na tabela users
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle()

          if (userError) {
            
          }

          if (userData && mounted) {
            
            
            const currentUser = {
              id: userData.id,
              email: userData.email,
              name: userData.name,
              specialty: userData.specialty,
              crm: userData.crm || '000000',
              gender: userData.gender || null,
              phone: userData.phone || null
            }
            
            // Verificar se o email foi confirmado
            const emailConfirmed = !!session.user.email_confirmed_at
            setIsEmailConfirmed(emailConfirmed)
            
            setUser(currentUser)
            localStorage.setItem('currentUser', JSON.stringify(currentUser))
            localStorage.setItem('isEmailConfirmed', emailConfirmed.toString())
          } else {
            
            
            
            // Tentar criar o registro na tabela users
            try {
              const { error: insertError } = await supabase
                .from('users')
                .insert({
                  id: session.user.id,
                  email: session.user.email || '',
                  name: session.user.user_metadata?.name || 'Usuário',
                  specialty: session.user.user_metadata?.specialty || 'Anestesiologia',
                  crm: session.user.user_metadata?.crm || '000000',
                  password_hash: '',
                  subscription_plan: 'premium',
                  subscription_status: 'active'
                })

              if (insertError) {
                
              } else {
                
              }
            } catch (error) {
              
            }
            
            // VALIDAÇÃO DUPLA: Verificar se email foi confirmado no Supabase Auth
            const emailConfirmed = !!session.user.email_confirmed_at
            
            // VALIDAÇÃO DUPLA: Verificar se usuário existe na tabela users
            if (!userData) {
              // Usuário não existe na tabela users (não confirmou email), limpar dados
              setUser(null)
              setIsEmailConfirmed(false)
              localStorage.removeItem('currentUser')
              localStorage.removeItem('isEmailConfirmed')
              localStorage.removeItem('supabase.auth.token')
              return
            }

            // VALIDAÇÃO DUPLA: Verificar se status é 'active' na tabela users
            if (userData.subscription_status !== 'active') {
              // Usuário não está ativo, limpar dados
              setUser(null)
              setIsEmailConfirmed(false)
              localStorage.removeItem('currentUser')
              localStorage.removeItem('isEmailConfirmed')
              localStorage.removeItem('supabase.auth.token')
              return
            }
            
            // Usar dados do user_metadata como fallback
            const currentUser = {
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.name || 'Usuário',
              specialty: session.user.user_metadata?.specialty || 'Anestesiologia',
              crm: session.user.user_metadata?.crm || '000000',
              gender: session.user.user_metadata?.gender || null,
              phone: session.user.user_metadata?.phone || null
            }
            
            setIsEmailConfirmed(emailConfirmed)
            
            setUser(currentUser)
            localStorage.setItem('currentUser', JSON.stringify(currentUser))
            localStorage.setItem('isEmailConfirmed', emailConfirmed.toString())
          }
        } else {
          
          // Limpar dados inválidos do localStorage
          setUser(null)
          setIsEmailConfirmed(false)
          localStorage.removeItem('currentUser')
          localStorage.removeItem('isEmailConfirmed')
          localStorage.removeItem('supabase.auth.token')
        }
      } catch (error) {
        
        // Limpar dados em caso de erro
        setUser(null)
        setIsEmailConfirmed(false)
        localStorage.removeItem('currentUser')
        localStorage.removeItem('isEmailConfirmed')
        localStorage.removeItem('supabase.auth.token')
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    checkUser()

    return () => {
      mounted = false
    }
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    try {
      const user = await authService.login(email, password)
      if (user) {
        // Verificar se o email foi confirmado
        const emailConfirmed = await authService.isEmailConfirmed(user.id)
        setIsEmailConfirmed(emailConfirmed)
        
        setUser(user)
        localStorage.setItem('currentUser', JSON.stringify(user))
        localStorage.setItem('isEmailConfirmed', emailConfirmed.toString())
        
        // Se email não confirmado, redirecionar para página de espera
        if (!emailConfirmed) {
          
          router.push('/confirm-email?email=' + encodeURIComponent(email))
        } else {
          
        }
        
        return true
      }
      return false
    } catch (error) {
      
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (email: string, password: string, userData: { name: string; specialty: string; crm: string }): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true)
    try {
      
      
      const result = await authService.register(email, password, userData)
      
      
      
      if (result.success) {
        
        
        if (result.user) {
          setUser(result.user)
          setIsEmailConfirmed(false) // Email não confirmado ainda
          localStorage.setItem('currentUser', JSON.stringify(result.user))
          localStorage.setItem('isEmailConfirmed', 'false')
        }
        
        // Redirecionar para página de login
        router.push('/login')
        return { success: true, message: result.message }
      }
      
      
      return { success: false, message: result.message }
    } catch (error) {
      
      return { success: false, message: 'Erro interno. Tente novamente.' }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    setIsLoading(true)
    try {
      await authService.logout()
      setUser(null)
      setIsEmailConfirmed(false)
      localStorage.removeItem('currentUser')
      localStorage.removeItem('isEmailConfirmed')
      router.push('/')
    } catch (error) {
      
    } finally {
      setIsLoading(false)
    }
  }

  const updateUser = async (userData: { name?: string; email?: string; crm?: string; specialty?: string; phone?: string; gender?: string }): Promise<boolean> => {
    if (!user) return false
    
    setIsLoading(true)
    try {
      const updatedUser = await authService.updateUser(user.id, userData)
      if (updatedUser) {
        setUser(updatedUser)
        return true
      }
      return false
    } catch (error) {
      
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const deleteAccount = async (): Promise<boolean> => {
    if (!user) return false
    
    setIsLoading(true)
    try {
      const success = await authService.deleteAccount(user.id)
      if (success) {
        setUser(null)
        localStorage.removeItem('currentUser')
        router.push('/')
        return true
      }
      return false
    } catch (error) {
      
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const value = {
    user,
    isAuthenticated: !!user, // Remover verificação de email confirmado
    isEmailConfirmed,
    isLoading,
    login,
    register,
    logout,
    updateUser,
    deleteAccount
  }


  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
