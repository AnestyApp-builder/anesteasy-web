'use client'

import { useState, useEffect } from 'react'
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
import { procedureService } from '@/lib/procedures'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency } from '@/lib/utils'
import { ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

export default function Financeiro() {
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    cancelled: 0,
    totalValue: 0,
    completedValue: 0,
    pendingValue: 0
  })
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    if (user?.id) {
      loadFinancialData()
    }
  }, [user])

  const loadFinancialData = async () => {
    if (!user?.id) return
    
    setLoading(true)
    try {
      const statsData = await procedureService.getProcedureStats(user.id)
      setStats(statsData)
    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error)
    } finally {
      setLoading(false)
    }
  }

  const financialData = [
    {
      title: 'Receita Total',
      value: formatCurrency(stats.totalValue),
      change: '+12.5%',
      changeType: 'positive' as const,
      icon: DollarSign
    },
    {
      title: 'Receita Realizada',
      value: formatCurrency(stats.completedValue),
      change: '+8.2%',
      changeType: 'positive' as const,
      icon: TrendingUp
    },
    {
      title: 'Pendente de Recebimento',
      value: formatCurrency(stats.pendingValue),
      change: '+3.1%',
      changeType: 'negative' as const,
      icon: CreditCard
    },
    {
      title: 'Taxa de Recebimento',
      value: stats.totalValue > 0 ? `${Math.round((stats.completedValue / stats.totalValue) * 100)}%` : '0%',
      change: '-2.4%',
      changeType: 'positive' as const,
      icon: Banknote
    }
  ]

  const pieData = [
    { name: 'Recebido', value: stats.completedValue, color: '#10b981' },
    { name: 'Pendente', value: stats.pendingValue, color: '#f59e0b' }
  ]

  const monthlyData = [
    { name: 'Jan', receita: 12000, despesas: 3000 },
    { name: 'Fev', receita: 15000, despesas: 3500 },
    { name: 'Mar', receita: 18000, despesas: 4000 },
    { name: 'Abr', receita: 14000, despesas: 3200 },
    { name: 'Mai', receita: 16000, despesas: 3800 },
    { name: 'Jun', receita: 20000, despesas: 4500 }
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
              <CardTitle>Distribuição de Receitas</CardTitle>
            </CardHeader>
            <div className="p-6">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Valor']} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Receita vs Despesas (Últimos 6 Meses)</CardTitle>
            </CardHeader>
            <div className="p-6">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Valor']} />
                    <Bar dataKey="receita" fill="#14b8a6" name="Receita" />
                    <Bar dataKey="despesas" fill="#ef4444" name="Despesas" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  )
}

