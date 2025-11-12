'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { isSecretaria } from '@/lib/user-utils'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isEmailConfirmed, isLoading, user } = useAuth()
  const router = useRouter()
  const [isCheckingSecretaria, setIsCheckingSecretaria] = useState(true)

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
        const secretaria = await isSecretaria(user.id)
        if (secretaria) {
          // Secretária tentando acessar rota de anestesista - redirecionar para dashboard da secretária
          router.push('/secretaria/dashboard')
          setIsCheckingSecretaria(false)
          return
        }
      }

      setIsCheckingSecretaria(false)
    }

    checkUserType()
  }, [isAuthenticated, isEmailConfirmed, isLoading, router, user])

  if (isLoading || isCheckingSecretaria) {
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
