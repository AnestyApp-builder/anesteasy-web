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
  Activity,
  Plus,
  Target,
  X,
  Paperclip
} from 'lucide-react'
import { Layout } from '@/components/layout/Layout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { procedureService, ProcedureAttachment } from '@/lib/procedures'
import { goalService } from '@/lib/goals'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate, getFullGreeting, handleButtonPress, handleCardPress } from '@/lib/utils'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Loading } from '@/components/ui/Loading'
import { useRouter } from 'next/navigation'
import { isSecretaria } from '@/lib/user-utils'

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
  const [monthlyRevenue, setMonthlyRevenue] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [procedureAttachments, setProcedureAttachments] = useState<Record<string, ProcedureAttachment[]>>({})
  const [currentStatIndex, setCurrentStatIndex] = useState(0)
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
  const [showCalculationModal, setShowCalculationModal] = useState(false)
  const [calculationDetails, setCalculationDetails] = useState<{
    title: string
    description: string
    procedures: any[]
    totalValue: number
    period: string
  } | null>(null)
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)
  const [monthlyProcedures, setMonthlyProcedures] = useState<any[]>([])
  const { user } = useAuth()
  const router = useRouter()

  // Verificar se é secretária e redirecionar
  useEffect(() => {
    const checkIfSecretaria = async () => {
      if (user?.id) {
        try {
          // Timeout de 2 segundos para evitar travamento
          const timeoutPromise = new Promise<boolean>((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), 2000)
          })
          
          const secretariaPromise = isSecretaria(user.id)
          const secretaria = await Promise.race([secretariaPromise, timeoutPromise]) as boolean
          
          if (secretaria) {
            router.push('/secretaria/dashboard')
            return
          }
        } catch (error) {
          // Se der timeout, continuar como anestesista
          console.warn('⚠️ Erro ao verificar secretária no dashboard, continuando:', error)
        }
        
        // Só carregar dados se não for secretária
        loadDashboardData()
        loadMonthlyGoal()
      }
    }
    checkIfSecretaria()
  }, [user, router])

  // Verificar se precisa resetar a meta e recalcular progresso
  useEffect(() => {
    if (monthlyGoal.isEnabled && user?.id) {
      checkAndResetGoal(monthlyGoal)
      calculateProgress(monthlyGoal)
    }
  }, [stats.completedValue, monthlyGoal, user])

  // Função para atualizar o índice atual baseado no scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget
    const scrollLeft = container.scrollLeft
    const cardWidth = 280 + 16 // min-w-[280px] + gap-4
    const newIndex = Math.round(scrollLeft / cardWidth)
    setCurrentStatIndex(Math.min(newIndex, dashboardStats.length - 1))
  }

  const loadDashboardData = async () => {
    if (!user?.id) return
    
    setLoading(true)
    try {
      // Timeout de 10 segundos para evitar travamento
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout ao carregar dados do dashboard')), 10000)
      })
      
      const dataPromise = Promise.all([
        procedureService.getProcedureStats(user.id),
        procedureService.getProcedures(user.id)
      ])
      
      const [statsData, proceduresData] = await Promise.race([dataPromise, timeoutPromise])
      
      setStats(statsData)
      setRecentProcedures(proceduresData.slice(0, 5))
      
      // Filtrar procedimentos do mês atual para os detalhes
      const now = new Date()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()
      const monthStart = new Date(currentYear, currentMonth, 1)
      const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999)
      
      const monthlyProcs = proceduresData.filter((proc: any) => {
        if (!proc.procedure_date) return false
        const procDate = new Date(proc.procedure_date)
        return procDate >= monthStart && procDate <= monthEnd
      })
      setMonthlyProcedures(monthlyProcs)
      
      // Carregar anexos para os procedimentos recentes (com timeout individual)
      const attachmentsMap: Record<string, ProcedureAttachment[]> = {}
      for (const procedure of proceduresData.slice(0, 5)) {
        try {
          const attachmentTimeout = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), 3000)
          })
          const procedureAttachments = await Promise.race([
            procedureService.getAttachments(procedure.id),
            attachmentTimeout
          ]) as ProcedureAttachment[]
          attachmentsMap[procedure.id] = procedureAttachments
        } catch (error) {
          console.warn(`⚠️ Erro ao carregar anexos do procedimento ${procedure.id}:`, error)
          attachmentsMap[procedure.id] = []
        }
      }
      setProcedureAttachments(attachmentsMap)
      
      // Calcular receita mensal dos últimos 6 meses
      const monthlyData = await calculateMonthlyRevenue(proceduresData)
      setMonthlyRevenue(monthlyData)
    } catch (error: any) {
      console.error('❌ Erro ao carregar dados do dashboard:', error)
      // Em caso de erro, manter dados vazios mas não travar
      setStats({
        total: 0,
        completed: 0,
        pending: 0,
        cancelled: 0,
        totalValue: 0,
        completedValue: 0,
        pendingValue: 0
      })
      setRecentProcedures([])
      setMonthlyRevenue([])
    } finally {
      setLoading(false)
    }
  }

  const loadMonthlyGoal = async () => {
    if (!user?.id) return
    
    try {
      // Primeiro tentar carregar do Supabase
      const goal = await goalService.getGoal(user.id)
      
      if (goal) {
        // Converter formato do banco para formato do estado
        const goalData = {
          targetValue: goal.target_value,
          resetDay: goal.reset_day || 30, // Padrão: último dia do mês se não definido
          isEnabled: goal.is_enabled
        }
        setMonthlyGoal(goalData)
        // O useEffect irá calcular o progresso automaticamente quando monthlyGoal mudar
      } else {
        // Se não encontrar no banco, tentar migrar do localStorage
        const migratedGoal = await goalService.migrateFromLocalStorage(user.id)
        if (migratedGoal) {
          const goalData = {
            targetValue: migratedGoal.target_value,
            resetDay: migratedGoal.reset_day || 30, // Padrão: último dia do mês
            isEnabled: migratedGoal.is_enabled
          }
          setMonthlyGoal(goalData)
          // O useEffect irá calcular o progresso automaticamente quando monthlyGoal mudar
        } else {
          // Se não há meta, usar padrão: último dia do mês (30)
          setMonthlyGoal({
            targetValue: 0,
            resetDay: 30,
            isEnabled: false
          })
        }
      }
    } catch (error) {
      
    }
  }

  const saveMonthlyGoal = async (goal: any) => {
    if (!user?.id) return
    
    try {
      // Salvar no Supabase
      const goalData = {
        user_id: user.id,
        target_value: goal.targetValue,
        reset_day: goal.resetDay,
        is_enabled: goal.isEnabled
      }
      
      const savedGoal = await goalService.saveGoal(goalData)
      
      if (savedGoal) {
        setMonthlyGoal(goal)
        setShowGoalModal(false)
      } else {
        
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
      console.log(`🔄 [DASHBOARD] Resetando meta no dia ${resetDay} do mês ${currentMonth + 1}/${currentYear}`)
      localStorage.setItem(lastResetKey, today.toISOString())
      // Recarregar dados do dashboard para recalcular com novo período
      await loadDashboardData()
    }
  }

  // Função para calcular o progresso da meta baseado no período
  const calculateProgress = async (goal: any) => {
    if (!goal.isEnabled || goal.targetValue === 0 || !user?.id) {
      setCurrentProgress({
        currentValue: 0,
        percentage: 0,
        daysRemaining: 0,
        isCompleted: false
      })
      return
    }

    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    
    // Calcular data de início do período atual baseado no resetDay
    // Se o resetDay é 30, considerar como último dia do mês
    let startDate = new Date(currentYear, currentMonth, goal.resetDay)
    
    // Ajustar para último dia do mês se resetDay for 30
    if (goal.resetDay === 30) {
      // Último dia do mês atual
      const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
      startDate = new Date(currentYear, currentMonth, lastDayOfMonth)
    }
    
    // Se a data de reset ainda não chegou este mês, usar o mês anterior
    if (startDate > now) {
      if (goal.resetDay === 30) {
        // Último dia do mês anterior
        const lastDayOfPrevMonth = new Date(currentYear, currentMonth, 0).getDate()
        startDate = new Date(currentYear, currentMonth - 1, lastDayOfPrevMonth)
      } else {
        startDate = new Date(currentYear, currentMonth - 1, goal.resetDay)
      }
    }
    
    // Calcular data de fim do período (próximo reset)
    const endDate = new Date(startDate)
    if (goal.resetDay === 30) {
      // Próximo último dia do mês
      const nextMonth = endDate.getMonth() + 1
      const nextYear = endDate.getFullYear()
      const lastDayOfNextMonth = new Date(nextYear, nextMonth + 1, 0).getDate()
      endDate.setMonth(nextMonth)
      endDate.setDate(lastDayOfNextMonth)
    } else {
      endDate.setMonth(endDate.getMonth() + 1)
      endDate.setDate(goal.resetDay)
    }
    
    // Calcular dias restantes
    const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    
    // Calcular valor atual do período (apenas procedimentos pagos no período atual)
    let currentValue = 0
    try {
      const procedures = await procedureService.getProcedures(user.id)
      
      // Filtrar procedimentos pagos no período atual
      const periodProcedures = procedures.filter((proc: any) => {
        if (proc.payment_status !== 'paid' || !proc.payment_date) return false
        
        const paymentDate = new Date(proc.payment_date)
        return paymentDate >= startDate && paymentDate < endDate
      })
      
      // Somar valores dos procedimentos do período
      currentValue = periodProcedures.reduce((sum: number, proc: any) => {
        return sum + (proc.procedure_value || 0)
      }, 0)
      
      console.log(`📊 [DASHBOARD] Meta: Valor atual do período: R$ ${currentValue.toFixed(2)} (${periodProcedures.length} procedimentos)`)
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
  }

  // Função para calcular receita mensal
  const calculateMonthlyRevenue = async (procedures: any[]) => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    const currentDate = new Date()
    const monthlyData = []

    // Calcular os últimos 6 meses incluindo o mês atual
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1)
      const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0)
      
      let monthRevenue = 0
      
      // Processar cada procedimento
      for (const procedure of procedures) {
        const isParcelado = procedure.payment_method === 'Parcelado' || procedure.forma_pagamento === 'Parcelado'
        
        if (isParcelado) {
          // Para procedimentos parcelados, somar apenas as parcelas recebidas no mês
          const parcelas = await procedureService.getParcelas(procedure.id)
          const parcelasDoMes = parcelas.filter(parcela => {
            if (!parcela.recebida || !parcela.data_recebimento) return false
            const dataRecebimento = new Date(parcela.data_recebimento)
            return dataRecebimento >= monthStart && dataRecebimento <= monthEnd
          })
          
          const valorDoMes = parcelasDoMes.reduce((sum, parcela) => {
            return sum + (parcela.valor_parcela || 0)
          }, 0)
          
          monthRevenue += valorDoMes
        } else {
          // Para procedimentos não parcelados, usar payment_date
          if (procedure.payment_date) {
            const paymentDate = new Date(procedure.payment_date)
            if (paymentDate >= monthStart && paymentDate <= monthEnd) {
              monthRevenue += (procedure.procedure_value || 0)
            }
          }
        }
      }
      
      monthlyData.push({
        name: months[targetDate.getMonth()],
        value: monthRevenue
      })
    }
    
    return monthlyData
  }

  // Função para calcular status das parcelas
  const getParcelStatus = (procedure: any) => {
    if (procedure.payment_method !== 'Parcelado' && procedure.forma_pagamento !== 'Parcelado') {
      return null
    }
    
    const totalParcelas = procedure.numero_parcelas || 0
    const parcelasRecebidas = procedure.parcelas_recebidas || 0
    
    return `${parcelasRecebidas}/${totalParcelas}`
  }

  // Função para obter cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-500 text-white shadow-sm'
      case 'pending':
        return 'bg-amber-500 text-white shadow-sm'
      case 'cancelled':
        return 'bg-red-500 text-white shadow-sm'
      default:
        return 'bg-red-500 text-white shadow-sm'
    }
  }

  // Função para obter texto do status
  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Pago'
      case 'pending':
        return 'Pendente'
      case 'cancelled':
        return 'Aguardando'
      default:
        return 'Aguardando'
    }
  }

  const handleProcedureClick = (procedure: any) => {
    // Redirecionar para a página de procedimentos com o ID do procedimento
    window.location.href = `/procedimentos?procedureId=${procedure.id}`
  }



  const pieData = [
    { name: 'Concluídos', value: stats.completed, color: '#10b981' },
    { name: 'Pendentes', value: stats.pending, color: '#f59e0b' },
    { name: 'Não Lançados', value: stats.cancelled, color: '#ef4444' }
  ]

  // Calcular valores mensais para os cards
  const calculateMonthlyStats = () => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const monthStart = new Date(currentYear, currentMonth, 1)
    const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999)
    
    // Filtrar procedimentos do mês atual
    const monthlyProcs = monthlyProcedures.filter((proc: any) => {
      if (!proc.procedure_date) return false
      const procDate = new Date(proc.procedure_date)
      return procDate >= monthStart && procDate <= monthEnd
    })
    
    // Calcular receita recebida (procedimentos pagos)
    const paidProcedures = monthlyProcs.filter((p: any) => p.payment_status === 'paid')
    const receivedValue = paidProcedures.reduce((sum: number, p: any) => {
      return sum + (p.procedure_value || 0)
    }, 0)
    
    // Calcular receita pendente (procedimentos pendentes)
    const pendingProcedures = monthlyProcs.filter((p: any) => p.payment_status === 'pending')
    const pendingValue = pendingProcedures.reduce((sum: number, p: any) => {
      return sum + (p.procedure_value || 0)
    }, 0)
    
    // Total de procedimentos do mês
    const totalMonthly = monthlyProcs.length
    
    // Procedimentos concluídos do mês
    const completedMonthly = paidProcedures.length
    
    return {
      receivedValue,
      pendingValue,
      totalMonthly,
      completedMonthly,
      paidProcedures,
      pendingProcedures,
      monthlyProcs
    }
  }

  const monthlyStats = calculateMonthlyStats()

  // Função para preparar detalhes do cálculo
  const prepareCalculationDetails = (statKey: string) => {
    const now = new Date()
    const monthName = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    
    switch (statKey) {
      case 'received':
        return {
          title: 'Receita Total (mensal) - Recebida',
          description: `Soma dos valores de todos os procedimentos pagos realizados em ${monthName}`,
          procedures: monthlyStats.paidProcedures,
          totalValue: monthlyStats.receivedValue,
          period: monthName
        }
      case 'pending':
        return {
          title: 'Receita Total (mensal) - Pendente',
          description: `Soma dos valores de todos os procedimentos pendentes realizados em ${monthName}`,
          procedures: monthlyStats.pendingProcedures,
          totalValue: monthlyStats.pendingValue,
          period: monthName
        }
      case 'total':
        return {
          title: 'Procedimentos (mensal) - Total',
          description: `Total de procedimentos realizados em ${monthName}`,
          procedures: monthlyStats.monthlyProcs,
          totalValue: monthlyStats.totalMonthly,
          period: monthName
        }
      case 'completed':
        return {
          title: 'Procedimentos Realizados - Concluídos',
          description: `Total de procedimentos pagos realizados em ${monthName}`,
          procedures: monthlyStats.paidProcedures,
          totalValue: monthlyStats.completedMonthly,
          period: monthName
        }
      default:
        return null
    }
  }

  // Handlers para long press
  const handleLongPressStart = (statKey: string) => {
    const timer = setTimeout(() => {
      const details = prepareCalculationDetails(statKey)
      if (details) {
        setCalculationDetails(details)
        setShowCalculationModal(true)
      }
    }, 500) // 500ms para ativar o long press
    setLongPressTimer(timer)
  }

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }

  const dashboardStats = [
    {
      title: 'Receita Total (mensal)',
      value: formatCurrency(monthlyStats.receivedValue),
      change: 'Recebida',
      changeType: 'positive' as const,
      icon: DollarSign,
      statKey: 'received'
    },
    {
      title: 'Receita Total (mensal)',
      value: formatCurrency(monthlyStats.pendingValue),
      change: 'Pendente',
      changeType: 'neutral' as const,
      icon: DollarSign,
      statKey: 'pending'
    },
    {
      title: 'Procedimentos (mensal)',
      value: monthlyStats.totalMonthly.toString(),
      change: 'Total',
      changeType: 'positive' as const,
      icon: FileText,
      statKey: 'total'
    },
    {
      title: 'Procedimentos Realizados',
      value: monthlyStats.completedMonthly.toString(),
      change: 'Concluídos',
      changeType: 'positive' as const,
      icon: Users,
      statKey: 'completed'
    }
  ]

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-base sm:text-lg text-gray-600 mt-1 font-medium">{getFullGreeting(user?.name, user?.gender)}</p>
            </div>
            <div className="mt-4 sm:mt-0 hidden lg:block">
              <Link href="/procedimentos/novo">
                <Button 
                  onClick={() => handleButtonPress(undefined, 'medium')}
                  className="text-base sm:text-lg font-semibold px-6 py-3"
                >
                  <Calendar className="w-5 h-5 mr-2" />
                  Novo Procedimento
                </Button>
              </Link>
            </div>
          </div>

        {/* Stats Grid - Mobile Carousel */}
        <div className="lg:hidden">
          <div 
            className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide"
            style={{
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
            onScroll={handleScroll}
          >
            {dashboardStats.map((stat, index) => (
              <Card 
                key={index} 
                className="min-w-[280px] flex-shrink-0 hover:shadow-lg transition-all duration-300 cursor-pointer select-none"
                onMouseDown={() => handleLongPressStart(stat.statKey)}
                onMouseUp={handleLongPressEnd}
                onMouseLeave={handleLongPressEnd}
                onTouchStart={() => handleLongPressStart(stat.statKey)}
                onTouchEnd={handleLongPressEnd}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-gray-700 truncate">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className="h-5 w-5 text-gray-500 flex-shrink-0" />
                </CardHeader>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-gray-900 truncate">
                    {stat.value}
                  </div>
                  <div className="flex items-center text-sm">
                    {stat.changeType === 'positive' ? (
                      <ArrowUpRight className="h-4 w-4 text-green-600 mr-1 flex-shrink-0" />
                    ) : stat.changeType === 'neutral' ? (
                      <Activity className="h-4 w-4 text-amber-600 mr-1 flex-shrink-0" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-red-600 mr-1 flex-shrink-0" />
                    )}
                    <span className={`${
                      stat.changeType === 'positive' ? 'text-green-600' : 
                      stat.changeType === 'neutral' ? 'text-amber-600' : 'text-red-600'
                    } truncate font-medium`}>
                      {stat.change}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          
          {/* Indicadores de paginação */}
          <div className="flex justify-center items-center gap-1 mt-3 mb-2">
            {dashboardStats.map((_, index) => (
              <div 
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  index === currentStatIndex ? 'bg-teal-600' : 'bg-gray-300'
                }`}
              ></div>
            ))}
          </div>
          
          {/* Dica de texto */}
          <p className="text-xs text-gray-400 text-center">
            Deslize para o lado
          </p>
        </div>

        {/* Progress Bar - Meta */}
        {monthlyGoal.isEnabled && monthlyGoal.targetValue > 0 ? (
          <div className="space-y-3">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Meta Mensal</span>
                <span className="text-sm font-semibold text-teal-600">
                  {formatCurrency(currentProgress.currentValue || stats.completedValue)} / {formatCurrency(monthlyGoal.targetValue)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-teal-500 to-teal-600 h-3 rounded-full transition-all duration-500 ease-out"
                  style={{ 
                    width: `${Math.min(((currentProgress.currentValue || stats.completedValue) / monthlyGoal.targetValue) * 100, 100)}%` 
                  }}
                ></div>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-500">
                  {Math.round(((currentProgress.currentValue || stats.completedValue) / monthlyGoal.targetValue) * 100)}% concluído
                </span>
                <span className="text-xs text-gray-500">
                  {(currentProgress.currentValue || stats.completedValue) >= monthlyGoal.targetValue ? 'Meta atingida!' : 
                   `Faltam ${formatCurrency(monthlyGoal.targetValue - (currentProgress.currentValue || stats.completedValue))}`}
                </span>
              </div>
            </div>
            <p className="text-center text-sm text-gray-500 font-medium">Meta</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-gradient-to-r from-teal-50 to-teal-100 rounded-lg p-4 border border-teal-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-teal-600" />
                  <span className="text-sm font-medium text-teal-800">Meta Mensal</span>
                </div>
                <span className="text-xs text-teal-600 font-medium">Não configurada</span>
              </div>
              <p className="text-sm text-teal-700 mb-3">
                Configure uma meta mensal para acompanhar seu progresso e receber notificações de conquista.
              </p>
              <Button 
                size="sm"
                className="bg-teal-600 hover:bg-teal-700 text-white text-xs"
                onClick={() => handleButtonPress(() => setShowGoalModal(true), 'light')}
              >
                <Target className="w-4 h-4 mr-1" />
                Ativar Meta
              </Button>
            </div>
            <p className="text-center text-sm text-gray-500 font-medium">Meta</p>
          </div>
        )}


        {/* Stats Grid - Desktop */}
        <div className="hidden lg:grid grid-cols-4 gap-6">
          {dashboardStats.map((stat, index) => (
            <Card 
              key={index} 
              className="hover:shadow-lg transition-all duration-300 cursor-pointer select-none"
              onMouseDown={() => handleLongPressStart(stat.statKey)}
              onMouseUp={handleLongPressEnd}
              onMouseLeave={handleLongPressEnd}
              onTouchStart={() => handleLongPressStart(stat.statKey)}
              onTouchEnd={handleLongPressEnd}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700 truncate">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-5 w-5 text-gray-500 flex-shrink-0" />
              </CardHeader>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-gray-900 truncate">
                  {stat.value}
                </div>
                <div className="flex items-center text-sm">
                  {stat.changeType === 'positive' ? (
                    <ArrowUpRight className="h-4 w-4 text-green-600 mr-1 flex-shrink-0" />
                  ) : stat.changeType === 'neutral' ? (
                    <Activity className="h-4 w-4 text-amber-600 mr-1 flex-shrink-0" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-600 mr-1 flex-shrink-0" />
                  )}
                  <span className={`${
                    stat.changeType === 'positive' ? 'text-green-600' : 
                    stat.changeType === 'neutral' ? 'text-amber-600' : 'text-red-600'
                  } truncate font-medium`}>
                    {stat.change}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>


        {/* Charts and Recent Activity */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
          {/* Revenue Chart */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Receita dos Últimos 6 Meses</CardTitle>
            </CardHeader>
            <div className="p-3 sm:p-4 lg:p-6">
              <div className="h-48 sm:h-56 lg:h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyRevenue} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid 
                      strokeDasharray="2 4" 
                      stroke="#e5e7eb" 
                      strokeOpacity={0.6}
                    />
                    <XAxis 
                      dataKey="name" 
                      fontSize={12}
                      tick={{ fontSize: 11 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      fontSize={12}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) => {
                        if (value >= 1000000) {
                          return `R$ ${(value / 1000000).toFixed(1)}M`
                        } else if (value >= 1000) {
                          return `R$ ${(value / 1000).toFixed(0)}k`
                        } else {
                          return `R$ ${value.toFixed(0)}`
                        }
                      }}
                    />
                    <Tooltip 
                      formatter={(value, name, props) => [
                        formatCurrency(Number(value)), 
                        'Receita Recebida'
                      ]}
                      labelFormatter={(label) => `Mês: ${label}`}
                      contentStyle={{
                        fontSize: '12px',
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        backgroundColor: 'white',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#14b8a6" 
                      strokeWidth={3}
                      dot={{ 
                        fill: '#14b8a6', 
                        strokeWidth: 2, 
                        r: 5,
                        stroke: '#ffffff'
                      }}
                      activeDot={{ 
                        r: 7, 
                        stroke: '#14b8a6', 
                        strokeWidth: 3,
                        fill: '#ffffff'
                      }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>

          {/* Status Distribution */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Distribuição por Status</CardTitle>
            </CardHeader>
            <div className="p-3 sm:p-4 lg:p-6">
              <div className="h-48 sm:h-56 lg:h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(props: any) => {
                        if (props.percent === 0) return null
                        return `${props.name} ${(props.percent * 100).toFixed(0)}%`
                      }}
                      outerRadius={60}
                      innerRadius={20}
                      fill="#8884d8"
                      dataKey="value"
                      fontSize={11}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name) => [value, name]}
                      contentStyle={{
                        fontSize: '12px',
                        padding: '8px',
                        borderRadius: '6px',
                        border: '1px solid #e5e7eb'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Legend for mobile */}
              <div className="mt-4 flex flex-wrap justify-center gap-3 sm:hidden">
                {pieData.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-xs text-gray-600">{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Procedures */}
        <div>
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Procedimentos Recentes</h2>
            <Link 
              href="/procedimentos" 
              className="text-green-600 hover:text-green-700 font-medium text-sm sm:text-base transition-colors duration-200"
            >
              Ver mais
            </Link>
          </div>
            {loading ? (
              <Loading text="Carregando dados..." />
            ) : recentProcedures.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Nenhum procedimento encontrado</p>
                <p className="text-sm text-gray-500 mt-1">Comece criando seu primeiro procedimento</p>
              </div>
            ) : (
            <div className="space-y-3 sm:space-y-4">
                {recentProcedures.map((procedure) => (
                  <div 
                    key={procedure.id} 
                  className="group relative overflow-hidden bg-white rounded-xl border border-gray-200/50 shadow-sm hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-300/50 cursor-pointer transition-all duration-300 ease-in-out transform hover:-translate-y-1"
                  onClick={() => handleCardPress(() => handleProcedureClick(procedure))}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-gray-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  {/* Mobile Layout */}
                  <div className="lg:hidden relative p-4">
                    <div className="flex flex-col gap-3">
                      {/* Primeira linha: Nome + Status */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="w-12 h-12 bg-gradient-to-br from-teal-100 to-teal-200 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                            <FileText className="w-6 h-6 text-teal-700" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <p className="font-semibold text-gray-900 text-base truncate">
                                {procedure.patient_name || 'Nome não informado'}
                              </p>
                              {procedureAttachments[procedure.id] && procedureAttachments[procedure.id].length > 0 && (
                                <Paperclip className="w-4 h-4 text-blue-500 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600 truncate font-medium mb-1">
                              {procedure.procedure_name || procedure.procedure_type || 'Procedimento não informado'}
                            </p>
                            {getParcelStatus(procedure) && (
                              <p className="text-xs text-teal-600 font-medium bg-teal-50 px-2 py-1 rounded-full inline-block">
                                Parcelas: {getParcelStatus(procedure)}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className={`inline-flex px-3 py-1.5 text-xs font-semibold rounded-full shadow-sm ${getStatusColor(procedure.payment_status || 'cancelled')}`}>
                          {getStatusText(procedure.payment_status || 'cancelled')}
                        </span>
                      </div>
                      
                      {/* Segunda linha: Valor + Data */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <DollarSign className="w-5 h-5 mr-2 text-gray-600" />
                          <span className="font-bold text-gray-900 text-lg">{formatCurrency(procedure.procedure_value || 0)}</span>
                        </div>
                        <div className="text-sm text-gray-500 font-medium">
                          {formatDate(procedure.procedure_date)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden lg:flex flex-col relative p-6">
                    {/* Primeira linha: Nome + Status */}
                    <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-teal-100 to-teal-200 rounded-xl flex items-center justify-center shadow-sm">
                          <FileText className="w-6 h-6 text-teal-700" />
                      </div>
                      <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <p className="font-semibold text-gray-900 text-lg">
                              {procedure.patient_name || 'Nome não informado'}
                            </p>
                            {procedureAttachments[procedure.id] && procedureAttachments[procedure.id].length > 0 && (
                              <Paperclip className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 font-medium mb-1">
                            {procedure.procedure_name || procedure.procedure_type || 'Procedimento não informado'}
                          </p>
                          {getParcelStatus(procedure) && (
                            <p className="text-xs text-teal-600 font-medium bg-teal-50 px-2 py-1 rounded-full inline-block">
                              Parcelas: {getParcelStatus(procedure)}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className={`inline-flex px-3 py-1.5 text-xs font-semibold rounded-full shadow-sm ${getStatusColor(procedure.payment_status || 'cancelled')}`}>
                        {getStatusText(procedure.payment_status || 'cancelled')}
                      </span>
                    </div>
                    
                    {/* Segunda linha: Informações + Valor */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-6 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {formatDate(procedure.procedure_date)}
                      </div>
                    </div>
                      <div className="flex items-center space-x-4">
                    <div className="text-right">
                          <p className="font-bold text-gray-900 text-xl flex items-center justify-end">
                            <DollarSign className="w-5 h-5 mr-2 text-gray-600" />
                        {formatCurrency(procedure.procedure_value || 0)}
                      </p>
                        </div>
                      </div>
                    </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>


      </div>

      {/* Modal de Configuração da Meta */}
      {showGoalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-teal-200 bg-teal-50">
              <h3 className="text-lg font-semibold text-teal-800">Configurar Meta Mensal</h3>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
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
                  className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                />
                <label htmlFor="enableGoal" className="ml-2 block text-sm text-gray-700">
                  Ativar meta mensal
                </label>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 p-6 border-t border-teal-200">
              <Button 
                variant="outline"
                onClick={() => setShowGoalModal(false)}
              >
                Cancelar
              </Button>
              <Button 
                onClick={() => saveMonthlyGoal(monthlyGoal)}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                Salvar Meta
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button - Mobile Only */}
      <div className="fixed bottom-6 right-6 z-50 lg:hidden">
        <Link href="/procedimentos/novo">
          <button 
            className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 bg-teal-600 hover:bg-teal-700 text-white border-0 flex items-center justify-center"
            onClick={() => handleButtonPress(undefined, 'medium')}
          >
            <Plus className="w-7 h-7 stroke-2" />
          </button>
        </Link>
      </div>

      {/* Modal de Detalhes do Cálculo */}
      {showCalculationModal && calculationDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]" onClick={() => setShowCalculationModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{calculationDetails.title}</h2>
                <p className="text-sm text-gray-600 mt-1">{calculationDetails.description}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCalculationModal(false)}
                className="ml-4"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-4 p-4 bg-teal-50 rounded-lg border border-teal-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-teal-800">Período:</span>
                  <span className="text-sm font-semibold text-teal-900 capitalize">{calculationDetails.period}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-medium text-teal-800">
                    {calculationDetails.title.includes('Receita') ? 'Total:' : 'Quantidade:'}
                  </span>
                  <span className="text-lg font-bold text-teal-900">
                    {calculationDetails.title.includes('Receita') 
                      ? formatCurrency(calculationDetails.totalValue)
                      : calculationDetails.totalValue}
                  </span>
                </div>
              </div>

              {calculationDetails.procedures.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700">
                    Procedimentos ({calculationDetails.procedures.length}):
                  </h3>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {calculationDetails.procedures.map((proc: any, idx: number) => (
                      <div key={proc.id || idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {proc.patient_name || 'Paciente não informado'}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              {proc.procedure_type || 'Tipo não informado'}
                            </p>
                            {proc.procedure_date && (
                              <p className="text-xs text-gray-500 mt-1">
                                {formatDate(proc.procedure_date)}
                              </p>
                            )}
                          </div>
                          {calculationDetails.title.includes('Receita') && (
                            <div className="ml-4 text-right">
                              <p className="text-sm font-semibold text-teal-600">
                                {formatCurrency(proc.procedure_value || 0)}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {proc.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Nenhum procedimento encontrado para este período.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  💡 Dica: Clique e segure em qualquer card para ver os detalhes do cálculo
                </p>
                <Button
                  onClick={() => setShowCalculationModal(false)}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
    </ProtectedRoute>
  )
}
