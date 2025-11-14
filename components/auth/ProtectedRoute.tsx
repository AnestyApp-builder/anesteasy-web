'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { isSecretaria } from '@/lib/user-utils'
import { hasActiveSubscription } from '@/lib/subscription'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireSubscription?: boolean // Se true, verifica assinatura ativa
}

export function ProtectedRoute({ children, requireSubscription = true }: ProtectedRouteProps) {
  const { isAuthenticated, isEmailConfirmed, isLoading, user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isCheckingSecretaria, setIsCheckingSecretaria] = useState(true)
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(false)

  // Rotas que não requerem assinatura
  const publicRoutes = ['/planos', '/checkout']

  useEffect(() => {
    const checkUserType = async () => {
      if (isLoading) {
        return
      }

      if (!isAuthenticated) {
        // Usuário não autenticado - redirecionar para login
        router.push('/login')
        setIsCheckingSecretaria(false)
        return
      }

      if (user && !isEmailConfirmed) {
        // Usuário autenticado mas email não confirmado - redirecionar para página de espera
        router.push('/confirm-email?email=' + encodeURIComponent(user.email))
        setIsCheckingSecretaria(false)
        return
      }

      // Verificar se é secretária - secretárias NÃO podem acessar rotas de anestesistas
      if (user) {
        try {
          // Timeout de 2 segundos para evitar travamento
          const timeoutPromise = new Promise<boolean>((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), 2000)
          })
          
          const secretariaPromise = isSecretaria(user.id)
          const secretaria = await Promise.race([secretariaPromise, timeoutPromise]) as boolean
          
          if (secretaria) {
            // Secretária tentando acessar rota de anestesista - redirecionar para dashboard da secretária
            router.push('/secretaria/dashboard')
            setIsCheckingSecretaria(false)
            return
          }
        } catch (error) {
          // Se der timeout, continuar como anestesista
          console.warn('⚠️ Erro ao verificar secretária, continuando:', error)
        }

        // Verificar assinatura apenas para anestesistas e se a rota requer
        if (requireSubscription && !publicRoutes.includes(pathname)) {
          setIsCheckingSubscription(true)
          
          try {
            // Timeout de 3 segundos para evitar travamento
            const timeoutPromise = new Promise<boolean>((_, reject) => {
              setTimeout(() => reject(new Error('Timeout')), 3000)
            })
            
            const subscriptionPromise = hasActiveSubscription(user.id)
            const hasSubscription = await Promise.race([subscriptionPromise, timeoutPromise]) as boolean
            
            if (!hasSubscription) {
              // Sem assinatura ativa - redirecionar para planos
              router.push('/planos?required=true')
              setIsCheckingSubscription(false)
              setIsCheckingSecretaria(false)
              return
            }
          } catch (error) {
            // Se der timeout ou erro, permitir acesso (não bloquear)
            console.warn('⚠️ Erro ao verificar assinatura, permitindo acesso:', error)
          }
          
          setIsCheckingSubscription(false)
        }
      }

      setIsCheckingSecretaria(false)
    }

    checkUserType()
  }, [isAuthenticated, isEmailConfirmed, isLoading, router, user, requireSubscription, pathname])

  if (isLoading || isCheckingSecretaria || isCheckingSubscription) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !isEmailConfirmed) {
    return null
  }

  return <>{children}</>
}
