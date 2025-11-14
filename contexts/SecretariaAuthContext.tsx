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
    const TIMEOUT = 8000 // 8 segundos timeout para mobile

    // Verificar sessão inicial com timeout
    const checkInitialSession = async () => {
      try {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout na verificação de secretária')), TIMEOUT)
        })

        const sessionPromise = supabase.auth.getSession()
        const { data: { session } } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any

        if (session?.user && mounted) {
          try {
            const secretariaPromise = supabase
              .from('secretarias')
              .select('*')
              .eq('email', session.user.email)
              .single()

            const { data: secretariaData, error: secretariaError } = await Promise.race([
              secretariaPromise,
              timeoutPromise
            ]) as any

            if (secretariaData && !secretariaError && mounted) {
              setSecretaria(secretariaData)
            } else if (mounted) {
              setSecretaria(null)
            }
          } catch (queryError: any) {
            console.warn('⚠️ [SECRETARIA] Timeout ou erro ao buscar secretária:', queryError.message || queryError)
            if (mounted) {
              setSecretaria(null)
            }
          }
        } else if (mounted) {
          setSecretaria(null)
        }
      } catch (error: any) {
        console.warn('⚠️ [SECRETARIA] Erro ou timeout na verificação inicial:', error.message || error)
        if (mounted) {
          setSecretaria(null)
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

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

      if (session?.user && mounted) {
        try {
          // Buscar dados da secretaria com timeout
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout ao buscar secretária')), TIMEOUT)
          })

          const secretariaPromise = supabase
            .from('secretarias')
            .select('*')
            .eq('email', session.user.email)
            .single()

          const { data: secretariaData, error: secretariaError } = await Promise.race([
            secretariaPromise,
            timeoutPromise
          ]) as any

          if (secretariaData && !secretariaError && mounted) {
            setSecretaria(secretariaData)
          } else if (mounted) {
            setSecretaria(null)
          }
        } catch (queryError: any) {
          console.warn('⚠️ [SECRETARIA] Timeout ou erro ao buscar secretária:', queryError.message || queryError)
          if (mounted) {
            setSecretaria(null)
          }
        }
      } else if (event === 'SIGNED_OUT' && mounted) {
        setSecretaria(null)
      }
      
      if (mounted) {
        setIsLoading(false)
      }
    })

    // Verificar sessão inicial
    checkInitialSession()

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    try {
      console.log('🔐 [SECRETARIA] Iniciando login para:', email)
      
      // Fazer login com Supabase Auth
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      })

      if (authError) {
        console.error('❌ [SECRETARIA] Erro no login:', authError.message)
        return false
      }

      if (!data?.user) {
        console.error('❌ [SECRETARIA] Usuário não retornado')
        return false
      }

      console.log('✅ [SECRETARIA] Login Supabase bem-sucedido')

      // Verificar se é uma secretaria (com timeout)
      let secretariaData = null
      try {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 2000)
        })
        
        // Tentar por email primeiro (mais rápido)
        const secretariaPromise = supabase
          .from('secretarias')
          .select('*')
          .eq('email', email.trim().toLowerCase())
          .maybeSingle()
        
        const result = await Promise.race([secretariaPromise, timeoutPromise]) as any
        if (result && !result.error && result.data) {
          secretariaData = result.data
        } else {
          // Se não encontrou por email, tentar por ID
          const idResult = await supabase
            .from('secretarias')
            .select('*')
            .eq('id', data.user.id)
            .maybeSingle()
          if (idResult.data && !idResult.error) {
            secretariaData = idResult.data
          }
        }
      } catch (error) {
        console.warn('⚠️ [SECRETARIA] Timeout ao verificar secretária:', error)
        return false
      }

      if (!secretariaData) {
        console.error('❌ [SECRETARIA] Usuário não é uma secretária válida')
        // Fazer logout se não for secretária
        await supabase.auth.signOut()
        return false
      }

      console.log('✅ [SECRETARIA] Secretária encontrada:', secretariaData.id)
      setSecretaria(secretariaData)
      
      // Redirecionar para dashboard
      router.push('/secretaria/dashboard')
      
      return true
    } catch (error: any) {
      console.error('❌ [SECRETARIA] Erro no login:', error)
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
