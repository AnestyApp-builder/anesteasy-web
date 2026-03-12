'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { fetchWithTimeout } from '@/lib/utils'
import { Navigation } from '@/components/layout/Navigation'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireSubscription?: boolean // Se true, verifica assinatura ativa
}

interface AuthStatus {
  ok: boolean
  authenticated: boolean
  email_confirmed: boolean
  role: 'secretaria' | 'anestesista' | 'admin'
  subscription_status: 'active' | 'trial' | 'expired' | 'none'
  has_access: boolean
}

export function ProtectedRoute({ children, requireSubscription = true }: ProtectedRouteProps) {
  const { isLoading, user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null)

  // Rotas que não requerem assinatura
  const publicRoutes = ['/planos', '/checkout']

  useEffect(() => {
    let mounted = true
    let timeoutId: NodeJS.Timeout

    const checkAuthStatus = async () => {
      if (!mounted) return

      if (isLoading) {
        return
      }

      // Verificar cache local primeiro para renderização instantânea
      const cachedAuth = localStorage.getItem('auth_cache')
      let cachedData: any = null
      if (cachedAuth) {
        try {
          cachedData = JSON.parse(cachedAuth)
          // Cache válido por 15 minutos (aumentado de 5 para reduzir verificações)
          if (Date.now() - cachedData.timestamp < 15 * 60 * 1000) {
            if (mounted) {
              setAuthStatus({
                ok: true,
                authenticated: true,
                email_confirmed: cachedData.email_confirmed,
                role: cachedData.role,
                subscription_status: cachedData.subscription_status,
                has_access: cachedData.has_access
              })
              setIsChecking(false)
            }
            return // ✅ Usar cache e não fazer verificação no servidor
          }
        } catch (error) {
          // Cache inválido, continuar com verificação
        }
      }

      // Se não tem usuário autenticado, redirecionar para login
      if (!user) {
        if (mounted) {
          router.push('/login')
          setIsChecking(false)
        }
        return
      }

      try {
        // ✅ FIX CRÍTICO: Adicionar timeout em getSession()
        const { supabase } = await import('@/lib/supabase')
        
        const sessionPromise = supabase.auth.getSession()
        const sessionTimeout = new Promise<{ data: { session: null } }>((resolve) => {
          timeoutId = setTimeout(() => {
            console.warn('⏱️ [AUTH] Timeout ao obter sessão (5s)')
            resolve({ data: { session: null } })
          }, 5000) // ✅ 5 segundos de timeout
        })

        const { data: { session } } = await Promise.race([sessionPromise, sessionTimeout])

        if (timeoutId) clearTimeout(timeoutId)

        if (!mounted) return
        
        if (!session?.access_token) {
          router.push('/login')
          setIsChecking(false)
          return
        }

        // Chamar endpoint unificado /api/auth/status com timeout reduzido
        const response = await fetchWithTimeout('/api/auth/status', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          },
          timeout: 5000, // ✅ Reduzido de 7s para 5s
          maxRetries: 1  // ✅ Reduzido de 2 para 1 tentativa
        })

        if (!mounted) return

        if (!response.ok) {
          // Se falhar, redirecionar para login
          router.push('/login')
          setIsChecking(false)
          return
        }

        const status: AuthStatus = await response.json()

        if (!mounted) return

        // Atualizar cache com TTL maior
        if (status.ok) {
          localStorage.setItem('auth_cache', JSON.stringify({
            role: status.role,
            subscription_status: status.subscription_status,
            email_confirmed: status.email_confirmed,
            has_access: status.has_access,
            timestamp: Date.now()
          }))
        }

        setAuthStatus(status)

        // Decisões de rota baseadas no status
        if (!status.authenticated) {
          router.push('/login')
          setIsChecking(false)
          return
        }

        if (!status.email_confirmed) {
          router.push(`/confirm-email?email=${encodeURIComponent(user.email || '')}`)
          setIsChecking(false)
          return
        }

        // Secretária tentando acessar rota de anestesista
        if (status.role === 'secretaria' && !pathname.startsWith('/secretaria')) {
          router.push('/secretaria/dashboard')
          setIsChecking(false)
          return
        }

        // Verificar assinatura se necessário
        if (requireSubscription && !publicRoutes.includes(pathname)) {
          if (!status.has_access) {
            router.push('/planos?required=true')
            setIsChecking(false)
            return
          }
        }

        setIsChecking(false)
      } catch (error) {
        console.warn('⚠️ [AUTH] Erro na verificação, permitindo acesso temporário:', error)
        // ✅ FIX: Em caso de erro, setar isChecking(false) para não ficar travado
        if (mounted) {
          setIsChecking(false)
          // ✅ Permitir acesso com cache expirado em vez de bloquear
          if (cachedData) {
            setAuthStatus({
              ok: true,
              authenticated: true,
              email_confirmed: cachedData.email_confirmed,
              role: cachedData.role,
              subscription_status: cachedData.subscription_status,
              has_access: cachedData.has_access
            })
          }
        }
      }
    }

    checkAuthStatus()

    // ✅ Cleanup adequado
    return () => {
      mounted = false
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [isLoading, user, router, pathname, requireSubscription])

  if (isLoading || isChecking) {
    return (
      <div className="min-h-screen bg-white">
        {/* Navigation sempre visível em mobile */}
        <Navigation />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] pt-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!authStatus?.ok || !authStatus.authenticated || !authStatus.email_confirmed) {
    return null
  }

  return <>{children}</>
}
