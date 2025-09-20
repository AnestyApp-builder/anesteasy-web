'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Secretaria {
  id: string
  nome: string
  email: string
  telefone?: string
  data_cadastro: string
  status: string
  created_at: string
  updated_at: string
}

interface SecretariaAuthContextType {
  secretaria: Secretaria | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
}

const SecretariaAuthContext = createContext<SecretariaAuthContextType | undefined>(undefined)

export function SecretariaAuthProvider({ children }: { children: ReactNode }) {
  const [secretaria, setSecretaria] = useState<Secretaria | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    let mounted = true

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (mounted) {
        if (session?.user) {
          // Buscar dados da secretaria
          const { data: secretariaData, error: secretariaError } = await supabase
            .from('secretarias')
            .select('*')
            .eq('email', session.user.email)
            .single()

          if (secretariaData && !secretariaError) {
            setSecretaria(secretariaData)
          } else {
            setSecretaria(null)
          }
        } else {
          setSecretaria(null)
        }
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
      // Fazer login com Supabase Auth
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (authError) {
        return false
      }

      if (data.user) {
        // Verificar se é uma secretaria
        const { data: secretariaData, error: secretariaError } = await supabase
          .from('secretarias')
          .select('*')
          .eq('email', email)
          .single()

        if (secretariaError || !secretariaData) {
          return false
        }

        setSecretaria(secretariaData)
        router.push('/secretaria/dashboard')
        return true
      }
      return false
    } catch (error) {
      console.error('Erro no login da secretaria:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    setIsLoading(true)
    try {
      await supabase.auth.signOut()
      setSecretaria(null)
      router.push('/login')
    } catch (error) {
      console.error('Erro no logout da secretaria:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const value = {
    secretaria,
    isAuthenticated: !!secretaria,
    isLoading,
    login,
    logout
  }

  return (
    <SecretariaAuthContext.Provider value={value}>
      {children}
    </SecretariaAuthContext.Provider>
  )
}

export function useSecretariaAuth() {
  const context = useContext(SecretariaAuthContext)
  if (context === undefined) {
    throw new Error('useSecretariaAuth must be used within a SecretariaAuthProvider')
  }
  return context
}
