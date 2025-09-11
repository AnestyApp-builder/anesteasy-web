'use client'

import { useState, useEffect } from 'react'
import { 
  Calendar, 
  Plus, 
  Edit, 
  Trash2, 
  Clock, 
  MapPin,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle,
  AlertTriangle,
  Menu
} from 'lucide-react'
import { Layout } from '@/components/layout/Layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/badge'
import { shiftService, Shift } from '@/lib/shifts'
import { useAuth } from '@/contexts/AuthContext'
import { formatDate, formatTime, formatShiftDates } from '@/lib/utils'

export default function Agenda() {
  const { user } = useAuth()
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showDailyView, setShowDailyView] = useState(false)
  const [editingShift, setEditingShift] = useState<Shift | null>(null)
  const [showNotification, setShowNotification] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [notificationMessage, setNotificationMessage] = useState('')
  const [confirmationData, setConfirmationData] = useState<{
    message: string
    onConfirm: () => void
    onCancel?: () => void
  } | null>(null)
  const [deleteShiftData, setDeleteShiftData] = useState<{
    shift: Shift
    step: 'initial' | 'confirm-series' | 'confirm-single'
  } | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    start_date: '',
    end_date: '',
    shift_type: 'hospital_fixo' as 'hospital_fixo' | 'sobreaviso',
    hospital_name: '',
    description: '',
    is_recurring: false,
    recurrence_type: 'weekly' as 'weekly' | 'monthly',
    recurrence_end_date: ''
  })

  useEffect(() => {
    if (user?.id) {
      loadShifts()
    }
  }, [user])

  // Debug para monitorar estado do modal
  useEffect(() => {
    console.log('Estado do modal de confirmação:', {
      showConfirmation,
      confirmationData: confirmationData ? 'existe' : 'null'
    })
  }, [showConfirmation, confirmationData])

  // Funções auxiliares para modais
  const showNotificationModal = (message: string) => {
    setNotificationMessage(message)
    setShowNotification(true)
  }

  const showConfirmationModal = (message: string, onConfirm: () => void, onCancel?: () => void) => {
    console.log('=== showConfirmationModal CHAMADO ===')
    console.log('Mensagem:', message)
    console.log('onConfirm:', onConfirm)
    console.log('onCancel:', onCancel)
    
    setConfirmationData({
      message,
      onConfirm,
      onCancel
    })
    setShowConfirmation(true)
    
    console.log('Modal de confirmação ativado')
  }

  const handleNotificationClose = () => {
    setShowNotification(false)
    setNotificationMessage('')
  }

  const handleConfirmationConfirm = () => {
    console.log('=== CONFIRMAÇÃO CLICADA ===')
    console.log('confirmationData:', confirmationData)
    
    if (confirmationData?.onConfirm) {
      console.log('Executando onConfirm...')
      confirmationData.onConfirm()
    }
    setShowConfirmation(false)
    setConfirmationData(null)
    console.log('Modal de confirmação fechado')
  }

  const handleConfirmationCancel = () => {
    console.log('=== CANCELAR CLICADO ===')
    console.log('confirmationData:', confirmationData)
    
    if (confirmationData?.onCancel) {
      console.log('Executando onCancel...')
      confirmationData.onCancel()
    }
    setShowConfirmation(false)
    setConfirmationData(null)
    console.log('Modal de confirmação fechado')
  }

  const loadShifts = async () => {
    if (!user?.id) return
    
    setLoading(true)
    try {
      const shiftsData = await shiftService.getShifts(user.id)
      setShifts(shiftsData)
    } catch (error) {
      console.error('Erro ao carregar plantões:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateShift = () => {
    setEditingShift(null)
    
    // Se há uma data selecionada, pré-preencher os campos de data
    let startDate = ''
    let endDate = ''
    
    if (selectedDate) {
      const dateStr = selectedDate.toISOString().slice(0, 16) // Formato datetime-local
      startDate = dateStr
      // Definir horário padrão: 08:00 - 18:00
      const endDateObj = new Date(selectedDate)
      endDateObj.setHours(18, 0, 0, 0)
      endDate = endDateObj.toISOString().slice(0, 16)
    }
    
    setFormData({
      title: '',
      start_date: startDate,
      end_date: endDate,
      shift_type: 'hospital_fixo',
      hospital_name: '',
      description: '',
      is_recurring: false,
      recurrence_type: 'weekly',
      recurrence_end_date: ''
    })
    setShowModal(true)
  }

  const handleEditShift = (shift: Shift) => {
    setEditingShift(shift)
    
    // Converter datas do UTC para horário local para exibição no formulário
    const startDate = new Date(shift.start_date)
    const endDate = new Date(shift.end_date)
    const recurrenceEndDate = shift.recurrence_end_date ? new Date(shift.recurrence_end_date) : null
    
    // Formatar para input datetime-local (YYYY-MM-DDTHH:MM)
    const formatForInput = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day}T${hours}:${minutes}`
    }
    
    setFormData({
      title: shift.title,
      start_date: formatForInput(startDate),
      end_date: formatForInput(endDate),
      shift_type: shift.shift_type,
      hospital_name: shift.hospital_name || '',
      description: shift.description || '',
      is_recurring: shift.is_recurring || false,
      recurrence_type: shift.recurrence_type || 'weekly',
      recurrence_end_date: recurrenceEndDate ? formatForInput(recurrenceEndDate) : ''
    })
    setShowModal(true)
  }

  const handleDeleteShift = async (shift: Shift) => {
    // Verificar se é um plantão recorrente
    const isRecurring = shift.is_recurring || shift.parent_shift_id
    
    if (isRecurring) {
      // Para plantões recorrentes, iniciar fluxo de confirmação
      setDeleteShiftData({ shift, step: 'initial' })
      showConfirmationModal(
        'Este plantão faz parte de uma série recorrente.\n\n' +
        'Deseja excluir apenas este plantão ou toda a série?',
        () => {
          // Usuário escolheu excluir toda a série
          console.log('Usuário escolheu excluir toda a série')
          setDeleteShiftData(prev => prev ? { ...prev, step: 'confirm-series' } : null)
          
          // Aguardar um pouco para o primeiro modal fechar
          setTimeout(() => {
            console.log('Abrindo segundo modal para confirmar exclusão da série')
            showConfirmationModal(
              'Tem certeza que deseja excluir toda a série de plantões?',
              async () => {
                console.log('Segunda confirmação: Excluir toda a série')
                await executeDelete(shift, false)
              }
            )
          }, 100)
        },
        () => {
          // Usuário escolheu excluir apenas este plantão
          console.log('Usuário escolheu excluir apenas este plantão')
          setDeleteShiftData(prev => prev ? { ...prev, step: 'confirm-single' } : null)
          
          // Aguardar um pouco para o primeiro modal fechar
          setTimeout(() => {
            console.log('Abrindo segundo modal para confirmar exclusão individual')
            showConfirmationModal(
              'Tem certeza que deseja excluir apenas este plantão?',
              async () => {
                console.log('Segunda confirmação: Excluir apenas este plantão')
                await executeDelete(shift, true)
              }
            )
          }, 100)
        }
      )
    } else {
      // Para plantões únicos
      showConfirmationModal(
        'Tem certeza que deseja excluir este plantão?',
        async () => {
          await executeDelete(shift, true)
        }
      )
    }
  }

  const executeDelete = async (shift: Shift, deleteOnlyThis: boolean) => {
    try {
      console.log('=== INICIANDO EXCLUSÃO ===')
      console.log('Shift:', shift)
      console.log('DeleteOnlyThis:', deleteOnlyThis)
      
      let success = false
      if (deleteOnlyThis) {
        console.log('Excluindo apenas este plantão...')
        success = await shiftService.deleteShift(shift.id)
        console.log('Resultado deleteShift:', success)
      } else {
        console.log('Excluindo grupo completo...')
        success = await shiftService.deleteShiftGroup(shift.id, false)
        console.log('Resultado deleteShiftGroup:', success)
      }
      
      console.log('Resultado final da exclusão:', success)
      
      if (success) {
        console.log('Exclusão bem-sucedida, recarregando plantões...')
        await loadShifts()
        console.log('Plantões recarregados')
        showNotificationModal(deleteOnlyThis ? 'Plantão excluído com sucesso!' : 'Série de plantões excluída com sucesso!')
      } else {
        console.log('Exclusão falhou')
        showNotificationModal('Erro ao excluir plantão.')
      }
    } catch (error) {
      console.error('ERRO na exclusão:', error)
      showNotificationModal('Erro ao excluir plantão.')
    } finally {
      console.log('Limpando estado deleteShiftData')
      setDeleteShiftData(null)
      console.log('=== FIM DA EXCLUSÃO ===')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user?.id) return

    try {
      // Validações
      if (!formData.title.trim()) {
        showNotificationModal('Título é obrigatório')
        return
      }

      if (!formData.start_date || !formData.end_date) {
        showNotificationModal('Data de início e fim são obrigatórias')
        return
      }

      if (new Date(formData.start_date) >= new Date(formData.end_date)) {
        showNotificationModal('Data de fim deve ser posterior à data de início')
        return
      }

      if (formData.shift_type === 'hospital_fixo' && !formData.hospital_name.trim()) {
        showNotificationModal('Nome do hospital é obrigatório para plantão fixo')
        return
      }

      // Converter datetime-local para UTC (corrigir fuso horário)
      const startDate = new Date(formData.start_date)
      const endDate = new Date(formData.end_date)

      // Verificar sobreposição apenas para plantões únicos
      // Para plantões recorrentes, a validação será feita no serviço
      if (!editingShift || (!editingShift.is_recurring && !editingShift.parent_shift_id)) {
        const hasOverlap = await shiftService.checkOverlap(
          user.id,
          startDate.toISOString(),
          endDate.toISOString(),
          editingShift?.id
        )

        if (hasOverlap) {
          showNotificationModal('Este plantão sobrepõe com outro plantão existente')
          return
        }
      }
      
      const shiftData = {
        user_id: user.id,
        title: formData.title.trim(),
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        shift_type: formData.shift_type,
        hospital_name: formData.shift_type === 'hospital_fixo' ? formData.hospital_name.trim() : undefined,
        description: formData.description.trim() || undefined,
        is_recurring: formData.is_recurring,
        recurrence_type: formData.is_recurring ? formData.recurrence_type : undefined,
        recurrence_end_date: formData.is_recurring && formData.recurrence_end_date ? new Date(formData.recurrence_end_date).toISOString() : undefined
      }

      if (editingShift) {
        // Se for um plantão recorrente, atualizar todo o grupo
        if (editingShift.is_recurring || editingShift.parent_shift_id) {
          await shiftService.updateShiftGroup(editingShift.id, shiftData)
        } else {
          await shiftService.updateShift(editingShift.id, shiftData)
        }
      } else {
        const newShift = await shiftService.createShift(shiftData)
        
        // Se for recorrente, gerar os plantões filhos
        if (newShift && formData.is_recurring) {
          await shiftService.generateRecurringShifts(newShift)
        }
      }

      await loadShifts()
      setShowModal(false)
      
      // Mostrar mensagem de sucesso
      if (editingShift) {
        showNotificationModal('Plantão atualizado com sucesso!')
      } else {
        if (formData.is_recurring) {
          showNotificationModal('Plantão recorrente criado com sucesso!')
        } else {
          showNotificationModal('Plantão criado com sucesso!')
        }
      }
    } catch (error: any) {
      console.error('Erro ao salvar plantão:', error)
      showNotificationModal('Erro ao salvar plantão: ' + (error.message || 'Erro desconhecido'))
    }
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    setShowDailyView(true)
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []
    
    // Dias do mês anterior
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i)
      days.push({ date: prevDate, isCurrentMonth: false })
    }
    
    // Dias do mês atual
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day)
      days.push({ date: currentDate, isCurrentMonth: true })
    }
    
    // Dias do próximo mês para completar a grade
    const remainingDays = 42 - days.length
    for (let day = 1; day <= remainingDays; day++) {
      const nextDate = new Date(year, month + 1, day)
      days.push({ date: nextDate, isCurrentMonth: false })
    }
    
    return days
  }

  const getShiftsForDate = (date: Date) => {
    return shifts.filter(shift => {
      const shiftStart = new Date(shift.start_date)
      const shiftEnd = new Date(shift.end_date)
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
      
      return shiftStart < dayEnd && shiftEnd > dayStart
    })
  }

  const getTimeBlocks = () => {
    return [
      { label: 'Madrugada', start: 0, end: 6, color: 'bg-slate-100', textColor: 'text-slate-600' },
      { label: 'Manhã', start: 6, end: 12, color: 'bg-blue-100', textColor: 'text-blue-600' },
      { label: 'Tarde', start: 12, end: 18, color: 'bg-amber-100', textColor: 'text-amber-600' },
      { label: 'Noite', start: 18, end: 24, color: 'bg-purple-100', textColor: 'text-purple-600' }
    ]
  }

  const getShiftsForTimeBlock = (shifts: Shift[], startHour: number, endHour: number, currentDate: Date) => {
    return shifts.filter(shift => {
      const shiftStart = new Date(shift.start_date)
      const shiftEnd = new Date(shift.end_date)
      const shiftStartHour = shiftStart.getHours()
      const shiftEndHour = shiftEnd.getHours()
      const shiftStartDay = shiftStart.getDate()
      const shiftEndDay = shiftEnd.getDate()
      const currentDay = currentDate.getDate()
      
      // Regra principal: cada plantão aparece onde começa
      const startsToday = shiftStartDay === currentDay && shiftStartHour >= startHour && shiftStartHour < endHour
      
      // EXCEÇÃO: Plantões noturnos (que cruzam meia-noite) também aparecem no dia seguinte
      const isOvernightShift = shiftEndHour <= shiftStartHour // Termina antes de começar = cruza meia-noite
      const endsToday = isOvernightShift && shiftEndDay === currentDay && shiftEndHour >= startHour && shiftEndHour < endHour
      
      return startsToday || endsToday
    })
  }



  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
  }

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando agenda...</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header Mobile Optimized */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Agenda de Plantões</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Gerencie seus plantões e horários de trabalho</p>
          </div>
          <Button 
            onClick={handleCreateShift}
            className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 text-sm sm:px-4 sm:py-2 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Novo Plantão</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </div>

        {/* Calendário Mobile Optimized */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg lg:text-xl">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </CardTitle>
              <div className="flex items-center space-x-1 sm:space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth('prev')}
                  className="p-1 sm:p-2"
                >
                  <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                  className="text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-2"
                >
                  Hoje
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth('next')}
                  className="p-1 sm:p-2"
                >
                  <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-2 sm:p-6">
            <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-2 sm:mb-4">
              {dayNames.map(day => (
                <div key={day} className="p-1 sm:p-2 text-center text-xs sm:text-sm font-medium text-gray-500">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
              {getDaysInMonth(currentDate).map((day, index) => {
                const dayShifts = getShiftsForDate(day.date)
                const isToday = day.date.toDateString() === new Date().toDateString()
                const timeBlocks = getTimeBlocks()
                
                return (
                  <div
                    key={index}
                    onClick={() => day.isCurrentMonth && handleDateClick(day.date)}
                    className={`
                      min-h-[80px] sm:min-h-[100px] p-0.5 border border-gray-200 rounded-md
                      ${day.isCurrentMonth ? 'bg-white cursor-pointer hover:bg-gray-50 hover:shadow-sm transition-all duration-200' : 'bg-gray-50'}
                      ${isToday ? 'ring-2 ring-teal-500 shadow-md' : ''}
                    `}
                  >
                    {/* Número do dia otimizado */}
                    <div className={`
                      text-xs font-semibold text-center h-3 sm:h-4 flex items-center justify-center border-b border-gray-100
                      ${day.isCurrentMonth ? 'text-gray-800' : 'text-gray-400'}
                      ${isToday ? 'text-teal-600 bg-teal-50' : ''}
                    `}>
                      {day.date.getDate()}
                    </div>
                    
                    {/* 4 Blocos com cards robustos */}
                    <div className="space-y-0">
                      {timeBlocks.map((block, blockIndex) => {
                        const blockShifts = getShiftsForTimeBlock(dayShifts, block.start, block.end, day.date)
                        
                        return (
                          <div
                            key={block.label}
                            className="relative h-4 sm:h-5 border-b border-gray-100 last:border-b-0 hover:bg-gray-25 transition-colors"
                          >
                            {blockShifts.length > 0 ? (
                              <div className="flex flex-col justify-center items-center h-full px-0.5 space-y-0.5">
                                {blockShifts.slice(0, 1).map((shift) => (
                                  <Badge
                                    key={shift.id}
                                    variant={shift.shift_type === 'hospital_fixo' ? 'default' : 'secondary'}
                                    className={`
                                      text-xs px-1 py-0.5 h-4 sm:h-5 w-full text-center font-medium
                                      ${shift.shift_type === 'hospital_fixo' 
                                        ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                                        : 'bg-amber-500 hover:bg-amber-600 text-white'
                                      }
                                    `}
                                    title={`${shift.title} - ${formatTime(shift.start_date)} às ${formatTime(shift.end_date)}`}
                                  >
                                    <span className="truncate text-xs">{shift.title}</span>
                                  </Badge>
                                ))}
                                {blockShifts.length > 1 && (
                                  <div className="text-xs text-gray-400 truncate w-full text-center font-medium">
                                    +{blockShifts.length - 1}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="h-full flex items-center justify-center">
                                <div className="w-0.5 h-0.5 sm:w-1 sm:h-1 bg-gray-200 rounded-full opacity-50"></div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Legenda */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Legenda</h3>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span className="text-sm text-gray-700">🏥 Plantão Hospital Fixo</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-amber-500 rounded"></div>
                <span className="text-sm text-gray-700">📞 Plantão Sobreaviso</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modal de Criação/Edição */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingShift ? 'Editar Plantão' : 'Novo Plantão'}
                  </h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowModal(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Título *
                    </label>
                    <Input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Ex: Plantão Noturno"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de Plantão *
                    </label>
                    <select
                      value={formData.shift_type}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        shift_type: e.target.value as 'hospital_fixo' | 'sobreaviso',
                        hospital_name: e.target.value === 'sobreaviso' ? '' : prev.hospital_name
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    >
                      <option value="hospital_fixo">🏥 Hospital Fixo</option>
                      <option value="sobreaviso">📞 Sobreaviso</option>
                    </select>
                  </div>

                  {formData.shift_type === 'hospital_fixo' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Hospital/Clínica *
                      </label>
                      <Input
                        type="text"
                        value={formData.hospital_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, hospital_name: e.target.value }))}
                        placeholder="Ex: Hospital São Paulo"
                        required
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Data/Hora Início *
                      </label>
                      <Input
                        type="datetime-local"
                        value={formData.start_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Data/Hora Fim *
                      </label>
                      <Input
                        type="datetime-local"
                        value={formData.end_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descrição
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Observações adicionais..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      rows={3}
                    />
                  </div>

                  {/* Seção de Recorrência */}
                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Recorrência</h3>
                    
                    <div className="flex items-center mb-4">
                      <input
                        type="checkbox"
                        id="is_recurring"
                        checked={formData.is_recurring}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_recurring: e.target.checked }))}
                        className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                      />
                      <label htmlFor="is_recurring" className="ml-2 block text-sm text-gray-700">
                        Este plantão se repete
                      </label>
                    </div>

                    {formData.is_recurring && (
                      <div className="space-y-4 pl-6 border-l-2 border-teal-200">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Frequência
                          </label>
                          <div className="space-y-2">
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name="recurrence_type"
                                value="weekly"
                                checked={formData.recurrence_type === 'weekly'}
                                onChange={(e) => setFormData(prev => ({ ...prev, recurrence_type: e.target.value as 'weekly' | 'monthly' }))}
                                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300"
                              />
                              <span className="ml-2 text-sm text-gray-700">Toda semana</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name="recurrence_type"
                                value="monthly"
                                checked={formData.recurrence_type === 'monthly'}
                                onChange={(e) => setFormData(prev => ({ ...prev, recurrence_type: e.target.value as 'weekly' | 'monthly' }))}
                                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300"
                              />
                              <span className="ml-2 text-sm text-gray-700">Todo mês</span>
                            </label>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Até quando repetir?
                          </label>
                          <input
                            type="datetime-local"
                            value={formData.recurrence_end_date}
                            onChange={(e) => setFormData(prev => ({ ...prev, recurrence_end_date: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            required={formData.is_recurring}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            O plantão será criado automaticamente até esta data
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowModal(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      className="bg-teal-600 hover:bg-teal-700 text-white"
                    >
                      {editingShift ? 'Atualizar' : 'Criar'} Plantão
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Visualização Diária */}
        {showDailyView && selectedDate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    Agenda do Dia - {formatDate(selectedDate)}
                  </h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDailyView(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-6">
                  {(() => {
                    const dayShifts = getShiftsForDate(selectedDate)
                    
                    if (dayShifts.length === 0) {
                      return (
                        <div className="text-center py-8">
                          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600">Nenhum plantão agendado para este dia</p>
                          <p className="text-sm text-gray-500 mt-1">Clique em "Adicionar Plantão" para começar</p>
                        </div>
                      )
                    }
                    
                    return (
                      <>
                        {/* Timeline de 24 horas */}
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h3 className="text-sm font-medium text-gray-700 mb-3">Timeline do Dia (00:00 - 23:59)</h3>
                          <div className="relative">
                            {/* Barra de horários */}
                            <div className="flex justify-between text-xs text-gray-500 mb-2">
                              <span>00:00</span>
                              <span>06:00</span>
                              <span>12:00</span>
                              <span>18:00</span>
                              <span>23:59</span>
                            </div>
                            
                            {/* Linha de tempo */}
                            <div className="relative h-12 bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                              {/* Marcadores de 6 em 6 horas */}
                              <div className="absolute left-1/4 top-0 bottom-0 w-px bg-gray-300"></div>
                              <div className="absolute left-2/4 top-0 bottom-0 w-px bg-gray-300"></div>
                              <div className="absolute left-3/4 top-0 bottom-0 w-px bg-gray-300"></div>
                              
                              {/* Cards dos plantões posicionados por horário */}
                              {dayShifts.map((shift) => {
                                const startTime = new Date(shift.start_date)
                                const endTime = new Date(shift.end_date)
                                const currentDay = selectedDate.getDate()
                                const shiftStartDay = startTime.getDate()
                                const shiftEndDay = endTime.getDate()
                                
                                // Para plantões que começam no dia anterior, ajusta o horário de início
                                let displayStartHour = startTime.getHours() + startTime.getMinutes() / 60
                                let displayEndHour = endTime.getHours() + endTime.getMinutes() / 60
                                
                                // Se o plantão começou no dia anterior, mostra a partir de 00:00
                                if (shiftStartDay < currentDay) {
                                  displayStartHour = 0
                                }
                                
                                // Se o plantão termina no dia seguinte, mostra até 23:59
                                if (shiftEndDay > currentDay) {
                                  displayEndHour = 24
                                }
                                
                                // Calcula posição e largura baseado nas 24 horas
                                const leftPercent = (displayStartHour / 24) * 100
                                const widthPercent = ((displayEndHour - displayStartHour) / 24) * 100
                                
                                return (
                                  <div
                                    key={shift.id}
                                    className="absolute top-1 bottom-1 rounded-md shadow-sm border-l-4 flex items-center px-2 cursor-pointer hover:shadow-md transition-shadow"
                                    style={{
                                      left: `${leftPercent}%`,
                                      width: `${widthPercent}%`,
                                      borderLeftColor: shift.shift_type === 'hospital_fixo' ? '#3b82f6' : '#f59e0b',
                                      backgroundColor: shift.shift_type === 'hospital_fixo' ? '#dbeafe' : '#fef3c7'
                                    }}
                                    title={`${shift.title} - ${formatTime(shift.start_date)} às ${formatTime(shift.end_date)}`}
                                    onClick={() => {
                                      setShowDailyView(false)
                                      handleEditShift(shift)
                                    }}
                                  >
                                    <div className="flex items-center justify-between w-full min-w-0">
                                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                          shift.shift_type === 'hospital_fixo' ? 'bg-blue-500' : 'bg-amber-500'
                                        }`}></div>
                                        <span className="text-xs font-medium text-gray-800 truncate">
                                          {shift.title}
                                        </span>
                                        {shift.is_recurring && (
                                          <span className="text-xs text-blue-600 flex-shrink-0">🔄</span>
                                        )}
                                      </div>
                                      <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleDeleteShift(shift)
                                          }}
                                          className="text-gray-400 hover:text-red-600 p-0.5"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                            
                            {/* Legenda */}
                            <div className="flex items-center justify-center space-x-4 mt-3 text-xs">
                              <div className="flex items-center space-x-1">
                                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                <span className="text-gray-600">Hospital Fixo</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                                <span className="text-gray-600">Sobreaviso</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Lista detalhada dos plantões */}
                        <div className="space-y-3">
                          <h3 className="text-sm font-medium text-gray-700">Detalhes dos Plantões</h3>
                          {dayShifts.map((shift) => (
                      <div
                        key={shift.id}
                        className={`
                          p-4 rounded-lg border transition-all hover:shadow-md
                          ${shift.shift_type === 'hospital_fixo' 
                            ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' 
                            : 'bg-amber-50 border-amber-200 hover:bg-amber-100'
                          }
                        `}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                             <div className="flex items-center space-x-3 mb-2">
                               <span className="text-2xl">
                                 {shift.shift_type === 'hospital_fixo' ? '🏥' : '📞'}
                               </span>
                               <h3 className="text-lg font-semibold text-gray-900">{shift.title}</h3>
                               <span className={`
                                 px-3 py-1 rounded-full text-sm font-medium text-white
                                 ${shift.shift_type === 'hospital_fixo' ? 'bg-blue-500' : 'bg-amber-500'}
                               `}>
                                 {shift.shift_type === 'hospital_fixo' ? 'Hospital Fixo' : 'Sobreaviso'}
                               </span>
                               {(shift.is_recurring || shift.parent_shift_id) && (
                                 <span className="px-2 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                                   🔄 Recorrente
                                 </span>
                               )}
                             </div>
                            
                            <div className="space-y-2 text-sm text-gray-600">
                              <div className="flex items-center space-x-2">
                                <Clock className="w-4 h-4" />
                                <span>
                                  {formatShiftDates(shift.start_date, shift.end_date)} das {formatTime(shift.start_date)} às {formatTime(shift.end_date)}
                                </span>
                              </div>
                              
                              {shift.hospital_name && (
                                <div className="flex items-center space-x-2">
                                  <MapPin className="w-4 h-4" />
                                  <span>{shift.hospital_name}</span>
                                </div>
                              )}
                              
                              {shift.description && (
                                <div className="mt-2 p-3 bg-white rounded-lg border">
                                  <p className="text-gray-700">{shift.description}</p>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setShowDailyView(false)
                                handleEditShift(shift)
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteShift(shift)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                          ))}
                        </div>
                      </>
                    )
                  })()}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200">
                  <Button
                    onClick={() => {
                      setShowDailyView(false)
                      handleCreateShift()
                    }}
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Plantão para este dia
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Notificação */}
        {showNotification && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-teal-100 rounded-full">
                  <CheckCircle className="w-6 h-6 text-teal-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 text-center mb-2">
                  Notificação
                </h3>
                <p className="text-sm text-gray-600 text-center mb-6 whitespace-pre-line">
                  {notificationMessage}
                </p>
                <div className="flex justify-center">
                  <Button
                    onClick={handleNotificationClose}
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    OK
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Confirmação */}
        {showConfirmation && confirmationData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-amber-100 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 text-center mb-2">
                  Confirmação
                </h3>
                <p className="text-sm text-gray-600 text-center mb-6 whitespace-pre-line">
                  {confirmationData.message}
                </p>
                <div className="flex justify-center space-x-3">
                  <Button
                    onClick={handleConfirmationCancel}
                    variant="outline"
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleConfirmationConfirm}
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    Confirmar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  )
}
