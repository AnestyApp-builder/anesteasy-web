'use client'

import { Calendar, Wrench, Clock } from 'lucide-react'
import { Layout } from '@/components/layout/Layout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

export default function AgendaPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-10 max-w-md w-full shadow-sm">
            <div className="flex justify-center mb-5">
              <div className="relative">
                <Calendar className="w-16 h-16 text-amber-400" />
                <div className="absolute -bottom-1 -right-1 bg-amber-500 rounded-full p-1.5">
                  <Wrench className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">Agenda em Manutenção</h1>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              Estamos realizando melhorias na funcionalidade de agenda para oferecer uma experiência ainda melhor.
              Em breve estará disponível novamente.
            </p>

            <div className="flex items-center justify-center gap-2 text-amber-600 text-sm font-medium">
              <Clock className="w-4 h-4" />
              <span>Voltaremos em breve</span>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  )
}
