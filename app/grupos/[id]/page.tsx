'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { getGroupDetails, addGroupMember, removeGroupMember, updateGroup, deleteGroup } from '@/lib/groups'
import { 
  updateMemberQuota, 
  getMemberQuotaHistory, 
  inviteGroupSecretary, 
  getGroupSecretaries, 
  getSecretaryPermissions, 
  updateSecretaryPermissions, 
  removeGroupSecretary,
  getMonthlyClosings,
  getClosingDetails,
  QuotaHistoryItem,
  GroupSecretary
} from '@/lib/groups-pro'
import { 
  Users, 
  UserPlus, 
  Shield, 
  Mail, 
  Trash2, 
  ArrowLeft, 
  Check, 
  Clock, 
  Settings, 
  Save, 
  X, 
  Calendar as CalendarIcon, 
  RefreshCw,
  DollarSign,
  Briefcase,
  Layers,
  Lock,
  Unlock,
  AlertCircle,
  Copy,
  CheckCircle2,
  CalendarDays,
  Plus,
  Eye,
  User,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  MapPin,
  FileText,
  Search,
  Filter
} from 'lucide-react'
import { googleSheetsService } from '@/lib/google-sheets'
import { useToast } from '@/contexts/ToastContext'
import { formatCurrency } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Layout } from '@/components/layout/Layout'
import { procedureService } from '@/lib/procedures'
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
import dynamic from 'next/dynamic'
import { useFinanceiroDashboard } from '@/hooks/useFinanceiroDashboard'

const DashboardFinanceiroGrupo = dynamic(
  () => import('@/components/financeiro/DashboardFinanceiroGrupo'),
  { ssr: false, loading: () => <div className="animate-pulse h-64 bg-stone-100 rounded-2xl" /> }
)

