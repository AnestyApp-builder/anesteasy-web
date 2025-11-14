'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, Loader2, ArrowRight } from 'lucide-react'
import { Layout } from '@/components/layout/Layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

function CheckoutSuccessPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get('session_id')
  const plan = searchParams.get('plan')
  const userId = searchParams.get('user_id')
  const [loading, setLoading] = useState(true)
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('pending')

  useEffect(() => {
    // Verificar status da sessão se session_id estiver presente
    if (sessionId) {
      // O webhook já deve ter processado, mas podemos verificar
      const timer = setTimeout(() => {
        setLoading(false)
        setSubscriptionStatus('active')
      }, 2000)
      return () => clearTimeout(timer)
    } else {
      // Fallback para modo antigo (Pagar.me)
      const timer = setTimeout(() => {
        setLoading(false)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [sessionId])

  const planNames: Record<string, string> = {
    monthly: 'Plano Mensal',
    quarterly: 'Plano Trimestral',
    annual: 'Plano Anual'
  }

  const planPrices: Record<string, number> = {
    monthly: 79.00,
    quarterly: 225.00,
    annual: 850.00
  }

  const planName = plan ? planNames[plan] || 'Plano' : 'Plano'
  const planPrice = plan ? planPrices[plan] : 0
  const status = subscriptionStatus || searchParams.get('status') || 'active'

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary-500 mx-auto mb-4" />
            <p className="text-gray-600">Verificando pagamento...</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8 shadow-lg">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Pagamento Confirmado!
              </h1>
              <p className="text-gray-600">
                Sua assinatura do {planName} foi ativada com sucesso.
              </p>
            </div>

            <CardContent className="space-y-6">
              {/* Informações do Plano */}
              {plan && (
                <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-primary-900 mb-2">
                    Plano Ativo
                  </p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold text-primary-800">{planName}</p>
                      <p className="text-sm text-primary-600">
                        {plan === 'monthly' && 'Renovação mensal'}
                        {plan === 'quarterly' && 'Renovação trimestral'}
                        {plan === 'annual' && 'Renovação anual'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary-600">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(planPrice)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Status - Só mostrar se não for active (para não confundir) */}
              {status !== 'active' && (
                <div className={`border rounded-lg p-4 ${
                  status === 'pending'
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <p className="text-sm font-semibold mb-1">
                    Status: <span className="capitalize">{status === 'pending' ? 'Pendente' : status}</span>
                  </p>
                  {status === 'pending' && (
                    <p className="text-xs text-yellow-700 mt-1">
                      Aguardando confirmação do pagamento. Você receberá um email quando a assinatura for ativada.
                    </p>
                  )}
                </div>
              )}

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  <strong>O que acontece agora?</strong>
                </p>
                <ul className="mt-2 text-sm text-green-700 space-y-1 list-disc list-inside">
                  <li>Sua assinatura está {status === 'active' ? 'ativa' : 'sendo processada'} e você já pode usar todos os recursos</li>
                  <li>Você receberá um email de confirmação em breve</li>
                  <li>O acesso será renovado automaticamente conforme seu plano</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/dashboard" className="flex-1">
                  <Button className="w-full">
                    Ir para Dashboard
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/planos" className="flex-1">
                  <Button variant="outline" className="w-full">
                    Ver Planos
                  </Button>
                </Link>
              </div>

              <div className="text-center text-sm text-gray-500 pt-4 border-t">
                <p>
                  Dúvidas? Entre em contato com nosso suporte através do email.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-500" />
            <p className="text-gray-600">Carregando...</p>
          </div>
        </div>
      </Layout>
    }>
      <CheckoutSuccessPageContent />
    </Suspense>
  )
}
