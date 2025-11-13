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

    // Listener para mudanças de autenticação e erros de refresh token
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      // Tratar erro de refresh token inválido
      if (event === 'TOKEN_REFRESHED' && !session) {
        console.error('Erro: Refresh token inválido. Fazendo logout...')
        // Limpar dados e redirecionar para login
        setUser(null)
        setIsEmailConfirmed(false)
        localStorage.removeItem('currentUser')
        localStorage.removeItem('isEmailConfirmed')
        localStorage.removeItem('supabase.auth.token')
        localStorage.removeItem('sb-auth-token')
        // Limpar todos os dados do Supabase do localStorage
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') || key.includes('supabase')) {
            localStorage.removeItem(key)
          }
        })
        router.push('/login?error=session_expired')
        return
      }

      // Atualizar sessão quando houver mudanças
      if (session?.user) {
        // Verificar se é secretária antes de fazer checkUser
        // Isso evita que o AuthContext tente fazer login automático para secretárias
        const isSec = await isSecretaria(session.user.id)
        if (isSec) {
          // É secretária, ignorar - deixar o SecretariaAuthContext lidar
          console.log('👩‍💼 [AUTH CONTEXT] Evento de sessão é de secretária, ignorando...')
          setUser(null)
          setIsEmailConfirmed(false)
          localStorage.removeItem('currentUser')
          localStorage.removeItem('isEmailConfirmed')
          return
        }
        checkUser()
      } else if (event === 'SIGNED_OUT') {
        // Limpar completamente quando signOut for detectado
        setUser(null)
        setIsEmailConfirmed(false)
        localStorage.removeItem('currentUser')
        localStorage.removeItem('isEmailConfirmed')
        localStorage.removeItem('supabase.auth.token')
        localStorage.removeItem('sb-auth-token')
        
        // Limpar todos os dados do Supabase do localStorage
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') || key.includes('supabase')) {
            localStorage.removeItem(key)
          }
        })
      }
    })

    const checkUser = async () => {
      try {
        
        
        // Verificar sessão atual primeiro
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          // Se o erro for relacionado a refresh token inválido, limpar dados
          if (sessionError.message?.includes('Refresh Token') || sessionError.message?.includes('refresh_token')) {
            console.error('Erro de refresh token:', sessionError)
            setUser(null)
            setIsEmailConfirmed(false)
            localStorage.removeItem('currentUser')
            localStorage.removeItem('isEmailConfirmed')
            localStorage.removeItem('supabase.auth.token')
            localStorage.removeItem('sb-auth-token')
            // Limpar todos os dados do Supabase do localStorage
            Object.keys(localStorage).forEach(key => {
              if (key.startsWith('sb-') || key.includes('supabase')) {
                localStorage.removeItem(key)
              }
            })
            if (mounted) {
              router.push('/login?error=session_expired')
            }
            return
          }
        }
        
        
        
        if (session?.user) {
          // IMPORTANTE: Verificar se é secretária ANTES de qualquer coisa
          // Secretárias NÃO devem usar o AuthContext de anestesistas
          const secretaria = await isSecretaria(session.user.id)
          if (secretaria) {
            // É secretária, limpar dados e NÃO fazer login automático
            console.log('👩‍💼 [AUTH CONTEXT] Sessão detectada é de secretária, ignorando...')
            setUser(null)
            setIsEmailConfirmed(false)
            localStorage.removeItem('currentUser')
            localStorage.removeItem('isEmailConfirmed')
            // NÃO redirecionar aqui - deixar o SecretariaAuthContext lidar com isso
            if (mounted) {
              setIsLoading(false)
            }
            return
          }
          
          
          // Buscar dados do usuário na tabela users (apenas para anestesistas)
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
              // Calcular data de término do período de teste (7 dias a partir de agora)
              const trialEndsAt = new Date()
              trialEndsAt.setDate(trialEndsAt.getDate() + 7)
              
              const { error: insertError } = await supabase
                .from('users')
                .insert({
                  id: session.user.id,
                  email: session.user.email || '',
                  name: session.user.user_metadata?.name || 'Usuário',
                  specialty: session.user.user_metadata?.specialty || 'Anestesiologia',
                  crm: session.user.user_metadata?.crm || '000000',
                  cpf: session.user.user_metadata?.cpf || null,
                  password_hash: '',
                  subscription_plan: 'premium',
                  subscription_status: 'trial', // Status de teste durante os 7 dias
                  trial_ends_at: trialEndsAt.toISOString() // 7 dias a partir de agora
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
            // Se não for 'active', ainda permitir login mas logar aviso
            if (userData.subscription_status !== 'active') {
              console.warn('Usuário com subscription_status diferente de active:', {
                userId: userData.id,
                status: userData.subscription_status
              })
              // Ainda permitir login - a validação de acesso será feita nas rotas protegidas
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

    // Verificar sessão inicial apenas se não for secretária
    const checkInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const isSec = await isSecretaria(session.user.id)
        if (!isSec) {
          // Só verificar se não for secretária
          checkUser()
        } else {
          // É secretária, não fazer nada - deixar o SecretariaAuthContext lidar
          setUser(null)
          setIsEmailConfirmed(false)
          setIsLoading(false)
        }
      } else {
        setIsLoading(false)
      }
    }

    checkInitialSession()

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [router])

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    try {
      console.log('🔐 [AUTH CONTEXT] Iniciando login no contexto para:', email)
      
      const user = await authService.login(email, password)
      
      if (user) {
        console.log('✅ [AUTH CONTEXT] Usuário obtido do authService:', user.id)
        
        // Verificar se o email foi confirmado
        const emailConfirmed = await authService.isEmailConfirmed(user.id)
        console.log('📧 [AUTH CONTEXT] Email confirmado:', emailConfirmed)
        
        setIsEmailConfirmed(emailConfirmed)
        
        setUser(user)
        localStorage.setItem('currentUser', JSON.stringify(user))
        localStorage.setItem('isEmailConfirmed', emailConfirmed.toString())
        
        console.log('✅ [AUTH CONTEXT] Usuário salvo no estado e localStorage')
        
        // Se email não confirmado, redirecionar para página de espera
        if (!emailConfirmed) {
          console.log('⚠️ [AUTH CONTEXT] Email não confirmado, redirecionando...')
          router.push('/confirm-email?email=' + encodeURIComponent(email))
        } else {
          console.log('✅ [AUTH CONTEXT] Login completo com sucesso')
        }
        
        return true
      }
      
      console.error('❌ [AUTH CONTEXT] authService.login retornou null')
      return false
    } catch (error) {
      console.error('❌ [AUTH CONTEXT] Erro no login:', error)
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
        console.log('✅ [AUTH CONTEXT] Registro bem-sucedido, redirecionando para confirmação de email')
        
        if (result.user) {
          setUser(result.user)
          setIsEmailConfirmed(false) // Email não confirmado ainda
          localStorage.setItem('currentUser', JSON.stringify(result.user))
          localStorage.setItem('isEmailConfirmed', 'false')
        }
        
        // Redirecionar para página de confirmação de email
        router.push('/confirm-email?email=' + encodeURIComponent(email))
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
      // Limpar estado imediatamente para feedback visual rápido
      setUser(null)
      setIsEmailConfirmed(false)
      
      // Limpar todos os dados do localStorage relacionados ao usuário
      localStorage.removeItem('currentUser')
      localStorage.removeItem('isEmailConfirmed')
      localStorage.removeItem('supabase.auth.token')
      localStorage.removeItem('sb-auth-token')
      
      // Limpar todos os dados do Supabase do localStorage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key)
        }
      })
      
      // Fazer signOut no Supabase
      await authService.logout()
      
      // Usar window.location.href para forçar reload completo e garantir logout
      // Isso evita que o router.push mantenha estado em cache
      window.location.href = '/login'
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
      // Mesmo com erro, forçar redirecionamento e limpeza
      setUser(null)
      setIsEmailConfirmed(false)
      localStorage.clear()
      window.location.href = '/login'
    } finally {
      setIsLoading(false)
    }
  }

  const updateUser = async (userData: { name?: string; email?: string; crm?: string; specialty?: string; phone?: string; gender?: string }): Promise<boolean> => {
    if (!user) {
      console.error('❌ [AUTH CONTEXT] updateUser: Usuário não encontrado')
      return false
    }
    
    console.log('🔄 [AUTH CONTEXT] Atualizando usuário:', { userId: user.id, userData })
    // NÃO usar setIsLoading aqui para não bloquear a interface
    // O componente que chama updateUser deve gerenciar seu próprio estado de loading
    try {
      const updatedUser = await authService.updateUser(user.id, userData)
      if (updatedUser) {
        console.log('✅ [AUTH CONTEXT] Usuário atualizado com sucesso:', updatedUser)
        setUser(updatedUser)
        // Atualizar localStorage também
        localStorage.setItem('currentUser', JSON.stringify(updatedUser))
        return true
      } else {
        console.error('❌ [AUTH CONTEXT] updateUser retornou null')
        return false
      }
    } catch (error) {
      console.error('❌ [AUTH CONTEXT] Erro ao atualizar usuário:', error)
      return false
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
