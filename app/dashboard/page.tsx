'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  TrendingUp, 
  DollarSign, 
  FileText, 
  Users, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Activity
} from 'lucide-react'
import { Layout } from '@/components/layout/Layout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { procedureService } from '@/lib/procedures'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate } from '@/lib/utils'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Loading } from '@/components/ui/Loading'

export default function Dashboard() {
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    cancelled: 0,
    totalValue: 0,
    completedValue: 0,
    pendingValue: 0
  })
  const [recentProcedures, setRecentProcedures] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    if (user?.id) {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    if (!user?.id) return
    
    setLoading(true)
    try {
      const [statsData, proceduresData] = await Promise.all([
        procedureService.getProcedureStats(user.id),
        procedureService.getProcedures(user.id)
      ])
      
      setStats(statsData)
      setRecentProcedures(proceduresData.slice(0, 5))
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleProcedureClick = (procedure: any) => {
    // Redirecionar para a página de procedimentos com o ID do procedimento
    window.location.href = `/procedimentos?procedureId=${procedure.id}`
  }


  const chartData = [
    { name: 'Jan', value: 12000 },
    { name: 'Fev', value: 15000 },
    { name: 'Mar', value: 18000 },
    { name: 'Abr', value: 14000 },
    { name: 'Mai', value: 16000 },
    { name: 'Jun', value: 20000 }
  ]

  const pieData = [
    { name: 'Concluídos', value: stats.completed, color: '#10b981' },
    { name: 'Pendentes', value: stats.pending, color: '#f59e0b' },
    { name: 'Não Lançados', value: stats.cancelled, color: '#ef4444' }
  ]

  const dashboardStats = [
    {
      title: 'Receita Total',
      value: formatCurrency(stats.totalValue),
      change: '+12.5%',
      changeType: 'positive' as const,
      icon: DollarSign
    },
    {
      title: 'Procedimentos',
      value: stats.total.toString(),
      change: '+8.2%',
      changeType: 'positive' as const,
      icon: FileText
    },
    {
      title: 'Concluídos',
      value: stats.completed.toString(),
      change: '+3.1%',
      changeType: 'positive' as const,
      icon: Users
    },
    {
      title: 'Taxa de Sucesso',
      value: stats.total > 0 ? `${Math.round((stats.completed / stats.total) * 100)}%` : '0%',
      change: '-2.4%',
      changeType: 'negative' as const,
      icon: Activity
    }
  ]

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">Bem-vindo de volta, Dr. Usuário</p>
            </div>
            <div className="mt-4 sm:mt-0">
              <Link href="/procedimentos/novo">
                <Button>
                  <Calendar className="w-4 h-4 mr-2" />
                  Novo Procedimento
                </Button>
              </Link>
            </div>
          </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {dashboardStats.map((stat, index) => (
            <Card key={index} className="hover:shadow-lg transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <div className="flex items-center text-sm">
                  {stat.changeType === 'positive' ? (
                    <ArrowUpRight className="h-4 w-4 text-green-600 mr-1" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-600 mr-1" />
                  )}
                  <span className={stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'}>
                    {stat.change}
                  </span>
                  <span className="text-gray-500 ml-1">vs mês anterior</span>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Charts and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Receita dos Últimos 6 Meses</CardTitle>
            </CardHeader>
            <div className="p-6">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Receita']} />
                    <Line type="monotone" dataKey="value" stroke="#14b8a6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>

          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Status</CardTitle>
            </CardHeader>
            <div className="p-6">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
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
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Procedures */}
        <Card>
          <CardHeader>
            <CardTitle>Procedimentos Recentes</CardTitle>
          </CardHeader>
          <div className="p-6">
            {loading ? (
              <Loading text="Carregando dados..." />
            ) : recentProcedures.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Nenhum procedimento encontrado</p>
                <p className="text-sm text-gray-500 mt-1">Comece criando seu primeiro procedimento</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentProcedures.map((procedure) => (
                  <div 
                    key={procedure.id} 
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => handleProcedureClick(procedure)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                        <FileText className="w-5 h-5 text-teal-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{procedure.patient_name || 'Nome não informado'}</p>
                        <p className="text-sm text-gray-600">{procedure.procedure_name || procedure.procedure_type || 'Procedimento não informado'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        {formatCurrency(procedure.procedure_value || 0)}
                      </p>
                      <p className="text-sm text-gray-600">{formatDate(procedure.procedure_date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-6">
              <Link href="/procedimentos">
                <Button variant="outline" className="w-full">
                  Ver todos os procedimentos
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/procedimentos/novo">
                <Button variant="outline" className="h-20 flex flex-col items-center justify-center w-full">
                  <FileText className="w-6 h-6 mb-2" />
                  Novo Procedimento
                </Button>
              </Link>
              <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
                <DollarSign className="w-6 h-6 mb-2" />
                Registrar Pagamento
              </Button>
              <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
                <Users className="w-6 h-6 mb-2" />
                Adicionar Paciente
              </Button>
            </div>
          </div>
        </Card>

      </div>
    </Layout>
    </ProtectedRoute>
  )
}
