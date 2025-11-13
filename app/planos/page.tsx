'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  Check, 
  CreditCard, 
  Calendar, 
  TrendingUp, 
  Shield, 
  Zap,
  ArrowLeft,
  Loader2
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

function PlanosContent() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [showCardModal, setShowCardModal] = useState(false)
  const [cardData, setCardData] = useState({
    number: '',
    holder_name: '',
    exp_month: '',
    exp_year: '',
    cvv: '',
    document: ''
  })

  useEffect(() => {
    // Redirecionar secretárias - elas não precisam pagar
    if (isAuthenticated && user) {
      const checkSecretaria = async () => {
        const isSec = await isSecretaria(user.id)
        if (isSec) {
          router.push('/secretaria/dashboard')
        }
      }
      checkSecretaria()
    }
  }, [isAuthenticated, user, router])

  const handleSelectPlan = (plan: Plan) => {
    console.log('🔘 handleSelectPlan chamado para plano:', plan.id)
    
    if (!isAuthenticated || !user) {
      console.log('⚠️ Usuário não autenticado, redirecionando...')
      router.push('/login?redirect=/planos')
      return
    }

    console.log('✅ Abrindo modal de cartão para plano:', plan.name)
    setSelectedPlan(plan)
    setShowCardModal(true)
    console.log('✅ Modal deve estar visível agora')
  }

  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('📝 handleCardSubmit chamado')
    console.log('📋 Dados do cartão:', { 
      hasNumber: !!cardData.number,
      hasHolderName: !!cardData.holder_name,
      hasExpMonth: !!cardData.exp_month,
      hasExpYear: !!cardData.exp_year,
      hasCvv: !!cardData.cvv,
      hasDocument: !!cardData.document
    })
    
    if (!selectedPlan || !isAuthenticated || !user) {
      console.error('❌ Dados faltando:', { selectedPlan: !!selectedPlan, isAuthenticated, user: !!user })
      return
    }

    // Validação básica
    if (!cardData.number || !cardData.holder_name || !cardData.exp_month || !cardData.exp_year || !cardData.cvv) {
      console.error('❌ Dados do cartão incompletos')
      alert('Por favor, preencha todos os dados do cartão')
      return
    }
    
    console.log('✅ Validação passou, criando assinatura...')

    setLoading(true)

    try {
      // Obter token do Supabase
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        alert('Sessão expirada. Por favor, faça login novamente.')
        router.push('/login?redirect=/planos')
        return
      }

      // Criar assinatura direta com dados do cartão
      const response = await fetch('/api/pagarme/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          plan_id: selectedPlan.id,
          cardData: {
            number: cardData.number.replace(/\s/g, ''),
            holder_name: cardData.holder_name,
            exp_month: cardData.exp_month,
            exp_year: cardData.exp_year,
            cvv: cardData.cvv,
            document: cardData.document.replace(/\D/g, '')
          }
        })
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('❌ Erro na resposta:', JSON.stringify(data, null, 2))
        
        // Tratar diferentes formatos de erro
        let errorMessage = 'Erro ao criar assinatura'
        if (typeof data.error === 'string') {
          errorMessage = data.error
        } else if (data.error && typeof data.error === 'object') {
          errorMessage = data.error.message || data.error.error || JSON.stringify(data.error)
        } else if (data.message) {
          errorMessage = typeof data.message === 'string' ? data.message : JSON.stringify(data.message)
        }
        
        throw new Error(errorMessage)
      }

      // Assinatura criada com sucesso
      console.log('✅ Assinatura criada com sucesso:', data.subscription?.id)
      setShowCardModal(false)
      router.push(`/checkout/success?plan=${selectedPlan.id}&status=${data.status || 'active'}`)

    } catch (error: any) {
      console.error('Erro ao processar:', error)
      
      // Tratar diferentes formatos de erro
      let errorMessage = 'Erro ao processar assinatura. Tente novamente.'
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

  const fillTestData = () => {
    setCardData({
      number: '4111 1111 1111 1111',
      holder_name: 'TESTE APROVADO',
      exp_month: '12',
      exp_year: '25',
      cvv: '123',
      document: '12345678900'
    })
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
              <Link href="/login?redirect=/planos">
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

          {/* Planos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {PLANS.map((plan) => (
              <Card 
                key={plan.id}
                className={`relative transition-all duration-300 hover:shadow-xl ${
                  plan.popular 
                    ? 'border-2 border-primary-500 shadow-lg scale-105' 
                    : 'border border-gray-200'
                }`}
              >
                {plan.popular && (
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
                    disabled={loading}
                    className={`w-full ${
                      plan.popular 
                        ? 'bg-primary-600 hover:bg-primary-700' 
                        : 'bg-gray-800 hover:bg-gray-900'
                    }`}
                  >
                    {loading && selectedPlan?.id === plan.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processando...
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
            ))}
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
                  Processado pela Pagar.me com criptografia SSL
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

      {/* Modal de Cartão */}
      {showCardModal && selectedPlan && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            // Fechar modal ao clicar fora
            if (e.target === e.currentTarget) {
              setShowCardModal(false)
              setSelectedPlan(null)
              setLoading(false)
            }
          }}
        >
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Dados do Cartão - {selectedPlan.name}</span>
                <button
                  onClick={() => {
                    setShowCardModal(false)
                    setSelectedPlan(null)
                    setLoading(false)
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCardSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número do Cartão
                  </label>
                  <input
                    type="text"
                    value={cardData.number}
                    onChange={(e) => {
                      let value = e.target.value.replace(/\D/g, '')
                      // Formatar com espaços a cada 4 dígitos
                      value = value.replace(/(\d{4})(?=\d)/g, '$1 ')
                      if (value.length <= 19) {
                        setCardData({ ...cardData, number: value })
                      }
                    }}
                    placeholder="4111 1111 1111 1111"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                    maxLength={19}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome no Cartão
                  </label>
                  <input
                    type="text"
                    value={cardData.holder_name}
                    onChange={(e) => setCardData({ ...cardData, holder_name: e.target.value.toUpperCase() })}
                    placeholder="NOME COMPLETO"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mês
                    </label>
                    <input
                      type="text"
                      value={cardData.exp_month}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, '')
                        if (value.length <= 2 && (value === '' || (parseInt(value) >= 1 && parseInt(value) <= 12))) {
                          setCardData({ ...cardData, exp_month: value })
                        }
                      }}
                      placeholder="12"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                      maxLength={2}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ano
                    </label>
                    <input
                      type="text"
                      value={cardData.exp_year}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, '')
                        if (value.length <= 2) {
                          setCardData({ ...cardData, exp_year: value })
                        }
                      }}
                      placeholder="25"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                      maxLength={2}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CVV
                    </label>
                    <input
                      type="text"
                      value={cardData.cvv}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, '')
                        if (value.length <= 4) {
                          setCardData({ ...cardData, cvv: value })
                        }
                      }}
                      placeholder="123"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                      maxLength={4}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CPF
                  </label>
                  <input
                    type="text"
                    value={cardData.document}
                    onChange={(e) => {
                      let value = e.target.value.replace(/\D/g, '')
                      // Formatar CPF
                      if (value.length <= 11) {
                        value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
                        setCardData({ ...cardData, document: value })
                      }
                    }}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                    maxLength={14}
                  />
                </div>

                {/* Notificação sobre renovação automática */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <CreditCard className="w-5 h-5 text-blue-600 mt-0.5" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-semibold text-blue-900 mb-1">
                        Renovação Automática
                      </h3>
                      <p className="text-sm text-blue-800">
                        Esta assinatura será renovada automaticamente no final de cada período ({selectedPlan.period === 'mensal' ? 'mensalmente' : selectedPlan.period === 'trimestral' ? 'trimestralmente' : 'anualmente'}). 
                        Você pode cancelar a qualquer momento sem taxas ou multas.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={fillTestData}
                    className="flex-1 bg-yellow-500 hover:bg-yellow-600"
                  >
                    🧪 Preencher Dados de Teste
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        Finalizar Pagamento
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
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
