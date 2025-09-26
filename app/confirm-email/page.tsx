'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/ui/Logo'
import { CheckCircle, Mail, Clock, ArrowLeft } from 'lucide-react'

function ConfirmEmailContent() {
  const [countdown, setCountdown] = useState(30)
  const [canResend, setCanResend] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  
  const searchParams = useSearchParams()
  const router = useRouter()
  const email = searchParams.get('email') || ''

  // Countdown para reenvio
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      setCanResend(true)
    }
  }, [countdown])

  // Verificação automática a cada 5 segundos
  useEffect(() => {
    const checkConfirmation = async () => {
      try {
        const response = await fetch('/api/check-email-confirmation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        })

        const result = await response.json()
        
        if (result.confirmed) {
          // Email confirmado, redirecionar para dashboard
          window.location.href = '/dashboard'
        }
      } catch (error) {
        // Silenciar erros para não poluir o console
      }
    }

    // Verificar imediatamente
    checkConfirmation()

    // Configurar verificação a cada 5 segundos
    const interval = setInterval(checkConfirmation, 5000)

    // Limpar intervalo quando componente for desmontado
    return () => clearInterval(interval)
  }, [email])

  // Verificação manual de confirmação (removida verificação automática para evitar loops)
  const handleCheckConfirmation = async () => {
    try {
      const response = await fetch('/api/check-email-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const result = await response.json()
      
      if (result.confirmed) {
        // Email confirmado, redirecionar para dashboard
        window.location.href = '/dashboard'
      } else {
        alert('Email ainda não foi confirmado. Verifique sua caixa de entrada.')
      }
    } catch (error) {
      alert('Erro ao verificar confirmação. Tente novamente.')
    }
  }

  const handleResendEmail = async () => {
    if (!canResend || isResending) return

    setIsResending(true)
    setResendMessage('')

    try {
      const response = await fetch('/api/resend-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const result = await response.json()

      if (result.success) {
        setResendMessage('✅ Email reenviado com sucesso!')
        setCountdown(30)
        setCanResend(false)
      } else {
        setResendMessage('❌ Erro ao reenviar email. Tente novamente.')
      }
    } catch (error) {
      setResendMessage('❌ Erro ao reenviar email. Tente novamente.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8 relative">
      {/* Botão Voltar */}
      <div className="absolute top-6 left-6">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/login')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Voltar</span>
        </Button>
      </div>

      <div className="max-w-md w-full">
        {/* Logo - Centralizado com o card */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-block">
            <Logo size="md" showText={false} />
          </Link>
        </div>

        {/* Confirmação de Email Form */}
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-gray-900">
              Confirme seu Email
            </CardTitle>
            <p className="text-center text-gray-600 mt-2">
              Enviamos um link de confirmação para:
            </p>
            <p className="text-center text-teal-600 font-semibold mt-1 break-all">
              {email}
            </p>
          </CardHeader>

          <CardContent className="space-y-6 p-6 pt-0">
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-teal-800">
                  <p className="font-medium mb-2">Instruções:</p>
                  <ol className="list-decimal list-inside space-y-1 text-teal-700">
                    <li>Verifique sua caixa de entrada</li>
                    <li>Procure por um email da AnestEasy</li>
                    <li>Clique no link "Confirmar Email"</li>
                    <li>Você será redirecionado automaticamente</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                Não recebeu o email? Verifique sua pasta de spam ou:
              </p>
              
              <Button
                onClick={handleResendEmail}
                disabled={!canResend || isResending}
                className="w-full mb-3"
                variant={canResend ? "default" : "outline"}
              >
                {isResending ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Reenviando...
                  </>
                ) : canResend ? (
                  'Reenviar Email'
                ) : (
                  <>
                    <Clock className="w-4 h-4 mr-2" />
                    Reenviar em {countdown}s
                  </>
                )}
              </Button>

              <Button
                onClick={handleCheckConfirmation}
                variant="outline"
                className="w-full mb-3"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Verificar Confirmação
              </Button>

              <Button
                onClick={() => router.push('/login')}
                variant="outline"
                className="w-full mb-3"
              >
                <Mail className="w-4 h-4 mr-2" />
                Ir para Login
              </Button>

              {resendMessage && (
                <p className={`text-sm ${resendMessage.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
                  {resendMessage}
                </p>
              )}

                      <div className="mt-4 p-3 bg-teal-50 border border-teal-200 rounded-lg">
                        <p className="text-xs text-teal-700">
                          <strong>💡 Dica:</strong> Após confirmar o email, você será redirecionado automaticamente 
                          para o dashboard em até 5 segundos. Ou clique em "Verificar Confirmação" para verificar imediatamente.
                        </p>
                      </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-500 mt-4">
          Problemas? Entre em contato conosco em{' '}
          <a href="mailto:contato@anesteasyapp.com.br" className="text-teal-600 hover:underline">
            contato@anesteasyapp.com.br
          </a>
        </p>
      </div>
    </div>
  )
}

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-6">
            <Link href="/" className="inline-block">
              <Logo size="md" showText={false} />
            </Link>
          </div>
          <Card className="animate-fade-in">
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    }>
      <ConfirmEmailContent />
    </Suspense>
  )
}
