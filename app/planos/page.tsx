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
  CheckCircle
} from 'lucide-react'
import { Layout } from '@/components/layout/Layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import { isSecretaria } from '@/lib/user-utils'
import Link from 'next/link'

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

function PlanosContent() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [activeSubscription, setActiveSubscription] = useState<ActiveSubscription | null>(null)
  const [loadingSubscription, setLoadingSubscription] = useState(true)

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
        console.error('❌ Erro ao obter sessão:', sessionError)
        setLoadingSubscription(false)
        return
      }

      if (!session?.access_token) {
        console.warn('⚠️ Sessão não encontrada ou sem token')
        setLoadingSubscription(false)
        return
      }

      const response = await fetch('/api/stripe/subscription', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      // Verificar se a resposta é JSON
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json()
        if (response.ok && data.subscription) {
          setActiveSubscription(data.subscription)
        }
      } else if (response.status === 404) {
        // Não tem assinatura, isso é normal
        setActiveSubscription(null)
      }
    } catch (error) {
      console.error('❌ Erro ao buscar assinatura:', error)
      // Não travar a página, apenas não mostrar assinatura
      setActiveSubscription(null)
    } finally {
      setLoadingSubscription(false)
    }
  }, [user])

  useEffect(() => {
    // Redirecionar secretárias - elas não precisam pagar
    if (isAuthenticated && user) {
      let mounted = true
      
      const checkSecretaria = async () => {
        try {
          // Timeout de 2 segundos para evitar travamento
          const timeoutPromise = new Promise<boolean>((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), 2000)
          })
          
          const secretariaPromise = isSecretaria(user.id)
          const isSec = await Promise.race([secretariaPromise, timeoutPromise]) as boolean
          
          if (!mounted) return
          
          if (isSec) {
            router.push('/secretaria/dashboard')
          } else {
            // Buscar assinatura ativa
            fetchActiveSubscription()
          }
        } catch (error) {
          // Se der timeout ou erro, continuar como anestesista
          if (!mounted) return
          console.warn('⚠️ Erro ao verificar secretária, continuando:', error)
          fetchActiveSubscription()
        }
      }
      
      checkSecretaria()
      
      return () => {
        mounted = false
      }
    } else {
      setLoadingSubscription(false)
    }
  }, [isAuthenticated, user, router, fetchActiveSubscription])

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
          console.log(`🔄 Sincronizando com session_id... (tentativa ${attempts}/${maxAttempts})`)
          
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
              console.log('✅ Assinatura sincronizada automaticamente!')
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
          console.warn(`⚠️ Erro na tentativa ${attempts}:`, error)
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
          console.log('🔄 Tentando sincronizar assinatura por email...')
          
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
              console.log('✅ Assinatura encontrada e sincronizada!')
              setActiveSubscription(data.subscription)
            }
          }
        } catch (error) {
          console.warn('⚠️ Erro ao sincronizar por email:', error)
        }
      }
      
      // Se tem session_id, tentar sincronizar com ele primeiro
      if (sessionId) {
        console.log('🔄 Session ID encontrado na URL, sincronizando automaticamente...')
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
    console.log('🔘 handleSelectPlan chamado para plano:', plan.id)
    
    if (!isAuthenticated || !user) {
      console.log('⚠️ Usuário não autenticado, redirecionando para login...')
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

      console.log('📤 Criando Checkout Session na Stripe para plano:', plan.name)
      console.log('📋 Dados enviados:', { plan_id: plan.id, user_id: user.id })

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

      console.log('📥 Resposta recebida, status:', response.status, response.statusText)

      // Verificar se a resposta é JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('❌ Resposta não é JSON:', text.substring(0, 500))
        throw new Error('Resposta inválida do servidor. Verifique os logs do servidor.')
      }

      const data = await response.json()

      if (!response.ok) {
        console.error('❌ Erro na resposta:', JSON.stringify(data, null, 2))
        
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
      console.log('✅ Checkout Session criada:', data.session_id)
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

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Escolha seu Plano
              </h1>
              <p className="text-gray-600">
                Faça login para continuar com a assinatura
              </p>
              <Link href="/login">
                <Button className="mt-4">
                  Fazer Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <Link href="/dashboard" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Dashboard
            </Link>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Escolha seu Plano
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Planos flexíveis para anestesistas. Secretárias usam gratuitamente.
            </p>
          </div>

          {/* Assinatura Ativa */}
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
                <div className="mt-4 pt-4 border-t border-primary-200">
                  <Link href="/assinatura">
                    <Button variant="outline" className="w-full sm:w-auto">
                      <Calendar className="w-4 h-4 mr-2" />
                      Gerenciar Assinatura
                    </Button>
                  </Link>
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

    </Layout>
  )
}

export default function Planos() {
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
      <PlanosContent />
    </Suspense>
  )
}
