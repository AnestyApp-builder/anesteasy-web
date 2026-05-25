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
  X,
  Users
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
    savings: '5% OFF',
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
    savings: '10% OFF',
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
  cancel_at_period_end?: boolean
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
  const [activeSeats, setActiveSeats] = useState<{standard: number} | null>(null)
  const [loadingSubscription, setLoadingSubscription] = useState(true)
  const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(null)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  const [isCanceling, setIsCanceling] = useState(false)
  const [isReactivating, setIsReactivating] = useState(false)

  const [planMode, setPlanMode] = useState<'individual' | 'group'>('individual')

  const [extraStandardSeats, setExtraStandardSeats] = useState(0)

  const STANDARD_SEAT_UNIT_PRICES = {
    monthly: 79.90,
    quarterly: 227.00,
    annual: 862.90
  }




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
        if (subscriptionResponse.ok) {
          if (data.subscription) {
            setActiveSubscription(data.subscription)
          }
          if (data.seats) {
            setActiveSeats(data.seats)
          }
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

  const handleReactivate = async () => {
    setIsReactivating(true)
    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch('/api/stripe/reactivate-subscription', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
      })
      const data = await response.json()
      if (response.ok) {
        await fetchActiveSubscription()
      } else {
        alert(data.error || 'Erro ao reativar renovação')
      }
    } catch {
      alert('Erro ao reativar renovação automática')
    } finally {
      setIsReactivating(false)
    }
  }

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

  const isUserCoordinator = activeSubscription && (
    (activeSubscription.plan_type === 'monthly' && activeSubscription.amount >= 179) ||
    (activeSubscription.plan_type === 'quarterly' && activeSubscription.amount >= 513) ||
    (activeSubscription.plan_type === 'annual' && activeSubscription.amount >= 1942) ||
    (activeSeats && activeSeats.standard > 0)
  )

  const getPlanName = (planType: string, isCoord?: boolean): string => {
    let name = PLANS.find(p => p.id === planType)?.name || planType
    if (isCoord) {
      name = name.replace('Plano ', 'Plano Coordenador ')
    }
    return name
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
          plan_id: plan.id,
          standard_seats: extraStandardSeats
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
                        Assinatura Ativa: {getPlanName(activeSubscription.plan_type, !!isUserCoordinator)}
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

                {/* Vagas do plano — sempre visível para coordenadores */}
                {isUserCoordinator && (
                  <div className="mt-6 p-4 bg-white/50 rounded-xl border border-primary-200/50 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 mb-1">Vagas Contratadas</h4>
                      <p className="text-sm text-gray-600">Composição da sua equipe AnestEasy.</p>
                    </div>
                    <div className="flex gap-3 flex-wrap">
                      <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-primary-100">
                        <Users className="w-4 h-4 text-primary-500" />
                        <span className="font-bold text-gray-900">1</span>
                        <span className="text-sm text-gray-600">Coordenador</span>
                      </div>
                      {activeSeats && activeSeats.standard > 0 && (
                        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100">
                          <Users className="w-4 h-4 text-teal-500" />
                          <span className="font-bold text-gray-900">{activeSeats.standard}</span>
                          <span className="text-sm text-gray-600">Anestesistas</span>
                        </div>
                      )}

                    </div>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-primary-200 flex gap-3 flex-wrap items-center">
                  {activeSubscription.cancel_at_period_end ? (
                    <>
                      <span className="text-sm text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Renovação cancelada — acesso até {new Date(activeSubscription.current_period_end).toLocaleDateString('pt-BR')}
                      </span>
                      <Button
                        variant="outline"
                        onClick={handleReactivate}
                        className="text-teal-600 border-teal-200 hover:bg-teal-50 hover:border-teal-300"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Reativar Renovação Automática
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => setIsCancelModalOpen(true)}
                      className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancelar Renovação Automática
                    </Button>
                  )}
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

          {/* Toggle Individual / Grupo */}
          <div className="flex justify-center mb-8">
            <div className="bg-slate-100 p-1 rounded-xl inline-flex relative border border-slate-200">
              <button
                onClick={() => {
                  setPlanMode('individual')
                  setExtraStandardSeats(0)

                }}
                className={`relative z-10 px-6 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
                  planMode === 'individual' ? 'text-teal-700 bg-white shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Anestesista Individual
              </button>
              <button
                onClick={() => {
                  setPlanMode('group')
                  if (extraStandardSeats === 0) {
                    setExtraStandardSeats(1)
                  }
                }}
                className={`relative z-10 px-6 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
                  planMode === 'group' ? 'text-teal-700 bg-white shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Plano de Grupo (Coordenador)
              </button>
            </div>
          </div>

          {/* Adicionar Vagas Extras à Assinatura */}
          {planMode === 'group' && (
          <div className="max-w-3xl mx-auto bg-white p-6 rounded-3xl border border-slate-100 shadow-md mb-12 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 text-center flex items-center justify-center gap-2">
              <Users className="w-5 h-5 text-teal-600 animate-pulse" />
              Deseja adicionar vagas extras para sua equipe?
            </h3>
            <p className="text-sm text-slate-500 text-center max-w-xl mx-auto">
              Ao assinar seu plano, você pode incluir assentos adicionais para Anestesistas e Secretárias extras. Todos os valores serão cobrados juntos em uma única fatura recorrente.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
               <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase flex justify-between">
                  <span>Assentos Anestesista (Standard)</span>
                  <span className="text-teal-600 font-bold">
                    + R$ 79,90/mês
                  </span>
                </label>
                <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                  <button
                    onClick={() => setExtraStandardSeats(Math.max(0, extraStandardSeats - 1))}
                    className="p-3 hover:bg-slate-100 text-slate-500 font-bold w-12 transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={extraStandardSeats}
                    onChange={(e) => setExtraStandardSeats(Math.max(0, parseInt(e.target.value) || 0))}
                    className="flex-1 text-center font-bold outline-none border-none bg-transparent"
                  />
                  <button
                    onClick={() => setExtraStandardSeats(extraStandardSeats + 1)}
                    className="p-3 hover:bg-slate-100 text-slate-500 font-bold w-12 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>


            </div>
          </div>
          )}

          {/* Planos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {PLANS.map((plan) => {
              const isCoordinator = planMode === 'group'
              const isActivePlan = activeSubscription?.plan_type === plan.id && activeSubscription?.status === 'active' && (isCoordinator === !!isUserCoordinator)
              const basePrice = isCoordinator
                ? plan.id === 'monthly' ? 179.90 : plan.id === 'quarterly' ? 513.00 : 1942.90
                : plan.price
              const totalCardPrice = basePrice + (extraStandardSeats * STANDARD_SEAT_UNIT_PRICES[plan.id])
              
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
                  <div className="absolute top-4 right-4">
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200 shadow-sm">
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
                       {formatCurrency(basePrice)}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      por {plan.period}
                    </div>
                     {plan.discount && (
                      <div className="text-sm text-green-600 font-semibold mt-1">
                        {plan.discount}% de desconto
                      </div>
                    )}

                    {/* Exibir valor total e breakdown se houver assentos adicionais */}
                    {extraStandardSeats > 0 && (
                      <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100 text-left text-xs space-y-1">
                        <div className="flex justify-between font-bold text-slate-700">
                          <span>{isCoordinator ? 'Plano Base (Coord.):' : 'Plano Base:'}</span>
                          <span>{formatCurrency(basePrice)}</span>
                        </div>
                        {extraStandardSeats > 0 && (
                          <div className="flex justify-between text-slate-600">
                            <span>{extraStandardSeats}x Anestesistas:</span>
                            <span>{formatCurrency(extraStandardSeats * STANDARD_SEAT_UNIT_PRICES[plan.id])}</span>
                          </div>
                        )}

                        <div className="border-t border-slate-200 pt-1.5 flex justify-between font-extrabold text-slate-900 text-sm">
                          <span>Total Geral:</span>
                          <span>{formatCurrency(totalCardPrice)}</span>
                        </div>
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
                        {extraStandardSeats > 0
                          ? `Assinar por ${formatCurrency(totalCardPrice)}`
                          : 'Assinar Agora'}
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

          {/* Modal de Confirmação de Cancelamento */}
          {isCancelModalOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
                <div className="flex items-center gap-4 text-red-600 mb-6">
                  <div className="p-3 bg-red-50 rounded-full">
                    <X className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">Cancelar Renovação Automática</h3>
                </div>

                <div className="space-y-4 mb-8">
                  <p className="text-slate-600">Ao cancelar a renovação automática:</p>
                  <ul className="space-y-3">
                    <li className="flex gap-2">
                      <Check className="w-5 h-5 text-teal-500 shrink-0" />
                      <span className="text-sm text-slate-700"><strong>Acesso garantido:</strong> Você continua usando normalmente até {activeSubscription && new Date(activeSubscription.current_period_end).toLocaleDateString('pt-BR')} ({activeSubscription && calculateDaysRemaining(activeSubscription.current_period_end)} dias restantes).</span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="w-5 h-5 text-teal-500 shrink-0" />
                      <span className="text-sm text-slate-700"><strong>Sem novas cobranças:</strong> Seu cartão não será cobrado na próxima renovação.</span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="w-5 h-5 text-teal-500 shrink-0" />
                      <span className="text-sm text-slate-700"><strong>Pode reativar a qualquer momento:</strong> Enquanto o período não vencer, você pode reverter essa decisão.</span>
                    </li>
                    <li className="flex gap-2">
                      <X className="w-5 h-5 text-red-400 shrink-0" />
                      <span className="text-sm text-slate-700"><strong>Ao vencer:</strong> Seus grupos e vagas extras ficarão inativos se você não reativar antes.</span>
                    </li>
                  </ul>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setIsCancelModalOpen(false)}
                    className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors"
                    disabled={isCanceling}
                  >
                    Manter Renovação
                  </button>
                  <button
                    onClick={async () => {
                      setIsCanceling(true)
                      try {
                        const { supabase } = await import('@/lib/supabase')
                        const { data: { session } } = await supabase.auth.getSession()

                        if (!session?.access_token) {
                          alert('Sessão expirada. Por favor, faça login novamente.')
                          setIsCanceling(false)
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
                          setIsCancelModalOpen(false)
                          fetchActiveSubscription()
                        } else {
                          alert(data.error || 'Erro ao cancelar renovação')
                        }
                      } catch (error) {
                        console.error('Erro:', error)
                        alert('Erro ao cancelar renovação automática')
                      } finally {
                        setIsCanceling(false)
                      }
                    }}
                    disabled={isCanceling}
                    className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors disabled:opacity-70 flex justify-center items-center gap-2"
                  >
                    {isCanceling ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Cancelar Renovação'}
                  </button>
                </div>
              </div>
            </div>
          )}
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
