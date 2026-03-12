'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Página de assinatura redirecionada para /planos
 * Mantida para compatibilidade com links antigos
 */
export default function AssinaturaPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirecionar imediatamente para /planos
    router.replace('/planos')
  }, [router])

  // Mostrar loading enquanto redireciona
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecionando...</p>
      </div>
    </div>
  )
}
