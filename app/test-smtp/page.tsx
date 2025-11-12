'use client'

import { useState } from 'react'
import { Mail, Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Logo } from '@/components/ui/Logo'

export default function TestSMTP() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    warning?: boolean
    details?: any
    troubleshooting?: string[]
    nextSteps?: string[]
  } | null>(null)

  const handleTest = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setResult(null)

    try {
      // Testar SMTP usando o sistema de autenticação do Supabase
      // Isso usa o SMTP configurado no Supabase Dashboard
      const response = await fetch('/api/test-smtp-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email
        })
      })

      const data = await response.json()

      if (data.success) {
        setResult({
          success: true,
          warning: data.warning || false,
          message: data.message || '✅ Email enviado com sucesso!',
          details: data.details || data,
          troubleshooting: data.troubleshooting,
          nextSteps: data.nextSteps
        })
      } else {
        setResult({
          success: false,
          message: data.message || data.error || 'Erro ao enviar email',
          details: data.details || data.check || data
        })
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Erro ao testar SMTP',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Logo size="md" showText={false} />
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Teste de SMTP</h1>
          <p className="mt-2 text-sm text-gray-600">
            Teste a configuração SMTP do Supabase
          </p>
        </div>

        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-xl text-center">
              Enviar Email de Teste
            </CardTitle>
            <p className="text-center text-sm text-gray-600 mt-2">
              Digite um email para receber um email de teste
            </p>
          </CardHeader>

          <form onSubmit={handleTest} className="space-y-6 p-6 pt-0">
            <Input
              label="Email de Destino"
              type="email"
              placeholder="seu@email.com"
              icon={<Mail className="w-5 h-5" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />


            {result && (
              <div className="space-y-3">
                <div
                  className={`p-4 rounded-lg border ${
                    result.success && !result.warning
                      ? 'bg-green-50 border-green-200'
                      : result.warning
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {result.success && !result.warning ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    ) : result.warning ? (
                      <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p
                        className={`text-sm font-medium ${
                          result.success && !result.warning
                            ? 'text-green-800'
                            : result.warning
                            ? 'text-yellow-800'
                            : 'text-red-800'
                        }`}
                      >
                        {result.message}
                      </p>
                      {result.troubleshooting && (
                        <div className="mt-3 pt-3 border-t border-yellow-200">
                          <p className="text-xs font-medium text-yellow-900 mb-2">
                            🔍 Passos para diagnosticar:
                          </p>
                          <ul className="text-xs text-yellow-800 space-y-1 list-disc list-inside">
                            {result.troubleshooting.map((step: string, idx: number) => (
                              <li key={idx}>{step}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {result.nextSteps && (
                        <div className="mt-3 pt-3 border-t border-yellow-200">
                          <p className="text-xs font-medium text-yellow-900 mb-2">
                            📋 Próximos passos:
                          </p>
                          <ul className="text-xs text-yellow-800 space-y-1 list-disc list-inside">
                            {result.nextSteps.map((step: string, idx: number) => (
                              <li key={idx}>{step}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {result.details && !result.troubleshooting && !result.nextSteps && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-600 cursor-pointer">
                            Ver detalhes
                          </summary>
                          <pre className="mt-2 text-xs bg-white p-2 rounded overflow-auto max-h-40">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !email}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Email de Teste
                </>
              )}
            </Button>
          </form>

          <div className="px-6 pb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">
                📋 O que será testado:
              </h3>
              <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                <li>Configuração SMTP no Supabase Dashboard</li>
                <li>Envio de email através do SMTP configurado</li>
                <li>Sistema de autenticação do Supabase</li>
                <li>Entrega do email na caixa de entrada</li>
              </ul>
              <div className="mt-3 pt-3 border-t border-blue-200">
                <p className="text-xs text-blue-700 font-medium mb-1">
                  ⚠️ Importante:
                </p>
                <p className="text-xs text-blue-800 mb-2">
                  Este teste gera um link de recuperação, mas isso <strong>NÃO garante</strong> que o email foi enviado.
                </p>
                <p className="text-xs text-blue-800 font-medium">
                  Se o email não chegar, verifique:
                </p>
                <ul className="text-xs text-blue-800 mt-1 space-y-1 list-disc list-inside">
                  <li>Logs do Supabase Dashboard → Logs → Auth</li>
                  <li>Configuração SMTP no Supabase Dashboard</li>
                  <li>Pasta de spam/lixo eletrônico</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>

        <div className="text-center space-y-2">
          <p className="text-xs text-gray-500">
            Verifique também os logs do Supabase Dashboard → Logs → Auth
          </p>
          <a 
            href="/DIAGNOSTICO_SMTP.md" 
            target="_blank"
            className="text-xs text-primary-600 hover:text-primary-500 underline"
          >
            📋 Guia completo de diagnóstico SMTP
          </a>
        </div>
      </div>
    </div>
  )
}

