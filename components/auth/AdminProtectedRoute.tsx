'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface AdminProtectedRouteProps {
  children: React.ReactNode
}

export function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        // Verificar sessão atual
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError || !session?.user) {
          console.log('❌ [ADMIN PROTECTED] Sem sessão ou erro:', sessionError)
          router.push('/super-admin-login-x872k20')
          return
        }

        console.log('✅ [ADMIN PROTECTED] Sessão encontrada, verificando admin via API...')

        // Verificar se o usuário é admin via API (bypass RLS)
        const response = await fetch('/api/admin/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: session.user.id
          })
        })

        if (!response.ok) {
          console.error('❌ [ADMIN PROTECTED] Erro na verificação:', response.status)
          router.push('/super-admin-login-x872k20')
          return
        }

        const verifyData = await response.json()
        console.log('📋 [ADMIN PROTECTED] Dados de verificação:', verifyData)

        if (!verifyData.isAdmin) {
          console.error('❌ [ADMIN PROTECTED] Usuário não é admin')
          router.push('/')
          return
        }

        // É admin - permitir acesso
        console.log('✅ [ADMIN PROTECTED] Acesso autorizado')
        setIsAuthorized(true)
      } catch (error) {
        console.error('❌ [ADMIN PROTECTED] Erro ao verificar acesso:', error)
        router.push('/super-admin-login-x872k20')
      } finally {
        setIsLoading(false)
      }
    }

    checkAdminAccess()

    // Listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.push('/super-admin-login-x872k20')
      } else {
        checkAdminAccess()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando permissões administrativas...</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  return <>{children}</>
}

