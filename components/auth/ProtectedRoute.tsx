'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isEmailConfirmed, isLoading, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        // Usuário não autenticado - redirecionar para login
        router.push('/login')
      } else if (user && !isEmailConfirmed) {
        // Usuário autenticado mas email não confirmado - redirecionar para página de espera
        router.push('/confirm-email?email=' + encodeURIComponent(user.email))
      }
    }
  }, [isAuthenticated, isEmailConfirmed, isLoading, router, user])

  if (isLoading) {
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
