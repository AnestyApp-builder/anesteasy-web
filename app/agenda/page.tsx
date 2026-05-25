'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { Layout } from '@/components/layout/Layout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { useSearchParams } from 'next/navigation'
import { procedureService, Procedure } from '@/lib/procedures'
import { getUserGroups } from '@/lib/groups'
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  isSameDay, 
  eachDayOfInterval,
  parseISO,
  subMonths,
  addMonths
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  User, 
  Plus,
  Clock,
  MapPin,
  Stethoscope,
  Filter,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

function AgendaContent() {
  const { user } = useAuth()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()
  const initialFilter = searchParams.get('groupId') || 'all'
  const [filter, setFilter] = useState<string>(initialFilter)

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user, currentMonth, filter])

  const loadData = async () => {
    try {
      setLoading(true)
      const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
      const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd')
      
      const userGroups = await getUserGroups()
      setGroups(userGroups || [])

      let fetchedProcedures: Procedure[] = []
      
      if (filter === 'all') {
        const personal = await procedureService.getProceduresByDateRange(user!.id, start, end)
        fetchedProcedures = [...personal]
        for (const group of userGroups) {
          const groupProcs = await procedureService.getProceduresByDateRange(user!.id, start, end, group.id)
          const uniqueGroupProcs = groupProcs.filter(gp => !fetchedProcedures.some(p => p.id === gp.id))
          fetchedProcedures = [...fetchedProcedures, ...uniqueGroupProcs]
        }
      } else if (filter === 'personal') {
        fetchedProcedures = await procedureService.getProceduresByDateRange(user!.id, start, end)
      } else {
        fetchedProcedures = await procedureService.getProceduresByDateRange(user!.id, start, end, filter)
      }

      // Ordenar por data e hora (se existir)
      fetchedProcedures.sort((a, b) => a.procedure_date.localeCompare(b.procedure_date))
      
      setProcedures(fetchedProcedures)
    } catch (error) {
      console.error('Erro ao carregar agenda:', error)
    } finally {
      setLoading(false)
    }
  }

  const getGroupColor = (groupId: string | null | undefined) => {
    if (!groupId) return '#0d9488'
    const group = groups.find(g => g.id === groupId)
    return group?.color || '#0d9488'
  }

  // Filtrar procedimentos do dia selecionado
  const selectedDayProcedures = useMemo(() => {
    return procedures.filter(p => isSameDay(parseISO(p.procedure_date), selectedDate))
  }, [procedures, selectedDate])

  // Dias do mês para o mini-calendário
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    // Ajustar para mostrar semanas completas se quiser, mas aqui faremos apenas o mês
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* COLUNA ESQUERDA: Navegação e Filtros */}
        <div className="lg:w-80 space-y-6">
          {/* Card do Mini Calendário */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-900 capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </h3>
              <div className="flex gap-1">
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, idx) => (
                <div key={idx} className="text-center text-[10px] font-bold text-slate-300 uppercase">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {/* Padding para o início do mês */}
              {Array.from({ length: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay() }).map((_, i) => (
                <div key={`pad-${i}`} />
              ))}
              
              {calendarDays.map((day, i) => {
                const isSelected = isSameDay(day, selectedDate)
                const isToday = isSameDay(day, new Date())
                const hasEvents = procedures.some(p => isSameDay(parseISO(p.procedure_date), day))

                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "relative h-9 w-9 flex items-center justify-center rounded-xl text-sm font-semibold transition-all",
                      isSelected ? "bg-teal-600 text-white shadow-md scale-110 z-10" : 
                      isToday ? "bg-teal-50 text-teal-600" : "text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    {format(day, 'd')}
                    {hasEvents && !isSelected && (
                      <div className="absolute bottom-1.5 w-1 h-1 rounded-full bg-teal-400" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Filtros de Grupo */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Filter className="w-3 h-3" />
              Filtrar Agenda
            </h4>
            <div className="space-y-2">
              <button 
                onClick={() => setFilter('all')}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all",
                  filter === 'all' ? "bg-teal-600 text-white shadow-lg" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <CalendarIcon className="w-4 h-4" />
                Agenda Geral
              </button>
              <button 
                onClick={() => setFilter('personal')}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all",
                  filter === 'personal' ? "bg-teal-50 text-teal-600" : "text-slate-600 hover:bg-slate-50 border border-transparent"
                )}
              >
                <User className="w-4 h-4" />
                Pessoal
              </button>
              {groups.map(group => (
                <button 
                  key={group.id}
                  onClick={() => setFilter(group.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all",
                    filter === group.id ? "bg-slate-900 text-white shadow-lg" : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: group.color }} />
                  {group.name}
                </button>
              ))}
            </div>
          </div>

          {/* Botão Novo */}
          <Link
            href="/procedimentos/rapido"
            className="flex items-center justify-center gap-2 w-full bg-teal-600 hover:bg-teal-700 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-teal-100"
          >
            <Plus className="w-5 h-5" />
            Novo Procedimento
          </Link>
        </div>

        {/* COLUNA DIREITA: Timeline do Dia */}
        <div className="flex-1 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">
                {isSameDay(selectedDate, new Date()) ? 'Hoje' : format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </h2>
              <p className="text-slate-500">Você tem {selectedDayProcedures.length} procedimentos agendados.</p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-white border border-slate-100 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : selectedDayProcedures.length > 0 ? (
            <div className="space-y-4">
              {selectedDayProcedures.map((proc) => (
                <Link
                  key={proc.id}
                  href={`/procedimentos?procedureId=${proc.id}`}
                  className="group block bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
                >
                  {/* Barra Lateral de Cor */}
                  <div 
                    className="absolute left-0 top-0 bottom-0 w-2"
                    style={{ backgroundColor: getGroupColor(proc.group_id) }}
                  />

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start gap-5">
                      <div className="bg-slate-50 p-4 rounded-2xl text-slate-400 group-hover:text-teal-600 transition-colors">
                        <Stethoscope className="w-8 h-8" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-bold text-slate-900">{proc.patient_name}</h3>
                          {proc.group_id && (
                            <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                              {groups.find(g => g.id === proc.group_id)?.name}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-sm text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-slate-300" />
                            {proc.hospital_clinic || 'Hospital não informado'}
                          </div>
                          <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                            <Clock className="w-4 h-4 text-teal-500" />
                            {proc.procedure_date ? format(parseISO(proc.procedure_date), 'HH:mm') : '--:--'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-4 md:pt-0">
                      <div className="text-right">
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Status</p>
                        <span className={cn(
                          "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                          proc.payment_status === 'paid' ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"
                        )}>
                          {proc.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                        </span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl text-slate-300 group-hover:bg-teal-50 group-hover:text-teal-600 transition-all">
                        <ArrowRight className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[40px] p-20 text-center">
              <div className="bg-white w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                <CalendarIcon className="w-10 h-10 text-slate-200" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Nada agendado para hoje</h3>
              <p className="text-slate-500 mb-8 max-w-xs mx-auto">
                Aproveite o tempo livre ou cadastre um novo procedimento para este dia.
              </p>
              <Link
                href={`/procedimentos/rapido?date=${format(selectedDate, 'yyyy-MM-dd')}`}
                className="inline-flex items-center gap-2 bg-white text-teal-600 px-8 py-3 rounded-2xl font-bold border border-teal-100 hover:bg-teal-50 transition-all shadow-sm"
              >
                <Plus className="w-5 h-5" />
                Agendar Agora
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AgendaPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-600"></div>
          </div>
        }>
          <AgendaContent />
        </Suspense>
      </Layout>
    </ProtectedRoute>
  )
}
