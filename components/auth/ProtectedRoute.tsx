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
  role: 'anestesista' | 'admin'
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

    const checkAuthStatus = async () => {
      if (!mounted) return

      if (isLoading) {
        return
      }

      // Verificar cache local primeiro para renderização instantânea
      const cachedAuth = localStorage.getItem('auth_cache')
      let cachedData: (AuthStatus & { timestamp: number }) | null = null
      if (cachedAuth) {
        try {
          cachedData = JSON.parse(cachedAuth)
          // Cache válido por 15 minutos (aumentado de 5 para reduzir verificações)
          if (cachedData && Date.now() - cachedData.timestamp < 15 * 60 * 1000) {
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
        } catch (error: unknown) {
          console.warn('Erro ao ler cache de autenticação:', error)
          // Cache inválido, continuar com verificação
        }
      }

      try {
        const { supabase } = await import('@/lib/supabase')

        // Após server action de login, cookies podem hidratar alguns ms depois — várias tentativas antes de desistir
        let session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'] = null
        for (let attempt = 0; attempt < 8; attempt++) {
          const { data } = await supabase.auth.getSession()
          session = data.session
          if (session?.access_token) break
          await new Promise((r) => setTimeout(r, 100 * (attempt + 1)))
        }

        if (!mounted) return

        if (!session?.access_token) {
          if (!user) {
            router.push('/login')
            setIsChecking(false)
          }
          return
        }

        const response = await fetchWithTimeout('/api/auth/status', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          timeout: 12000,
          maxRetries: 1,
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


        // Verificar assinatura se necessário
        if (requireSubscription && !publicRoutes.includes(pathname)) {
          if (!status.has_access) {
            router.push('/planos?required=true')
            setIsChecking(false)
            return
          }
        }

        setIsChecking(false)
      } catch (error: unknown) {
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
