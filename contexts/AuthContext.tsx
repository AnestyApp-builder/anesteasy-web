'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { authService, User } from '@/lib/auth'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  register: (email: string, password: string, userData: { name: string; specialty: string; crm: string }) => Promise<boolean>
  logout: () => Promise<void>
  updateUser: (userData: { name?: string; email?: string; crm?: string; specialty?: string; phone?: string; gender?: string }) => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    let mounted = true

    // Verificar se há usuário logado ao carregar
    const checkUser = async () => {
      try {
        const currentUser = await authService.getCurrentUser()
        if (mounted) {
          setUser(currentUser)
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Erro ao verificar usuário:', error)
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    checkUser()

    // Escutar mudanças de autenticação
    const { data: { subscription } } = authService.onAuthStateChange((user) => {
      if (mounted) {
        setUser(user)
        setIsLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    try {
      const user = await authService.login(email, password)
      if (user) {
        setUser(user)
        router.push('/dashboard')
        return true
      }
      return false
    } catch (error) {
      console.error('Erro no login:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (email: string, password: string, userData: { name: string; specialty: string; crm: string }): Promise<boolean> => {
    setIsLoading(true)
    try {
      const user = await authService.register(email, password, userData)
      if (user) {
        setUser(user)
        router.push('/dashboard')
        return true
      }
      return false
    } catch (error) {
      console.error('Erro no registro:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    setIsLoading(true)
    try {
      await authService.logout()
      setUser(null)
      router.push('/')
    } catch (error) {
      console.error('Erro no logout:', error)
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
      console.error('Erro ao atualizar usuário:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    updateUser
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
