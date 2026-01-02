'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
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
  Paperclip,
  Settings,
  Loader2,
  ArrowRight,
  Zap,
  AlertCircle
} from 'lucide-react'
import { Layout } from '@/components/layout/Layout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { procedureService, ProcedureAttachment } from '@/lib/procedures'
import { goalService } from '@/lib/goals'
import { shiftService } from '@/lib/shifts'
import { useAuth } from '@/contexts/AuthContext'
import { useSecretaria } from '@/contexts/SecretariaContext'
import { formatCurrency, formatDate, getFullGreeting, handleButtonPress, handleCardPress, retryWithTimeout } from '@/lib/utils'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Loading } from '@/components/ui/Loading'
import { SkeletonStatsCard, SkeletonChart, SkeletonProcedureList } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useRouter } from 'next/navigation'

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
  const [isSavingGoal, setIsSavingGoal] = useState(false)
  const [goalError, setGoalError] = useState<string | null>(null)
  const [calculationDetails, setCalculationDetails] = useState<{
    title: string
    description: string
    procedures: any[]
    totalValue: number
    period: string
  } | null>(null)
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)
  const [monthlyProcedures, setMonthlyProcedures] = useState<any[]>([])
  const [monthlyShifts, setMonthlyShifts] = useState<any[]>([])
  const [allProcedures, setAllProcedures] = useState<any[]>([])
  const [allShifts, setAllShifts] = useState<any[]>([])
  const [monthlyStats, setMonthlyStats] = useState<any>({
    receivedValue: 0,
    pendingValue: 0,
    totalMonthly: 0,
    completedMonthly: 0,
    paidProcedures: [],
    pendingProcedures: [],
    monthlyProcs: [],
    totalMonthlyShifts: 0,
    completedMonthlyShifts: 0,
    paidShifts: [],
    pendingShifts: [],
    monthlyShiftsFiltered: []
  })
  const { user } = useAuth()
  const { secretaria, isLoading: secretariaLoading } = useSecretaria()
  const router = useRouter()
  

  // Verificar cache de autenticação e redirecionar se necessário
  useEffect(() => {
    if (user?.id) {
      // Verificar cache local para decisão rápida
      const cachedAuth = localStorage.getItem('auth_cache')
      if (cachedAuth) {
        try {
          const cached = JSON.parse(cachedAuth)
          if (cached.role === 'secretaria') {
            router.push('/secretaria/dashboard')
            return
          }
        } catch (error) {
          // Cache inválido, continuar
        }
      }
      
      // Carregar dados em paralelo
      Promise.all([
        loadDashboardData(),
        loadMonthlyGoal()
      ]).catch((error) => {
        console.error('Erro ao carregar dados do dashboard:', error)
      })
    }
  }, [user, router])

  // Verificar se precisa resetar a meta e recalcular progresso
  useEffect(() => {
    if (monthlyGoal.isEnabled && user?.id) {
      checkAndResetGoal(monthlyGoal)
      calculateProgress(monthlyGoal)
    }
  }, [monthlyStats.receivedValue, monthlyGoal, user])

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
      // Usar retry com timeout padronizado de 7s
      const [statsData, proceduresData, shiftStats, shiftsData] = await retryWithTimeout(
        () => Promise.all([
          procedureService.getProcedureStats(user.id),
          procedureService.getProcedures(user.id),
          shiftService.getShiftStats(user.id),
          shiftService.getShifts(user.id)
        ]),
        {
          maxRetries: 2,
          timeout: 7000, // Padronizado para 7 segundos
          delay: 500,
          onRetry: () => {
            // Retry de carregamento de dados
          }
        }
      )
      
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
      setRecentProcedures(proceduresData.slice(0, 5))
      
      // Armazenar todos os procedimentos e plantões para cálculos totais
      setAllProcedures(proceduresData)
      setAllShifts(shiftsData)
      
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

      // Filtrar plantões do mês atual
      const monthlyShiftsData = shiftsData.filter((shift: any) => {
        if (!shift.start_date) return false
        const shiftDate = new Date(shift.start_date)
        return shiftDate >= monthStart && shiftDate <= monthEnd
      })
      setMonthlyShifts(monthlyShiftsData)
      
      // Carregar anexos para os procedimentos recentes em paralelo (com retry individual)
      const attachmentsMap: Record<string, ProcedureAttachment[]> = {}
      const attachmentPromises = proceduresData.slice(0, 5).map(async (procedure) => {
        try {
          const procedureAttachments = await retryWithTimeout(
            () => procedureService.getAttachments(procedure.id),
            {
              maxRetries: 2,
              timeout: 7000, // Padronizado para 7 segundos
              delay: 500
            }
          )
          return { id: procedure.id, attachments: procedureAttachments }
        } catch (error) {
          return { id: procedure.id, attachments: [] }
        }
      })
      
      const attachmentResults = await Promise.all(attachmentPromises)
      attachmentResults.forEach(({ id, attachments }) => {
        attachmentsMap[id] = attachments
      })
      setProcedureAttachments(attachmentsMap)
      
      // Calcular receita mensal dos últimos 6 meses
      const monthlyData = await calculateMonthlyRevenue(proceduresData)
      setMonthlyRevenue(monthlyData)
    } catch (error: any) {
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
      setMonthlyShifts([])
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
    if (!user?.id) {
      setGoalError('Usuário não identificado. Por favor, faça login novamente.')
      return
    }

    // Validação básica
    if (goal.isEnabled && goal.targetValue <= 0) {
      setGoalError('Por favor, informe um valor maior que zero para a meta.')
      return
    }

    if (goal.resetDay < 1 || goal.resetDay > 31) {
      setGoalError('O dia de reinício deve estar entre 1 e 31.')
      return
    }
    
    setIsSavingGoal(true)
    setGoalError(null)
    
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
        // Recalcular progresso após salvar
        if (goal.isEnabled) {
          calculateProgress(goal)
        }
        setShowGoalModal(false)
        setGoalError(null)
      } else {
        setGoalError('Erro ao salvar meta. Por favor, tente novamente.')
      }
    } catch (error: any) {
      setGoalError(error?.message || 'Erro ao salvar meta. Por favor, tente novamente.')
    } finally {
      setIsSavingGoal(false)
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
    
    // Calcular valor atual do período
    // Se o período for o mês atual e monthlyStats estiver disponível, usar receivedValue
    // (que já considera parcelas recebidas no mês baseado em payment_date)
    let currentValue = 0
    
    const monthStart = new Date(currentYear, currentMonth, 1)
    const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999)
    
    // Se o período da meta corresponde ao mês atual, usar monthlyStats.receivedValue
    if (startDate >= monthStart && endDate <= monthEnd && monthlyStats?.receivedValue !== undefined) {
      currentValue = monthlyStats.receivedValue
    } else {
      // Para outros períodos, calcular manualmente
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
        
        // Para procedimentos parcelados, considerar apenas parcelas recebidas no período
        let proceduresValue = 0
        for (const proc of periodProcedures) {
          const isParcelado = proc.payment_method === 'Parcelado' || proc.forma_pagamento === 'Parcelado'
          if (isParcelado) {
            try {
              const parcelas = await procedureService.getParcelas(proc.id)
              const parcelasDoPeriodo = parcelas.filter((parcela: any) => {
                if (!parcela.recebida || !parcela.data_recebimento) return false
                const dataRecebimento = new Date(parcela.data_recebimento)
                return dataRecebimento >= startDate && dataRecebimento < endDate
              })
              proceduresValue += parcelasDoPeriodo.reduce((sum: number, p: any) => sum + (p.valor_parcela || 0), 0)
            } catch (error) {
              // Se der erro, usar valor total do procedimento
              proceduresValue += proc.procedure_value || 0
            }
          } else {
            proceduresValue += proc.procedure_value || 0
          }
        }
        
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
      } catch (error) {
        // Fallback: usar monthlyStats.receivedValue se disponível, senão stats.completedValue
        currentValue = monthlyStats?.receivedValue || stats.completedValue || 0
      }
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
  const calculateMonthlyStats = async () => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const monthStart = new Date(currentYear, currentMonth, 1)
    const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999)
    
    // Filtrar procedimentos do mês atual (para contagem total)
    const monthlyProcs = monthlyProcedures.filter((proc: any) => {
      if (!proc.procedure_date) return false
      const procDate = new Date(proc.procedure_date)
      return procDate >= monthStart && procDate <= monthEnd
    })
    
    // Filtrar plantões do mês atual (para contagem total)
    const monthlyShiftsFiltered = monthlyShifts.filter((shift: any) => {
      if (!shift.start_date) return false
      const shiftDate = new Date(shift.start_date)
      return shiftDate >= monthStart && shiftDate <= monthEnd
    })
    
    // Calcular receita recebida (procedimentos pagos no mês - usar payment_date)
    // Primeiro buscar todos os procedimentos pagos, depois filtrar por payment_date
    const allPaidProcedures = allProcedures.filter((p: any) => p.payment_status === 'paid')
    const paidProceduresThisMonth = allPaidProcedures.filter((p: any) => {
      if (!p.payment_date) return false
      const paymentDate = new Date(p.payment_date)
      return paymentDate >= monthStart && paymentDate <= monthEnd
    })
    
    // Para procedimentos parcelados, considerar apenas parcelas recebidas no mês
    // Buscar todas as parcelas de uma vez para otimizar
    const procedureIds = paidProceduresThisMonth.map(p => p.id)
    const parcelasMap: Record<string, any[]> = {}
    
    if (procedureIds.length > 0) {
      try {
        // Buscar todas as parcelas de todos os procedimentos pagos do mês
        for (const procId of procedureIds) {
          try {
            const parcelas = await procedureService.getParcelas(procId)
            parcelasMap[procId] = parcelas || []
          } catch (error) {
            parcelasMap[procId] = []
          }
        }
      } catch (error) {
        // Se der erro, continuar sem parcelas
      }
    }
    
    let receivedValueProcs = 0
    for (const proc of paidProceduresThisMonth) {
      const isParcelado = proc.payment_method === 'Parcelado' || proc.forma_pagamento === 'Parcelado'
      if (isParcelado) {
        // Usar parcelas do cache
        const parcelas = parcelasMap[proc.id] || []
        const parcelasDoMes = parcelas.filter((parcela: any) => {
          if (!parcela.recebida || !parcela.data_recebimento) return false
          const dataRecebimento = new Date(parcela.data_recebimento)
          return dataRecebimento >= monthStart && dataRecebimento <= monthEnd
        })
        receivedValueProcs += parcelasDoMes.reduce((sum: number, p: any) => sum + (p.valor_parcela || 0), 0)
      } else {
        // Procedimento não parcelado, usar valor total
        receivedValueProcs += proc.procedure_value || 0
      }
    }
    
    // Calcular receita recebida (plantões pagos no mês - usar payment_date)
    const allPaidShifts = allShifts.filter((s: any) => s.payment_status === 'paid')
    const paidShiftsThisMonth = allPaidShifts.filter((s: any) => {
      if (!s.payment_date) return false
      const paymentDate = new Date(s.payment_date)
      return paymentDate >= monthStart && paymentDate <= monthEnd
    })
    const receivedValueShifts = paidShiftsThisMonth.reduce((sum: number, s: any) => {
      return sum + (s.shift_value || 0)
    }, 0)
    
    const receivedValue = receivedValueProcs + receivedValueShifts
    
    // Manter referência aos procedimentos pagos do mês para o modal de detalhes
    const paidProcedures = paidProceduresThisMonth
    const paidShifts = paidShiftsThisMonth
    
    // Calcular receita pendente (procedimentos pendentes)
    const pendingProcedures = monthlyProcs.filter((p: any) => p.payment_status === 'pending')
    const pendingValueProcs = pendingProcedures.reduce((sum: number, p: any) => {
      return sum + (p.procedure_value || 0)
    }, 0)
    
    // Calcular receita pendente (plantões pendentes)
    const pendingShifts = monthlyShiftsFiltered.filter((s: any) => s.payment_status === 'pending')
    const pendingValueShifts = pendingShifts.reduce((sum: number, s: any) => {
      return sum + (s.shift_value || 0)
    }, 0)
    
    const pendingValue = pendingValueProcs + pendingValueShifts
    
    // Total de procedimentos do mês
    const totalMonthly = monthlyProcs.length
    
    // Total de plantões do mês
    const totalMonthlyShifts = monthlyShiftsFiltered.length
    
    // Procedimentos concluídos do mês
    const completedMonthly = paidProcedures.length
    
    // Plantões concluídos do mês
    const completedMonthlyShifts = paidShifts.length
    
    return {
      receivedValue,
      pendingValue,
      totalMonthly,
      completedMonthly,
      paidProcedures,
      pendingProcedures,
      monthlyProcs,
      totalMonthlyShifts,
      completedMonthlyShifts,
      paidShifts,
      pendingShifts,
      monthlyShiftsFiltered
    }
  }

  // Calcular estatísticas mensais quando os dados mudarem
  useEffect(() => {
    if ((allProcedures.length > 0 || allShifts.length > 0) && (monthlyProcedures.length > 0 || monthlyShifts.length > 0)) {
      calculateMonthlyStats().then(setMonthlyStats).catch(() => {
        // Em caso de erro, manter valores padrão
      })
    }
  }, [allProcedures, allShifts, monthlyProcedures, monthlyShifts])

  // Função para preparar detalhes do cálculo
  const prepareCalculationDetails = async (statKey: string) => {
    const now = new Date()
    const monthName = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const monthStart = new Date(currentYear, currentMonth, 1)
    const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999)
    
    switch (statKey) {
      case 'received':
        // Para procedimentos parcelados, buscar e mostrar as parcelas recebidas no mês
        const itemsToShow: any[] = []
        let totalValue = 0
        
        // Verificar se monthlyStats existe antes de acessar
        if (!monthlyStats) {
          return {
            title: 'Receita Total (mensal) - Recebida',
            description: `Valores recebidos em ${monthName}`,
            procedures: [],
            totalValue: 0,
            period: monthName
          }
        }
        
        // Processar procedimentos pagos do mês
        if (monthlyStats.paidProcedures && monthlyStats.paidProcedures.length > 0) {
          for (const proc of monthlyStats.paidProcedures) {
            const isParcelado = proc.payment_method === 'Parcelado' || proc.forma_pagamento === 'Parcelado'
            
            if (isParcelado) {
              // Buscar parcelas do procedimento
              try {
                const parcelas = await procedureService.getParcelas(proc.id)
                const parcelasDoMes = parcelas.filter((parcela: any) => {
                  if (!parcela.recebida || !parcela.data_recebimento) return false
                  const dataRecebimento = new Date(parcela.data_recebimento)
                  return dataRecebimento >= monthStart && dataRecebimento <= monthEnd
                })
                
                // Adicionar cada parcela como item separado
                for (const parcela of parcelasDoMes) {
                  itemsToShow.push({
                    id: `${proc.id}-parcela-${parcela.id}`,
                    type: 'parcela',
                    procedure_id: proc.id,
                    patient_name: proc.patient_name,
                    procedure_name: proc.procedure_name || proc.procedure_type,
                    procedure_date: proc.procedure_date,
                    parcela_numero: parcela.numero_parcela || 0,
                    value: parcela.valor_parcela || 0,
                    payment_date: parcela.data_recebimento,
                    isParcela: true
                  })
                  totalValue += parcela.valor_parcela || 0
                }
              } catch (error) {
                console.error('Erro ao buscar parcelas:', error)
                // Se der erro ao buscar parcelas, adicionar procedimento completo
                itemsToShow.push({
                  ...proc,
                  type: 'procedure',
                  isParcela: false
                })
                totalValue += proc.procedure_value || 0
              }
            } else {
              // Procedimento não parcelado, adicionar normalmente
              itemsToShow.push({
                ...proc,
                type: 'procedure',
                isParcela: false
              })
              totalValue += proc.procedure_value || 0
            }
          }
        }
        
        // Adicionar plantões pagos do mês
        if (monthlyStats.paidShifts && monthlyStats.paidShifts.length > 0) {
          for (const shift of monthlyStats.paidShifts) {
            itemsToShow.push({
              ...shift,
              type: 'shift',
              isParcela: false
            })
            totalValue += shift.shift_value || 0
          }
        }
        
        return {
          title: 'Receita Total (mensal) - Recebida',
          description: `Valores recebidos em ${monthName}`,
          procedures: itemsToShow,
          totalValue: totalValue,
          period: monthName
        }
      case 'pending':
        // Calcular todos os procedimentos e plantões não pagos (tudo exceto 'paid')
        // Inclui 'pending' e 'cancelled' (Aguardando)
        const allPendingProcedures = (allProcedures || []).filter((p: any) => 
          p.payment_status !== 'paid' && p.payment_status !== null && p.payment_status !== undefined
        )
        const allPendingShifts = (allShifts || []).filter((s: any) => 
          s.payment_status !== 'paid' && s.payment_status !== null && s.payment_status !== undefined
        )
        const totalPendingValue = allPendingProcedures.reduce((sum: number, p: any) => sum + (p.procedure_value || 0), 0) +
          allPendingShifts.reduce((sum: number, s: any) => sum + (s.shift_value || 0), 0)
        
        // Se não houver dados carregados ainda, usar o valor de stats.pendingValue
        const finalPendingValue = (allProcedures.length === 0 && allShifts.length === 0) 
          ? stats.pendingValue 
          : totalPendingValue
        
        return {
          title: 'Receita Total - Pendente',
          description: 'Soma dos valores de todos os procedimentos e plantões não pagos (pendentes e aguardando)',
          procedures: [...allPendingProcedures, ...allPendingShifts],
          totalValue: finalPendingValue,
          period: 'Total'
        }
      case 'total':
        return {
          title: 'Procedimentos (mensal) - Total',
          description: `Total de procedimentos realizados em ${monthName}`,
          procedures: monthlyStats?.monthlyProcs || [],
          totalValue: monthlyStats?.totalMonthly || 0,
          period: monthName
        }
      case 'shifts':
        return {
          title: 'Plantões (mensal) - Total',
          description: `Total de plantões realizados em ${monthName}`,
          procedures: monthlyStats?.monthlyShiftsFiltered || [],
          totalValue: monthlyStats?.totalMonthlyShifts || 0,
          period: monthName
        }
      default:
        return null
    }
  }

  // Handlers para long press
  const handleLongPressStart = (statKey: string) => {
    const timer = setTimeout(async () => {
      const details = await prepareCalculationDetails(statKey)
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
      title: 'Receita Total',
      value: formatCurrency(stats.pendingValue),
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
      title: 'Plantões (mensal)',
      value: monthlyStats.totalMonthlyShifts.toString(),
      change: 'Total',
      changeType: 'positive' as const,
      icon: Calendar,
      statKey: 'shifts'
    }
  ]

  // Renderizar imediatamente, não bloquear por loading
  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-8">
          {/* Header - sempre visível */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-base sm:text-lg text-gray-600 mt-1 font-medium">{getFullGreeting(user?.name, user?.gender)}</p>
            </div>
          </div>

        {/* Stats Grid - Mobile Carousel */}
        <div className="lg:hidden">
          {loading ? (
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {Array.from({ length: 4 }).map((_, index) => (
                <SkeletonStatsCard key={index} />
              ))}
            </div>
          ) : (
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
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
              <Card 
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
                </motion.div>
              ))}
            </div>
          )}
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

        {/* Meta Mensal */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Target className="w-5 h-5 text-teal-600" />
                  Meta Mensal
                </CardTitle>
                <CardDescription>Configure e acompanhe sua meta de receita mensal</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleButtonPress(() => setShowGoalModal(true), 'light')}
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Configurar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {monthlyGoal.isEnabled && monthlyGoal.targetValue > 0 ? (
              <div className="space-y-3">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Progresso da Meta</span>
                    <span className="font-semibold text-teal-600">
                      {currentProgress.percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-500 ${
                        currentProgress.isCompleted 
                          ? 'bg-green-500' 
                          : 'bg-teal-500'
                      }`}
                      style={{ width: `${Math.min(100, currentProgress.percentage)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">
                      {formatCurrency(currentProgress.currentValue || monthlyStats?.receivedValue || 0)} de {formatCurrency(monthlyGoal.targetValue)}
                    </span>
                    <span className="font-medium text-teal-600">
                      {formatCurrency(monthlyGoal.targetValue - (currentProgress.currentValue || monthlyStats?.receivedValue || 0))} restante
                    </span>
                  </div>
                </div>
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
                  onClick={() => handleButtonPress(() => setShowGoalModal(true), 'light')}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  <Target className="w-4 h-4 mr-2" />
                  Configurar Meta
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Seção de Ações Rápidas */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-900">Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
              {/* Cadastro Rápido */}
              <Link href="/procedimentos/rapido" className="w-full">
                <div
                  className="w-full bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 flex flex-col items-center justify-center gap-1.5 py-3 px-2 sm:py-4 sm:px-3 cursor-pointer active:scale-95"
                  onClick={() => handleButtonPress(undefined, 'medium')}
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="text-[10px] sm:text-xs font-medium text-gray-900 text-center leading-tight px-0.5">Cadastro Rápido</span>
                </div>
              </Link>

              {/* Cadastro Detalhado */}
              <Link href="/procedimentos/novo" className="w-full">
                <div
                  className="w-full bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 flex flex-col items-center justify-center gap-1.5 py-3 px-2 sm:py-4 sm:px-3 cursor-pointer active:scale-95"
                  onClick={() => handleButtonPress(undefined, 'medium')}
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-[10px] sm:text-xs font-medium text-gray-900 text-center leading-tight px-0.5">Cadastro Detalhado</span>
                </div>
              </Link>

              {/* Vincular Secretária */}
              {secretariaLoading ? (
                <div className="w-full bg-gray-50 rounded-lg border border-gray-200 animate-pulse flex flex-col items-center justify-center gap-1.5 py-3 px-2 sm:py-4 sm:px-3">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gray-200 rounded"></div>
                  <div className="h-2.5 w-12 sm:w-16 bg-gray-200 rounded"></div>
                </div>
              ) : secretaria ? (
                <Link href="/configuracoes" className="w-full">
                  <div className="w-full bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 flex flex-col items-center justify-center gap-1.5 py-3 px-2 sm:py-4 sm:px-3 cursor-pointer active:scale-95">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="text-[10px] sm:text-xs font-medium text-gray-900 text-center leading-tight px-0.5">{secretaria.nome.split(' ')[0]}</span>
                  </div>
                </Link>
              ) : (
                <Link href="/configuracoes" className="w-full">
                  <div className="w-full bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 flex flex-col items-center justify-center gap-1.5 py-3 px-2 sm:py-4 sm:px-3 cursor-pointer active:scale-95">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    <span className="text-[10px] sm:text-xs font-medium text-gray-900 text-center leading-tight px-0.5">Vincular Secretária</span>
                  </div>
                </Link>
              )}

            </div>

          </CardContent>
        </Card>

        {/* Stats Grid - Desktop */}
        <div className="hidden lg:grid grid-cols-4 gap-6">
          {loading ? (
            <>
              {Array.from({ length: 4 }).map((_, index) => (
                <SkeletonStatsCard key={index} />
              ))}
            </>
          ) : (
            <>
              {dashboardStats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
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
            </motion.div>
              ))}
            </>
          )}
        </div>


        {/* Charts and Recent Activity */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
          {/* Revenue Chart */}
          {loading ? (
            <SkeletonChart />
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
            >
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
            </motion.div>
          )}

          {/* Status Distribution */}
          {loading ? (
            <SkeletonChart />
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
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
            </motion.div>
          )}
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
              <SkeletonProcedureList count={5} />
            ) : recentProcedures.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Nenhum procedimento ainda"
                description="Comece criando seu primeiro procedimento para organizar seus atendimentos."
                action={{
                  label: 'Criar Procedimento',
                  onClick: () => router.push('/procedimentos/rapido'),
                  variant: 'primary'
                }}
              />
            ) : (
            <div className="space-y-3 sm:space-y-4">
                {recentProcedures.map((procedure, index) => (
                  <motion.div
                    key={procedure.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
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
                  </motion.div>
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
                onClick={() => {
                  setShowGoalModal(false)
                  setGoalError(null)
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="p-6 space-y-4">
              {goalError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <span className="text-sm text-red-800">{goalError}</span>
                </div>
              )}
              
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
                disabled={isSavingGoal}
              >
                {isSavingGoal ? 'Salvando...' : 'Salvar Meta'}
              </Button>
            </div>
          </div>
        </div>
      )}


      {/* Modal de Detalhes do Cálculo */}
      {showCalculationModal && calculationDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]" onClick={() => setShowCalculationModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{calculationDetails.title}</h2>
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
                    {calculationDetails.title.includes('Receita') && calculationDetails.procedures.some((p: any) => p.isParcela)
                      ? 'Parcelas e Procedimentos'
                      : 'Procedimentos'
                    } ({calculationDetails.procedures.length}):
                  </h3>
                  <div className="space-y-2">
                    {calculationDetails.procedures.map((proc: any, idx: number) => (
                      <div key={proc.id || idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {proc.patient_name || 'Paciente não informado'}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              {proc.isParcela 
                                ? `${proc.procedure_name || proc.procedure_type || 'Procedimento'} - Parcela ${proc.parcela_numero}`
                                : (proc.procedure_type || proc.procedure_name || 'Tipo não informado')
                              }
                            </p>
                            {proc.procedure_date && (
                              <p className="text-xs text-gray-500 mt-1">
                                Procedimento: {formatDate(proc.procedure_date)}
                              </p>
                            )}
                            {proc.isParcela && proc.payment_date && (
                              <p className="text-xs text-teal-600 mt-1 font-medium">
                                Recebida em: {formatDate(proc.payment_date)}
                              </p>
                            )}
                          </div>
                          {calculationDetails.title.includes('Receita') && (
                            <div className="ml-4 text-right">
                              <p className="text-sm font-semibold text-teal-600">
                                {formatCurrency(proc.isParcela ? (proc.value || 0) : (proc.procedure_value || proc.shift_value || 0))}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {proc.isParcela ? 'Parcela Recebida' : (proc.payment_status === 'paid' ? 'Pago' : 'Pendente')}
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
