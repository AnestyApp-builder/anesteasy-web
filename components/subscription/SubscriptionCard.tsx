'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  CreditCard, 
  Calendar, 
  CheckCircle, 
  AlertCircle,
  ArrowRight,
  Loader2
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { getActiveSubscription, Subscription } from '@/lib/subscription'
import { formatCurrency, formatDate } from '@/lib/utils'

interface SubscriptionCardProps {
  userId: string
}

export function SubscriptionCard({ userId }: SubscriptionCardProps) {
  const router = useRouter()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadSubscription = async () => {
      try {
        const activeSub = await getActiveSubscription(userId)
        setSubscription(activeSub)
      } catch (error) {
        console.error('Erro ao carregar assinatura:', error)
      } finally {
        setLoading(false)
      }
    }

    loadSubscription()
  }, [userId])

  const getPlanName = (planType: string) => {
    const names: Record<string, string> = {
      monthly: 'Mensal',
      quarterly: 'Trimestral',
      annual: 'Anual'
    }
    return names[planType] || planType
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'text-green-600 bg-green-50',
      pending: 'text-yellow-600 bg-yellow-50',
      cancelled: 'text-red-600 bg-red-50',
      expired: 'text-gray-600 bg-gray-50',
      suspended: 'text-orange-600 bg-orange-50'
    }
    return colors[status] || colors.pending
  }

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      active: 'Ativa',
      pending: 'Pendente',
      cancelled: 'Cancelada',
      expired: 'Expirada',
      suspended: 'Suspensa'
    }
    return texts[status] || status
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!subscription) {
    return (
      <Card className="border-2 border-primary-200 bg-gradient-to-br from-primary-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center text-gray-900">
            <CreditCard className="w-5 h-5 mr-2 text-primary-600" />
            Assinatura
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900 mb-1">
                Nenhuma assinatura ativa
              </p>
              <p className="text-xs text-gray-600">
                Assine um plano para continuar usando todas as funcionalidades da plataforma.
              </p>
            </div>
          </div>
          <Button
            onClick={() => router.push('/planos')}
            className="w-full bg-primary-600 hover:bg-primary-700"
          >
            Ver Planos
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    )
  }

  const periodEnd = new Date(subscription.current_period_end)
  const daysRemaining = Math.ceil((periodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  return (
    <Card className="border-2 border-primary-200 bg-gradient-to-br from-primary-50 to-white">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-gray-900">
          <div className="flex items-center">
            <CreditCard className="w-5 h-5 mr-2 text-primary-600" />
            Assinatura
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(subscription.status)}`}>
            {getStatusText(subscription.status)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Plano</span>
            <span className="text-sm font-semibold text-gray-900">
              {getPlanName(subscription.plan_type)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Valor</span>
            <span className="text-sm font-semibold text-gray-900">
              {formatCurrency(subscription.amount)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Próxima cobrança</span>
            <span className="text-sm font-semibold text-gray-900">
              {formatDate(subscription.current_period_end)}
            </span>
          </div>
          {daysRemaining > 0 && daysRemaining <= 7 && (
            <div className="flex items-start p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-yellow-800">
                Sua assinatura renova em {daysRemaining} {daysRemaining === 1 ? 'dia' : 'dias'}
              </p>
            </div>
          )}
        </div>

        {subscription.status === 'active' && (
          <div className="pt-4 border-t border-gray-200">
            <Button
              onClick={() => router.push('/configuracoes?tab=subscription')}
              variant="outline"
              className="w-full"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Gerenciar Assinatura
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

