'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  Check, 
  CreditCard, 
  Calendar, 
  TrendingUp, 
  Shield, 
  Zap,
  ArrowLeft,
  Loader2,
  CheckCircle,
  Gift,
  X
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { Layout } from '@/components/layout/Layout'

interface Plan {
  id: 'monthly' | 'quarterly' | 'annual'
  name: string
  price: number
  originalPrice?: number
  discount?: number
  period: string
  description: string
  features: string[]
  popular?: boolean
  savings?: string
}

const PLANS: Plan[] = [
  {
    id: 'monthly',
    name: 'Plano Mensal',
    price: 79.00,
    period: 'mensal',
    description: 'Ideal para começar',
    features: [
      'Acesso completo à plataforma',
      'Gestão ilimitada de procedimentos',
      'Relatórios e estatísticas',
      'Suporte por email',
      'Atualizações automáticas'
    ]
  },
  {
    id: 'quarterly',
    name: 'Plano Trimestral',
    price: 225.00,
    originalPrice: 237.00,
    discount: 5,
    period: 'trimestral',
    description: 'Economia de 5%',
    popular: true,
    savings: 'Economize R$ 12,00',
    features: [
      'Tudo do plano mensal',
      '5% de desconto',
      'Cobrança trimestral',
      'Prioridade no suporte',
      'Relatórios avançados'
    ]
  },
  {
    id: 'annual',
    name: 'Plano Anual',
    price: 850.00,
    originalPrice: 948.00,
    discount: 10,
    period: 'anual',
    description: 'Melhor custo-benefício',
    savings: 'Economize R$ 98,00',
    features: [
      'Tudo do plano trimestral',
      '10% de desconto',
      'Cobrança anual única',
      'Suporte prioritário',
      'Acesso a recursos beta',
      'Consultoria personalizada'
    ]
  }
]

interface ActiveSubscription {
  id: string
  plan_type: 'monthly' | 'quarterly' | 'annual'
  status: string
  current_period_end: string
  amount: number
}

interface TrialInfo {
  trial_ends_at: string | null
  free_months: number | null
  isInTrial: boolean
  daysRemaining: number
}

