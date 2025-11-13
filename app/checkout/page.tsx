'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CreditCard, Lock, Loader2, ArrowLeft } from 'lucide-react'
import { Layout } from '@/components/layout/Layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

const PLAN_PRICES = {
  monthly: 79.00,
  quarterly: 225.00,
  annual: 850.00
}

const PLAN_NAMES = {
  monthly: 'Plano Mensal',
  quarterly: 'Plano Trimestral',
  annual: 'Plano Anual'
}

interface CardData {
  number: string
  holderName: string
  expirationDate: string
  cvv: string
}

interface CustomerData {
  name: string
  email: string
  document: string
  phone: string
  zipcode: string
  street: string
  streetNumber: string
  neighborhood: string
  city: string
  state: string
}

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const plan = searchParams.get('plan') as 'monthly' | 'quarterly' | 'annual' | null
  const { user, isAuthenticated } = useAuth()

  const [cardData, setCardData] = useState<CardData>({
    number: '',
    holderName: '',
    expirationDate: '',
    cvv: ''
  })
  const [customerData, setCustomerData] = useState<CustomerData>({
    name: user?.name || '',
    email: user?.email || '',
    document: '',
    phone: '',
    zipcode: '',
    street: '',
    streetNumber: '',
    neighborhood: '',
    city: '',
    state: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!plan) {
      router.push('/planos')
    }
    if (isAuthenticated && user) {
      setCustomerData(prev => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email
      }))
    }
  }, [plan, router, isAuthenticated, user])

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '')
    const match = cleaned.match(/.{1,4}/g)
    return match ? match.join(' ') : ''
  }

  const formatExpirationDate = (value: string) => {
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length > 2) {
      return `${cleaned.substring(0, 2)}/${cleaned.substring(2, 4)}`
    }
    return cleaned
  }

  const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (name === 'number') {
      setCardData({ ...cardData, [name]: formatCardNumber(value) })
    } else if (name === 'expirationDate') {
      setCardData({ ...cardData, [name]: formatExpirationDate(value) })
    } else {
      setCardData({ ...cardData, [name]: value })
    }
  }

  const handleCustomerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setCustomerData({ ...customerData, [name]: value })
  }

  const fillTestData = () => {
    setCardData({
      number: '4111 1111 1111 1111',
      holderName: 'TESTE APROVADO',
      expirationDate: '12/25',
      cvv: '123'
    })
    setCustomerData({
      ...customerData,
      name: user?.name || 'Felipe Teste',
      document: '12345678900',
      phone: '11987654321',
      zipcode: '01310-100',
      street: 'Avenida Paulista',
      streetNumber: '1578',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP'
    })
    console.log('✅ Dados de teste preenchidos!')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!plan || !user) {
      setError('Plano ou usuário não identificado.')
      return
    }

    // Validação de campos obrigatórios
    if (!cardData.number || !cardData.holderName || !cardData.expirationDate || !cardData.cvv) {
      setError('Por favor, preencha todos os dados do cartão.')
      return
    }

    if (!customerData.document || !customerData.phone) {
      setError('Por favor, preencha CPF e telefone.')
      return
    }

    setLoading(true)

    try {
      // Obter token do Supabase
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Sessão expirada. Por favor, faça login novamente.')
      }

      // Extrair mês e ano da validade
      const [expMonth, expYear] = cardData.expirationDate.split('/')

      // Preparar dados do cartão para envio
      const cardDataForAPI = {
        number: cardData.number.replace(/\s/g, ''),
        holder_name: cardData.holderName.toUpperCase(),
        exp_month: expMonth,
        exp_year: expYear,
        cvv: cardData.cvv,
        document: customerData.document.replace(/\D/g, ''),
        phone: customerData.phone.replace(/\D/g, ''),
        address: {
          street: customerData.street,
          number: customerData.streetNumber,
          zipcode: customerData.zipcode.replace(/\D/g, ''),
          neighborhood: customerData.neighborhood,
          city: customerData.city,
          state: customerData.state
        }
      }

      console.log('📤 Criando assinatura recorrente...')

      // Enviar para o endpoint de subscription
      const response = await fetch('/api/pagarme/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          plan_id: plan,
          cardData: cardDataForAPI
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

      console.log('✅ Assinatura criada com sucesso:', data.subscription?.id)

      // Redirecionar para página de sucesso
      router.push(`/checkout/success?plan=${plan}&status=${data.status || 'active'}`)

    } catch (err: any) {
      console.error('❌ Erro no checkout:', err)
      setError(err.message || 'Erro ao processar pagamento. Tente novamente.')
      setLoading(false)
    }
  }

  if (!plan) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Plano não selecionado</h1>
            <p className="text-gray-600 mb-4">Por favor, selecione um plano para continuar.</p>
            <Link href="/planos">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para Planos
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    )
  }

  const currentPlanPrice = PLAN_PRICES[plan]
  const currentPlanName = PLAN_NAMES[plan]

  return (
    <Layout>
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 py-12 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <Link href="/planos" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para Planos
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Finalizar Assinatura: {currentPlanName}
              </h1>
              <p className="text-xl text-primary-600 font-semibold mb-4">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentPlanPrice)}
              </p>
              <p className="text-gray-600">
                Preencha os dados para ativar sua assinatura.
              </p>
            </div>

            {/* Botão de Teste - Apenas para desenvolvimento */}
            <div className="mb-6 text-center">
              <Button
                type="button"
                onClick={fillTestData}
                className="bg-yellow-500 hover:bg-yellow-600 text-white"
              >
                🧪 Preencher Dados de Teste
              </Button>
            </div>

            <Card className="p-6 shadow-lg">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Dados do Cartão */}
                <CardHeader className="px-0 pt-0">
                  <CardTitle className="text-xl font-semibold text-gray-800 flex items-center">
                    <CreditCard className="w-5 h-5 mr-2 text-primary-500" />
                    Dados do Cartão
                  </CardTitle>
                </CardHeader>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 mb-1">Número do Cartão</label>
                    <Input
                      id="cardNumber"
                      name="number"
                      type="text"
                      value={cardData.number}
                      onChange={handleCardChange}
                      maxLength={19}
                      placeholder="XXXX XXXX XXXX XXXX"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="cardHolderName" className="block text-sm font-medium text-gray-700 mb-1">Nome no Cartão</label>
                    <Input
                      id="cardHolderName"
                      name="holderName"
                      type="text"
                      value={cardData.holderName}
                      onChange={handleCardChange}
                      placeholder="Nome Completo"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="cardExpirationDate" className="block text-sm font-medium text-gray-700 mb-1">Validade</label>
                      <Input
                        id="cardExpirationDate"
                        name="expirationDate"
                        type="text"
                        value={cardData.expirationDate}
                        onChange={handleCardChange}
                        maxLength={5}
                        placeholder="MM/AA"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="cardCvv" className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
                      <Input
                        id="cardCvv"
                        name="cvv"
                        type="text"
                        value={cardData.cvv}
                        onChange={handleCardChange}
                        maxLength={4}
                        placeholder="123"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Dados Pessoais */}
                <CardHeader className="px-0 pt-0">
                  <CardTitle className="text-xl font-semibold text-gray-800 flex items-center">
                    <Lock className="w-5 h-5 mr-2 text-primary-500" />
                    Dados Pessoais
                  </CardTitle>
                </CardHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                    <Input
                      id="customerName"
                      name="name"
                      type="text"
                      value={customerData.name}
                      onChange={handleCustomerChange}
                      placeholder="Seu nome completo"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <Input
                      id="customerEmail"
                      name="email"
                      type="email"
                      value={customerData.email}
                      onChange={handleCustomerChange}
                      placeholder="seu@email.com"
                      required
                      disabled
                    />
                  </div>
                  <div>
                    <label htmlFor="customerDocument" className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
                    <Input
                      id="customerDocument"
                      name="document"
                      type="text"
                      value={customerData.document}
                      onChange={handleCustomerChange}
                      maxLength={14}
                      placeholder="000.000.000-00"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                    <Input
                      id="customerPhone"
                      name="phone"
                      type="text"
                      value={customerData.phone}
                      onChange={handleCustomerChange}
                      maxLength={15}
                      placeholder="(DD) 9XXXX-XXXX"
                      required
                    />
                  </div>
                </div>

                {/* Endereço */}
                <CardHeader className="px-0 pt-0">
                  <CardTitle className="text-xl font-semibold text-gray-800 flex items-center">
                    <Lock className="w-5 h-5 mr-2 text-primary-500" />
                    Endereço
                  </CardTitle>
                </CardHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="customerZipcode" className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                    <Input
                      id="customerZipcode"
                      name="zipcode"
                      type="text"
                      value={customerData.zipcode}
                      onChange={handleCustomerChange}
                      maxLength={9}
                      placeholder="00000-000"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="customerStreet" className="block text-sm font-medium text-gray-700 mb-1">Rua</label>
                    <Input
                      id="customerStreet"
                      name="street"
                      type="text"
                      value={customerData.street}
                      onChange={handleCustomerChange}
                      placeholder="Nome da Rua"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="customerStreetNumber" className="block text-sm font-medium text-gray-700 mb-1">Número</label>
                    <Input
                      id="customerStreetNumber"
                      name="streetNumber"
                      type="text"
                      value={customerData.streetNumber}
                      onChange={handleCustomerChange}
                      placeholder="123"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="customerNeighborhood" className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
                    <Input
                      id="customerNeighborhood"
                      name="neighborhood"
                      type="text"
                      value={customerData.neighborhood}
                      onChange={handleCustomerChange}
                      placeholder="Nome do Bairro"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="customerCity" className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                    <Input
                      id="customerCity"
                      name="city"
                      type="text"
                      value={customerData.city}
                      onChange={handleCustomerChange}
                      placeholder="Cidade"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="customerState" className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                    <Input
                      id="customerState"
                      name="state"
                      type="text"
                      value={customerData.state}
                      onChange={handleCustomerChange}
                      maxLength={2}
                      placeholder="UF"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Erro: </strong>
                    <span className="block sm:inline">{error}</span>
                  </div>
                )}

                {/* Notificação sobre renovação automática */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <CreditCard className="w-5 h-5 text-blue-600 mt-0.5" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-semibold text-blue-900 mb-1">
                        Renovação Automática
                      </h3>
                      <p className="text-sm text-blue-800">
                        Esta assinatura será renovada automaticamente no final de cada período. 
                        Você pode cancelar a qualquer momento sem taxas ou multas.
                      </p>
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
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
              </form>
            </Card>

            {/* Segurança */}
            <div className="mt-6 text-center">
              <div className="flex items-center justify-center text-sm text-gray-600">
                <Lock className="w-4 h-4 mr-2" />
                <span>Pagamento seguro processado pela Pagar.me</span>
              </div>
            </div>
          </div>
        </div>
      </Layout>
  )
}
