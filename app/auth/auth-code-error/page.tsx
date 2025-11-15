'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { AlertCircle, ArrowLeft, Mail } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function AuthCodeErrorPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center pb-8">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Erro na Confirmação
            </CardTitle>
            <p className="text-gray-600 mt-2">
              Não foi possível confirmar seu email
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-sm text-red-800">
                <p className="font-medium mb-2">Possíveis causas:</p>
                <ul className="list-disc list-inside space-y-1 text-red-700">
                  <li>Link de confirmação expirado</li>
                  <li>Link já foi usado anteriormente</li>
                  <li>Link inválido ou corrompido</li>
                </ul>
              </div>
            </div>

            <div className="text-center space-y-3">
              <p className="text-sm text-gray-600">
                O que fazer agora:
              </p>
              
              <Button
                onClick={() => router.push('/login')}
                className="w-full"
              >
                <Mail className="w-4 h-4 mr-2" />
                Fazer Login
              </Button>

              <Button
                variant="outline"
                onClick={() => router.push('/')}
                className="w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Início
              </Button>
            </div>

            <div className="border-t border-teal-500 pt-4 text-center">
              <p className="text-xs text-gray-500">
                Se o problema persistir, entre em contato conosco em{' '}
                <a href="mailto:contato@anesteasyapp.com.br" className="text-blue-600 hover:underline">
                  contato@anesteasyapp.com.br
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
