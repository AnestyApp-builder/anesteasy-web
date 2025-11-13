'use client'

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
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
  const isLoggingOutRef = useRef(false)

  useEffect(() => {
    let mounted = true

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      // Ignorar eventos durante logout para evitar relogin automático
      if (isLoggingOutRef.current) {
        console.log('🚪 [SECRETARIA] Ignorando evento durante logout:', event)
        if (event === 'SIGNED_OUT') {
          setSecretaria(null)
          setIsLoading(false)
          isLoggingOutRef.current = false
        }
        return
      }

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
      } else if (event === 'SIGNED_OUT') {
        setSecretaria(null)
      }
      
      setIsLoading(false)
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
        
        // Redirecionar para dashboard
        router.push('/secretaria/dashboard')
        
        return true
      }
      return false
    } catch (error) {
      
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    console.log('🚪 [SECRETARIA] Iniciando logout...')
    
    // Marcar que está fazendo logout para evitar relogin automático
    isLoggingOutRef.current = true
    
    // Limpar estado imediatamente para feedback visual rápido
    setSecretaria(null)
    
    // Limpar todos os dados do localStorage relacionados ao Supabase ANTES do signOut
    if (typeof window !== 'undefined') {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key)
        }
      })
    }
    
    // Fazer signOut e AGUARDAR completar
    try {
      console.log('🚪 [SECRETARIA] Fazendo signOut no Supabase...')
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('❌ [SECRETARIA] Erro ao fazer signOut:', error)
      } else {
        console.log('✅ [SECRETARIA] SignOut concluído')
      }
    } catch (error) {
      console.error('❌ [SECRETARIA] Erro ao fazer signOut:', error)
    }
    
    // Aguardar um pouco para garantir que o signOut foi processado
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Limpar localStorage novamente após signOut
    if (typeof window !== 'undefined') {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key)
        }
      })
    }
    
    console.log('🚪 [SECRETARIA] Redirecionando para login...')
    
    // Redirecionar usando window.location para forçar reload completo e evitar relogin
    window.location.href = '/login'
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
