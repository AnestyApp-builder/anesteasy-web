'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Clock, Loader2, Calendar, CreditCard, ArrowRight, X, AlertTriangle, TrendingUp } from 'lucide-react'
import { Layout } from '@/components/layout/Layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

interface Subscription {
  id: string
  user_id: string
  plan_type: 'monthly' | 'quarterly' | 'annual'
  status: 'active' | 'pending' | 'cancelled' | 'expired' | 'failed' | 'suspended'
  amount: number
  pagarme_subscription_id: string
  current_period_start: string
  current_period_end: string | null
  created_at: string
  cancelled_at: string | null
}

const PLAN_NAMES: Record<string, string> = {
  monthly: 'Plano Mensal',
  quarterly: 'Plano Trimestral',
  annual: 'Plano Anual'
}

const PLAN_PRICES: Record<string, number> = {
  monthly: 79.00,
  quarterly: 225.00,
  annual: 850.00
}

export default function AssinaturaPage() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/assinatura')
      return
    }

    if (user) {
      fetchSubscription()
    }
  }, [isAuthenticated, user, router])

  const fetchSubscription = async () => {
    try {
      setLoading(true)
      setError(null)

      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Sessão expirada. Por favor, faça login novamente.')
      }

      const response = await fetch('/api/pagarme/subscription', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 404) {
          setSubscription(null)
          setError(null) // Não é erro, apenas não tem assinatura
        } else {
          throw new Error(data.error || 'Erro ao buscar assinatura')
        }
      } else {
        setSubscription(data.subscription)
      }
    } catch (err: any) {
      console.error('Erro ao buscar assinatura:', err)
      setError(err.message || 'Erro ao carregar informações da assinatura')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />
      case 'cancelled':
      case 'expired':
        return <XCircle className="w-5 h-5 text-red-600" />
      case 'failed':
        return <AlertTriangle className="w-5 h-5 text-red-600" />
      case 'suspended':
        return <XCircle className="w-5 h-5 text-orange-600" />
      default:
        return <Clock className="w-5 h-5 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'cancelled':
      case 'expired':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'suspended':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ativa'
      case 'pending':
        return 'Pendente'
      case 'cancelled':
        return 'Cancelada'
      case 'expired':
        return 'Expirada'
      case 'failed':
        return 'Falha no Pagamento'
      case 'suspended':
        return 'Suspensa'
      default:
        return status
    }
  }

  const handleCancelSubscription = async (cancelImmediately: boolean = false) => {
    if (!subscription) return

    // Verificar se já está cancelada
    if (subscription.status === 'cancelled' || subscription.status === 'expired') {
      setError('Esta assinatura já foi cancelada.')
      return
    }

    const confirmMessage = cancelImmediately
      ? 'Tem certeza que deseja cancelar sua assinatura imediatamente? Você perderá o acesso imediatamente.'
      : 'Tem certeza que deseja cancelar sua assinatura? Ela será cancelada ao fim do período atual e você manterá o acesso até então.'

    if (!confirm(confirmMessage)) return

    try {
      setIsCancelling(true)
      setError(null)

      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Sessão expirada. Por favor, faça login novamente.')
      }

      const response = await fetch('/api/pagarme/subscription/cancel', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription_id: subscription.pagarme_subscription_id,
          cancel_immediately: cancelImmediately
        })
      })

      const data = await response.json()

      if (!response.ok) {
        // Verificar se o erro é porque já está cancelada
        const errorMessage = data.error || 'Erro ao cancelar assinatura'
        if (errorMessage.toLowerCase().includes('canceled') || errorMessage.toLowerCase().includes('cancelada')) {
          // Assinatura já estava cancelada, apenas atualizar dados
          await fetchSubscription()
          alert('Esta assinatura já estava cancelada.')
          return
        }
        throw new Error(errorMessage)
      }

      // Mostrar mensagem de sucesso
      if (data.success) {
        alert(data.message || (cancelImmediately 
          ? 'Assinatura cancelada com sucesso. Você perdeu o acesso imediatamente.'
          : 'Assinatura será cancelada ao fim do período atual. Você manterá o acesso até então.'))
      }

      // Recarregar dados da assinatura
      await fetchSubscription()

    } catch (err: any) {
      console.error('Erro ao cancelar assinatura:', err)
      const errorMessage = err.message || 'Erro ao cancelar assinatura'
      // Verificar se o erro é porque já está cancelada
      if (errorMessage.toLowerCase().includes('canceled') || errorMessage.toLowerCase().includes('cancelada')) {
        setError('Esta assinatura já está cancelada.')
        // Recarregar para atualizar status
        await fetchSubscription()
      } else {
        setError(errorMessage)
      }
    } finally {
      setIsCancelling(false)
    }
  }

  const handleUpgrade = async (newPlanType: string) => {
    if (!subscription) return

    try {
      setIsUpgrading(true)
      setError(null)

      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Sessão expirada. Por favor, faça login novamente.')
      }

      const response = await fetch('/api/pagarme/subscription/upgrade', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription_id: subscription.pagarme_subscription_id,
          new_plan_id: newPlanType
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao atualizar plano')
      }

      alert('Plano atualizado com sucesso!')
      setShowUpgradeModal(false)

      // Recarregar dados da assinatura
      await fetchSubscription()

    } catch (err: any) {
      console.error('Erro ao fazer upgrade:', err)
      setError(err.message || 'Erro ao atualizar plano')
    } finally {
      setIsUpgrading(false)
    }
  }

  const getAvailablePlansForUpgrade = () => {
    if (!subscription) return []
    
    const currentPlanIndex = ['monthly', 'quarterly', 'annual'].indexOf(subscription.plan_type)
    const allPlans = ['monthly', 'quarterly', 'annual']
    
    // Retornar todos os planos exceto o atual
    return allPlans.filter((plan, index) => index !== currentPlanIndex)
  }

  if (!isAuthenticated) {
    return null
  }

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary-500 mx-auto mb-4" />
            <p className="text-gray-600">Carregando informações da assinatura...</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Minha Assinatura
            </h1>
            <p className="text-gray-600">
              Gerencie sua assinatura e acompanhe o status do seu plano
            </p>
          </div>

          {error && (
            <Card className="mb-6 border-red-200 bg-red-50">
              <CardContent className="p-4">
                <p className="text-red-800">{error}</p>
              </CardContent>
            </Card>
          )}

          {!subscription ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Nenhuma assinatura ativa
                </h2>
                <p className="text-gray-600 mb-6">
                  Você ainda não possui uma assinatura ativa. Escolha um plano para começar.
                </p>
                <Link href="/planos">
                  <Button>
                    Ver Planos Disponíveis
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Status da Assinatura */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Status da Assinatura</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold border flex items-center gap-2 ${getStatusColor(subscription.status)}`}>
                      {getStatusIcon(subscription.status)}
                      {getStatusLabel(subscription.status)}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Valor</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {new Intl.NumberFormat('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL' 
                      }).format(subscription.amount || PLAN_PRICES[subscription.plan_type] || 0)}
                      <span className="text-sm font-normal text-gray-600 ml-1">
                        {subscription.plan_type === 'monthly' && '/mês'}
                        {subscription.plan_type === 'quarterly' && '/trimestre'}
                        {subscription.plan_type === 'annual' && '/ano'}
                      </span>
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Período de Renovação */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-primary-500" />
                    Período de Renovação
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Início do Período</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatDate(subscription.current_period_start)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Próxima Renovação</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {subscription.current_period_end 
                          ? formatDate(subscription.current_period_end)
                          : 'N/A'}
                      </p>
                      {subscription.current_period_end && subscription.status === 'active' && (
                        <p className="text-xs text-gray-500 mt-1">
                          {(() => {
                            const renewalDate = new Date(subscription.current_period_end)
                            const today = new Date()
                            const daysUntilRenewal = Math.ceil((renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                            if (daysUntilRenewal > 0) {
                              return `Em ${daysUntilRenewal} ${daysUntilRenewal === 1 ? 'dia' : 'dias'}`
                            } else if (daysUntilRenewal === 0) {
                              return 'Hoje'
                            } else {
                              return 'Vencido'
                            }
                          })()}
                        </p>
                      )}
                    </div>
                  </div>
                  {subscription.status === 'active' && subscription.current_period_end && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800">
                        <strong>Renovação automática:</strong> Sua assinatura será renovada automaticamente em{' '}
                        {formatDate(subscription.current_period_end)}.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Ações */}
              <div className="space-y-4">
                {subscription.status === 'active' && (
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button 
                      className="flex-1 bg-primary-600 hover:bg-primary-700"
                      onClick={() => setShowUpgradeModal(true)}
                      disabled={isUpgrading}
                    >
                      <TrendingUp className="w-4 h-4 mr-2" />
                      {isUpgrading ? 'Atualizando...' : 'Alterar Plano'}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                      onClick={() => handleCancelSubscription(false)}
                      disabled={isCancelling || subscription.status === 'cancelled' || subscription.status === 'expired'}
                    >
                      {isCancelling ? 'Cancelando...' : 'Cancelar Assinatura'}
                    </Button>
                  </div>
                )}
                {(subscription.status === 'cancelled' || subscription.status === 'expired') && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-700 mb-2">
                      <strong>Assinatura cancelada</strong>
                    </p>
                    {subscription.cancelled_at && (
                      <p className="text-xs text-gray-600">
                        Cancelada em {formatDate(subscription.cancelled_at)}
                      </p>
                    )}
                    <Link href="/planos" className="mt-3 inline-block">
                      <Button size="sm" className="bg-primary-600 hover:bg-primary-700">
                        Assinar Novo Plano
                      </Button>
                    </Link>
                  </div>
                )}
                {subscription.status === 'failed' && (
                  <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-4">
                      <div className="flex items-start">
                        <AlertTriangle className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-red-800 mb-1">
                            Falha no Pagamento
                          </p>
                          <p className="text-sm text-red-700 mb-3">
                            Houve um problema com o pagamento da sua assinatura. Por favor, atualize seus dados de pagamento ou entre em contato com o suporte.
                          </p>
                          <Link href="/planos">
                            <Button size="sm" className="bg-red-600 hover:bg-red-700">
                              Atualizar Pagamento
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/dashboard" className="flex-1">
                    <Button variant="outline" className="w-full">
                      Ir para Dashboard
                    </Button>
                  </Link>
                  {subscription.status !== 'active' && subscription.status !== 'failed' && (
                    <Link href="/planos" className="flex-1">
                      <Button className="w-full">
                        Assinar Plano
                      </Button>
                    </Link>
                  )}
                </div>
              </div>

              {/* Modal de Upgrade */}
              {showUpgradeModal && (
                <Modal
                  isOpen={showUpgradeModal}
                  onClose={() => setShowUpgradeModal(false)}
                  title="Alterar Plano"
                >
                  <div className="space-y-4">
                    <p className="text-gray-600">
                      Escolha o novo plano para sua assinatura:
                    </p>
                    <div className="space-y-3">
                      {getAvailablePlansForUpgrade().map((planType) => (
                        <button
                          key={planType}
                          onClick={() => handleUpgrade(planType)}
                          disabled={isUpgrading}
                          className="w-full p-4 border-2 border-primary-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-semibold text-gray-900">
                                {PLAN_NAMES[planType]}
                              </p>
                              <p className="text-sm text-gray-600">
                                {planType === 'monthly' && 'Renovação mensal'}
                                {planType === 'quarterly' && 'Renovação trimestral'}
                                {planType === 'annual' && 'Renovação anual'}
                              </p>
                            </div>
                            <p className="text-lg font-bold text-primary-600">
                              {new Intl.NumberFormat('pt-BR', { 
                                style: 'currency', 
                                currency: 'BRL' 
                              }).format(PLAN_PRICES[planType] || 0)}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                    {error && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800">{error}</p>
                      </div>
                    )}
                  </div>
                </Modal>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