export default function GroupDetailsPage() {
  const { id } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { setWorkspace } = useWorkspace()
  const { addToast } = useToast()
  
  const [group, setGroup] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  // Set context to group
  useEffect(() => {
    if (id) {
      setWorkspace('group', id as string)
    }
  }, [id, setWorkspace])
  
  // Tab control based on URL
  const tabParam = searchParams.get('tab') as 'members' | 'secretaries' | 'finance' | 'agenda' | 'shifts' | 'procedures' | 'settings' | null
  const [activeTab, setActiveTab] = useState<'members' | 'secretaries' | 'finance' | 'agenda' | 'shifts' | 'procedures' | 'settings'>(tabParam || 'agenda')

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as any)
    router.push(`/grupos/${id}?tab=${tab}`, { scroll: false })
  }

  const [isAdmin, setIsAdmin] = useState(false)

  // Estados de edição do grupo
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editCnpj, setEditCnpj] = useState('')
  const [editType, setEditType] = useState<'com_cotas' | 'sem_cotas'>('sem_cotas')
  const [editShareFinancials, setEditShareFinancials] = useState(false)
  const [editGoogleSheetsId, setEditGoogleSheetsId] = useState('')
  const [editGoogleSheetsEnabled, setEditGoogleSheetsEnabled] = useState(false)
  const [syncing, setSyncing] = useState(false)

  // 1. Membros & Cotas
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteQuotaPercent, setInviteQuotaPercent] = useState<string>('')
  const [inviteQuotaSince, setInviteQuotaSince] = useState<string>('')
  const [isInviting, setIsInviting] = useState(false)
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)
  const [editQuotaPercent, setEditQuotaPercent] = useState<number>(0)
  const [editQuotaSince, setEditQuotaSince] = useState<string>('')
  const [savingQuota, setSavingQuota] = useState(false)
  
  // Modal de Histórico de Cotas
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [historyUserId, setHistoryUserId] = useState<string | null>(null)
  const [historyUserName, setHistoryUserName] = useState('')
  const [quotaHistory, setQuotaHistory] = useState<QuotaHistoryItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // 2. Secretárias de Grupo
  const [secretaries, setSecretaries] = useState<GroupSecretary[]>([])
  const [showInviteSecModal, setShowInviteSecModal] = useState(false)
  const [inviteSecEmail, setInviteSecEmail] = useState('')
  const [isInvitingSec, setIsInvitingSec] = useState(false)
  const [generatedLink, setGeneratedLink] = useState('')
  const [showCopySecSuccess, setShowCopySecSuccess] = useState(false)
  
  // Modal de Permissões
  const [showPermsModal, setShowPermsModal] = useState(false)
  const [selectedSec, setSelectedSec] = useState<GroupSecretary | null>(null)
  const [secPermissions, setSecPermissions] = useState<string[]>([])
  const [savingPerms, setSavingPerms] = useState(false)

  // 3. Fechamento Financeiro
  const [closings, setClosings] = useState<any[]>([])
  const [closingMonth, setClosingMonth] = useState<string>('')
  const [isSimulating, setIsSimulating] = useState(false)
  const [isClosingMonth, setIsClosingMonth] = useState(false)
  const [simulatedData, setSimulatedData] = useState<{ totalRevenue: number; distributions: any[] } | null>(null)
  
  // Modal Detalhes do Fechamento
  const [showClosingDetails, setShowClosingDetails] = useState(false)
  const [selectedClosing, setSelectedClosing] = useState<any>(null)
  
  // Reabertura
  const [showReopenModal, setShowReopenModal] = useState(false)
  const [reopenClosingId, setReopenClosingId] = useState<string | null>(null)
  const [reopenReason, setReopenReason] = useState('')
  const [isReopening, setIsReopening] = useState(false)

  // 4. Escalas do Grupo
  const [groupShifts, setGroupShifts] = useState<any[]>([])
  const [loadingShifts, setLoadingShifts] = useState(false)
  const [showAddShiftModal, setShowAddShiftModal] = useState(false)
  const [isCreatingShift, setIsCreatingShift] = useState(false)
  const [newShift, setNewShift] = useState({
    title: '',
    start_date: '',
    end_date: '',
    shift_type: 'hospital_fixo',
    hospital_name: '',
    assigned_user_id: '',
    backup_user_id: '',
    shift_value: '',
    professional_role: 'principal'
  })

  // 5. Agenda do Grupo
  const [groupProcedures, setGroupProcedures] = useState<any[]>([])
  const [loadingGroupAgendaState, setLoadingGroupAgendaState] = useState(false)
  const [agendaSelectedDate, setAgendaSelectedDate] = useState(new Date())
  const [agendaCurrentMonth, setAgendaCurrentMonth] = useState(new Date())
  
  // Modal de Detalhes/Edição de Procedimento na Agenda do Grupo
  const [showProcDetailsModal, setShowProcDetailsModal] = useState(false)
  const [selectedProc, setSelectedProc] = useState<any>(null)
  const [updatingProc, setUpdatingProc] = useState(false)
  const [deletingProc, setDeletingProc] = useState(false)

  const handleDeleteProcedure = async () => {
    if (!selectedProc) return
    if (!window.confirm('Tem certeza que deseja excluir este procedimento? Esta ação não pode ser desfeita.')) return
    
    try {
      setDeletingProc(true)
      const success = await procedureService.deleteProcedure(selectedProc.id)
      
      if (success) {
        addToast({ title: 'Procedimento excluído com sucesso!', variant: 'success' })
        setShowProcDetailsModal(false)
        if (activeTab === 'agenda') {
          loadGroupAgenda()
        } else if (activeTab === 'procedures') {
          loadTabProcedures(false)
        }
      } else {
        throw new Error('Falha ao excluir procedimento')
      }
    } catch (error: any) {
      addToast({ title: error.message || 'Erro ao excluir procedimento', variant: 'error' })
    } finally {
      setDeletingProc(false)
    }
  }
  const [procExecutorId, setProcExecutorId] = useState('')
  const [anesthesiologistConflict, setAnesthesiologistConflict] = useState<string | null>(null)
  // Campos editáveis do procedimento
  const [procEditData, setProcEditData] = useState<any>({})

  // 6. Aba Procedimentos do Grupo
  const [tabProceduresList, setTabProceduresList] = useState<any[]>([])
  const [tabProceduresSearch, setTabProceduresSearch] = useState('')
  const [tabProceduresStatusFilter, setTabProceduresStatusFilter] = useState('all')
  const [tabProceduresMemberFilter, setTabProceduresMemberFilter] = useState('all')
  const [tabProceduresStartDate, setTabProceduresStartDate] = useState('')
  const [tabProceduresEndDate, setTabProceduresEndDate] = useState('')
  const [tabProceduresTotalCount, setTabProceduresTotalCount] = useState(0)
  const [tabProceduresHasMore, setTabProceduresHasMore] = useState(false)
  const [tabProceduresLoading, setTabProceduresLoading] = useState(false)

  const formatProcDate = (dateStr: string) => {
    if (!dateStr) return ''
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy')
    } catch (e) {
      return dateStr
    }
  }

  const getTabStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-50'
      case 'pending':
        return 'bg-amber-50 text-amber-700 shadow-sm shadow-amber-50'
      case 'cancelled':
        return 'bg-slate-50 text-slate-600'
      case 'sent':
        return 'bg-blue-50 text-blue-700 shadow-sm shadow-blue-50'
      default:
        return 'bg-slate-50 text-slate-600 border-slate-100'
    }
  }

  const getTabStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Pago'
      case 'pending':
        return 'Pendente'
      case 'cancelled':
        return 'Aguardando'
      case 'sent':
        return 'Enviado'
      default:
        return 'Aguardando'
    }
  }

  // Helper: detecta conflito de horário para um anestesista na lista de procedimentos do dia
  const checkAnesthesiologistConflict = (anesthId: string, currentProcId: string, date: string, horario: string, durMinutes: number): string | null => {
    if (!anesthId || !horario || !date) return null
    const [hh, mm] = horario.split(':').map(Number)
    if (isNaN(hh) || isNaN(mm)) return null
    const startNew = hh * 60 + mm
    const endNew = startNew + (durMinutes || 60)

    const sameDay = groupProcedures.filter(p =>
      p.id !== currentProcId &&
      p.anesthesiologist_user_id === anesthId &&
      isSameDay(parseISO(p.procedure_date), parseISO(date))
    )

    for (const p of sameDay) {
      if (!p.horario) continue
      const [ph, pm] = p.horario.split(':').map(Number)
      if (isNaN(ph) || isNaN(pm)) continue
      const startExist = ph * 60 + pm
      const endExist = startExist + (p.duration_minutes || 60)
      // Overlap se os intervalos se intersectam
      if (startNew < endExist && endNew > startExist) {
        const endHH = Math.floor(endExist / 60).toString().padStart(2, '0')
        const endMM = (endExist % 60).toString().padStart(2, '0')
        return `Já escalado em "${p.procedure_name}" das ${p.horario} até ${endHH}:${endMM}`
      }
    }
    return null
  }

  const handleOpenProcDetails = (proc: any) => {
    setSelectedProc(proc)
    setProcExecutorId(proc.anesthesiologist_user_id || '')
    setAnesthesiologistConflict(null)
    setProcEditData({
      procedure_name: proc.procedure_name || '',
      procedure_date: proc.procedure_date?.split('T')[0] || '',
      horario: proc.horario || '',
      procedure_type: proc.procedure_type || '',
      tecnica_anestesica: proc.tecnica_anestesica || '',
      patient_name: proc.patient_name || '',
      hospital_clinic: proc.hospital_clinic || '',
      nome_cirurgiao: proc.nome_cirurgiao || proc.surgeon_name || '',
      payment_status: proc.payment_status || 'pending',
      payment_method: proc.payment_method || '',
      valor_total: proc.procedure_value ?? proc.valor_total ?? proc.total_amount ?? '',
      duration_minutes: proc.duration_minutes || 60,
      billing_entity_type: proc.billing_entity_type || '',
    })
    setShowProcDetailsModal(true)
  }

  const handleCnpjChange = (value: string) => {
    const numeric = value.replace(/\D/g, '').slice(0, 14)
    let formatted = numeric
    if (numeric.length > 12) {
      formatted = numeric.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/, '$1.$2.$3/$4-$5')
    } else if (numeric.length > 8) {
      formatted = numeric.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})/, '$1.$2.$3/$4')
    } else if (numeric.length > 5) {
      formatted = numeric.replace(/^(\d{2})(\d{3})(\d{0,3})/, '$1.$2.$3')
    } else if (numeric.length > 2) {
      formatted = numeric.replace(/^(\d{2})(\d{0,3})/, '$1.$2')
    }
    setEditCnpj(formatted)
  }

  const loadGroup = async () => {
    try {
      setLoading(true)
      const data = await getGroupDetails(id as string)
      setGroup(data)
      setEditName(data.name)
      setEditColor(data.color)
      setEditCnpj(data.cnpj || '')
      setEditType(data.type || 'sem_cotas')
      setEditShareFinancials(data.share_financials)
      setEditGoogleSheetsId(data.google_sheets_id || '')
      setEditGoogleSheetsEnabled(data.google_sheets_sync_enabled || false)
      
      const currentUserMember = data.group_members.find((m: any) => m.users?.id === user?.id)
      if (!currentUserMember) {
        addToast({ title: 'Acesso negado', variant: 'error' })
        router.push('/grupos')
        return
      }
      setIsAdmin(currentUserMember.role === 'admin')
      
      // Carregar dados adicionais com base na aba ativa
      if (activeTab === 'secretaries') {
        const secList = await getGroupSecretaries(id as string)
        setSecretaries(secList)
      } else if (activeTab === 'finance') {
        const closures = await getMonthlyClosings(id as string)
        setClosings(closures)
      } else if (activeTab === 'agenda') {
        loadGroupAgenda()
      } else if (activeTab === 'shifts') {
        loadShifts()
      } else if (activeTab === 'procedures') {
        loadTabProcedures(false)
      }
    } catch (error) {
      addToast({ title: 'Erro ao carregar grupo', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const loadGroupAgenda = async () => {
    try {
      setLoadingGroupAgendaState(true)
      const start = format(startOfMonth(agendaCurrentMonth), 'yyyy-MM-dd')
      const end = format(endOfMonth(agendaCurrentMonth), 'yyyy-MM-dd')
      
      const procs = await procedureService.getProceduresByDateRange(user!.id, start, end, id as string)
      procs.sort((a, b) => a.procedure_date.localeCompare(b.procedure_date))
      setGroupProcedures(procs)
    } catch (error) {
      addToast({ title: 'Erro ao carregar agenda do grupo', variant: 'error' })
    } finally {
      setLoadingGroupAgendaState(false)
    }
  }

  const handleUpdateProcedure = async () => {
    if (!selectedProc) return
    try {
      setUpdatingProc(true)
      
      const updates: any = {
        anesthesiologist_user_id: procExecutorId || null,
        procedure_name: procEditData.procedure_name || 'Procedimento', // Fallback caso esteja vazio
        procedure_date: procEditData.procedure_date,
        horario: procEditData.horario || null,
        tecnica_anestesica: procEditData.tecnica_anestesica || null,
        patient_name: procEditData.patient_name,
        hospital_clinic: procEditData.hospital_clinic || null,
        nome_cirurgiao: procEditData.nome_cirurgiao || null,
        payment_status: procEditData.payment_status,
        payment_method: procEditData.payment_method || null,
        procedure_value: procEditData.valor_total ? parseFloat(String(procEditData.valor_total).replace(',', '.')) : 0,
        duration_minutes: procEditData.duration_minutes ? parseInt(String(procEditData.duration_minutes)) : null,
        billing_entity_type: procEditData.billing_entity_type || null,
      }

      if (procEditData.procedure_type) {
        updates.procedure_type = procEditData.procedure_type
      }
      
      if (procExecutorId) {
        const memberObj = group.group_members.find((m: any) => m.users?.id === procExecutorId)
        if (memberObj?.users) {
          updates.anesthesiologist_name = memberObj.users.name
        }
      } else {
        updates.anesthesiologist_name = null
      }
      
      const updated = await procedureService.updateProcedure(selectedProc.id, updates)
      
      if (updated) {
        addToast({ title: 'Procedimento atualizado com sucesso!', variant: 'success' })
        loadGroupAgenda()
        if (activeTab === 'procedures') {
          loadTabProcedures(false)
        }
        setShowProcDetailsModal(false)
      } else {
        throw new Error('Falha ao atualizar procedimento')
      }
    } catch (error: any) {
      addToast({ title: error.message || 'Erro ao atualizar procedimento', variant: 'error' })
    } finally {
      setUpdatingProc(false)
    }
  }

  const loadShifts = async () => {
    try {
      setLoadingShifts(true)
      const { data, error } = await supabase
        .from('shifts')
        .select(`
          *,
          assigned:assigned_user_id (name, email),
          backup:backup_user_id (name, email)
        `)
        .eq('group_id', id as string)
        .order('start_date', { ascending: true })

      if (error) throw error
      setGroupShifts(data || [])
    } catch (error) {
      addToast({ title: 'Erro ao carregar escalas', variant: 'error' })
    } finally {
      setLoadingShifts(false)
    }
  }

  const loadTabProcedures = async (loadMore = false) => {
    try {
      setTabProceduresLoading(true)
      const currentOffset = loadMore ? tabProceduresList.length : 0
      
      let query = supabase
        .from('procedures')
        .select('*', { count: 'exact' })
        .eq('group_id', id as string)
        .order('procedure_date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(currentOffset, currentOffset + 9)

      if (tabProceduresSearch.trim() !== '') {
        const searchVal = `%${tabProceduresSearch.trim()}%`
        query = query.or(`patient_name.ilike.${searchVal},procedure_name.ilike.${searchVal},procedure_type.ilike.${searchVal},hospital.ilike.${searchVal}`)
      }

      if (tabProceduresStatusFilter !== 'all') {
        query = query.eq('payment_status', tabProceduresStatusFilter)
      }

      if (tabProceduresMemberFilter !== 'all') {
        query = query.or(`anesthesiologist_user_id.eq.${tabProceduresMemberFilter},user_id.eq.${tabProceduresMemberFilter}`)
      }

      if (tabProceduresStartDate) {
        query = query.gte('procedure_date', tabProceduresStartDate)
      }

      if (tabProceduresEndDate) {
        query = query.lte('procedure_date', tabProceduresEndDate)
      }

      const { data, count, error } = await query
      if (error) throw error

      if (data) {
        if (loadMore) {
          setTabProceduresList(prev => [...prev, ...data])
        } else {
          setTabProceduresList(data)
        }
        setTabProceduresTotalCount(count || 0)
        setTabProceduresHasMore((currentOffset + data.length) < (count || 0))
      }
    } catch (error) {
      console.error('Erro ao carregar procedimentos do grupo:', error)
      addToast({ title: 'Erro ao carregar procedimentos', variant: 'error' })
    } finally {
      setTabProceduresLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'procedures' && id) {
      loadTabProcedures(false)
    }
  }, [tabProceduresStatusFilter, tabProceduresMemberFilter, tabProceduresStartDate, tabProceduresEndDate])

  useEffect(() => {
    if (id && user) {
      loadGroup()
    }
  }, [id, user, activeTab, agendaCurrentMonth])

  // ==========================================
  // ABA: MEMBROS & COTAS - MÉTODOS
  // ==========================================
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail) return
    
    // Validar se soma das cotas excede 100%
    if (group.type === 'com_cotas' && inviteQuotaPercent) {
      const qVal = parseFloat(inviteQuotaPercent)
      if (isNaN(qVal) || qVal < 0 || qVal > 100) {
        addToast({ title: 'Cota deve estar entre 0% e 100%', variant: 'error' })
        return
      }
      
      const currentTotal = group.group_members.reduce((acc: number, m: any) => {
        return acc + (Number(m.quota_percent) || 0)
      }, 0)

      if (currentTotal + qVal > 100) {
        addToast({ 
          title: 'Limite excedido', 
          description: `A soma das cotas do grupo não pode ultrapassar 100%. Espaço disponível: ${(100 - currentTotal).toFixed(2)}%`,
          variant: 'error' 
        })
        return
      }
    }

    try {
      setIsInviting(true)
      const qPercent = group.type === 'com_cotas' && inviteQuotaPercent ? parseFloat(inviteQuotaPercent) : null
      const qSince = group.type === 'com_cotas' && inviteQuotaSince ? inviteQuotaSince : null
      await addGroupMember(id as string, inviteEmail, user?.id || '', 'member', qPercent, qSince)
      addToast({ title: 'Convite enviado com sucesso!', variant: 'success' })
      setInviteEmail('')
      setInviteQuotaPercent('')
      setInviteQuotaSince('')
      loadGroup()
    } catch (error: any) {
      addToast({ title: error.message || 'Erro ao convidar membro', variant: 'error' })
    } finally {
      setIsInviting(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Tem certeza que deseja remover este membro?')) return
    
    try {
      await removeGroupMember(id as string, memberId)
      addToast({ title: 'Membro removido', variant: 'success' })
      loadGroup()
    } catch (error) {
      addToast({ title: 'Erro ao remover membro', variant: 'error' })
    }
  }

  const handleSaveQuota = async (member: any) => {
    if (editQuotaPercent < 0 || editQuotaPercent > 100) {
      addToast({ title: 'Cota deve estar entre 0% e 100%', variant: 'error' })
      return
    }
    if (!editQuotaSince) {
      addToast({ title: 'Defina a data de vigência da cota', variant: 'error' })
      return
    }

    // Validar se soma das cotas excede 100%
    const currentTotal = group.group_members.reduce((acc: number, m: any) => {
      if (m.id === member.id) return acc
      return acc + (Number(m.quota_percent) || 0)
    }, 0)

    if (currentTotal + editQuotaPercent > 100) {
      addToast({ 
        title: 'Limite excedido', 
        description: `A soma das cotas do grupo não pode ultrapassar 100%. Espaço disponível: ${(100 - currentTotal).toFixed(2)}%`,
        variant: 'error' 
      })
      return
    }

    try {
      setSavingQuota(true)
      await updateMemberQuota(
        id as string,
        member.id,
        member.users.id,
        editQuotaPercent,
        editQuotaSince,
        user?.id || ''
      )
      addToast({ title: 'Cota atualizada com sucesso!', variant: 'success' })
      setEditingMemberId(null)
      loadGroup()
    } catch (error) {
      addToast({ title: 'Erro ao atualizar cota', variant: 'error' })
    } finally {
      setSavingQuota(false)
    }
  }

  const handleOpenHistory = async (memberUser: any) => {
    setHistoryUserId(memberUser.id)
    setHistoryUserName(memberUser.name)
    setShowHistoryModal(true)
    setLoadingHistory(true)
    try {
      const hist = await getMemberQuotaHistory(id as string, memberUser.id)
      setQuotaHistory(hist)
    } catch (error) {
      addToast({ title: 'Erro ao carregar histórico', variant: 'error' })
    } finally {
      setLoadingHistory(false)
    }
  }

  // ==========================================
  // ABA: SECRETÁRIAS - MÉTODOS
  // ==========================================
  const handleInviteSecretary = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteSecEmail) return
    setIsInvitingSec(true)
    try {
      const link = await inviteGroupSecretary(id as string, inviteSecEmail)
      setGeneratedLink(link)
      addToast({ title: 'Convite gerado!', variant: 'success' })
      // Recarregar secretárias
      const secList = await getGroupSecretaries(id as string)
      setSecretaries(secList)
    } catch (error: any) {
      addToast({ title: error.message || 'Erro ao convidar secretária', variant: 'error' })
    } finally {
      setIsInvitingSec(false)
    }
  }

  const handleOpenPermissions = async (sec: GroupSecretary) => {
    setSelectedSec(sec)
    setSecPermissions([])
    setShowPermsModal(true)
    try {
      const perms = await getSecretaryPermissions(sec.id)
      setSecPermissions(perms)
    } catch (error) {
      addToast({ title: 'Erro ao obter permissões', variant: 'error' })
    }
  }

  const handleSavePermissions = async () => {
    if (!selectedSec) return
    setSavingPerms(true)
    try {
      await updateSecretaryPermissions(selectedSec.id, secPermissions, user?.id || '')
      addToast({ title: 'Permissões atualizadas com sucesso!', variant: 'success' })
      setShowPermsModal(false)
    } catch (error) {
      addToast({ title: 'Erro ao salvar permissões', variant: 'error' })
    } finally {
      setSavingPerms(false)
    }
  }

  const handleRemoveSecretary = async (secId: string) => {
    if (!confirm('Deseja remover esta secretária do grupo?')) return
    try {
      await removeGroupSecretary(secId)
      addToast({ title: 'Secretária removida', variant: 'success' })
      const secList = await getGroupSecretaries(id as string)
      setSecretaries(secList)
    } catch (error) {
      addToast({ title: 'Erro ao remover secretária', variant: 'error' })
    }
  }

  // ==========================================
  // ABA: FECHAMENTO - MÉTODOS
  // ==========================================
  const handleSimulateClosing = async () => {
    if (!closingMonth) {
      addToast({ title: 'Selecione o mês de referência', variant: 'error' })
      return
    }
    setIsSimulating(true)
    setSimulatedData(null)
    try {
      const response = await fetch('/api/groups/closings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: id as string,
          referenceMonth: closingMonth,
          action: 'simulate'
        })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setSimulatedData(data)
    } catch (error: any) {
      addToast({ title: 'Erro na simulação', description: error.message, variant: 'error' })
    } finally {
      setIsSimulating(false)
    }
  }

  const handleConfirmClosing = async () => {
    if (!closingMonth) return
    setIsClosingMonth(true)
    try {
      const response = await fetch('/api/groups/closings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: id as string,
          referenceMonth: closingMonth,
          action: 'close'
        })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      
      addToast({ title: 'Mês fechado com sucesso!', variant: 'success' })
      setSimulatedData(null)
      setClosingMonth('')
      // Atualizar lista de fechamentos
      const closures = await getMonthlyClosings(id as string)
      setClosings(closures)
    } catch (error: any) {
      addToast({ title: 'Erro ao fechar mês', description: error.message, variant: 'error' })
    } finally {
      setIsClosingMonth(false)
    }
  }

  const handleViewClosingDetails = async (closingId: string) => {
    try {
      const data = await getClosingDetails(closingId)
      setSelectedClosing(data)
      setShowClosingDetails(true)
    } catch (error) {
      addToast({ title: 'Erro ao abrir detalhes', variant: 'error' })
    }
  }

  const handleReopenClosing = async () => {
    if (!reopenClosingId || !reopenReason) {
      addToast({ title: 'Motivo é obrigatório', variant: 'error' })
      return
    }
    setIsReopening(true)
    try {
      const response = await fetch('/api/groups/closings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reopen',
          closingId: reopenClosingId,
          reason: reopenReason
        })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      addToast({ title: 'Fechamento reaberto com sucesso!', variant: 'success' })
      setShowReopenModal(false)
      setReopenReason('')
      setReopenClosingId(null)
      // Atualizar lista
      const closures = await getMonthlyClosings(id as string)
      setClosings(closures)
    } catch (error: any) {
      addToast({ title: 'Erro ao reabrir', description: error.message, variant: 'error' })
    } finally {
      setIsReopening(false)
    }
  }

  // ==========================================
  // ABA: ESCALAS - MÉTODOS
  // ==========================================
  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newShift.title || !newShift.start_date || !newShift.end_date) {
      addToast({ title: 'Preencha título, início e fim', variant: 'error' })
      return
    }
    setIsCreatingShift(true)
    try {
      const { error } = await supabase
        .from('shifts')
        .insert({
          group_id: id as string,
          title: newShift.title,
          start_date: newShift.start_date,
          end_date: newShift.end_date,
          shift_type: newShift.shift_type,
          hospital_name: newShift.hospital_name || null,
          assigned_user_id: newShift.assigned_user_id || null,
          backup_user_id: newShift.backup_user_id || null,
          shift_value: newShift.shift_value ? parseFloat(newShift.shift_value) : null,
          professional_role: newShift.professional_role || 'principal',
          user_id: user?.id // Criador
        })

      if (error) throw error
      addToast({ title: 'Plantão criado com sucesso!', variant: 'success' })
      setShowAddShiftModal(false)
      setNewShift({
        title: '',
        start_date: '',
        end_date: '',
        shift_type: 'hospital_fixo',
        hospital_name: '',
        assigned_user_id: '',
        backup_user_id: '',
        shift_value: '',
        professional_role: 'principal'
      })
      loadShifts()
    } catch (error: any) {
      addToast({ title: 'Erro ao criar plantão', description: error.message, variant: 'error' })
    } finally {
      setIsCreatingShift(false)
    }
  }

  const handleDeleteShift = async (shiftId: string) => {
    if (!confirm('Deseja excluir este plantão?')) return
    try {
      const { error } = await supabase.from('shifts').delete().eq('id', shiftId)
      if (error) throw error
      addToast({ title: 'Plantão removido', variant: 'success' })
      loadShifts()
    } catch (error: any) {
      addToast({ title: 'Erro ao remover plantão', variant: 'error' })
    }
  }

  const handleClaimShift = async (shiftId: string) => {
    try {
      const { error } = await supabase
        .from('shifts')
        .update({ assigned_user_id: user?.id })
        .eq('id', shiftId)
      if (error) throw error
      addToast({ title: 'Você assumiu este plantão!', variant: 'success' })
      loadShifts()
    } catch (error: any) {
      addToast({ title: 'Erro ao assumir plantão', variant: 'error' })
    }
  }

  // ==========================================
  // ABA: CONFIGURAÇÕES - MÉTODOS
  // ==========================================
  const handleUpdateGroup = async () => {
    try {
      await updateGroup(id as string, {
        name: editName,
        color: editColor,
        cnpj: editCnpj,
        type: editType,
        share_financials: editShareFinancials,
        google_sheets_id: editGoogleSheetsId,
        google_sheets_sync_enabled: editGoogleSheetsEnabled
      })
      addToast({ title: 'Configurações atualizadas!', variant: 'success' })
      loadGroup()
    } catch (error) {
      addToast({ title: 'Erro ao atualizar grupo', variant: 'error' })
    }
  }

  const handleDeleteGroup = async () => {
    if (!confirm('ATENÇÃO: Isso excluirá o grupo PERMANENTEMENTE. Deseja continuar?')) return
    try {
      await deleteGroup(id as string)
      addToast({ title: 'Grupo excluído', variant: 'success' })
      router.push('/grupos')
    } catch (error) {
      addToast({ title: 'Erro ao excluir grupo', variant: 'error' })
    }
  }

  const handleSyncSheets = async () => {
    try {
      setSyncing(true)
      const result = await googleSheetsService.syncFromSheetToApp(id as string)
      if (result.success) {
        addToast({ 
          title: result.simulated ? 'Modo Simulação' : 'Sincronização concluída!', 
          description: result.simulated ? 'Configure as chaves do Google para sincronizar de verdade.' : `Importados ${result.count} registros.`,
          variant: 'success' 
        })
        loadGroup()
      }
    } catch (error) {
      addToast({ title: 'Erro ao sincronizar planilha.', variant: 'error' })
    } finally {
      setSyncing(false)
    }
  }

  if (loading || !group) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-600"></div>
          </div>
        </Layout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="p-3 sm:p-4 md:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-8 animate-in fade-in duration-500">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 pb-4 sm:pb-6 border-b border-slate-100">
            <div className="flex items-center gap-3 sm:gap-4">
              <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full transition-colors shrink-0">
                <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight truncate">{group.name}</h1>
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full shadow-sm shrink-0" style={{ backgroundColor: group.color }} />
                  <span className="text-[10px] sm:text-xs bg-slate-100 text-slate-600 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full font-bold uppercase">
                    {group.type === 'com_cotas' ? 'Com Cotas' : 'Sem Cotas'}
                  </span>
                </div>
                <p className="text-xs sm:text-base text-slate-500 font-medium truncate">{group.cnpj ? `CNPJ: ${group.cnpj}` : 'Gestão de equipe anestésica'}</p>
              </div>
            </div>
          </header>

          <main className="min-h-[50vh]">
            {/* ==========================================
                TAB: MEMBROS & COTAS
                ========================================== */}
            {activeTab === 'members' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <section className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                    <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                      <div>
                        <h2 className="text-lg font-black text-slate-900">Membros da Equipe</h2>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{group.group_members.length} Anestesistas</p>
                      </div>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {group.group_members.map((member: any) => (
                        <div key={member.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors group">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 border border-teal-100 font-bold">
                              {member.users.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 flex items-center gap-2">
                                {member.users.name}
                                {member.role === 'admin' && <Shield className="w-4 h-4 text-amber-500" title="Admin" />}
                              </p>
                              <p className="text-xs text-slate-500">{member.users.email}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold uppercase">
                                  CRM {member.users.crm || 'N/A'}
                                </span>
                                {group.type === 'com_cotas' && (
                                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold">
                                    Cota: {member.quota_percent ? `${member.quota_percent}%` : 'Sem cota'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end md:self-center">
                            {group.type === 'com_cotas' && (
                              <button
                                onClick={() => handleOpenHistory(member.users)}
                                className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 font-bold transition-all flex items-center gap-1"
                              >
                                <Clock className="w-3.5 h-3.5" />
                                Histórico
                              </button>
                            )}

                            {isAdmin && editingMemberId !== member.id && (
                              <button
                                onClick={() => {
                                  setEditingMemberId(member.id)
                                  setEditQuotaPercent(member.quota_percent || 0)
                                  setEditQuotaSince(member.quota_since || new Date().toISOString().split('T')[0])
                                }}
                                className="px-3 py-1.5 text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl font-bold transition-all"
                              >
                                Ajustar Cota
                              </button>
                            )}

                            {isAdmin && member.users.id !== user?.id && (
                              <button
                                onClick={() => handleRemoveMember(member.id)}
                                className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {/* INLINE EDIT QUOTA */}
                          {editingMemberId === member.id && (
                            <div className="w-full md:w-auto flex flex-wrap items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 mt-2 md:mt-0">
                              <div className="w-24">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Cota %</label>
                                <input
                                  type="number"
                                  value={editQuotaPercent}
                                  onChange={(e) => setEditQuotaPercent(parseFloat(e.target.value) || 0)}
                                  className="w-full px-2 py-1 text-sm border rounded bg-white font-bold"
                                  min="0" max="100" step="0.1"
                                />
                              </div>
                              <div className="w-32">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Data Vigência</label>
                                <input
                                  type="date"
                                  value={editQuotaSince}
                                  onChange={(e) => setEditQuotaSince(e.target.value)}
                                  className="w-full px-2 py-1 text-sm border rounded bg-white text-xs"
                                />
                              </div>
                              <div className="flex gap-1 mt-4">
                                <button
                                  onClick={() => handleSaveQuota(member)}
                                  disabled={savingQuota}
                                  className="p-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingMemberId(null)}
                                  className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                <aside className="space-y-6">
                  {isAdmin && (
                    <section className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 p-6 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-teal-600 p-2 rounded-xl text-white">
                          <UserPlus className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">Convidar Médico</h2>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">Adicione outros anestesistas ao grupo inserindo seu e-mail ou CRM.</p>
                      <form onSubmit={handleInvite} className="space-y-4">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">E-mail ou CRM</label>
                          <input
                            type="text"
                            placeholder="E-mail ou CRM"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none text-sm font-medium focus:border-teal-500 transition-colors"
                            required
                          />
                        </div>

                        {group.type === 'com_cotas' && (
                          <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-200">
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Cota Inicial %</label>
                              <input
                                type="number"
                                placeholder="ex: 15"
                                value={inviteQuotaPercent}
                                onChange={(e) => setInviteQuotaPercent(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none text-sm font-semibold focus:border-teal-500 transition-colors"
                                min="0"
                                max="100"
                                step="0.1"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Vigência de</label>
                              <input
                                type="date"
                                value={inviteQuotaSince}
                                onChange={(e) => setInviteQuotaSince(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none text-xs focus:border-teal-500 transition-colors"
                              />
                            </div>
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={isInviting}
                          className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                        >
                          {isInviting ? 'Enviando...' : 'Enviar Convite'}
                        </button>
                      </form>
                    </section>
                  )}
                </aside>
              </div>
            )}

            {/* ==========================================
                TAB: SECRETÁRIAS
                ========================================== */}
            {activeTab === 'secretaries' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <section className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                    <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                      <div>
                        <h2 className="text-lg font-black text-slate-900">Secretárias de Grupo</h2>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{secretaries.length} Contas de Secretárias</p>
                      </div>
                    </div>
                    {secretaries.length === 0 ? (
                      <div className="p-8 text-center text-slate-400">Nenhuma secretária associada a este grupo.</div>
                    ) : (
                      <div className="divide-y divide-slate-50">
                        {secretaries.map(sec => (
                          <div key={sec.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                            <div>
                              <p className="font-bold text-slate-950">{sec.nome}</p>
                              <p className="text-xs text-slate-500">{sec.email} • {sec.telefone}</p>
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold uppercase mt-1 inline-block">
                                Status: {sec.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleOpenPermissions(sec)}
                                className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all flex items-center gap-1"
                              >
                                Permissões
                              </button>
                              <button
                                onClick={() => handleRemoveSecretary(sec.id)}
                                className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>

                <aside className="space-y-6">
                  {isAdmin && (
                    <section className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 p-6 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-teal-600 p-2 rounded-xl text-white">
                          <UserPlus className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">Novo Convite</h2>
                      </div>
                      <p className="text-xs text-slate-500">Convide uma nova secretária para gerenciar as agendas do grupo.</p>
                      <form onSubmit={handleInviteSecretary} className="space-y-3">
                        <input
                          type="email"
                          placeholder="email@secretaria.com"
                          value={inviteSecEmail}
                          onChange={(e) => setInviteSecEmail(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none text-sm font-medium"
                          required
                        />
                        <button
                          type="submit"
                          disabled={isInvitingSec}
                          className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl text-sm font-bold transition-all"
                        >
                          {isInvitingSec ? 'Enviando...' : 'Gerar Convite'}
                        </button>
                      </form>

                      {generatedLink && (
                        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl mt-4 space-y-2">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Link gerado:</p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={generatedLink}
                              readOnly
                              className="w-full px-2 py-1 text-xs border rounded bg-white text-slate-600"
                            />
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(generatedLink)
                                setShowCopySecSuccess(true)
                                setTimeout(() => setShowCopySecSuccess(false), 2000)
                              }}
                              className="p-1.5 border hover:bg-slate-100 rounded"
                            >
                              {showCopySecSuccess ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                            </button>
                          </div>
                        </div>
                      )}
                    </section>
                  )}
                </aside>
              </div>
            )}

            {/* ==========================================
                TAB: FECHAMENTO FINANCEIRO
                ========================================== */}
            {activeTab === 'finance' && (
              <div className="space-y-6">
                {/* Dashboard Financeiro com Gráficos */}
                {group && (
                  <FinanceiroDashboardWrapper groupId={id as string} groupName={group.name} groupMembers={group.group_members || []} currentUserId={user?.id} />
                )}

                <hr className="border-stone-200" />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Simular e Fechar Mês */}
                  <div className="lg:col-span-1">
                    <section className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 p-6 space-y-4">
                      <h3 className="text-lg font-bold text-slate-900">Iniciar Fechamento</h3>
                      <p className="text-xs text-slate-500 font-medium">Selecione o mês desejado para calcular os repasses por cota.</p>
                      
                      <div className="space-y-3">
                        <input
                          type="month"
                          value={closingMonth}
                          onChange={(e) => setClosingMonth(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none text-sm"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleSimulateClosing}
                            disabled={isSimulating}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 py-3 rounded-xl text-sm font-bold transition-all"
                          >
                            {isSimulating ? 'Calculando...' : 'Simular'}
                          </button>
                          {isAdmin && simulatedData && (
                            <button
                              onClick={handleConfirmClosing}
                              disabled={isClosingMonth}
                              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-xl text-sm font-bold transition-all"
                            >
                              {isClosingMonth ? 'Fechando...' : 'Efetuar Fechamento'}
                            </button>
                          )}
                        </div>
                      </div>
                    </section>
                  </div>

                  {/* Painel da Simulação */}
                  <div className="lg:col-span-2">
                    {simulatedData ? (
                      <section className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 p-6 space-y-6 animate-in slide-in-from-top-4 duration-300">
                        <div className="flex justify-between items-center pb-4 border-b">
                          <div>
                            <h3 className="text-lg font-bold text-slate-900">Simulação de Repasses</h3>
                            <p className="text-xs text-slate-500">Mês de Referência: {closingMonth}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-2xl font-black text-teal-600">{formatCurrency(simulatedData.totalRevenue)}</span>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Total Faturado</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Divisão de Repasse por Membro</h4>
                          <div className="divide-y border rounded-2xl overflow-hidden bg-slate-50/50">
                            {simulatedData.distributions.map((dist, idx) => (
                              <div key={idx} className="p-4 flex justify-between items-center">
                                <div>
                                  <p className="font-bold text-slate-900">{dist.user?.name || 'Médico'}</p>
                                  {group.type === 'com_cotas' ? (
                                    <p className="text-[10px] text-slate-500">Cota de {dist.quota_percent}%</p>
                                  ) : (
                                    <p className="text-[10px] text-slate-500">Procedimentos individuais executados</p>
                                  )}
                                </div>
                                <span className="font-extrabold text-slate-900">{formatCurrency(dist.gross_amount)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </section>
                    ) : (
                      <div className="bg-slate-50 border border-slate-100 rounded-3xl p-12 text-center text-slate-400">
                        Selecione um mês e clique em Simular para visualizar os cálculos de repasse.
                      </div>
                    )}
                  </div>
                </div>

                {/* Histórico de Fechamentos */}
                <section className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                  <div className="p-6 border-b border-slate-50 bg-slate-50/50">
                    <h3 className="text-lg font-bold text-slate-950">Histórico de Fechamentos</h3>
                  </div>
                  {closings.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">Nenhum fechamento registrado no grupo.</div>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      {closings.map(c => (
                        <div key={c.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors">
                          <div className="min-w-0">
                            <p className="font-bold text-slate-950 text-sm sm:text-base truncate">
                              Ref: {new Date(c.reference_month + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                            </p>
                            <p className="text-xs text-slate-500">Total: {formatCurrency(c.total_revenue)}</p>
                            <span className="text-[10px] bg-teal-50 text-teal-700 px-2.5 py-0.5 rounded font-black uppercase mt-1 inline-block">
                              {c.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleViewClosingDetails(c.id)}
                              className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition-all flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" /> Detalhes
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => {
                                  setReopenClosingId(c.id)
                                  setShowReopenModal(true)
                                }}
                                className="px-3 py-1.5 text-xs border border-red-100 hover:bg-red-50 text-red-600 font-bold rounded-xl transition-all"
                              >
                                Reabrir
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* ==========================================
                TAB: ESCALAS
                ========================================== */}
            {activeTab === 'shifts' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-200">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">Escalas da Equipe</h3>
                    <p className="text-xs text-slate-500 font-medium">Gerenciamento e cobertura de plantões.</p>
                  </div>
                  <button
                    onClick={() => setShowAddShiftModal(true)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-md transition-all text-xs w-full sm:w-auto"
                  >
                    <Plus className="w-4 h-4" /> Novo Plantão
                  </button>
                </div>

                {loadingShifts ? (
                  <div className="p-8 text-center text-slate-400 animate-pulse">Carregando plantões...</div>
                ) : groupShifts.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400">
                    Nenhum plantão cadastrado para este grupo.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groupShifts.map(shift => (
                      <div key={shift.id} className="bg-white rounded-3xl border border-slate-100 shadow-lg p-6 space-y-4 hover:shadow-xl transition-shadow relative">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold uppercase">
                              {shift.shift_type.replace('_', ' ')}
                            </span>
                            <h4 className="font-black text-slate-950 mt-1">{shift.title}</h4>
                            <p className="text-xs text-slate-500">{shift.hospital_name || 'Hospital não definido'}</p>
                          </div>
                          {shift.shift_value && (
                            <span className="font-extrabold text-sm text-slate-900">{formatCurrency(shift.shift_value)}</span>
                          )}
                        </div>

                        <div className="text-xs text-slate-600 space-y-1">
                          <p><strong>Início:</strong> {new Date(shift.start_date).toLocaleString()}</p>
                          <p><strong>Fim:</strong> {new Date(shift.end_date).toLocaleString()}</p>
                        </div>

                        <div className="pt-4 border-t space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500">Escalado:</span>
                            {shift.assigned ? (
                              <span className="font-bold text-slate-800">
                                {shift.assigned.name} {shift.professional_role ? `(${shift.professional_role === 'principal' ? 'Principal' : 'Auxiliar'})` : ''}
                              </span>
                            ) : (
                              <span className="text-amber-600 font-bold flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" /> Aberto
                              </span>
                            )}
                          </div>
                          {shift.backup && (
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-500">Reserva/Backup:</span>
                              <span className="font-bold text-slate-800">{shift.backup.name}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 pt-2">
                          {!shift.assigned_user_id && (
                            <button
                              onClick={() => handleClaimShift(shift.id)}
                              className="flex-1 text-center bg-teal-50 hover:bg-teal-100 text-teal-700 py-2 rounded-xl text-xs font-bold transition-all"
                            >
                              Assumir Plantão
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteShift(shift.id)}
                            className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ==========================================
                TAB: AGENDA DO GRUPO
                ========================================== */}
            {activeTab === 'agenda' && (
              <div className="space-y-4 sm:space-y-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-200">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">Agenda de Procedimentos</h3>
                    <p className="text-xs text-slate-500 font-medium">Calendário de cirurgias e procedimentos do grupo.</p>
                  </div>
                  <Link
                    href={`/procedimentos/novo?groupId=${id}`}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-md transition-all text-xs w-full sm:w-auto"
                  >
                    <Plus className="w-4 h-4" /> Novo Procedimento
                  </Link>
                </div>

                <div className="flex flex-col lg:flex-row gap-4 sm:gap-8">
                  {/* COLUNA ESQUERDA: Mini Calendário */}
                  <div className="w-full lg:w-80 shrink-0 space-y-4 sm:space-y-6">
                    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-lg p-4 sm:p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-slate-900 capitalize">
                          {format(agendaCurrentMonth, 'MMMM yyyy', { locale: ptBR })}
                        </h3>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => setAgendaCurrentMonth(subMonths(agendaCurrentMonth, 1))} 
                            className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setAgendaCurrentMonth(addMonths(agendaCurrentMonth, 1))} 
                            className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400"
                          >
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
                        {Array.from({ length: new Date(agendaCurrentMonth.getFullYear(), agendaCurrentMonth.getMonth(), 1).getDay() }).map((_, i) => (
                          <div key={`pad-${i}`} />
                        ))}
                        
                        {eachDayOfInterval({ 
                          start: startOfMonth(agendaCurrentMonth), 
                          end: endOfMonth(agendaCurrentMonth) 
                        }).map((day, i) => {
                          const isSelected = isSameDay(day, agendaSelectedDate)
                          const isToday = isSameDay(day, new Date())
                          const hasEvents = groupProcedures.some(p => isSameDay(parseISO(p.procedure_date), day))

                          return (
                            <button
                              key={i}
                              onClick={() => setAgendaSelectedDate(day)}
                              className={cn(
                                "relative h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded-xl text-xs sm:text-sm font-semibold transition-all",
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
                  </div>

                  {/* COLUNA DIREITA: Procedimentos do Dia */}
                  <div className="flex-1 space-y-4">
                    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 p-4 sm:p-6 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 mb-4 sm:mb-6">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600 shrink-0" />
                          <h4 className="font-extrabold text-slate-900 capitalize text-sm sm:text-base truncate">
                            {format(agendaSelectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                          </h4>
                        </div>
                        {(() => {
                          const count = groupProcedures.filter(p => isSameDay(parseISO(p.procedure_date), agendaSelectedDate)).length
                          return count > 0 ? (
                            <span className="flex items-center gap-1.5 bg-teal-50 text-teal-700 border border-teal-100 text-xs font-bold px-3 py-1.5 rounded-xl">
                              <CalendarDays className="w-3.5 h-3.5" />
                              {count} {count === 1 ? 'procedimento' : 'procedimentos'}
                            </span>
                          ) : null
                        })()}
                      </div>

                      {loadingGroupAgendaState ? (
                        <div className="p-8 text-center text-slate-400 animate-pulse">Carregando procedimentos...</div>
                      ) : groupProcedures.filter(p => isSameDay(parseISO(p.procedure_date), agendaSelectedDate)).length === 0 ? (
                        <div className="text-center py-12 text-slate-400 border border-slate-200 border-dashed rounded-2xl bg-slate-50/50">
                          Nenhum procedimento agendado para este dia.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {groupProcedures
                            .filter(p => isSameDay(parseISO(p.procedure_date), agendaSelectedDate))
                            .map((proc) => {
                              const conflict = proc.anesthesiologist_user_id ? checkAnesthesiologistConflict(
                                proc.anesthesiologist_user_id,
                                proc.id,
                                proc.procedure_date,
                                proc.horario || '',
                                proc.duration_minutes || 60
                              ) : null;
                              return (
                                <div
                                  key={proc.id}
                                  onClick={() => handleOpenProcDetails(proc)}
                                  className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-teal-200 transition-all p-3 sm:p-5 flex flex-col md:flex-row justify-between md:items-center gap-3 sm:gap-4 cursor-pointer group"
                                >
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold uppercase">
                                        {proc.procedure_type}
                                      </span>
                                      {proc.horario && (
                                        <span className="text-[10px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                                          <Clock className="w-3 h-3" /> {proc.horario}
                                        </span>
                                      )}
                                      <span className={cn(
                                        "px-2 py-0.5 text-[10px] font-bold rounded uppercase",
                                        getTabStatusColor(proc.payment_status)
                                      )}>
                                        {getTabStatusText(proc.payment_status)}
                                      </span>
                                    </div>
                                    
                                    <h5 className="font-extrabold text-slate-900 text-sm sm:text-base">
                                      {proc.procedure_name}
                                    </h5>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                                      <p className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> Paciente: <span className="text-slate-800 font-bold">{proc.patient_name}</span></p>
                                      {proc.hospital_clinic && (
                                        <p className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {proc.hospital_clinic}</p>
                                      )}
                                      {(proc.nome_cirurgiao || proc.surgeon_name) && (
                                        <p className="flex items-center gap-1"><Stethoscope className="w-3.5 h-3.5" /> Cirurgião: {proc.nome_cirurgiao || proc.surgeon_name}</p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex flex-col items-start md:items-end justify-between gap-3 border-t md:border-t-0 pt-3 md:pt-0">
                                    <div className="text-xs">
                                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Anestesista</span>
                                      <span className="font-extrabold text-slate-800">
                                        {proc.anesthesiologist_name || 'Não atribuído'}
                                      </span>
                                      {conflict && (
                                        <div className="mt-1 flex items-start gap-1 text-[10px] font-bold text-red-600 bg-red-50 p-1.5 rounded leading-tight max-w-[200px]">
                                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                          <span className="break-words">{conflict}</span>
                                        </div>
                                      )}
                                    </div>
                                    <span className="text-[10px] font-extrabold text-teal-600 group-hover:text-teal-700 bg-teal-50 group-hover:bg-teal-100/80 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all">
                                      <Eye className="w-3.5 h-3.5" /> Ver / Editar
                                    </span>
                                  </div>
                                </div>
                              )
                            })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ==========================================
                TAB: PROCEDIMENTOS DO GRUPO
                ========================================== */}
            {activeTab === 'procedures' && (
              <div className="space-y-6">
                {/* CARD DE FILTROS E BUSCA */}
                <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 p-4 sm:p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 sm:gap-4 items-end">
                    {/* Barra de Pesquisa */}
                    <div className="md:col-span-4 space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Buscar</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={tabProceduresSearch}
                          onChange={(e) => setTabProceduresSearch(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') loadTabProcedures(false)
                          }}
                          placeholder="Paciente, hospital, tipo..."
                          className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 focus:border-teal-500 outline-none transition-all font-medium text-sm"
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      </div>
                    </div>

                    {/* Status de Pagamento */}
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Status</label>
                      <select
                        value={tabProceduresStatusFilter}
                        onChange={(e) => setTabProceduresStatusFilter(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-teal-500 outline-none transition-all font-medium bg-white text-sm"
                      >
                        <option value="all">Todos</option>
                        <option value="paid">Pago</option>
                        <option value="pending">Pendente</option>
                        <option value="cancelled">Aguardando</option>
                        <option value="sent">Enviado</option>
                      </select>
                    </div>

                    {/* Executor / Membro */}
                    <div className="md:col-span-3 space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Executor</label>
                      <select
                        value={tabProceduresMemberFilter}
                        onChange={(e) => setTabProceduresMemberFilter(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-teal-500 outline-none transition-all font-medium bg-white text-sm"
                      >
                        <option value="all">Todos</option>
                        {group.group_members.map((m: any) => (
                          <option key={m.users.id} value={m.users.id}>
                            {m.users.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Datas Início/Fim */}
                    <div className="md:col-span-3 space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Período</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          value={tabProceduresStartDate}
                          onChange={(e) => setTabProceduresStartDate(e.target.value)}
                          className="w-full px-3 py-3 rounded-2xl border border-slate-200 focus:border-teal-500 outline-none transition-all font-medium text-xs"
                        />
                        <input
                          type="date"
                          value={tabProceduresEndDate}
                          onChange={(e) => setTabProceduresEndDate(e.target.value)}
                          className="w-full px-3 py-3 rounded-2xl border border-slate-200 focus:border-teal-500 outline-none transition-all font-medium text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Ações adicionais: Buscar e Limpar */}
                  <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-50">
                    {(tabProceduresSearch || tabProceduresStatusFilter !== 'all' || tabProceduresMemberFilter !== 'all' || tabProceduresStartDate || tabProceduresEndDate) && (
                      <button
                        onClick={() => {
                          setTabProceduresSearch('')
                          setTabProceduresStatusFilter('all')
                          setTabProceduresMemberFilter('all')
                          setTabProceduresStartDate('')
                          setTabProceduresEndDate('')
                          setTimeout(() => loadTabProcedures(false), 50)
                        }}
                        className="px-5 py-2.5 rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold text-xs transition-all"
                      >
                        Limpar Filtros
                      </button>
                    )}
                    <button
                      onClick={() => loadTabProcedures(false)}
                      className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-2xl font-bold text-xs transition-all shadow-md shadow-teal-100 flex items-center gap-2"
                    >
                      <Search className="w-3.5 h-3.5" />
                      Buscar
                    </button>
                  </div>
                </div>

                {/* PROCEDURES CONTAINER */}
                {tabProceduresLoading && tabProceduresList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50">
                    <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-slate-500 text-sm font-bold">Carregando procedimentos...</p>
                  </div>
                ) : tabProceduresList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 text-center px-6">
                    <div className="w-16 h-16 bg-slate-50 border border-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mb-4">
                      <FileText className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-black text-slate-800">Nenhum procedimento encontrado</h3>
                    <p className="text-slate-400 text-sm mt-1 max-w-sm">
                      Nenhum lançamento foi encontrado para os filtros selecionados neste grupo.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Grid de Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {tabProceduresList.map((proc) => {
                        const executorName = proc.anesthesiologist_user_id 
                          ? (group.group_members.find((m: any) => m.users?.id === proc.anesthesiologist_user_id)?.users?.name || proc.anesthesiologist_name || 'Membro do Grupo')
                          : (group.group_members.find((m: any) => m.users?.id === proc.user_id)?.users?.name || 'Criador do Lançamento')

                        const conflict = proc.anesthesiologist_user_id ? checkAnesthesiologistConflict(
                          proc.anesthesiologist_user_id,
                          proc.id,
                          proc.procedure_date,
                          proc.horario || '',
                          proc.duration_minutes || 60
                        ) : null;

                        return (
                          <div 
                            key={proc.id} 
                            className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col justify-between hover:shadow-slate-300/40 hover:border-slate-200/60 transition-all group"
                          >
                            <div className="p-6 space-y-4">
                              {/* Header Card */}
                              <div className="flex justify-between items-start gap-2">
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider truncate max-w-[150px]" title={proc.procedure_type}>
                                  {proc.procedure_type}
                                </span>
                                <span className="text-xs text-slate-400 font-bold">
                                  {formatProcDate(proc.procedure_date)}
                                </span>
                              </div>

                              {/* Patient Name */}
                              <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Paciente</p>
                                <h4 className="font-black text-slate-900 text-base leading-tight truncate mt-0.5" title={proc.patient_name}>
                                  {proc.patient_name}
                                </h4>
                              </div>

                              {/* Details Info */}
                              <div className="space-y-2 pt-2 border-t border-slate-50 text-xs">
                                {/* Cirurgia / Procedimento */}
                                <p className="text-slate-600 font-medium truncate flex items-center gap-1.5" title={proc.procedure_name || proc.procedure_type}>
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                  <span className="font-bold text-slate-400">Cirurgia:</span>
                                  <span className="text-slate-800 font-bold">{proc.procedure_name || proc.procedure_type || 'Não informada'}</span>
                                </p>

                                {/* Cirurgião */}
                                <p className="text-slate-600 font-medium truncate flex items-center gap-1.5" title={proc.surgeon_name || proc.nome_cirurgiao}>
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                  <span className="font-bold text-slate-400">Cirurgião:</span>
                                  <span className="text-slate-800 font-bold">
                                    {proc.surgeon_name || proc.nome_cirurgiao || 'Não informado'}
                                  </span>
                                </p>

                                {/* Anestesista Responsável */}
                                <div className="flex flex-col gap-1">
                                  <div className="text-slate-600 font-medium flex items-center gap-1.5 truncate">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                    <span className="font-bold text-slate-400">Anestesista:</span>
                                    <span className="text-slate-800 font-bold">Dr(a). {executorName}</span>
                                  </div>
                                  {conflict && (
                                    <div className="mt-0.5 mb-1 flex items-start gap-1 text-[10px] font-bold text-red-600 bg-red-50 p-1.5 rounded leading-tight w-full">
                                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                      <span className="break-words">{conflict}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Hospital */}
                                {proc.hospital && (
                                  <p className="text-slate-500 font-medium truncate flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                    <span className="font-bold text-slate-400">Hospital:</span>
                                    <span className="text-slate-600 font-semibold">{proc.hospital}</span>
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Bottom Card */}
                            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between">
                              <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Valor</p>
                                <p className="font-extrabold text-teal-600 text-sm">
                                  {formatCurrency(proc.procedure_value || 0)}
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "px-2.5 py-1 text-[10px] font-black rounded-full uppercase tracking-wider",
                                  getTabStatusColor(proc.payment_status)
                                )}>
                                  {getTabStatusText(proc.payment_status)}
                                </span>
                                
                                <button
                                  onClick={() => handleOpenProcDetails(proc)}
                                  className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-700 transition-all shadow-sm"
                                  title="Ver Detalhes"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Pagination Button */}
                    {tabProceduresHasMore && (
                      <div className="flex justify-center pt-4">
                        <button
                          onClick={() => loadTabProcedures(true)}
                          disabled={tabProceduresLoading}
                          className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-6 py-3 rounded-2xl font-bold text-xs transition-all shadow-md shadow-slate-100 flex items-center gap-2 hover:scale-[1.02] disabled:opacity-50"
                        >
                          {tabProceduresLoading ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-slate-700 border-t-transparent rounded-full animate-spin" />
                              Carregando...
                            </>
                          ) : (
                            'Ver mais'
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ==========================================
                TAB: CONFIGURAÇÕES
                ========================================== */}
            {activeTab === 'settings' && (
              <section className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 p-4 sm:p-8 space-y-4 sm:space-y-6">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <Settings className="w-6 h-6 text-teal-600" />
                    Editar Grupo
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Nome do Grupo</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:border-teal-500 outline-none transition-all font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">CNPJ do Grupo</label>
                    <input
                      type="text"
                      placeholder="00.000.000/0000-00"
                      value={editCnpj}
                      onChange={(e) => handleCnpjChange(e.target.value)}
                      className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:border-teal-500 outline-none transition-all font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Tipo de Repasse</label>
                    <select
                      value={editType}
                      onChange={(e: any) => setEditType(e.target.value)}
                      className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:border-teal-500 outline-none transition-all font-medium"
                    >
                      <option value="sem_cotas">Individual (Sem Cotas)</option>
                      <option value="com_cotas">Repasse por Cotas (%)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Cor do Grupo</label>
                    <div className="flex gap-3 p-1">
                      {['#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#111827'].map((c) => (
                        <button
                          key={c}
                          onClick={() => setEditColor(c)}
                          className={cn(
                            "w-8 h-8 rounded-full transition-all hover:scale-125",
                            editColor === c ? "ring-4 ring-offset-2 ring-slate-200 scale-110 shadow-lg" : "shadow-sm"
                          )}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <input
                      type="checkbox"
                      id="share_financials"
                      checked={editShareFinancials}
                      onChange={(e) => setEditShareFinancials(e.target.checked)}
                      className="w-5 h-5 accent-teal-600"
                    />
                    <label htmlFor="share_financials" className="text-sm font-bold text-slate-700 cursor-pointer">
                      Compartilhar valores financeiros entre todos os membros
                    </label>
                  </div>

                  <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="bg-indigo-600 p-2 rounded-lg text-white">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                        </div>
                        <div>
                          <h4 className="font-bold text-indigo-900">Google Sheets Sync</h4>
                          <p className="text-[10px] text-indigo-600 uppercase font-bold tracking-wider">
                            {group.google_sheets_last_sync 
                              ? `Última sinc.: ${new Date(group.google_sheets_last_sync).toLocaleString()}` 
                              : 'Nunca sincronizado'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {group.google_sheets_id && (
                          <button
                            onClick={handleSyncSheets}
                            disabled={syncing}
                            className="p-2 bg-white text-indigo-600 rounded-xl border border-indigo-100 hover:bg-white shadow-sm transition-all"
                            title="Sincronizar Agora"
                          >
                            <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
                          </button>
                        )}
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={editGoogleSheetsEnabled}
                            onChange={(e) => setEditGoogleSheetsEnabled(e.target.checked)}
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-indigo-700 mb-1 uppercase">ID ou Link da Planilha</label>
                      <input
                        type="text"
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                        value={editGoogleSheetsId}
                        onChange={(e) => setEditGoogleSheetsId(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl border border-indigo-200 focus:border-indigo-500 outline-none text-sm shadow-inner transition-all"
                      />
                    </div>

                    <div className="bg-white/60 p-3 rounded-xl border border-indigo-100/50">
                      <p className="text-[10px] text-indigo-800 leading-tight">
                        <strong>IMPORTANTE:</strong> Para funcionar, você deve compartilhar sua planilha com permissão de <strong>Editor</strong> para o e-mail:<br/>
                        <code className="bg-indigo-100 px-1 rounded font-bold text-indigo-900 block mt-1 py-1 text-center select-all">
                          anesteasy-sync@api-vision-495522.iam.gserviceaccount.com
                        </code>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleUpdateGroup}
                    className="w-full bg-teal-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-teal-100 hover:bg-teal-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    Salvar Alterações
                  </button>

                  {isAdmin && (
                    <div className="pt-6 border-t border-slate-100 mt-6">
                      <h4 className="text-red-600 font-bold text-xs uppercase tracking-widest mb-4">Zona de Perigo</h4>
                      <button
                        onClick={handleDeleteGroup}
                        className="w-full bg-white text-red-600 py-3 rounded-2xl font-bold border border-red-100 hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-5 h-5" />
                        Excluir Grupo Permanentemente
                      </button>
                    </div>
                  )}
                </div>
              </section>
            )}
          </main>
        </div>

        {/* ==========================================
            MODAL: HISTÓRICO DE COTAS
            ========================================== */}
        {showHistoryModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-200">
              <button 
                onClick={() => setShowHistoryModal(false)}
                className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-full"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
              
              <h3 className="text-lg font-bold text-slate-900">Histórico de Cotas</h3>
              <p className="text-xs text-slate-500 font-medium">Profissional: **{historyUserName}**</p>

              {loadingHistory ? (
                <div className="text-center py-8 text-slate-400">Carregando histórico...</div>
              ) : quotaHistory.length === 0 ? (
                <div className="text-center py-8 text-slate-400">Nenhum histórico registrado.</div>
              ) : (
                <div className="border rounded-2xl overflow-hidden bg-slate-50/50 max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b text-slate-500 font-bold">
                        <th className="p-3">Quota</th>
                        <th className="p-3">De</th>
                        <th className="p-3">Até</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {quotaHistory.map(item => (
                        <tr key={item.id} className="hover:bg-white transition-colors font-medium">
                          <td className="p-3 font-bold text-slate-800">{item.quota_percent}%</td>
                          <td className="p-3 text-slate-600">{new Date(item.valid_from + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                          <td className="p-3 text-slate-400">
                            {item.valid_until ? new Date(item.valid_until + 'T00:00:00').toLocaleDateString('pt-BR') : 'Vigente'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==========================================
            MODAL: PERMISSÕES DE SECRETÁRIA
            ========================================== */}
        {showPermsModal && selectedSec && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-200">
              <button 
                onClick={() => setShowPermsModal(false)}
                className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-full"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
              
              <h3 className="text-lg font-bold text-slate-900">Configurar Permissões</h3>
              <p className="text-xs text-slate-500 font-medium">Secretária: **{selectedSec.nome}**</p>

              <div className="space-y-3 pt-2">
                {[
                  { id: 'procedures', label: 'Procedimentos (Lançamentos e Pacientes)' },
                  { id: 'agenda', label: 'Agenda e Escalas' },
                  { id: 'financials', label: 'Financeiro e Faturamento' }
                ].map(mod => {
                  const isChecked = secPermissions.includes(mod.id)
                  return (
                    <label key={mod.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl cursor-pointer border border-transparent hover:border-slate-150 transition-all">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setSecPermissions(prev => prev.filter(p => p !== mod.id))
                          } else {
                            setSecPermissions(prev => [...prev, mod.id])
                          }
                        }}
                        className="w-5 h-5 accent-teal-600"
                      />
                      <span className="text-sm text-slate-800 font-medium">{mod.label}</span>
                    </label>
                  )
                })}
              </div>

              <button
                onClick={handleSavePermissions}
                disabled={savingPerms}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3.5 rounded-2xl font-bold mt-4 shadow-lg shadow-teal-100 transition-all"
              >
                {savingPerms ? 'Salvando...' : 'Salvar Permissões'}
              </button>
            </div>
          </div>
        )}

        {/* ==========================================
            MODAL: DETALHES DE FECHAMENTO HISTÓRICO
            ========================================== */}
        {showClosingDetails && selectedClosing && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-200">
              <button 
                onClick={() => setShowClosingDetails(false)}
                className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-full"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
              
              <h3 className="text-lg font-black text-slate-900">Detalhamento do Fechamento</h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                Mês de Referência: {new Date(selectedClosing.closing.reference_month + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </p>

              <div className="p-4 bg-slate-50 rounded-2xl border flex justify-between items-center text-sm">
                <span className="font-bold text-slate-700">Faturamento Consolidado:</span>
                <span className="font-black text-teal-600 text-lg">{formatCurrency(selectedClosing.closing.total_revenue)}</span>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Distribuições Realizadas</h4>
                <div className="border rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b text-slate-500 font-bold">
                        <th className="p-3">Médico</th>
                        <th className="p-3">Cota %</th>
                        <th className="p-3">Repasse</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y font-medium text-slate-700">
                      {selectedClosing.distributions.map((d: any) => (
                        <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-bold">{d.users?.name || 'Médico'}</td>
                          <td className="p-3">{d.quota_percent}%</td>
                          <td className="p-3 font-black text-slate-900">{formatCurrency(d.gross_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            MODAL: REABRIR FECHAMENTO
            ========================================== */}
        {showReopenModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-200">
              <button 
                onClick={() => setShowReopenModal(false)}
                className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-full"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
              
              <h3 className="text-lg font-bold text-red-600">Reabrir Fechamento</h3>
              <p className="text-xs text-slate-500 font-medium">Isso excluirá os repasses e desbloqueará os procedimentos para edição. Justifique o motivo:</p>

              <textarea
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="Ex: Correção de procedimentos lançados errados..."
                className="w-full p-3 border rounded-2xl min-h-24 text-sm font-medium outline-none focus:border-red-500 transition-colors"
                required
              />

              <button
                onClick={handleReopenClosing}
                disabled={isReopening || !reopenReason}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-2xl font-bold shadow-lg shadow-red-100 transition-all disabled:opacity-50"
              >
                {isReopening ? 'Reabrindo...' : 'Confirmar Reabertura'}
              </button>
            </div>
          </div>
        )}

        {/* ==========================================
            MODAL: NOVO PLANTÃO
            ========================================== */}
        {showAddShiftModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-200">
              <button 
                onClick={() => setShowAddShiftModal(false)}
                className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-full"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
              
              <h3 className="text-lg font-bold text-slate-900">Novo Plantão de Escala</h3>

              <form onSubmit={handleCreateShift} className="space-y-4 text-sm font-medium">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Título / Setor</label>
                  <input
                    type="text"
                    placeholder="Plantão Obstetrícia"
                    value={newShift.title}
                    onChange={(e) => setNewShift(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:border-teal-500 outline-none transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Hospital</label>
                  <input
                    type="text"
                    placeholder="Hospital Santa Joana"
                    value={newShift.hospital_name}
                    onChange={(e) => setNewShift(prev => ({ ...prev, hospital_name: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:border-teal-500 outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Início</label>
                    <input
                      type="datetime-local"
                      value={newShift.start_date}
                      onChange={(e) => setNewShift(prev => ({ ...prev, start_date: e.target.value }))}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs focus:border-teal-500 outline-none transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Fim</label>
                    <input
                      type="datetime-local"
                      value={newShift.end_date}
                      onChange={(e) => setNewShift(prev => ({ ...prev, end_date: e.target.value }))}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs focus:border-teal-500 outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Tipo</label>
                    <select
                      value={newShift.shift_type}
                      onChange={(e) => setNewShift(prev => ({ ...prev, shift_type: e.target.value }))}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:border-teal-500 outline-none transition-all"
                    >
                      <option value="hospital_fixo">Hospital Fixo</option>
                      <option value="sobreaviso">Sobreaviso</option>
                      <option value="cirurgia_eletiva">Eletiva</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Valor R$</label>
                    <input
                      type="number"
                      placeholder="1200"
                      value={newShift.shift_value}
                      onChange={(e) => setNewShift(prev => ({ ...prev, shift_value: e.target.value }))}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:border-teal-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Escalado (Membro)</label>
                    <select
                      value={newShift.assigned_user_id}
                      onChange={(e) => setNewShift(prev => ({ ...prev, assigned_user_id: e.target.value }))}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs focus:border-teal-500 outline-none transition-all"
                    >
                      <option value="">Ninguém (Aberto)</option>
                      {group.group_members.map((m: any) => (
                        <option key={m.users.id} value={m.users.id}>{m.users.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Reserva / Backup</label>
                    <select
                      value={newShift.backup_user_id}
                      onChange={(e) => setNewShift(prev => ({ ...prev, backup_user_id: e.target.value }))}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs focus:border-teal-500 outline-none transition-all"
                    >
                      <option value="">Nenhum</option>
                      {group.group_members.map((m: any) => (
                        <option key={m.users.id} value={m.users.id}>{m.users.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Função do Plantonista Escalado</label>
                  <select
                    value={newShift.professional_role}
                    onChange={(e) => setNewShift(prev => ({ ...prev, professional_role: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:border-teal-500 outline-none transition-all"
                  >
                    <option value="principal">Anestesista Principal</option>
                    <option value="auxiliar">Auxiliar</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isCreatingShift}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-2xl font-bold shadow-lg shadow-teal-100 transition-all disabled:opacity-50"
                >
                  {isCreatingShift ? 'Criando...' : 'Salvar Plantão'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ==========================================
            MODAL: DETALHES E ATRIBUIÇÃO DO PROCEDIMENTO
            ========================================== */}
        {showProcDetailsModal && selectedProc && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setShowProcDetailsModal(false)}>
            <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-2xl w-full p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl relative animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 max-h-[92vh] sm:max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <button 
                onClick={() => setShowProcDetailsModal(false)}
                className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-full z-10"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
              
              <div>
                <h3 className="text-lg font-bold text-slate-900 pr-8">Editar Procedimento</h3>
                <p className="text-xs text-slate-400 font-medium">Clique em Salvar para confirmar as alterações.</p>
              </div>

              {/* GRID PRINCIPAL */}
              <div className="space-y-4">
                {/* Linha 1: Nome e Tipo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Nome do Procedimento</label>
                    <input
                      type="text"
                      value={procEditData.procedure_name}
                      onChange={e => setProcEditData((d: any) => ({ ...d, procedure_name: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Técnica Anestésica</label>
                    <input
                      type="text"
                      value={procEditData.tecnica_anestesica}
                      onChange={e => setProcEditData((d: any) => ({ ...d, tecnica_anestesica: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                      placeholder="Ex: Raquidiana, Peridural, Geral..."
                    />
                  </div>
                </div>

                {/* Linha 2: Data e Horário */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Data</label>
                    <input
                      type="date"
                      value={procEditData.procedure_date}
                      onChange={e => setProcEditData((d: any) => ({ ...d, procedure_date: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Horário</label>
                    <input
                      type="time"
                      value={procEditData.horario}
                      onChange={e => setProcEditData((d: any) => ({ ...d, horario: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                    />
                  </div>
                </div>

                {/* Linha 3: Paciente e Hospital */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Paciente</label>
                    <input
                      type="text"
                      value={procEditData.patient_name}
                      onChange={e => setProcEditData((d: any) => ({ ...d, patient_name: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Hospital / Clínica</label>
                    <input
                      type="text"
                      value={procEditData.hospital_clinic}
                      onChange={e => setProcEditData((d: any) => ({ ...d, hospital_clinic: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                    />
                  </div>
                </div>

                {/* Linha 4: Cirürgião e Anestesista */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Cirurgião</label>
                    <input
                      type="text"
                      value={procEditData.nome_cirurgiao}
                      onChange={e => setProcEditData((d: any) => ({ ...d, nome_cirurgiao: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Anestesista (Grupo)</label>
                    <select
                      value={procExecutorId}
                      onChange={(e) => {
                        const newId = e.target.value
                        setProcExecutorId(newId)
                        const conflict = checkAnesthesiologistConflict(
                          newId,
                          selectedProc?.id,
                          procEditData.procedure_date,
                          procEditData.horario,
                          procEditData.duration_minutes
                        )
                        setAnesthesiologistConflict(conflict)
                      }}
                      className={`w-full px-4 py-2.5 border rounded-xl text-sm outline-none bg-white transition-colors ${
                        anesthesiologistConflict ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-teal-500'
                      }`}
                    >
                      <option value="">Ninguém (Aberto)</option>
                      {group.group_members.map((m: any) => (
                        <option key={m.users.id} value={m.users.id}>{m.users.name}</option>
                      ))}
                    </select>
                    {anesthesiologistConflict && (
                      <div className="mt-2 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                        <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-red-700">Conflito de Horário</p>
                          <p className="text-xs text-red-600">{anesthesiologistConflict}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Linha 5: Status, Valor e Rastreabilidade */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Status de Pagamento</label>
                    <select
                      value={procEditData.payment_status}
                      onChange={e => setProcEditData((d: any) => ({ ...d, payment_status: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none bg-white"
                    >
                      <option value="pending">Aguardando</option>
                      <option value="sent">Enviado</option>
                      <option value="paid">Pago</option>
                      <option value="cancelled">Cancelado</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Valor Total (R$)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={procEditData.valor_total}
                      onChange={e => setProcEditData((d: any) => ({ ...d, valor_total: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                      placeholder="0,00"
                    />
                  </div>
                </div>

                {/* Rastreabilidade — aparece sempre */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Rastreabilidade (Forma de Recebimento)</label>
                    <select
                      value={procEditData.payment_method || ''}
                      onChange={e => setProcEditData((d: any) => ({ ...d, payment_method: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none bg-white"
                    >
                      <option value="">Não informado</option>
                      <option value="pix">PIX</option>
                      <option value="transferencia">Transferência Bancária</option>
                      <option value="dinheiro">Dinheiro / Espécie</option>
                      <option value="cheque">Cheque</option>
                      <option value="cartao">Cartão</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Titularidade do Recebimento</label>
                    <select
                      value={procEditData.billing_entity_type || ''}
                      onChange={e => setProcEditData((d: any) => ({ ...d, billing_entity_type: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none bg-white"
                    >
                      <option value="">Em aberto / Não faturado</option>
                      <option value="cnpj_anestesista">Faturado por CPF/CNPJ do Anestesista</option>
                      <option value="cnpj_grupo">Faturado por CNPJ do Grupo</option>
                    </select>
                  </div>
                </div>

                {/* Linha 6: Duração */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Duração Estimada (horas)</label>
                    <input
                      type="number"
                      min="0.25"
                      step="0.25"
                      value={(procEditData.duration_minutes || 0) / 60}
                      onChange={e => {
                        const newDur = Math.round(parseFloat(e.target.value) * 60) || 60
                        setProcEditData((d: any) => ({ ...d, duration_minutes: newDur }))
                        // Revalida o conflito com a nova duração
                        if (procExecutorId) {
                          const conflict = checkAnesthesiologistConflict(
                            procExecutorId,
                            selectedProc?.id,
                            procEditData.procedure_date,
                            procEditData.horario,
                            newDur
                          )
                          setAnesthesiologistConflict(conflict)
                        }
                      }}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                      placeholder="60"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Usado para detectar conflito de horário</p>
                  </div>
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-2 border-t border-slate-100">
                <button
                  onClick={handleDeleteProcedure}
                  disabled={deletingProc || updatingProc}
                  className="px-4 py-3 border border-red-200 text-red-600 rounded-2xl font-bold transition-all hover:bg-red-50 disabled:opacity-50 flex items-center justify-center gap-2"
                  title="Excluir Procedimento"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowProcDetailsModal(false)}
                  className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-2xl font-bold transition-all hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdateProcedure}
                  disabled={updatingProc || deletingProc || !!anesthesiologistConflict}
                  title={anesthesiologistConflict ? `Não é possível salvar: ${anesthesiologistConflict}` : ''}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-2xl font-bold shadow-lg shadow-teal-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {updatingProc ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          </div>
        )}
      </Layout>
    </ProtectedRoute>
  )
}

// Wrapper para o Dashboard Financeiro (usa o hook separadamente para evitar rerenders desnecessários)
function FinanceiroDashboardWrapper({ groupId, groupName, groupMembers, currentUserId }: {
  groupId: string, 
  groupName: string, 
  groupMembers: any[],
  currentUserId?: string
}) {
  const { dados, loading, erro } = useFinanceiroDashboard({ groupId, groupName, groupMembers, currentUserId })
  return <DashboardFinanceiroGrupo dados={dados} loading={loading} erro={erro} />
}
