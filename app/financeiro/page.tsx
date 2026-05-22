'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { DollarSign } from 'lucide-react'
import { TrendingUp } from 'lucide-react'
import { TrendingDown } from 'lucide-react'
import { CreditCard } from 'lucide-react'
import { Banknote } from 'lucide-react'
import { PieChart } from 'lucide-react'
import { Calendar } from 'lucide-react'
import { ArrowUpRight } from 'lucide-react'
import { ArrowDownRight } from 'lucide-react'
import { Target } from 'lucide-react'
import { Settings } from 'lucide-react'
import { CheckCircle } from 'lucide-react'
import { X } from 'lucide-react'
import { Layout } from '@/components/layout/Layout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { procedureService } from '@/lib/procedures'
import { goalService } from '@/lib/goals'
import { shiftService } from '@/lib/shifts'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency } from '@/lib/utils'

const FinanceiroCharts = dynamic(
  () => import('@/components/charts/FinanceiroCharts'),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-64 bg-gray-100 animate-pulse rounded-lg" />
          <div className="h-64 bg-gray-100 animate-pulse rounded-lg" />
        </div>
        <div className="h-64 bg-gray-100 animate-pulse rounded-lg" />
      </div>
    ),
  }
)

function FinanceiroContent() {
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
    resetDay: 30, // Padrão: último dia do mês
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
    if (monthlyGoal.isEnabled && user?.id) {
      // Verificar se precisa resetar a meta e recalcular progresso
      checkAndResetGoal(monthlyGoal)
      calculateProgress(monthlyGoal)
    }
  }, [stats.completedValue, monthlyGoal, user])

  const loadFinancialData = async () => {
    if (!user?.id) return
    
    setLoading(true)
    try {
      const [statsData, shiftStats] = await Promise.all([
        procedureService.getProcedureStats(user.id),
        shiftService.getShiftStats(user.id)
      ])
      
      // Combinar estatísticas de procedimentos e plantões
      const combinedStats = {
        total: statsData.total + shiftStats.total,
        completed: statsData.completed + shiftStats.completed,
        pending: statsData.pending + shiftStats.pending,
        cancelled: statsData.cancelled + shiftStats.cancelled,
        totalValue: statsData.totalValue + shiftStats.totalValue,
        completedValue: statsData.completedValue + shiftStats.completedValue,
        pendingValue: statsData.pendingValue + shiftStats.pendingValue
      }
      
      setStats(combinedStats)
      
      // Carregar dados dos procedimentos e plantões para o gráfico
      const [procedures, shifts] = await Promise.all([
        procedureService.getProcedures(user.id),
        shiftService.getShifts(user.id)
      ])
      calculateProcedureChartData(procedures, shifts)
      calculateMonthlyRevenueData(procedures, shifts)
    } catch (error) {
      
    } finally {
      setLoading(false)
    }
  }

  const calculateProcedureChartData = (procedures: any[], shifts: any[] = []) => {
    const procedureStats = {
      total: procedures.length,
      paid: procedures.filter(p => p.payment_status === 'paid').length,
      pending: procedures.filter(p => p.payment_status === 'pending').length,
      cancelled: procedures.filter(p => p.payment_status === 'cancelled').length
    }
    
    const shiftStats = {
      total: shifts.length,
      paid: shifts.filter(s => s.payment_status === 'paid').length,
      pending: shifts.filter(s => s.payment_status === 'pending').length,
      cancelled: shifts.filter(s => s.payment_status === 'cancelled').length
    }
    
    const stats = {
      total: procedureStats.total + shiftStats.total,
      paid: procedureStats.paid + shiftStats.paid,
      pending: procedureStats.pending + shiftStats.pending,
      cancelled: procedureStats.cancelled + shiftStats.cancelled
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
        status: 'Enviado',
        quantidade: procedures.filter(p => p.payment_status === 'sent').length,
        cor: '#2563eb', // blue-600
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-700'
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

  const calculateMonthlyRevenueData = (procedures: any[], shifts: any[] = []) => {
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
      if (procedure.payment_status === 'paid' && procedure.payment_date) {
        const paymentDate = new Date(procedure.payment_date)
        const monthIndex = months.findIndex(month => 
          month.date.getMonth() === paymentDate.getMonth() && 
          month.date.getFullYear() === paymentDate.getFullYear()
        )
        
        if (monthIndex !== -1) {
          months[monthIndex].receita += procedure.procedure_value || 0
        }
      }
    })

    // Calcular receita por mês baseada nos plantões pagos
    shifts.forEach(shift => {
      if (shift.payment_status === 'paid' && shift.payment_date) {
        const paymentDate = new Date(shift.payment_date)
        const monthIndex = months.findIndex(month => 
          month.date.getMonth() === paymentDate.getMonth() && 
          month.date.getFullYear() === paymentDate.getFullYear()
        )
        
        if (monthIndex !== -1) {
          months[monthIndex].receita += shift.shift_value || 0
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
          resetDay: goal.reset_day || 30, // Padrão: último dia do mês se não definido
          isEnabled: goal.is_enabled
        }
        setMonthlyGoal(goalData)
        calculateProgress(goalData)
      } else {
        // Se não há meta, usar padrão: último dia do mês (30)
        const defaultGoal = {
          targetValue: 0,
          resetDay: 30,
          isEnabled: false
        }
        setMonthlyGoal(defaultGoal)
      }
    } catch (error) {
      
    }
  }

  // Função para verificar e resetar a meta automaticamente
  const checkAndResetGoal = async (goal: any) => {
    if (!goal.isEnabled || !user?.id) return

    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const currentDay = now.getDate()
    
    // Calcular o dia de reset (último dia do mês se resetDay for 30)
    const resetDay = goal.resetDay === 30 ? new Date(currentYear, currentMonth + 1, 0).getDate() : goal.resetDay
    
    // Verificar se chegou o dia de reset
    const lastResetKey = `lastReset_${user.id}`
    const lastResetStr = localStorage.getItem(lastResetKey)
    let lastReset: Date | null = null
    
    if (lastResetStr) {
      try {
        lastReset = new Date(lastResetStr)
      } catch (e) {
        lastReset = null
      }
    }
    
    // Verificar se precisa resetar (se passou o dia de reset desde o último reset)
    const today = new Date(currentYear, currentMonth, currentDay)
    const shouldReset = !lastReset || (today >= new Date(currentYear, currentMonth, resetDay) && 
      (lastReset.getMonth() !== currentMonth || lastReset.getFullYear() !== currentYear || lastReset.getDate() < resetDay))
    
    // Se chegou o dia de reset e ainda não foi resetado neste período
    if (currentDay >= resetDay && shouldReset) {
      console.log(`🔄 Resetando meta no dia ${resetDay} do mês ${currentMonth + 1}/${currentYear}`)
      localStorage.setItem(lastResetKey, today.toISOString())
      // Recarregar dados financeiros para recalcular com novo período
      await loadFinancialData()
    }
  }

  const calculateProgress = async (goal: any) => {
    if (!goal.isEnabled || goal.targetValue === 0) return

    const now = new Date()
    const currentDay = now.getDate()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    
    // Calcular data de fim do período (próximo reset)
    let endDate: Date
    
    if (goal.resetDay === 30) {
      // Se resetDay é 30, usar o último dia do mês atual
      const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
      endDate = new Date(currentYear, currentMonth, lastDayOfMonth, 23, 59, 59, 999)
    } else {
      // Se o dia de reset já passou este mês, usar o próximo mês
      if (currentDay >= goal.resetDay) {
        // Próximo mês, no dia de reset
        endDate = new Date(currentYear, currentMonth + 1, goal.resetDay, 23, 59, 59, 999)
      } else {
        // Ainda não passou o dia de reset, usar este mês
        endDate = new Date(currentYear, currentMonth, goal.resetDay, 23, 59, 59, 999)
      }
    }
    
    // Calcular data de início do período atual (último reset)
    let startDate: Date
    
    if (goal.resetDay === 30) {
      // Se resetDay é 30, início é o último dia do mês anterior
      const lastDayOfPrevMonth = new Date(currentYear, currentMonth, 0).getDate()
      startDate = new Date(currentYear, currentMonth - 1, lastDayOfPrevMonth, 0, 0, 0, 0)
    } else {
      // Se o dia de reset já passou este mês, início foi no dia de reset do mês atual
      if (currentDay >= goal.resetDay) {
        startDate = new Date(currentYear, currentMonth, goal.resetDay, 0, 0, 0, 0)
      } else {
        // Ainda não passou, início foi no dia de reset do mês anterior
        startDate = new Date(currentYear, currentMonth - 1, goal.resetDay, 0, 0, 0, 0)
      }
    }
    
    // Calcular dias restantes até o fim do período
    const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    
    console.log(`📅 [FINANCEIRO] Cálculo de dias restantes:`, {
      hoje: now.toLocaleDateString('pt-BR'),
      diaAtual: currentDay,
      resetDay: goal.resetDay,
      inicioPeriodo: startDate.toLocaleDateString('pt-BR'),
      fimPeriodo: endDate.toLocaleDateString('pt-BR'),
      diasRestantes: daysRemaining
    })
    
    // Calcular valor atual do período (procedimentos e plantões pagos no período atual)
    let currentValue = 0
    try {
      const [procedures, shifts] = await Promise.all([
        procedureService.getProcedures(user.id),
        shiftService.getShifts(user.id)
      ])
      
      // Filtrar procedimentos pagos no período atual
      const periodProcedures = procedures.filter((proc: any) => {
        if (proc.payment_status !== 'paid' || !proc.payment_date) return false
        
        const paymentDate = new Date(proc.payment_date)
        return paymentDate >= startDate && paymentDate < endDate
      })
      
      // Somar valores dos procedimentos do período
      const proceduresValue = periodProcedures.reduce((sum: number, proc: any) => {
        return sum + (proc.procedure_value || 0)
      }, 0)
      
      // Filtrar plantões pagos no período atual
      const periodShifts = shifts.filter((shift: any) => {
        if (shift.payment_status !== 'paid' || !shift.payment_date) return false
        
        const paymentDate = new Date(shift.payment_date)
        return paymentDate >= startDate && paymentDate < endDate
      })
      
      // Somar valores dos plantões do período
      const shiftsValue = periodShifts.reduce((sum: number, shift: any) => {
        return sum + (shift.shift_value || 0)
      }, 0)
      
      currentValue = proceduresValue + shiftsValue
      
      console.log(`📊 Meta: Valor atual do período: R$ ${currentValue.toFixed(2)} (${periodProcedures.length} procedimentos + ${periodShifts.length} plantões)`)
    } catch (error) {
      console.error('Erro ao calcular valor do período:', error)
      // Fallback: usar valor total se houver erro
      currentValue = stats.completedValue
    }
    
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
                // Redireciona para procedimentos com filtros ativados para registrar pagamentos
                // Mostra apenas procedimentos pendentes (inclui cancelled) que precisam ter pagamento registrado
                router.push('/procedimentos?status=pending');
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
                <div className="text-xl sm:text-2xl font-bold text-gray-900 break-all">{item.value}</div>
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
                    <div className="text-xl sm:text-2xl font-bold text-emerald-600 break-all">
                      {formatCurrency(currentProgress.currentValue)}
                    </div>
                    <div className="text-sm text-emerald-700">Arrecadado</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-xl sm:text-2xl font-bold text-blue-600 break-all">
                      {formatCurrency(monthlyGoal.targetValue)}
                    </div>
                    <div className="text-sm text-blue-700">Meta</div>
                  </div>
                  <div className={`text-center p-3 rounded-lg ${currentProgress.currentValue >= monthlyGoal.targetValue ? 'bg-green-50' : 'bg-orange-50'}`}>
                    <div className={`text-xl sm:text-2xl font-bold break-all ${currentProgress.currentValue >= monthlyGoal.targetValue ? 'text-green-600' : 'text-orange-600'}`}>
                      {currentProgress.currentValue >= monthlyGoal.targetValue ? (
                        `+ ${formatCurrency(currentProgress.currentValue - monthlyGoal.targetValue)}`
                      ) : (
                        formatCurrency(monthlyGoal.targetValue - currentProgress.currentValue)
                      )}
                    </div>
                    <div className={`text-sm ${currentProgress.currentValue >= monthlyGoal.targetValue ? 'text-green-700 font-medium' : 'text-orange-700'}`}>
                      {currentProgress.currentValue >= monthlyGoal.targetValue ? 'Superado' : 'Restante'}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-xl sm:text-2xl font-bold text-purple-600">
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

        <FinanceiroCharts
          pieData={pieData}
          monthlyRevenueData={monthlyRevenueData}
          procedureChartData={procedureChartData}
          formatCurrency={formatCurrency}
        />

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
                    {Array.from({ length: 30 }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>
                        Dia {day.toString().padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Por padrão: último dia do mês (30). A meta será resetada automaticamente no dia selecionado.
                  </p>
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

export default function Financeiro() {
  return (
    <ProtectedRoute>
      <FinanceiroContent />
    </ProtectedRoute>
  )
}