function PlanosContent() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const isAuthenticated = !!user
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [activeSubscription, setActiveSubscription] = useState<ActiveSubscription | null>(null)
  const [loadingSubscription, setLoadingSubscription] = useState(true)
  const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { supabase } = await import('@/lib/supabase')
      const { data } = await supabase.auth.getSession()
      const u = data.session?.user
      if (!cancelled) {
        setUser(u ? { id: u.id, email: u.email || undefined } : null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const fetchActiveSubscription = useCallback(async () => {
    if (!user) {
      setLoadingSubscription(false)
      return
    }

    try {
      setLoadingSubscription(true)
      const { supabase } = await import('@/lib/supabase')
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        // Erro ao obter sessão
        setLoadingSubscription(false)
        return
      }

      if (!session?.access_token) {
        // Sessão não encontrada
        setLoadingSubscription(false)
        return
      }

      // Buscar assinatura e trial em paralelo
      const [subscriptionResponse, trialResponse] = await Promise.all([
        fetch('/api/stripe/subscription', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/subscription/check', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        })
      ])

      // Processar assinatura
      const contentType = subscriptionResponse.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        const data = await subscriptionResponse.json()
        if (subscriptionResponse.ok && data.subscription) {
          setActiveSubscription(data.subscription)
        }
      } else if (subscriptionResponse.status === 404) {
        setActiveSubscription(null)
      }

      // Processar trial
      let trialInfoResolved: TrialInfo | null = null

      if (trialResponse.ok) {
        try {
          const trialData = await trialResponse.json()
          if (trialData.trialInfo) {
            trialInfoResolved = trialData.trialInfo
          }
        } catch {
          // json parse failed
        }
      }

      // Fallback: se a API falhou ou não retornou trialInfo,
      // calcular diretamente do Auth session (sempre disponível)
      if (!trialInfoResolved && session?.user) {
        const baseDate = session.user.email_confirmed_at || session.user.created_at
        if (baseDate) {
          const trialEnd = new Date(new Date(baseDate).getTime() + 7 * 24 * 60 * 60 * 1000)
          const daysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
          if (daysLeft > 0) {
            trialInfoResolved = {
              isInTrial: true,
              daysRemaining: daysLeft,
              trial_ends_at: trialEnd.toISOString(),
              free_months: null
            }
          }
        }
      }

      if (trialInfoResolved) {
        setTrialInfo(trialInfoResolved)
      }
    } catch (error) {
      // Erro ao buscar assinatura — tentar fallback de trial via Auth session
      try {
        const { supabase } = await import('@/lib/supabase')
        const { data: { session: fallbackSession } } = await supabase.auth.getSession()
        const authUser = fallbackSession?.user
        if (authUser) {
          const baseDate = authUser.email_confirmed_at || authUser.created_at
          if (baseDate) {
            const trialEnd = new Date(new Date(baseDate).getTime() + 7 * 24 * 60 * 60 * 1000)
            const daysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
            if (daysLeft > 0) {
              setTrialInfo({ isInTrial: true, daysRemaining: daysLeft, trial_ends_at: trialEnd.toISOString(), free_months: null })
            }
          }
        }
      } catch { /* ignore */ }
      setActiveSubscription(null)
    } finally {
      setLoadingSubscription(false)
    }
  }, [user])

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchActiveSubscription()
    } else {
      setLoadingSubscription(false)
    }
  }, [isAuthenticated, user, fetchActiveSubscription])

  // Verificação automática quando não há assinatura ativa
  useEffect(() => {
    // Se não há assinatura ativa e o usuário está autenticado, tentar sincronizar automaticamente
    if (isAuthenticated && user && !loadingSubscription && !activeSubscription) {
      let mounted = true
      let attempts = 0
      const maxAttempts = 3
      
      // Verificar se há session_id na URL (retornou do checkout)
      const urlParams = new URLSearchParams(window.location.search)
      const sessionId = urlParams.get('session_id')
      
      const syncWithSessionId = async () => {
        if (!mounted || attempts >= maxAttempts) {
          return
        }

        try {
          attempts++
          // Sincronizando com session_id
          
          const response = await fetch('/api/stripe/test-webhook', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              session_id: sessionId
            })
          })

          if (response.ok) {
            const data = await response.json()
            if (data.success) {
              // Assinatura sincronizada
              // Recarregar assinatura
              await fetchActiveSubscription()
              // Remover session_id da URL
              urlParams.delete('session_id')
              window.history.replaceState({}, '', `${window.location.pathname}${urlParams.toString() ? '?' + urlParams.toString() : ''}`)
              return
            }
          }
          
          // Tentar novamente após 2 segundos
          if (attempts < maxAttempts) {
            setTimeout(() => {
              if (mounted) {
                syncWithSessionId()
              }
            }, 2000)
          }
        } catch (error) {
          // Erro na tentativa
          // Tentar novamente após 2 segundos
          if (attempts < maxAttempts) {
            setTimeout(() => {
              if (mounted) {
                syncWithSessionId()
              }
            }, 2000)
          }
        }
      }

      const syncWithEmail = async () => {
        if (!mounted || !user.email) return
        
        try {
          // Tentando sincronizar assinatura por email
          
          const response = await fetch('/api/stripe/sync-subscription', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email: user.email
            })
          })

          if (response.ok) {
            const data = await response.json()
            if (data.subscription) {
              // Assinatura encontrada e sincronizada
              setActiveSubscription(data.subscription)
            }
          }
        } catch (error) {
          // Erro ao sincronizar por email
        }
      }
      
      // Se tem session_id, tentar sincronizar com ele primeiro
      if (sessionId) {
        // Session ID encontrado na URL, sincronizando automaticamente
        const autoSyncTimer = setTimeout(() => {
          if (mounted) {
            syncWithSessionId()
          }
        }, 2000) // Aguardar 2 segundos

        return () => {
          mounted = false
          clearTimeout(autoSyncTimer)
        }
      } else {
        // Se não tem session_id mas não há assinatura, tentar sincronizar por email após 5 segundos
        // (pode ser que o webhook ainda não tenha processado)
        const emailSyncTimer = setTimeout(() => {
          if (mounted && !activeSubscription && user.email) {
            syncWithEmail()
          }
        }, 5000) // Aguardar 5 segundos

        return () => {
          mounted = false
          clearTimeout(emailSyncTimer)
        }
      }
    }
  }, [isAuthenticated, user, loadingSubscription, activeSubscription, fetchActiveSubscription])

  const calculateDaysRemaining = (endDate: string): number => {
    const end = new Date(endDate)
    const now = new Date()
    const diff = end.getTime() - now.getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    return days > 0 ? days : 0
  }

  const getPlanName = (planType: string): string => {
    return PLANS.find(p => p.id === planType)?.name || planType
  }

  const handleSelectPlan = async (plan: Plan) => {
    // handleSelectPlan chamado
    
    if (!isAuthenticated || !user) {
      // Usuário não autenticado
      router.push('/login')
      return
    }

    setSelectedPlan(plan)
    setLoading(true)

    try {
      // Obter token do Supabase
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        alert('Sessão expirada. Por favor, faça login novamente.')
        router.push('/login')
        return
      }

      // Criando Checkout Session na Stripe

      // Criar Checkout Session na Stripe (checkout hospedado)
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          plan_id: plan.id
        })
      })

      // Resposta recebida

      // Verificar se a resposta é JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        // Resposta não é JSON
        throw new Error('Resposta inválida do servidor. Verifique os logs do servidor.')
      }

      const data = await response.json()

      if (!response.ok) {
        // Erro na resposta
        
        // Tratar diferentes formatos de erro
        let errorMessage = 'Erro ao criar checkout'
        if (typeof data.error === 'string') {
          errorMessage = data.error
        } else if (data.error && typeof data.error === 'object') {
          errorMessage = data.error.message || data.error.error || JSON.stringify(data.error)
        } else if (data.message) {
          errorMessage = typeof data.message === 'string' ? data.message : JSON.stringify(data.message)
        }
        
        throw new Error(errorMessage)
      }

      // Checkout Session criada com sucesso
      // Checkout Session criada
      console.log('🔗 URL do checkout:', data.checkout_url)

      // Redirecionar para o checkout hospedado da Stripe
      if (data.checkout_url) {
        console.log('🔄 Redirecionando para checkout da Stripe...')
        window.location.href = data.checkout_url
      } else {
        console.error('❌ URL do checkout não retornada na resposta:', data)
        throw new Error('URL do checkout não retornada')
      }

    } catch (error: any) {
      console.error('Erro ao processar:', error)
      
      // Tratar diferentes formatos de erro
      let errorMessage = 'Erro ao processar checkout. Tente novamente.'
      if (error.message) {
        errorMessage = typeof error.message === 'string' ? error.message : JSON.stringify(error.message)
      } else if (typeof error === 'string') {
        errorMessage = error
      } else if (error && typeof error === 'object') {
        errorMessage = error.message || error.error || JSON.stringify(error)
      }
      
      console.error('Mensagem de erro:', errorMessage)
      alert(`Erro: ${errorMessage}\n\nVerifique os logs do servidor para mais detalhes.`)
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  // Removido: não bloquear visualização dos planos para usuários não autenticados
  // O login será solicitado apenas quando tentar assinar um plano

  return (
    <div className="bg-gradient-to-br from-primary-50 via-white to-secondary-50 py-6 sm:py-8 lg:py-10 px-0 rounded-2xl">
      <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            {isAuthenticated && (
              <Link href="/dashboard" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Dashboard
              </Link>
            )}
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Escolha seu Plano
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Planos flexíveis para anestesistas. Secretárias usam gratuitamente.
            </p>
          </div>

          {/* Assinatura Ativa ou Free Trial */}
          {loadingSubscription ? (
            <div className="mb-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
            </div>
          ) : activeSubscription && activeSubscription.status === 'active' ? (
            <Card className="mb-8 bg-gradient-to-r from-primary-50 to-primary-100 border-primary-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary-500 rounded-lg">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">
                        Assinatura Ativa: {getPlanName(activeSubscription.plan_type)}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {formatCurrency(activeSubscription.amount)} por {activeSubscription.plan_type === 'monthly' ? 'mês' : activeSubscription.plan_type === 'quarterly' ? 'trimestre' : 'ano'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary-600 mb-1">
                      {calculateDaysRemaining(activeSubscription.current_period_end)} {calculateDaysRemaining(activeSubscription.current_period_end) === 1 ? 'dia' : 'dias'}
                    </div>
                    <p className="text-sm text-gray-600">
                      restantes no período atual
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-primary-200 flex gap-3 flex-wrap">
                  <Button 
                    variant="outline" 
                    onClick={async () => {
                      if (!confirm('Tem certeza que deseja cancelar sua assinatura? Você perderá o acesso ao final do período atual.')) {
                        return
                      }
                      
                      try {
                        const { supabase } = await import('@/lib/supabase')
                        const { data: { session } } = await supabase.auth.getSession()
                        
                        if (!session?.access_token) {
                          alert('Sessão expirada. Por favor, faça login novamente.')
                          return
                        }
                        
                        const response = await fetch('/api/stripe/cancel-subscription', {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${session.access_token}`,
                            'Content-Type': 'application/json'
                          }
                        })
                        
                        const data = await response.json()
                        
                        if (response.ok) {
                          alert('Assinatura cancelada com sucesso!')
                          // Recarregar assinatura
                          await fetchActiveSubscription()
                        } else {
                          alert(data.error || 'Erro ao cancelar assinatura')
                        }
                      } catch (error: any) {
                        alert('Erro ao cancelar assinatura: ' + error.message)
                      }
                    }}
                    className="bg-red-50 hover:bg-red-100 text-red-700 border-red-300"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancelar Assinatura
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : trialInfo && trialInfo.isInTrial ? (
            <Card className="mb-8 bg-gradient-to-r from-teal-50 to-teal-100 border-teal-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-teal-500 rounded-lg">
                      <Gift className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-teal-900 mb-1">
                        Free Trial Ativo
                      </h3>
                      <p className="text-sm text-teal-700">
                        {trialInfo.free_months && trialInfo.free_months > 0 
                          ? `Período gratuito com ${trialInfo.free_months} ${trialInfo.free_months === 1 ? 'mês grátis' : 'meses grátis'} incluído${trialInfo.free_months > 1 ? 's' : ''}`
                          : 'Período de teste gratuito de 7 dias'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-teal-600 mb-1">
                      {trialInfo.daysRemaining} {trialInfo.daysRemaining === 1 ? 'dia' : 'dias'}
                    </div>
                    <p className="text-sm text-teal-700">
                      restantes no trial
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-teal-200">
                  <p className="text-sm text-teal-800 mb-3">
                    💡 Assine um plano antes do término do trial para continuar usando sem interrupções.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : isAuthenticated ? (
            <Card className="mb-8 bg-yellow-50 border-yellow-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Calendar className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-yellow-900 mb-1">
                      Nenhuma assinatura ativa encontrada
                    </h3>
                    <p className="text-sm text-yellow-800">
                      Se você acabou de fazer um pagamento, estamos sincronizando automaticamente. A assinatura aparecerá em alguns instantes.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Planos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {PLANS.map((plan) => {
              const isActivePlan = activeSubscription?.plan_type === plan.id && activeSubscription?.status === 'active'
              
              return (
                <Card 
                  key={plan.id}
                className={`relative transition-all duration-300 hover:shadow-xl ${
                  isActivePlan
                    ? 'border-2 border-green-500 shadow-lg bg-green-50'
                    : plan.popular 
                      ? 'border-2 border-primary-500 shadow-lg scale-105' 
                      : 'border border-gray-200'
                }`}
              >
                {isActivePlan && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                    <span className="bg-green-500 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Plano Ativo
                    </span>
                  </div>
                )}
                {!isActivePlan && plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Mais Popular
                    </span>
                  </div>
                )}

                {plan.savings && (
                  <div className="absolute -top-4 right-4">
                    <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      {plan.savings}
                    </span>
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </CardTitle>
                  <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
                  
                  <div className="mb-4">
                    {plan.originalPrice && (
                      <div className="text-sm text-gray-500 line-through mb-1">
                        {formatCurrency(plan.originalPrice)}
                      </div>
                    )}
                    <div className="text-4xl font-bold text-primary-600">
                      {formatCurrency(plan.price)}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      por {plan.period}
                    </div>
                    {plan.discount && (
                      <div className="text-sm text-green-600 font-semibold mt-1">
                        {plan.discount}% de desconto
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <Check className="w-5 h-5 text-primary-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => handleSelectPlan(plan)}
                    disabled={loading || isActivePlan}
                    className={`w-full ${
                      isActivePlan
                        ? 'bg-green-600 hover:bg-green-700 cursor-not-allowed'
                        : plan.popular 
                          ? 'bg-primary-600 hover:bg-primary-700' 
                          : 'bg-gray-800 hover:bg-gray-900'
                    }`}
                  >
                    {loading && selectedPlan?.id === plan.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Redirecionando...
                      </>
                    ) : isActivePlan ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Plano Ativo
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        Assinar Agora
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
              )
            })}
          </div>

          {/* Mensagem de cancelamento */}
          {searchParams.get('checkout') === 'cancelled' && (
            <div className="mb-8">
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="p-6">
                  <div className="flex items-start">
                    <div className="p-2 bg-yellow-100 rounded-lg mr-4">
                      <Calendar className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-yellow-900 mb-2">
                        Checkout cancelado
                      </h3>
                      <p className="text-sm text-yellow-800">
                        O processo de pagamento foi cancelado. Você pode tentar novamente quando quiser.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Informações Adicionais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="border border-gray-200">
              <CardContent className="p-6 text-center">
                <Shield className="w-8 h-8 text-primary-500 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Pagamento Seguro</h3>
                <p className="text-sm text-gray-600">
                  Processado pela Stripe com criptografia SSL
                </p>
              </CardContent>
            </Card>

            <Card className="border border-gray-200">
              <CardContent className="p-6 text-center">
                <Zap className="w-8 h-8 text-primary-500 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Ativação Imediata</h3>
                <p className="text-sm text-gray-600">
                  Acesso liberado assim que o pagamento for confirmado
                </p>
              </CardContent>
            </Card>

            <Card className="border border-gray-200">
              <CardContent className="p-6 text-center">
                <TrendingUp className="w-8 h-8 text-primary-500 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Cancele Quando Quiser</h3>
                <p className="text-sm text-gray-600">
                  Sem taxas de cancelamento ou fidelidade
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Nota sobre Secretárias */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-start">
                <div className="p-2 bg-blue-100 rounded-lg mr-4">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">
                    Secretárias usam gratuitamente
                  </h3>
                  <p className="text-sm text-blue-800">
                    As secretárias vinculadas aos anestesistas podem usar todas as funcionalidades 
                    da plataforma sem custo adicional. Apenas os anestesistas precisam ter uma assinatura ativa.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
      </div>
    </div>
  )
}

export default function Planos() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-500" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    }>
      <Layout>
        <PlanosContent />
      </Layout>
    </Suspense>
  )
}
