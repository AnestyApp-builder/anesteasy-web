'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  CreditCard,
  Banknote,
  PieChart,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Settings,
  CheckCircle,
  X
} from 'lucide-react'
import { Layout } from '@/components/layout/Layout'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { procedureService } from '@/lib/procedures'
import { goalService } from '@/lib/goals'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency } from '@/lib/utils'
import { ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts'

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
  const [procedureChartData, setProcedureChartData] = useState<any[]>([])
  const [monthlyRevenueData, setMonthlyRevenueData] = useState<any[]>([])
  const [monthlyGoal, setMonthlyGoal] = useState({
    targetValue: 0,
    resetDay: 1,
    isEnabled: false
  })
  const [currentProgress, setCurrentProgress] = useState({
    currentValue: 0,
    percentage: 0,
    daysRemaining: 0,
    isCompleted: false
  })
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [showCongratsModal, setShowCongratsModal] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user?.id) {
      loadFinancialData()
      loadMonthlyGoal()
    }
  }, [user])

  useEffect(() => {
    if (monthlyGoal.isEnabled) {
      calculateProgress(monthlyGoal)
    }
  }, [stats.completedValue, monthlyGoal])

  const loadFinancialData = async () => {
    if (!user?.id) return
    
    setLoading(true)
    try {
      const statsData = await procedureService.getProcedureStats(user.id)
      setStats(statsData)
      
      // Carregar dados dos procedimentos para o gráfico
      const procedures = await procedureService.getProcedures(user.id)
      calculateProcedureChartData(procedures)
      calculateMonthlyRevenueData(procedures)
    } catch (error) {
      
    } finally {
      setLoading(false)
    }
  }

  const calculateProcedureChartData = (procedures: any[]) => {
    const stats = {
      total: procedures.length,
      paid: procedures.filter(p => p.payment_status === 'paid').length,
      pending: procedures.filter(p => p.payment_status === 'pending').length,
      cancelled: procedures.filter(p => p.payment_status === 'cancelled').length
    }

    const chartData = [
      {
        status: 'Total',
        quantidade: stats.total,
        cor: '#14b8a6', // teal-600 - cor principal do projeto
        bgColor: 'bg-teal-50',
        textColor: 'text-teal-700'
      },
      {
        status: 'Pago',
        quantidade: stats.paid,
        cor: '#22c55e', // green-500 - sucesso
        bgColor: 'bg-green-50',
        textColor: 'text-green-700'
      },
      {
        status: 'Pendente',
        quantidade: stats.pending,
        cor: '#f59e0b', // amber-500 - atenção
        bgColor: 'bg-amber-50',
        textColor: 'text-amber-700'
      },
      {
        status: 'Não Lançado',
        quantidade: stats.cancelled,
        cor: '#ef4444', // red-500 - erro
        bgColor: 'bg-red-50',
        textColor: 'text-red-700'
      }
    ]

    setProcedureChartData(chartData)
  }

  const calculateMonthlyRevenueData = (procedures: any[]) => {
    // Obter os últimos 6 meses
    const months: { date: Date; name: string; receita: number }[] = []
    const currentDate = new Date()
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      months.push({
        date: date,
        name: date.toLocaleDateString('pt-BR', { month: 'short' }),
        receita: 0
      })
    }

    // Calcular receita por mês baseada nos procedimentos pagos
    procedures.forEach(procedure => {
      if (procedure.payment_status === 'paid' && procedure.procedure_date) {
        const procedureDate = new Date(procedure.procedure_date)
        const monthIndex = months.findIndex(month => 
          month.date.getMonth() === procedureDate.getMonth() && 
          month.date.getFullYear() === procedureDate.getFullYear()
        )
        
        if (monthIndex !== -1) {
          months[monthIndex].receita += procedure.procedure_value || 0
        }
      }
    })

    setMonthlyRevenueData(months)
  }

  const loadMonthlyGoal = async () => {
    if (!user?.id) return
    
    try {
      // Primeiro, tentar carregar do banco de dados
      let goal = await goalService.getGoal(user.id)
      
      // Se não encontrou no banco, tentar migrar do localStorage
      if (!goal) {
        goal = await goalService.migrateFromLocalStorage(user.id)
      }
      
      if (goal) {
        // Converter formato do banco para formato do componente
        const goalData = {
          targetValue: goal.target_value,
          resetDay: goal.reset_day,
          isEnabled: goal.is_enabled
        }
        setMonthlyGoal(goalData)
        calculateProgress(goalData)
      }
    } catch (error) {
      
    }
  }

  const calculateProgress = (goal: any) => {
    if (!goal.isEnabled || goal.targetValue === 0) return

    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    
    // Calcular data de início do período atual
    let startDate = new Date(currentYear, currentMonth, goal.resetDay)
    if (startDate > now) {
      // Se a data de reset ainda não chegou este mês, usar o mês anterior
      startDate = new Date(currentYear, currentMonth - 1, goal.resetDay)
    }
    
    // Calcular data de fim do período
    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + 1)
    
    // Calcular dias restantes
    const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    
    // Calcular valor atual (usar completedValue como base)
    const currentValue = stats.completedValue
    const percentage = Math.min(100, (currentValue / goal.targetValue) * 100)
    const isCompleted = currentValue >= goal.targetValue

    setCurrentProgress({
      currentValue,
      percentage,
      daysRemaining,
      isCompleted
    })

    // Mostrar notificação se meta foi concluída
    if (isCompleted && !showCongratsModal) {
      setShowCongratsModal(true)
    }
  }

  const saveMonthlyGoal = async (goal: any) => {
    if (!user?.id) return
    
    try {
      // Converter formato do componente para formato do banco
      const goalData = {
        user_id: user.id,
        target_value: goal.targetValue,
        reset_day: goal.resetDay,
        is_enabled: goal.isEnabled
      }
      
      // Salvar no banco de dados
      const savedGoal = await goalService.saveGoal(goalData)
      
      if (savedGoal) {
        setMonthlyGoal(goal)
        calculateProgress(goal)
        setShowGoalModal(false)
        
      } else {
        
      }
    } catch (error) {
      
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

  // monthlyData agora vem do banco de dados via monthlyRevenueData

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Financeiro</h1>
            <p className="text-gray-600 mt-1">Controle suas receitas e pagamentos</p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                
                // Redireciona para procedimentos com filtros ativados
                router.push('/procedimentos?status=pending,not_launched');
              }}
            >
              <Banknote className="w-4 h-4 mr-2" />
              Registrar Pagamento
            </Button>
          </div>
        </div>

        {/* Financial Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {financialData.map((item, index) => (
            <Card key={index} className="hover:shadow-lg transition-all duration-300 border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {item.title}
                </CardTitle>
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <item.icon className="h-4 w-4 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-2xl font-bold text-gray-900">{item.value}</div>
                <div className="flex items-center text-sm">
                  {item.changeType === 'positive' ? (
                    <ArrowUpRight className="h-4 w-4 text-emerald-600 mr-1" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={item.changeType === 'positive' ? 'text-emerald-600 font-medium' : 'text-red-500 font-medium'}>
                    {item.change}
                  </span>
                  <span className="text-gray-500 ml-1">vs mês anterior</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Meta Mensal */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Target className="w-5 h-5 text-emerald-600" />
                  Meta Mensal
                </CardTitle>
                <CardDescription>Configure e acompanhe sua meta de receita mensal</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowGoalModal(true)}
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Configurar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {monthlyGoal.isEnabled ? (
              <div className="space-y-4">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Progresso da Meta</span>
                    <span className="font-semibold text-emerald-600">
                      {currentProgress.percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-500 ${
                        currentProgress.isCompleted 
                          ? 'bg-green-500' 
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, currentProgress.percentage)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-emerald-50 rounded-lg">
                    <div className="text-2xl font-bold text-emerald-600">
                      {formatCurrency(currentProgress.currentValue)}
                    </div>
                    <div className="text-sm text-emerald-700">Arrecadado</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(monthlyGoal.targetValue)}
                    </div>
                    <div className="text-sm text-blue-700">Meta</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {formatCurrency(Math.max(0, monthlyGoal.targetValue - currentProgress.currentValue))}
                    </div>
                    <div className="text-sm text-orange-700">Restante</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {currentProgress.daysRemaining}
                    </div>
                    <div className="text-sm text-purple-700">Dias Restantes</div>
                  </div>
                </div>

                {/* Status */}
                {currentProgress.isCompleted && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-green-700 font-medium">
                      🎉 Parabéns! Você atingiu sua meta mensal!
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhuma meta configurada
                </h3>
                <p className="text-gray-600 mb-4">
                  Configure uma meta mensal para acompanhar seu progresso e receber notificações de conquista.
                </p>
                <Button 
                  onClick={() => setShowGoalModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Target className="w-4 h-4 mr-2" />
                  Configurar Meta
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Distribuição de Receitas</CardTitle>
              <CardDescription>Status dos pagamentos dos procedimentos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(props: any) => `${props.name} ${(props.percent * 100).toFixed(0)}%`}
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
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Evolução da Receita</CardTitle>
              <CardDescription>Últimos 6 meses de receitas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyRevenueData}>
                    <defs>
                      <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" stroke="#666" />
                    <YAxis stroke="#666" />
                    <Tooltip 
                      formatter={(value) => [formatCurrency(Number(value)), 'Receita']}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="receita" 
                      stroke="#14b8a6" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorReceita)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de Quantidade de Procedimentos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Quantidade de Procedimentos</CardTitle>
              <CardDescription>Distribuição dos procedimentos por status de pagamento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={procedureChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="status" 
                    stroke="#666"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#666"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                      fontSize: '14px'
                    }}
                    formatter={(value: any, name: any, props: any) => [
                      value, 
                      'Procedimentos',
                      { color: props.payload?.cor }
                    ]}
                    labelStyle={{ 
                      color: '#374151', 
                      fontWeight: '600',
                      fontSize: '14px'
                    }}
                    itemStyle={{ 
                      color: '#374151',
                      fontSize: '13px'
                    }}
                  />
                  <Bar 
                    dataKey="quantidade" 
                    radius={[4, 4, 0, 0]}
                  >
                    {procedureChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.cor} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
                {/* Resumo das Estatísticas */}
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {procedureChartData.map((item, index) => (
                    <div 
                      key={index} 
                      className={`text-center p-4 rounded-lg border ${item.bgColor} border-opacity-20 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105`}
                      onClick={() => {
                        // Mapear status para filtros
                        let filterParam = ''
                        switch(item.status) {
                          case 'Total':
                            filterParam = 'all'
                            break
                          case 'Pago':
                            filterParam = 'paid'
                            break
                          case 'Pendente':
                            filterParam = 'pending'
                            break
                          case 'Não Lançado':
                            filterParam = 'cancelled'
                            break
                          default:
                            filterParam = 'all'
                        }
                        
                        // Redirecionar para procedimentos com filtro
                        router.push(`/procedimentos?status=${filterParam}`)
                      }}
                    >
                      <div
                        className="w-4 h-4 rounded-full mx-auto mb-3 shadow-sm"
                        style={{ backgroundColor: item.cor }}
                      ></div>
                      <div className={`text-3xl font-bold ${item.textColor} mb-1`}>{item.quantidade}</div>
                      <div className={`text-sm font-medium ${item.textColor} opacity-80`}>{item.status}</div>
                    </div>
                  ))}
                </div>
          </CardContent>
        </Card>
        </div>

        {/* Modal de Configuração da Meta */}
        {showGoalModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Configurar Meta Mensal</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowGoalModal(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor da Meta
                  </label>
                  <input
                    type="text"
                    value={monthlyGoal.targetValue > 0 ? formatCurrency(monthlyGoal.targetValue) : ''}
                    onChange={(e) => {
                      // Remove tudo que não é dígito
                      const numericValue = e.target.value.replace(/\D/g, '')
                      // Converte para número (divide por 100 para considerar centavos)
                      const value = numericValue ? parseFloat(numericValue) / 100 : 0
                      setMonthlyGoal(prev => ({ ...prev, targetValue: value }))
                    }}
                    onFocus={(e) => {
                      // Se o campo estiver vazio, mostrar placeholder
                      if (e.target.value === '') {
                        e.target.placeholder = 'R$ 0,00'
                      }
                    }}
                    onBlur={(e) => {
                      // Se o campo estiver vazio, limpar placeholder
                      if (e.target.value === '') {
                        e.target.placeholder = ''
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="R$ 0,00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dia de Reinício do Mês
                  </label>
                  <select
                    value={monthlyGoal.resetDay}
                    onChange={(e) => setMonthlyGoal(prev => ({ ...prev, resetDay: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>
                        Dia {day}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="enableGoal"
                    checked={monthlyGoal.isEnabled}
                    onChange={(e) => setMonthlyGoal(prev => ({ ...prev, isEnabled: e.target.checked }))}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                  />
                  <label htmlFor="enableGoal" className="ml-2 block text-sm text-gray-700">
                    Ativar meta mensal
                  </label>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 p-6 border-t">
                <Button 
                  variant="outline"
                  onClick={() => setShowGoalModal(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={() => saveMonthlyGoal(monthlyGoal)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Salvar Meta
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Parabéns */}
        {showCongratsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full text-center">
              <div className="p-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  🎉 Parabéns!
                </h3>
                <p className="text-gray-600 mb-6">
                  Você atingiu sua meta mensal de <strong>{formatCurrency(monthlyGoal.targetValue)}</strong>!
                  <br />
                  Continue assim e mantenha o excelente trabalho!
                </p>
                <Button 
                  onClick={() => setShowCongratsModal(false)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Obrigado!
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

