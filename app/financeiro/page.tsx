'use client'

import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  CreditCard,
  Banknote,
  PieChart,
  Calendar
} from 'lucide-react'
import { Layout } from '@/components/layout/Layout'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function Financeiro() {
  const financialData = [
    {
      title: 'Receita Total',
      value: 'R$ 45.230',
      change: '+12.5%',
      changeType: 'positive' as const,
      icon: DollarSign
    },
    {
      title: 'Despesas',
      value: 'R$ 12.450',
      change: '+3.2%',
      changeType: 'negative' as const,
      icon: TrendingDown
    },
    {
      title: 'Lucro Líquido',
      value: 'R$ 32.780',
      change: '+18.7%',
      changeType: 'positive' as const,
      icon: TrendingUp
    },
    {
      title: 'Pendências',
      value: 'R$ 5.200',
      change: '-8.1%',
      changeType: 'positive' as const,
      icon: CreditCard
    }
  ]

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Financeiro</h1>
            <p className="text-gray-600 mt-1">Controle suas finanças e pagamentos</p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Button>
              <Banknote className="w-4 h-4 mr-2" />
              Registrar Pagamento
            </Button>
          </div>
        </div>

        {/* Financial Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {financialData.map((item, index) => (
            <Card key={index} className="hover:shadow-lg transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {item.title}
                </CardTitle>
                <item.icon className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-gray-900">{item.value}</div>
                <div className="flex items-center text-sm">
                  {item.changeType === 'positive' ? (
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                  )}
                  <span className={item.changeType === 'positive' ? 'text-green-600' : 'text-red-600'}>
                    {item.change}
                  </span>
                  <span className="text-gray-500 ml-1">vs mês anterior</span>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Receita vs Despesas</CardTitle>
            </CardHeader>
            <div className="p-6">
              <div className="h-64 bg-gradient-to-br from-primary-50 to-secondary-50 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <PieChart className="w-12 h-12 text-primary-500 mx-auto mb-4" />
                  <p className="text-gray-600">Gráfico de receita vs despesas</p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fluxo de Caixa</CardTitle>
            </CardHeader>
            <div className="p-6">
              <div className="h-64 bg-gradient-to-br from-secondary-50 to-primary-50 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Calendar className="w-12 h-12 text-secondary-500 mx-auto mb-4" />
                  <p className="text-gray-600">Gráfico de fluxo de caixa</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  )
}
