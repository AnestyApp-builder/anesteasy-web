'use client'

import { 
  TrendingUp, 
  DollarSign, 
  FileText, 
  Users, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Clock
} from 'lucide-react'
import { Layout } from '@/components/layout/Layout'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function Dashboard() {
  const stats = [
    {
      title: 'Receita Total',
      value: 'R$ 45.230',
      change: '+12.5%',
      changeType: 'positive' as const,
      icon: DollarSign
    },
    {
      title: 'Procedimentos',
      value: '127',
      change: '+8.2%',
      changeType: 'positive' as const,
      icon: FileText
    },
    {
      title: 'Pacientes',
      value: '89',
      change: '+3.1%',
      changeType: 'positive' as const,
      icon: Users
    },
    {
      title: 'Taxa de Ocupação',
      value: '78%',
      change: '-2.4%',
      changeType: 'negative' as const,
      icon: Activity
    }
  ]

  const recentProcedures = [
    {
      id: 1,
      patient: 'Maria Silva',
      procedure: 'Anestesia Geral',
      date: '2024-01-15',
      value: 'R$ 1.200',
      status: 'Concluído'
    },
    {
      id: 2,
      patient: 'João Santos',
      procedure: 'Anestesia Regional',
      date: '2024-01-14',
      value: 'R$ 800',
      status: 'Pendente'
    },
    {
      id: 3,
      patient: 'Ana Costa',
      procedure: 'Sedação',
      date: '2024-01-13',
      value: 'R$ 600',
      status: 'Concluído'
    }
  ]

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Bem-vindo de volta, Dr. Usuário</p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Button>
              <Calendar className="w-4 h-4 mr-2" />
              Novo Procedimento
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
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
              <div className="h-64 bg-gradient-to-br from-primary-50 to-secondary-50 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 text-primary-500 mx-auto mb-4" />
                  <p className="text-gray-600">Gráfico de receita será exibido aqui</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Recent Procedures */}
          <Card>
            <CardHeader>
              <CardTitle>Procedimentos Recentes</CardTitle>
            </CardHeader>
            <div className="p-6">
              <div className="space-y-4">
                {recentProcedures.map((procedure) => (
                  <div key={procedure.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{procedure.patient}</p>
                        <p className="text-sm text-gray-600">{procedure.procedure}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{procedure.value}</p>
                      <p className="text-sm text-gray-600">{procedure.date}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <Button variant="outline" className="w-full">
                  Ver todos os procedimentos
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
                <FileText className="w-6 h-6 mb-2" />
                Novo Procedimento
              </Button>
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
  )
}
