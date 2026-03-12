'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { authService, User } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { isSecretaria } from '@/lib/user-utils'
import logger from '@/lib/logger'

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
        if (mounted) {
          setIsLoading(false)
        }
        return
      }

      try {
        // Verificar se é secretária - se for, ignorar
        // Secretárias usam SecretariaAuthContext, não este contexto
        // Otimização: verificar apenas uma vez usando a função isSecretaria
        try {
          const isSec = await isSecretaria(session.user.id)
          
          if (isSec) {
            if (mounted) {
              setUser(null)
              setIsEmailConfirmed(false)
              setIsLoading(false)
            }
            return
          }
        } catch (error) {
          // Silenciar erro - continuar normalmente como anestesista
        }

        // Buscar dados do usuário usando API route (bypassa RLS e evita erros 500)
        let userData = null
        try {
          const fetchResponse = await fetch('/api/admin/get-user-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: session.user.id })
          })
          
          if (fetchResponse.ok) {
            const fetchResult = await fetchResponse.json()
            if (fetchResult.exists && fetchResult.data) {
              userData = fetchResult.data
            }
          }
        } catch (error) {
          // Se der erro, continuar sem dados - vamos tentar criar dados básicos
        }

        if (!userData) {
          // Se o email foi confirmado mas o usuário não existe na tabela, tentar criar
          // Isso pode acontecer se a confirmação de email não criou o registro corretamente
          if (session.user.email_confirmed_at && !session.user.user_metadata?.role) {
            // Não é secretária, então deveria estar na tabela users
            try {
              const createResponse = await fetch('/api/admin/create-user-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: session.user.id,
                  email: session.user.email || '',
                  name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário',
                  specialty: session.user.user_metadata?.specialty || 'Anestesiologia',
                  crm: session.user.user_metadata?.crm || '000000',
                  gender: session.user.user_metadata?.gender || null,
                  phone: session.user.user_metadata?.phone || null,
                  cpf: session.user.user_metadata?.cpf || null
                })
              })
              
              if (createResponse.ok) {
                const createResult = await createResponse.json()
                if (createResult.data) {
                  userData = createResult.data
                }
              }
            } catch (createError) {
              // Erro ao criar usuário - continuar com dados básicos
            }
          }
          
          // Se ainda não tem userData, usar dados básicos do session.user
          if (!userData) {
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
              setIsLoading(false)
            }
            return
          }
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
          setIsLoading(false)
        }
      } catch (error) {
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

      // Ignorar eventos de erro relacionados a refresh token
      if (event === 'TOKEN_REFRESHED' && !session) {
        // Token refresh falhou (normal quando não há sessão)
        return
      }

      try {
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
      } catch (error: any) {
        // Ignorar erros de refresh token não encontrado
        const errorMessage = error?.message || ''
        if (errorMessage.includes('Refresh Token') || errorMessage.includes('refresh_token')) {
          // Estado normal - não há sessão válida
          if (mounted && event === 'SIGNED_OUT') {
            setUser(null)
            setIsEmailConfirmed(false)
            setIsLoading(false)
          }
          return
        }
      }
    })

    // Verificar sessão inicial
    const init = async () => {
      try {
        // ✅ FIX CRÍTICO: Adicionar timeout em getSession()
        let timeoutId: NodeJS.Timeout
        const sessionPromise = supabase.auth.getSession()
        const sessionTimeout = new Promise<{ data: { session: null }, error: { message: string } }>((resolve) => {
          timeoutId = setTimeout(() => {
            console.warn('⏱️ [AUTH CONTEXT] Timeout ao obter sessão inicial (10s)')
            resolve({ 
              data: { session: null }, 
              error: { message: 'Timeout' }
            })
          }, 10000) // ✅ 10 segundos de timeout (aumentado para produção)
        })

        const { data: { session }, error: sessionError } = await Promise.race([
          sessionPromise, 
          sessionTimeout
        ])

        if (timeoutId) clearTimeout(timeoutId)

        if (!mounted) return
        
        // Ignorar erros de refresh token não encontrado (estado normal quando não há sessão)
        if (sessionError) {
          const errorMessage = sessionError.message || ''
          if (errorMessage.includes('Refresh Token') || 
              errorMessage.includes('refresh_token') ||
              errorMessage.includes('Timeout')) {
            // Estado normal - não há sessão válida, continuar sem erro
            if (mounted) {
              setUser(null)
              setIsEmailConfirmed(false)
              setIsLoading(false)
            }
            return
          }
        }
        
        await loadUser(session)
      } catch (error: any) {
        // Ignorar erros de refresh token não encontrado
        const errorMessage = error?.message || ''
        if (errorMessage.includes('Refresh Token') || 
            errorMessage.includes('refresh_token') ||
            errorMessage.includes('Timeout')) {
          // Estado normal - não há sessão válida
          if (mounted) {
            setUser(null)
            setIsEmailConfirmed(false)
            setIsLoading(false)
          }
          return
        }
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
      const user = await authService.login(email, password)
      
      if (user) {
        const emailConfirmed = await authService.isEmailConfirmed(user.id)
        
        setUser(user)
        setIsEmailConfirmed(emailConfirmed)
        localStorage.setItem('currentUser', JSON.stringify(user))
        localStorage.setItem('isEmailConfirmed', emailConfirmed.toString())
        
        return true
      }
      
      return false
    } catch (error) {
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
      // Limpar estado imediatamente para feedback visual rápido
      setUser(null)
      setIsEmailConfirmed(false)
      
      // Limpar localStorage antes do signOut
      if (typeof window !== 'undefined') {
        localStorage.removeItem('currentUser')
        localStorage.removeItem('isEmailConfirmed')
        // Limpar todos os dados do Supabase do localStorage
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') || key.includes('supabase')) {
            localStorage.removeItem(key)
          }
        })
      }
      
      // Fazer signOut (não aguardar para redirecionar mais rápido)
      supabase.auth.signOut().catch(() => {
        // Erro no signOut
      })
      
      // Redirecionar imediatamente para login usando window.location para forçar reload completo
      // Isso garante que funciona em qualquer página, incluindo /planos
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    } catch (error) {
      // Mesmo com erro, redirecionar para login
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
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
