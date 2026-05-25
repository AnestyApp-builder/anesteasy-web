'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { getGroupDetails, addGroupMember, removeGroupMember, updateGroup, deleteGroup } from '@/lib/groups'
import { fechamentoService } from '@/lib/fechamentos'
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
  Filter,
  CreditCard,
  Pencil,
  Download
} from 'lucide-react'
import { googleSheetsService } from '@/lib/google-sheets'
import { useToast } from '@/contexts/ToastContext'
import { formatCurrency } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Layout } from '@/components/layout/Layout'
import { procedureService } from '@/lib/procedures'
import { despesaService, CATEGORIAS_DESPESA, type Despesa } from '@/lib/despesas'
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
  const { user, isLoading } = useAuth()
  const { setWorkspace } = useWorkspace()
  const { addToast } = useToast()
  
  const [group, setGroup] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  const [isSecretary, setIsSecretary] = useState(false)
  const [secretarySession, setSecretarySession] = useState<any>(null)
  const [secLoading, setSecLoading] = useState(true)
  const [showCreateProcModal, setShowCreateProcModal] = useState(false)
  const [isCreatingProc, setIsCreatingProc] = useState(false)
  const [createProcFormData, setCreateProcFormData] = useState({
    patient_name: '',
    procedure_name: '',
    procedure_value: '',
    procedure_date: new Date().toISOString().split('T')[0],
    tecnica_anestesica: '',
    hospital_clinic: '',
    anesthesiologist_user_id: '',
    billing_entity_type: 'cnpj_anestesista' as 'cnpj_anestesista' | 'cnpj_grupo'
  })
  
  // Set context to group
  useEffect(() => {
    if (id) {
      setWorkspace('group', id as string)
    }
  }, [id, setWorkspace])
  
  // Tab control based on URL
  const tabParam = searchParams.get('tab') as 'members' | 'secretaries' | 'finance' | 'agenda' | 'shifts' | 'procedures' | 'settings' | 'billing' | 'patients' | null
  const [activeTab, setActiveTab] = useState<'members' | 'secretaries' | 'finance' | 'agenda' | 'shifts' | 'procedures' | 'settings' | 'billing' | 'patients'>(tabParam || 'agenda')

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as any)
    router.push(`/grupos/${id}?tab=${tab}`, { scroll: false })
  }

  // Load secretary session if user is not a standard anesthesiologist
  useEffect(() => {
    const checkSecretary = async () => {
      if (user) {
        setIsSecretary(false)
        setSecLoading(false)
        return
      }
      try {
        const res = await fetch('/api/secretary/session')
        if (res.ok) {
          const data = await res.json()
          if (data.session && data.session.groupId === id) {
            setSecretarySession(data.session)
            setIsSecretary(true)
            
            // Redirect unauthorized tabs
            const allowedTabs: string[] = ['members']
            if (data.session.permissions.includes('agenda')) {
              allowedTabs.push('agenda', 'shifts')
            }
            if (data.session.permissions.includes('procedures')) {
              allowedTabs.push('procedures')
            }
            if (data.session.permissions.includes('patients')) {
              allowedTabs.push('patients')
            }
            if (data.session.permissions.includes('financials')) {
              allowedTabs.push('finance')
            }
            if (data.session.permissions.includes('secretaries')) {
              allowedTabs.push('secretaries')
            }
            
            if (!allowedTabs.includes(activeTab)) {
              const defaultTab = allowedTabs.includes('agenda') ? 'agenda' : allowedTabs[0]
              handleTabChange(defaultTab)
            }
          } else {
            router.push('/login')
          }
        } else {
          router.push('/login')
        }
      } catch (err) {
        console.error('Error checking secretary session:', err)
        router.push('/login')
      } finally {
        setSecLoading(false)
      }
    }
    
    if (!isLoading) {
      checkSecretary()
    }
  }, [user, id, isLoading])

  const handleCreateProcedure = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createProcFormData.patient_name || !createProcFormData.procedure_name || !createProcFormData.procedure_value) {
      addToast({ title: 'Preencha paciente, procedimento e valor', variant: 'warning' })
      return
    }
    
    setIsCreatingProc(true)
    try {
      const val = parseFloat(createProcFormData.procedure_value.replace(/[^\d,]/g, '').replace(',', '.')) || 0
      
      const payload = {
        procedureData: {
          procedure_name: createProcFormData.procedure_name,
          procedure_type: createProcFormData.procedure_name,
          procedure_value: val,
          procedure_date: createProcFormData.procedure_date,
          patient_name: createProcFormData.patient_name,
          tecnica_anestesica: createProcFormData.tecnica_anestesica,
          hospital_clinic: createProcFormData.hospital_clinic,
          group_id: id as string,
          grupo_anestesico: group?.name || '',
          anesthesiologist_user_id: createProcFormData.anesthesiologist_user_id || null,
          billing_entity_type: createProcFormData.billing_entity_type,
          show_to_secretary: true
        },
        userId: createProcFormData.anesthesiologist_user_id
      }

      const res = await fetch('/api/create-procedure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Erro ao registrar procedimento')
      }

      addToast({ title: 'Procedimento criado com sucesso!', variant: 'success' })
      setShowCreateProcModal(false)
      setCreateProcFormData({
        patient_name: '',
        procedure_name: '',
        procedure_value: '',
        procedure_date: new Date().toISOString().split('T')[0],
        tecnica_anestesica: '',
        hospital_clinic: '',
        anesthesiologist_user_id: group?.group_members?.[0]?.users?.id || '',
        billing_entity_type: 'cnpj_anestesista'
      })
      loadGroupAgenda()
      if (activeTab === 'procedures') {
        loadTabProcedures(false)
      }
    } catch (err: any) {
      addToast({ title: 'Erro ao criar procedimento', description: err.message, variant: 'error' })
    } finally {
      setIsCreatingProc(false)
    }
  }

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createPatientFormData.name) {
      addToast({ title: 'Preencha o nome do paciente', variant: 'warning' })
      return
    }

    setIsCreatingPatient(true)
    try {
      const payload = {
        procedureData: {
          procedure_name: 'Cadastro de Paciente',
          procedure_type: 'Outro',
          procedure_value: 0,
          procedure_date: new Date().toISOString().split('T')[0],
          patient_name: createPatientFormData.name,
          patient_gender: createPatientFormData.gender || '',
          data_nascimento: createPatientFormData.birthDate || null,
          patient_age: createPatientFormData.age ? parseInt(createPatientFormData.age) : null,
          patient_phone: createPatientFormData.phone || '',
          patient_email: createPatientFormData.email || '',
          patient_notes: createPatientFormData.notes || '',
          patient_companion: createPatientFormData.companion || '',
          patient_companion_phone: createPatientFormData.companionPhone || '',
          group_id: id as string,
          anesthesiologist_user_id: user?.id || group?.group_members?.[0]?.users?.id || null,
          billing_entity_type: 'cnpj_anestesista',
          show_to_secretary: true
        },
        userId: user?.id || group?.group_members?.[0]?.users?.id || ''
      }

      const res = await fetch('/api/create-procedure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Erro ao cadastrar paciente')
      }

      addToast({ title: 'Paciente cadastrado com sucesso!', variant: 'success' })
      setShowCreatePatientModal(false)
      setCreatePatientFormData({
        name: '',
        gender: '',
        birthDate: '',
        age: '',
        phone: '',
        email: '',
        notes: '',
        companion: '',
        companionPhone: ''
      })
      loadPatientsData()
    } catch (err: any) {
      console.error(err)
      addToast({ title: 'Erro ao cadastrar paciente', description: err.message, variant: 'error' })
    } finally {
      setIsCreatingPatient(false)
    }
  }

  const handleCreateSurgeon = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createSurgeonFormData.name) {
      addToast({ title: 'Preencha o nome do cirurgião', variant: 'warning' })
      return
    }

    setIsCreatingSurgeon(true)
    try {
      const payload = {
        procedureData: {
          procedure_name: 'Cadastro de Cirurgião',
          procedure_type: 'Outro',
          procedure_value: 0,
          procedure_date: new Date().toISOString().split('T')[0],
          patient_name: 'Cadastro de Cirurgião',
          nome_cirurgiao: createSurgeonFormData.name,
          surgeon_name: createSurgeonFormData.name,
          telefone_cirurgiao: createSurgeonFormData.phone || '',
          email_cirurgiao: createSurgeonFormData.email || '',
          especialidade_cirurgiao: createSurgeonFormData.specialty || '',
          group_id: id as string,
          anesthesiologist_user_id: user?.id || group?.group_members?.[0]?.users?.id || null,
          billing_entity_type: 'cnpj_anestesista',
          show_to_secretary: true
        },
        userId: user?.id || group?.group_members?.[0]?.users?.id || ''
      }

      const res = await fetch('/api/create-procedure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Erro ao cadastrar cirurgião')
      }

      addToast({ title: 'Cirurgião cadastrado com sucesso!', variant: 'success' })
      setShowCreateSurgeonModal(false)
      setCreateSurgeonFormData({
        name: '',
        phone: '',
        email: '',
        specialty: ''
      })
      loadPatientsData()
    } catch (err: any) {
      console.error(err)
      addToast({ title: 'Erro ao cadastrar cirurgião', description: err.message, variant: 'error' })
    } finally {
      setIsCreatingSurgeon(false)
    }
  }

  const handleCreateBackup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createBackupFormData.name) {
      addToast({ title: 'Preencha o nome do anestesista backup', variant: 'warning' })
      return
    }

    setIsCreatingBackup(true)
    try {
      const payload = {
        procedureData: {
          procedure_name: 'Cadastro de Anestesista Backup',
          procedure_type: 'Outro',
          procedure_value: 0,
          procedure_date: new Date().toISOString().split('T')[0],
          patient_name: 'Cadastro de Anestesista Backup',
          anesthesiologist_name: createBackupFormData.name,
          anesthesiologist_phone: createBackupFormData.phone || '',
          anesthesiologist_email: createBackupFormData.email || '',
          anesthesiologist_notes: createBackupFormData.notes || '',
          group_id: id as string,
          anesthesiologist_user_id: null,
          billing_entity_type: 'cnpj_anestesista',
          show_to_secretary: true
        },
        userId: user?.id || group?.group_members?.[0]?.users?.id || ''
      }

      const res = await fetch('/api/create-procedure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Erro ao cadastrar anestesista backup')
      }

      addToast({ title: 'Anestesista backup cadastrado com sucesso!', variant: 'success' })
      setShowCreateBackupModal(false)
      setCreateBackupFormData({
        name: '',
        phone: '',
        email: '',
        notes: ''
      })
      loadPatientsData()
    } catch (err: any) {
      console.error(err)
      addToast({ title: 'Erro ao cadastrar anestesista backup', description: err.message, variant: 'error' })
    } finally {
      setIsCreatingBackup(false)
    }
  }

  const handleSavePatientEdit = async () => {
    if (!selectedPatientDetails) return
    if (!editDetailsFormData.name) {
      addToast({ title: 'O nome do paciente é obrigatório', variant: 'warning' })
      return
    }
    setSavingDetails(true)
    try {
      const procedureIds = selectedPatientDetails.procedures.map((p: any) => p.id)
      
      const payload = {
        procedureIds,
        groupId: id as string,
        updates: {
          patient_name: editDetailsFormData.name,
          patient_gender: editDetailsFormData.gender || '',
          data_nascimento: editDetailsFormData.birthDate || null,
          patient_age: editDetailsFormData.age ? parseInt(editDetailsFormData.age) : null,
          patient_phone: editDetailsFormData.phone || '',
          patient_email: editDetailsFormData.email || '',
          patient_notes: editDetailsFormData.notes || '',
          patient_companion: editDetailsFormData.companion || '',
          patient_companion_phone: editDetailsFormData.companionPhone || ''
        }
      }

      const res = await fetch('/api/procedures/update-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao salvar alterações')
      }

      addToast({ title: 'Dados do paciente atualizados com sucesso!', variant: 'success' })
      setIsEditingDetails(false)
      setShowPatientDetailsModal(false)
      loadPatientsData()
    } catch (err: any) {
      addToast({ title: 'Erro ao atualizar dados', description: err.message, variant: 'error' })
    } finally {
      setSavingDetails(false)
    }
  }

  const handleSaveSurgeonEdit = async () => {
    if (!selectedSurgeonDetails) return
    if (!editDetailsFormData.name) {
      addToast({ title: 'O nome do cirurgião é obrigatório', variant: 'warning' })
      return
    }
    setSavingDetails(true)
    try {
      const procedureIds = selectedSurgeonDetails.procedures.map((p: any) => p.id)
      
      const payload = {
        procedureIds,
        groupId: id as string,
        updates: {
          nome_cirurgiao: editDetailsFormData.name,
          surgeon_name: editDetailsFormData.name,
          telefone_cirurgiao: editDetailsFormData.phone || '',
          email_cirurgiao: editDetailsFormData.email || '',
          especialidade_cirurgiao: editDetailsFormData.specialty || ''
        }
      }

      const res = await fetch('/api/procedures/update-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao salvar alterações')
      }

      addToast({ title: 'Dados do cirurgião atualizados com sucesso!', variant: 'success' })
      setIsEditingDetails(false)
      setShowSurgeonDetailsModal(false)
      loadPatientsData()
    } catch (err: any) {
      addToast({ title: 'Erro ao atualizar dados', description: err.message, variant: 'error' })
    } finally {
      setSavingDetails(false)
    }
  }

  const handleSaveBackupEdit = async () => {
    if (!selectedBackupDetails) return
    if (!editDetailsFormData.name) {
      addToast({ title: 'O nome do anestesista backup é obrigatório', variant: 'warning' })
      return
    }
    setSavingDetails(true)
    try {
      const procedureIds = selectedBackupDetails.procedures.map((p: any) => p.id)
      
      const payload = {
        procedureIds,
        groupId: id as string,
        updates: {
          anesthesiologist_name: editDetailsFormData.name,
          anesthesiologist_phone: editDetailsFormData.phone || '',
          anesthesiologist_email: editDetailsFormData.email || '',
          anesthesiologist_notes: editDetailsFormData.notes || ''
        }
      }

      const res = await fetch('/api/procedures/update-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao salvar alterações')
      }

      addToast({ title: 'Dados do anestesista backup atualizados com sucesso!', variant: 'success' })
      setIsEditingDetails(false)
      setShowBackupDetailsModal(false)
      loadPatientsData()
    } catch (err: any) {
      addToast({ title: 'Erro ao atualizar dados', description: err.message, variant: 'error' })
    } finally {
      setSavingDetails(false)
    }
  }

  const [isAdmin, setIsAdmin] = useState(false)

  // Estados de edição do grupo
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editCnpj, setEditCnpj] = useState('')
  const [editType, setEditType] = useState<'com_cotas' | 'sem_cotas'>('sem_cotas')
  const [editBillingType, setEditBillingType] = useState<'centralized' | 'individual'>('individual')
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
  const [editMemberColor, setEditMemberColor] = useState<string>('')
  
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
  
  // Financeiro e Fechamentos
  const [financeSubTab, setFinanceSubTab] = useState<'dashboard' | 'fechamentos'>('dashboard')
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0)
  const [fechamentosHistory, setFechamentosHistory] = useState<any[]>([])
  const [fechamentoPreview, setFechamentoPreview] = useState<any>(null)
  const [isGeneratingFechamento, setIsGeneratingFechamento] = useState(false)
  const [showFechamentoWizard, setShowFechamentoWizard] = useState(false)
  const [fechamentoCompetencia, setFechamentoCompetencia] = useState('')
  const [fechamentoEndDate, setFechamentoEndDate] = useState(new Date().toISOString().split('T')[0])

  
  // Despesas do grupo
  const [groupDespesas, setGroupDespesas] = useState<Despesa[]>([])
  const [loadingDespesas, setLoadingDespesas] = useState(false)
  const [newDespesa, setNewDespesa] = useState({ descricao: '', categoria: 'outros', valor: '', data_despesa: new Date().toISOString().split('T')[0], anesthesiologist_id: '' })
  const [savingDespesa, setSavingDespesa] = useState(false)
  const [showNewDespesaForm, setShowNewDespesaForm] = useState(false)
  const [showDespesaModal, setShowDespesaModal] = useState(false)
  const [despesaToDelete, setDespesaToDelete] = useState<{ id: string; descricao: string } | null>(null)
  const [isDeletingDespesa, setIsDeletingDespesa] = useState(false)

  // Modal Mapa de Sala Cirúrgica
  const [showMapaModal, setShowMapaModal] = useState(false)
  const [mapaDate, setMapaDate] = useState<Date>(new Date())

  const openMapaModal = (date?: Date) => {
    setMapaDate(date || agendaSelectedDate || new Date())
    if (groupProcedures.length === 0) loadGroupAgenda()
    setShowMapaModal(true)
  }

  // Modal de Detalhes/Edição de Procedimento na Agenda do Grupo
  const [showProcDetailsModal, setShowProcDetailsModal] = useState(false)
  const [selectedProc, setSelectedProc] = useState<any>(null)
  const [updatingProc, setUpdatingProc] = useState(false)
  const [deletingProc, setDeletingProc] = useState(false)

  const handleDeleteProcedure = async () => {
    if (!selectedProc) return
    if (selectedProc.fechamento_id) {
      addToast({ title: 'Período fechado', description: 'Não é possível excluir procedimentos de um período já encerrado.', variant: 'error' })
      return
    }
    if (!window.confirm(`Excluir o procedimento de ${selectedProc.patient_name || 'este paciente'}? Esta ação não pode ser desfeita.`)) return
    
    try {
      setDeletingProc(true)
      if (isSecretary) {
        const res = await fetch('/api/secretary/group/procedure/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: selectedProc.id })
        })
        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error || 'Falha ao excluir procedimento')
        }
        addToast({ title: 'Procedimento excluído com sucesso!', variant: 'success' })
        setShowProcDetailsModal(false)
        if (activeTab === 'agenda') {
          loadGroupAgenda()
        } else if (activeTab === 'procedures') {
          loadTabProcedures(false)
        }
      } else {
        const result = await procedureService.deleteProcedure(selectedProc.id)
        if (result.success) {
          addToast({ title: 'Procedimento excluído com sucesso!', variant: 'success' })
          setShowProcDetailsModal(false)
          if (activeTab === 'agenda') {
            loadGroupAgenda()
          } else if (activeTab === 'procedures') {
            loadTabProcedures(false)
          }
        } else {
          throw new Error(result.message || 'Falha ao excluir procedimento')
        }
      }
    } catch (error: any) {
      addToast({ title: error.message || 'Erro ao excluir procedimento', variant: 'error' })
    } finally {
      setDeletingProc(false)
    }
  }
  const [procExecutorId, setProcExecutorId] = useState('')
  const [anesthesiologistConflict, setAnesthesiologistConflict] = useState<string | null>(null)
  const [isProcEditMode, setIsProcEditMode] = useState(false)
  const [procParcelas, setProcParcelas] = useState<any[]>([])
  // Campos editáveis do procedimento
  const [procEditData, setProcEditData] = useState<any>({})

  // 6. Aba Procedimentos do Grupo
  const [tabProceduresList, setTabProceduresList] = useState<any[]>([])
  const [tabProceduresSearch, setTabProceduresSearch] = useState('')
  const [tabProceduresTypeFilter, setTabProceduresTypeFilter] = useState('all')
  const [tabProceduresStatusFilter, setTabProceduresStatusFilter] = useState('all')
  const [tabProceduresMemberFilter, setTabProceduresMemberFilter] = useState('all')
  const [tabProceduresStartDate, setTabProceduresStartDate] = useState('')
  const [tabProceduresEndDate, setTabProceduresEndDate] = useState('')
  const [tabProceduresTotalCount, setTabProceduresTotalCount] = useState(0)
  const [tabProceduresHasMore, setTabProceduresHasMore] = useState(false)
  const [tabProceduresLoading, setTabProceduresLoading] = useState(false)

  // 7. Aba Pacientes do Grupo (Cadastros)
  const [cadastroSubTab, setCadastroSubTab] = useState<'patients' | 'surgeons' | 'backups'>('patients')
  
  const [patientsList, setPatientsList] = useState<any[]>([])
  const [patientsSearch, setPatientsSearch] = useState('')
  const [patientsLoading, setPatientsLoading] = useState(false)

  const [showCreatePatientModal, setShowCreatePatientModal] = useState(false)
  const [createPatientFormData, setCreatePatientFormData] = useState({
    name: '',
    gender: '',
    birthDate: '',
    age: '',
    phone: '',
    email: '',
    notes: '',
    companion: '',
    companionPhone: ''
  })
  const [isCreatingPatient, setIsCreatingPatient] = useState(false)
  const [showPatientDetailsModal, setShowPatientDetailsModal] = useState(false)
  const [selectedPatientDetails, setSelectedPatientDetails] = useState<any>(null)

  // Cirurgiões
  const [surgeonsList, setSurgeonsList] = useState<any[]>([])
  const [surgeonsSearch, setSurgeonsSearch] = useState('')
  const [showCreateSurgeonModal, setShowCreateSurgeonModal] = useState(false)
  const [createSurgeonFormData, setCreateSurgeonFormData] = useState({
    name: '',
    phone: '',
    email: '',
    specialty: ''
  })
  const [isCreatingSurgeon, setIsCreatingSurgeon] = useState(false)
  const [showSurgeonDetailsModal, setShowSurgeonDetailsModal] = useState(false)
  const [selectedSurgeonDetails, setSelectedSurgeonDetails] = useState<any>(null)

  // Anestesistas Backup
  const [backupsList, setBackupsList] = useState<any[]>([])
  const [backupsSearch, setBackupsSearch] = useState('')
  const [showCreateBackupModal, setShowCreateBackupModal] = useState(false)
  const [createBackupFormData, setCreateBackupFormData] = useState({
    name: '',
    phone: '',
    email: '',
    notes: ''
  })
  const [isCreatingBackup, setIsCreatingBackup] = useState(false)
  const [showBackupDetailsModal, setShowBackupDetailsModal] = useState(false)
  const [selectedBackupDetails, setSelectedBackupDetails] = useState<any>(null)

  // Estados de edição de cadastros
  const [isEditingDetails, setIsEditingDetails] = useState(false)
  const [editDetailsFormData, setEditDetailsFormData] = useState<any>({
    name: '',
    gender: '',
    birthDate: '',
    age: '',
    phone: '',
    email: '',
    notes: '',
    specialty: '',
    companion: '',
    companionPhone: ''
  })
  const [savingDetails, setSavingDetails] = useState(false)
  const [phoneActionsTarget, setPhoneActionsTarget] = useState<string | null>(null)

  const formatPhone = (phone: string) => {
    if (!phone) return ''
    const digits = phone.replace(/\D/g, '')
    const base = digits.startsWith('0') ? digits.slice(1) : digits
    if (base.length === 11) {
      return `(${base.slice(0, 2)}) ${base.slice(2, 7)}-${base.slice(7)}`
    } else if (base.length === 10) {
      return `(${base.slice(0, 2)}) ${base.slice(2, 6)}-${base.slice(6)}`
    }
    return phone
  }

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
        return 'Aguardando'
      case 'cancelled':
        return 'Cancelado'
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

  const PRESET_COLORS = [
    { name: 'Azul', value: '#3B82F6' },
    { name: 'Indigo', value: '#6366F1' },
    { name: 'Roxo', value: '#8B5CF6' },
    { name: 'Rosa', value: '#EC4899' },
    { name: 'Vermelho', value: '#EF4444' },
    { name: 'Laranja', value: '#F97316' },
    { name: 'Amarelo', value: '#F59E0B' },
    { name: 'Verde', value: '#10B981' },
    { name: 'Teal', value: '#14B8A6' },
    { name: 'Cinza', value: '#64748B' }
  ]

  const getMemberColor = (userId: string) => {
    if (!group?.group_members || !userId) return null
    const member = group.group_members.find((m: any) => m.users?.id === userId || m.user_id === userId)
    return member?.color || null
  }

  const handleOpenProcDetails = async (proc: any) => {
    setSelectedProc(proc)
    setProcExecutorId(proc.anesthesiologist_user_id || '')
    setAnesthesiologistConflict(null)
    setIsProcEditMode(false)
    setProcParcelas([])
    setProcEditData({
      procedure_name: proc.procedure_name || '',
      procedure_date: proc.procedure_date?.split('T')[0] || '',
      horario: proc.horario || '',
      procedure_type: proc.procedure_type || '',
      tecnica_anestesica: proc.tecnica_anestesica || '',
      codigo_tssu: proc.codigo_tssu || '',
      grupo_anestesico: proc.grupo_anestesico || '',
      patient_name: proc.patient_name || '',
      data_nascimento: proc.data_nascimento?.split('T')[0] || '',
      convenio: proc.convenio || '',
      carteirinha: proc.carteirinha || '',
      patient_gender: proc.patient_gender || '',
      patient_phone: proc.patient_phone || '',
      patient_email: proc.patient_email || '',
      patient_companion: proc.patient_companion || '',
      patient_companion_phone: proc.patient_companion_phone || '',
      patient_notes: proc.patient_notes || '',
      hospital_clinic: proc.hospital_clinic || '',
      nome_cirurgiao: proc.nome_cirurgiao || proc.surgeon_name || '',
      especialidade_cirurgiao: proc.especialidade_cirurgiao || '',
      nome_equipe: proc.nome_equipe || '',
      anesthesiologist_role: proc.anesthesiologist_role || '',
      payment_status: proc.payment_status || 'pending',
      payment_method: proc.payment_method || '',
      valor_total: proc.procedure_value ?? proc.valor_total ?? proc.total_amount ?? '',
      duration_minutes: proc.duration_minutes || 60,
      billing_entity_type: proc.billing_entity_type || '',
      expected_payment_date: proc.expected_payment_date?.split('T')[0] || '',
      observacoes_financeiras: proc.observacoes_financeiras || '',
      observacoes_procedimento: proc.observacoes_procedimento || '',
      sangramento: proc.sangramento || '',
      nausea_vomito: proc.nausea_vomito || '',
      dor: proc.dor || '',
      acompanhamento_antes: proc.acompanhamento_antes || '',
      tipo_parto: proc.tipo_parto || '',
      tipo_cesariana: proc.tipo_cesariana || '',
      indicacao_cesariana: proc.indicacao_cesariana || '',
      descricao_indicacao_cesariana: proc.descricao_indicacao_cesariana || '',
      retencao_placenta: proc.retencao_placenta || '',
      laceracao_presente: proc.laceracao_presente || '',
      grau_laceracao: proc.grau_laceracao || '',
      hemorragia_puerperal: proc.hemorragia_puerperal || '',
      transfusao_realizada: proc.transfusao_realizada || '',
      show_to_secretary: proc.show_to_secretary !== false,
      feedback_solicitado: proc.feedback_solicitado || false,
      email_cirurgiao: proc.email_cirurgiao || '',
      telefone_cirurgiao: proc.telefone_cirurgiao || '',
    })
    setShowProcDetailsModal(true)
    // Carregar parcelas
    procedureService.getParcelas(proc.id).then(setProcParcelas).catch(() => setProcParcelas([]))
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
      
      if (isSecretary) {
        const res = await fetch(`/api/secretary/group/details?groupId=${id}`)
        if (!res.ok) throw new Error('Falha ao carregar grupo')
        const json = await res.json()
        const data = json.group
        
        setGroup(data)
        setEditName(data.name)
        setEditColor(data.color)
        setEditCnpj(data.cnpj || '')
        setEditType(data.type || 'sem_cotas')
        setEditBillingType(data.billing_type || 'individual')
        setEditShareFinancials(data.share_financials)
        setEditGoogleSheetsId(data.google_sheets_id || '')
        setEditGoogleSheetsEnabled(data.google_sheets_sync_enabled || false)
        setIsAdmin(false)
        
        if (createProcFormData.anesthesiologist_user_id === '' && data.group_members && data.group_members.length > 0) {
          setCreateProcFormData(prev => ({
            ...prev,
            anesthesiologist_user_id: data.group_members[0].users.id
          }))
        }
        
        if (activeTab === 'finance') {
          const clRes = await fetch('/api/secretary/dashboard/data')
          if (clRes.ok) {
            const clData = await clRes.json()
            setClosings(clData.closings || [])
          }
        }
      } else {
        const data = await getGroupDetails(id as string)
        setGroup(data)
        setEditName(data.name)
        setEditColor(data.color)
        setEditCnpj(data.cnpj || '')
        setEditType(data.type || 'sem_cotas')
        setEditBillingType(data.billing_type || 'individual')
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
        
        // Trava de Acesso: Faturamento Individual
        if (data.billing_type === 'individual' && currentUserMember.role !== 'admin') {
          const { data: userData } = await supabase.from('users').select('subscription_status').eq('id', user?.id).single();
          if (userData?.subscription_status !== 'active') {
            addToast({ 
              title: 'Assinatura Necessária', 
              description: 'Este grupo tem faturamento individual. Você precisa de uma assinatura ativa para acessar.', 
              variant: 'error' 
            })
            router.push('/planos')
            return
          }
        }

        // Os dados das abas (members, finance, etc) são carregados pelo useEffect separado
      }
    } catch (error) {
      addToast({ title: 'Erro ao carregar grupo', variant: 'error' })
      if (isSecretary) router.push('/login')
      else router.push('/grupos')
    } finally {
      setLoading(false)
    }
  }

  const enrichWithParcelas = async (procs: any[]): Promise<any[]> => {
    const parceladoIds = procs
      .filter((p: any) => p.payment_method === 'Parcelado' || p.forma_pagamento === 'Parcelado')
      .map((p: any) => p.id)
    if (parceladoIds.length === 0) return procs
    const parcelasMap = await procedureService.getParcelasBatch(parceladoIds)
    return procs.map((p: any) => {
      const parcelas = parcelasMap[p.id]
      if (!parcelas) return p
      return {
        ...p,
        numero_parcelas: parcelas.length,
        parcelas_recebidas: parcelas.filter((parc: any) => parc.recebida).length,
      }
    })
  }

  const loadGroupAgenda = async () => {
    try {
      setLoadingGroupAgendaState(true)
      const start = format(startOfMonth(agendaCurrentMonth), 'yyyy-MM-dd')
      const end = format(endOfMonth(agendaCurrentMonth), 'yyyy-MM-dd')

      const excludeNames = ['Cadastro de Paciente', 'Cadastro de Cirurgião', 'Cadastro de Anestesista Backup']

      let filtered: any[] = []
      if (isSecretary) {
        const res = await fetch(`/api/secretary/group/agenda?groupId=${id}&start=${start}&end=${end}`)
        if (!res.ok) throw new Error('Falha ao carregar agenda')
        const json = await res.json()
        filtered = (json.procedures || []).filter((p: any) => !excludeNames.includes(p.procedure_name))
      } else {
        const procs = await procedureService.getProceduresByDateRange(user!.id, start, end, id as string)
        filtered = procs.filter((p: any) => !excludeNames.includes(p.procedure_name))
        filtered.sort((a, b) => a.procedure_date.localeCompare(b.procedure_date))
      }

      setGroupProcedures(await enrichWithParcelas(filtered))
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
        procedure_name: procEditData.procedure_name || 'Procedimento',
        procedure_date: procEditData.procedure_date,
        horario: procEditData.horario || null,
        tecnica_anestesica: procEditData.tecnica_anestesica || null,
        codigo_tssu: procEditData.codigo_tssu || null,
        grupo_anestesico: procEditData.grupo_anestesico || null,
        patient_name: procEditData.patient_name,
        data_nascimento: procEditData.data_nascimento || null,
        convenio: procEditData.convenio || null,
        carteirinha: procEditData.carteirinha || null,
        patient_gender: procEditData.patient_gender || null,
        patient_phone: procEditData.patient_phone || null,
        patient_email: procEditData.patient_email || null,
        patient_companion: procEditData.patient_companion || null,
        patient_companion_phone: procEditData.patient_companion_phone || null,
        patient_notes: procEditData.patient_notes || null,
        hospital_clinic: procEditData.hospital_clinic || null,
        nome_cirurgiao: procEditData.nome_cirurgiao || null,
        especialidade_cirurgiao: procEditData.especialidade_cirurgiao || null,
        nome_equipe: procEditData.nome_equipe || null,
        anesthesiologist_role: procEditData.anesthesiologist_role || null,
        payment_status: procEditData.payment_status,
        payment_method: procEditData.payment_method || null,
        procedure_value: procEditData.valor_total ? parseFloat(String(procEditData.valor_total).replace(',', '.')) : 0,
        duration_minutes: procEditData.duration_minutes ? parseInt(String(procEditData.duration_minutes)) : null,
        billing_entity_type: procEditData.billing_entity_type || null,
        expected_payment_date: procEditData.expected_payment_date || null,
        observacoes_financeiras: procEditData.observacoes_financeiras || null,
        observacoes_procedimento: procEditData.observacoes_procedimento || null,
        sangramento: procEditData.sangramento || null,
        nausea_vomito: procEditData.nausea_vomito || null,
        dor: procEditData.dor || null,
        acompanhamento_antes: procEditData.acompanhamento_antes || null,
        tipo_parto: procEditData.tipo_parto || null,
        tipo_cesariana: procEditData.tipo_cesariana || null,
        indicacao_cesariana: procEditData.indicacao_cesariana || null,
        descricao_indicacao_cesariana: procEditData.descricao_indicacao_cesariana || null,
        retencao_placenta: procEditData.retencao_placenta || null,
        laceracao_presente: procEditData.laceracao_presente || null,
        grau_laceracao: procEditData.grau_laceracao || null,
        hemorragia_puerperal: procEditData.hemorragia_puerperal || null,
        transfusao_realizada: procEditData.transfusao_realizada || null,
        show_to_secretary: procEditData.show_to_secretary,
        feedback_solicitado: procEditData.feedback_solicitado,
        email_cirurgiao: procEditData.email_cirurgiao || null,
        telefone_cirurgiao: procEditData.telefone_cirurgiao || null,
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
      
      // Sincronizar parcelas_recebidas com o estado real das parcelas
      if (procParcelas.length > 0) {
        updates.parcelas_recebidas = procParcelas.filter((p: any) => p.recebida).length
        updates.numero_parcelas = procParcelas.length
      }

      // Salvar parcelas se houver (atualiza cada uma individualmente)
      const saveParcelas = async () => {
        if (procParcelas.length > 0) {
          await Promise.all(
            procParcelas.map(parc =>
              parc.id
                ? procedureService.updateParcela(parc.id, {
                    recebida: parc.recebida,
                    data_recebimento: parc.data_recebimento || null,
                    billing_entity_type: parc.billing_entity_type || null,
                    forma_recebimento: parc.forma_recebimento || null,
                  })
                : Promise.resolve(null)
            )
          )
        }
      }

      if (isSecretary) {
        const res = await fetch('/api/secretary/group/procedure/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: selectedProc.id, updates })
        })
        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error || 'Falha ao atualizar procedimento')
        }
        await saveParcelas()
        addToast({ title: 'Procedimento atualizado com sucesso!', variant: 'success' })
        loadGroupAgenda()
        if (activeTab === 'procedures') loadTabProcedures(false)
        setShowProcDetailsModal(false)
        setIsProcEditMode(false)
      } else {
        const updated = await procedureService.updateProcedure(selectedProc.id, updates)
        if (updated) {
          await saveParcelas()
          addToast({ title: 'Procedimento atualizado com sucesso!', variant: 'success' })
          loadGroupAgenda()
          if (activeTab === 'procedures') loadTabProcedures(false)
          setShowProcDetailsModal(false)
          setIsProcEditMode(false)
        } else {
          throw new Error('Falha ao atualizar procedimento')
        }
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
      if (isSecretary) {
        const res = await fetch(`/api/secretary/group/shifts?groupId=${id}`)
        if (!res.ok) throw new Error('Falha ao carregar escalas')
        const json = await res.json()
        setGroupShifts(json.shifts || [])
      } else {
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
      }
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
      
      if (isSecretary) {
        const params = new URLSearchParams({
          groupId: id as string,
          offset: String(currentOffset),
          limit: '10',
          search: tabProceduresSearch,
          status: tabProceduresStatusFilter,
          member: tabProceduresMemberFilter,
          start: tabProceduresStartDate,
          end: tabProceduresEndDate
        })
        const res = await fetch(`/api/secretary/group/procedures?${params}`)
        if (!res.ok) throw new Error('Falha ao carregar procedimentos')
        const json = await res.json()
        if (json.procedures) {
          const excludeNames = ['Cadastro de Paciente', 'Cadastro de Cirurgião', 'Cadastro de Anestesista Backup']
          const enriched = await enrichWithParcelas(json.procedures.filter((p: any) => !excludeNames.includes(p.procedure_name)))
          const effectiveFiltered = tabProceduresStatusFilter !== 'all'
            ? enriched.filter((p: any) => {
                const isParcelado = p.payment_method === 'Parcelado' || p.forma_pagamento === 'Parcelado'
                const hasOpen = isParcelado && p.numero_parcelas && (p.parcelas_recebidas || 0) < p.numero_parcelas
                const effective = hasOpen ? 'pending' : p.payment_status
                return effective === tabProceduresStatusFilter
              })
            : enriched
          if (loadMore) {
            setTabProceduresList(prev => [...prev, ...effectiveFiltered])
          } else {
            setTabProceduresList(effectiveFiltered)
          }
          setTabProceduresTotalCount(json.count || 0)
          setTabProceduresHasMore((currentOffset + json.procedures.length) < (json.count || 0))
        }
      } else {
        let query = supabase
          .from('procedures')
          .select('*', { count: 'exact' })
          .eq('group_id', id as string)
          .order('procedure_date', { ascending: false })
          .order('created_at', { ascending: false })
          .range(currentOffset, currentOffset + 9)

        if (tabProceduresSearch.trim() !== '') {
          const searchVal = `%${tabProceduresSearch.trim()}%`
          query = query.or(`patient_name.ilike.${searchVal},procedure_name.ilike.${searchVal},procedure_type.ilike.${searchVal},hospital_clinic.ilike.${searchVal},surgeon_name.ilike.${searchVal},nome_cirurgiao.ilike.${searchVal},anesthesiologist_name.ilike.${searchVal}`)
        }

        if (tabProceduresStatusFilter !== 'all') {
          // Procedimentos parcelados podem ter payment_status='paid' no banco mas
          // efetivamente pendentes (parcelas em aberto). Por isso, ao filtrar por
          // 'pending' ou 'paid', incluímos todos os parcelados e re-filtramos no cliente.
          if (tabProceduresStatusFilter === 'pending' || tabProceduresStatusFilter === 'paid') {
            query = query.or(`payment_status.eq.${tabProceduresStatusFilter},payment_method.eq.Parcelado,forma_pagamento.eq.Parcelado`)
          } else {
            query = query.eq('payment_status', tabProceduresStatusFilter)
          }
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
          const excludeNames = ['Cadastro de Paciente', 'Cadastro de Cirurgião', 'Cadastro de Anestesista Backup']
          const enriched = await enrichWithParcelas(data.filter((p: any) => !excludeNames.includes(p.procedure_name)))

          // Re-filtrar pelo status efetivo (considera parcelas em aberto)
          const effectiveFiltered = tabProceduresStatusFilter !== 'all'
            ? enriched.filter((p: any) => {
                const isParcelado = p.payment_method === 'Parcelado' || p.forma_pagamento === 'Parcelado'
                const hasOpen = isParcelado && p.numero_parcelas && (p.parcelas_recebidas || 0) < p.numero_parcelas
                const effective = hasOpen ? 'pending' : p.payment_status
                return effective === tabProceduresStatusFilter
              })
            : enriched

          if (loadMore) {
            setTabProceduresList(prev => [...prev, ...effectiveFiltered])
          } else {
            setTabProceduresList(effectiveFiltered)
          }
          setTabProceduresTotalCount(count || 0)
          setTabProceduresHasMore((currentOffset + data.length) < (count || 0))
        }
      }
    } catch (error) {
      console.error('Erro ao carregar procedimentos do grupo:', error)
      addToast({ title: 'Erro ao carregar procedimentos', variant: 'error' })
    } finally {
      setTabProceduresLoading(false)
    }
  }

  const loadPatientsData = async () => {
    try {
      setPatientsLoading(true)
      let procedures: any[] = []
      if (isSecretary) {
        const params = new URLSearchParams({
          groupId: id as string,
          offset: '0',
          limit: '1000'
        })
        const res = await fetch(`/api/secretary/group/procedures?${params}`)
        if (res.ok) {
          const json = await res.json()
          procedures = json.procedures || []
        }
      } else if (user) {
        procedures = await procedureService.getProcedures(user.id, { groupId: id as string, limit: 1000 })
      }

      const patientMap: Record<string, any> = {}
      const surgeonMap: Record<string, any> = {}
      const backupMap: Record<string, any> = {}

      procedures.forEach((proc: any) => {
        // --- 1. Pacientes ---
        const patName = (proc.patient_name || '').trim()
        if (patName && patName !== 'Cadastro de Cirurgião' && patName !== 'Cadastro de Anestesista Backup') {
          const patKey = patName.toLowerCase()
          if (!patientMap[patKey]) {
            patientMap[patKey] = {
              name: patName,
              data_nascimento: proc.data_nascimento || proc.birth_date || '',
              patient_age: proc.patient_age || '',
              patient_gender: proc.patient_gender || '',
              convenio: proc.convenio || '',
              carteirinha: proc.carteirinha || '',
              patient_phone: proc.patient_phone || '',
              patient_email: proc.patient_email || '',
              patient_notes: proc.patient_notes || '',
              patient_companion: proc.patient_companion || '',
              patient_companion_phone: proc.patient_companion_phone || '',
              proceduresCount: 0,
              lastProcedureDate: proc.procedure_date || '',
              lastProcedureType: proc.procedure_type || proc.procedure_name || '',
              procedures: []
            }
          }
          const pat = patientMap[patKey]
          if (proc.procedure_name !== 'Cadastro de Paciente' || proc.procedure_value > 0) {
            pat.proceduresCount += 1
          }
          pat.procedures.push(proc)
          if (proc.procedure_date && (!pat.lastProcedureDate || proc.procedure_date > pat.lastProcedureDate)) {
            pat.lastProcedureDate = proc.procedure_date
            if (proc.procedure_name !== 'Cadastro de Paciente' || proc.procedure_value > 0) {
              pat.lastProcedureType = proc.procedure_type || proc.procedure_name || ''
            }
            if (proc.data_nascimento) pat.data_nascimento = proc.data_nascimento
            if (proc.patient_gender) pat.patient_gender = proc.patient_gender
            if (proc.convenio) pat.convenio = proc.convenio
            if (proc.carteirinha) pat.carteirinha = proc.carteirinha
            if (proc.patient_phone) pat.patient_phone = proc.patient_phone
            if (proc.patient_email) pat.patient_email = proc.patient_email
            if (proc.patient_notes) pat.patient_notes = proc.patient_notes
            if (proc.patient_age) pat.patient_age = proc.patient_age
            if (proc.patient_companion) pat.patient_companion = proc.patient_companion
            if (proc.patient_companion_phone) pat.patient_companion_phone = proc.patient_companion_phone
          }
        }

        // --- 2. Cirurgiões ---
        const surgName = (proc.surgeon_name || proc.nome_cirurgiao || '').trim()
        if (surgName && surgName !== 'Cadastro de Cirurgião' && surgName !== 'Cadastro de Anestesista Backup' && surgName !== 'Não informado' && surgName !== 'Não informada') {
          const surgKey = surgName.toLowerCase()
          if (!surgeonMap[surgKey]) {
            surgeonMap[surgKey] = {
              name: surgName,
              phone: proc.telefone_cirurgiao || '',
              email: proc.email_cirurgiao || '',
              specialty: proc.especialidade_cirurgiao || '',
              proceduresCount: 0,
              lastProcedureDate: proc.procedure_date || '',
              procedures: []
            }
          }
          const surg = surgeonMap[surgKey]
          if (proc.procedure_name !== 'Cadastro de Cirurgião') {
            surg.proceduresCount += 1
          }
          surg.procedures.push(proc)
          if (proc.procedure_date && (!surg.lastProcedureDate || proc.procedure_date > surg.lastProcedureDate)) {
            surg.lastProcedureDate = proc.procedure_date
            if (proc.telefone_cirurgiao) surg.phone = proc.telefone_cirurgiao
            if (proc.email_cirurgiao) surg.email = proc.email_cirurgiao
            if (proc.especialidade_cirurgiao) surg.specialty = proc.especialidade_cirurgiao
          }
        }

        // --- 3. Anestesistas Backup ---
        const backupName = (proc.anesthesiologist_name || '').trim()
        if (backupName && !proc.anesthesiologist_user_id && backupName !== 'Cadastro de Anestesista Backup' && backupName !== 'Cadastro de Cirurgião') {
          const backupKey = backupName.toLowerCase()
          if (!backupMap[backupKey]) {
            backupMap[backupKey] = {
              name: backupName,
              phone: proc.anesthesiologist_phone || '',
              email: proc.anesthesiologist_email || '',
              notes: proc.anesthesiologist_notes || '',
              proceduresCount: 0,
              lastProcedureDate: proc.procedure_date || '',
              procedures: []
            }
          }
          const back = backupMap[backupKey]
          if (proc.procedure_name !== 'Cadastro de Anestesista Backup') {
            back.proceduresCount += 1
          }
          back.procedures.push(proc)
          if (proc.procedure_date && (!back.lastProcedureDate || proc.procedure_date > back.lastProcedureDate)) {
            back.lastProcedureDate = proc.procedure_date
            if (proc.anesthesiologist_phone) back.phone = proc.anesthesiologist_phone
            if (proc.anesthesiologist_email) back.email = proc.anesthesiologist_email
            if (proc.anesthesiologist_notes) back.notes = proc.anesthesiologist_notes
          }
        }
      })

      // Ordenar histórico de procedimentos por data decrescente
      Object.values(patientMap).forEach((patient: any) => {
        patient.procedures.sort((a: any, b: any) => new Date(b.procedure_date).getTime() - new Date(a.procedure_date).getTime())
      })
      Object.values(surgeonMap).forEach((surgeon: any) => {
        surgeon.procedures.sort((a: any, b: any) => new Date(b.procedure_date).getTime() - new Date(a.procedure_date).getTime())
      })
      Object.values(backupMap).forEach((backup: any) => {
        backup.procedures.sort((a: any, b: any) => new Date(b.procedure_date).getTime() - new Date(a.procedure_date).getTime())
      })

      setPatientsList(Object.values(patientMap))
      setSurgeonsList(Object.values(surgeonMap))
      setBackupsList(Object.values(backupMap))
    } catch (err) {
      console.error('Erro ao carregar cadastros:', err)
      addToast({ title: 'Erro ao carregar dados', variant: 'error' })
    } finally {
      setPatientsLoading(false)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user])

  useEffect(() => {
    if (id && isSecretary) {
      loadGroup()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isSecretary])

  useEffect(() => {
    if (!group) return // Wait for group to be loaded
    
    if (activeTab === 'agenda') {
      loadGroupAgenda()
    } else if (activeTab === 'shifts') {
      loadShifts()
    } else if (activeTab === 'procedures') {
      loadTabProcedures(false)
      // Carrega despesas junto com os procedimentos
      if (groupDespesas.length === 0) {
        despesaService.getByGroup(id as string).then(setGroupDespesas).catch(() => {})
      }
    } else if (activeTab === 'finance') {
      if (isSecretary) {
        fetch('/api/secretary/dashboard/data')
          .then(res => res.json())
          .then(data => {
            setClosings(data.closings || [])
          })
          .catch(err => console.error('Error loading finance data', err))
      } else {
        getMonthlyClosings(id as string).then(setClosings)
      }
      // Carregar despesas do grupo
      setLoadingDespesas(true)
      despesaService.getByGroup(id as string).then(data => {
        setGroupDespesas(data)
        setLoadingDespesas(false)
      }).catch(() => setLoadingDespesas(false))
    } else if (!isSecretary && (activeTab === 'secretaries' || activeTab === 'billing')) {
      getGroupSecretaries(id as string).then(setSecretaries)
    } else if (activeTab === 'patients') {
      loadPatientsData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, agendaCurrentMonth, group, isSecretary])

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

    // ----------------------------------------------------
    // CATRACA: Verifica se tem assento disponível (Grupo Centralizado)
    // ----------------------------------------------------
    if (group.billing_type === 'centralized') {
      const standardSeatsPaid = group.standard_seats_paid || 0;
      const membersCount = group.group_members?.filter((m: any) => m.role !== 'admin').length || 0;
      
      if (membersCount >= standardSeatsPaid) {
        addToast({ 
          title: 'Sem assentos disponíveis', 
          description: 'O seu grupo possui faturamento centralizado. Você precisa comprar mais assentos Standard antes de convidar novos anestesistas.',
          variant: 'error' 
        });
        return;
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
        user?.id || '',
        editMemberColor || null
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

    // ----------------------------------------------------
    // CATRACA: Verifica se tem assento disponível (Grupo Centralizado)
    // ----------------------------------------------------
    if (group.billing_type === 'centralized') {
      if (secretaries.length >= 5) {
        addToast({ 
          title: 'Limite atingido', 
          description: 'O limite de 5 secretárias foi atingido.',
          variant: 'error' 
        });
        return;
      }
    }

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
      if (isSecretary) {
        const res = await fetch('/api/secretary/group/shift/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            groupId: id as string,
            title: newShift.title,
            start_date: newShift.start_date,
            end_date: newShift.end_date,
            shift_type: newShift.shift_type,
            hospital_name: newShift.hospital_name || null,
            assigned_user_id: newShift.assigned_user_id || null,
            backup_user_id: newShift.backup_user_id || null,
            shift_value: newShift.shift_value || null,
            professional_role: newShift.professional_role || 'principal'
          })
        })
        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error || 'Falha ao criar plantão')
        }
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
      } else {
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
            user_id: user?.id
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
      }
    } catch (error: any) {
      addToast({ title: 'Erro ao criar plantão', description: error.message, variant: 'error' })
    } finally {
      setIsCreatingShift(false)
    }
  }

  const handleDeleteShift = async (shiftId: string) => {
    if (!confirm('Deseja excluir este plantão?')) return
    try {
      if (isSecretary) {
        const res = await fetch('/api/secretary/group/shift/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: shiftId })
        })
        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error || 'Falha ao remover plantão')
        }
        addToast({ title: 'Plantão removido', variant: 'success' })
        loadShifts()
      } else {
        const { error } = await supabase.from('shifts').delete().eq('id', shiftId)
        if (error) throw error
        addToast({ title: 'Plantão removido', variant: 'success' })
        loadShifts()
      }
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
        billing_type: editBillingType,
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
    if (!confirm('ATENÇÃO: O grupo será arquivado e não aparecerá mais para ninguém. Se não for restaurado, ele será excluído permanentemente após 30 dias. Deseja continuar?')) return
    try {
      await deleteGroup(id as string)
      addToast({ title: 'Grupo arquivado com sucesso', description: 'Ele será excluído definitivamente em 30 dias.', variant: 'success' })
      router.push('/grupos')
    } catch (error) {
      addToast({ title: 'Erro ao arquivar grupo', variant: 'error' })
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

  // ==========================================
  // ABA: ASSENTOS & COBRANÇA
  // ==========================================
  const [buySeatsPlanType, setBuySeatsPlanType] = useState<'monthly' | 'quarterly' | 'annual'>('monthly')
  const [isBuyingSeats, setIsBuyingSeats] = useState(false)
  const [buyStandardSeats, setBuyStandardSeats] = useState(1)
  const standardSeatUnitPrice = buySeatsPlanType === 'monthly' ? 79.90 : buySeatsPlanType === 'quarterly' ? 227.00 : buySeatsPlanType === 'annual' ? 862.90 : 79.90
  const totalStandardCost = buyStandardSeats * standardSeatUnitPrice
  const totalCost = totalStandardCost
  const periodLabel = buySeatsPlanType === 'monthly' ? '/mês' : buySeatsPlanType === 'quarterly' ? '/tri' : '/ano'
  const standardUnitPriceFormatted = standardSeatUnitPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })


  const handleCheckoutSeats = async () => {
    if (buyStandardSeats === 0) {
      addToast({ title: 'Selecione pelo menos um assento para comprar', variant: 'error' })
      return
    }

    try {
      setIsBuyingSeats(true)
      const response = await fetch('/api/stripe/checkout-group-seats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: id,
          standardSeats: buyStandardSeats,
          planType: buySeatsPlanType
        })
      })

      const data = await response.json()
      if (data.error) throw new Error(data.details || data.error)
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error: any) {
      addToast({ title: error.message || 'Erro ao iniciar pagamento', variant: 'error' })
    } finally {
      setIsBuyingSeats(false)
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
            {isSecretary && secretarySession?.permissions.includes('procedures') && (
              <div className="flex items-center shrink-0">
                <button
                  onClick={() => setShowCreateProcModal(true)}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-3 rounded-2xl font-bold shadow-lg shadow-teal-500/20 text-sm transition-all flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  <span>Novo Procedimento</span>
                </button>
              </div>
            )}
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
                            <div 
                              className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold border shrink-0"
                              style={{ 
                                backgroundColor: member.color ? `${member.color}15` : '#F0FDFA',
                                borderColor: member.color || '#E2E8F0',
                                color: member.color || '#0D9488'
                              }}
                            >
                              {member.users.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 flex items-center gap-2">
                                {member.users.name}
                                {member.role === 'admin' && <span title="Admin"><Shield className="w-4 h-4 text-amber-500" /></span>}
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
                                  setEditMemberColor(member.color || '')
                                }}
                                className="px-3 py-1.5 text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl font-bold transition-all"
                              >
                                Configurar
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

                          {/* INLINE EDIT QUOTA & COLOR */}
                          {editingMemberId === member.id && (
                            <div className="w-full md:w-auto flex flex-wrap items-end gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 mt-2 md:mt-0">
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
                              <div className="flex flex-col gap-1 min-w-[200px]">
                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Cor do Membro</label>
                                <div className="flex flex-wrap gap-1 items-center">
                                  {PRESET_COLORS.map(c => (
                                    <button
                                      key={c.value}
                                      type="button"
                                      onClick={() => setEditMemberColor(c.value)}
                                      className={`w-5 h-5 rounded-full border transition-all shrink-0 ${
                                        editMemberColor === c.value ? 'border-slate-800 scale-110 shadow-sm ring-1 ring-slate-800' : 'border-transparent hover:scale-105'
                                      }`}
                                      style={{ backgroundColor: c.value }}
                                      title={c.name}
                                    />
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() => setEditMemberColor('')}
                                    className={`text-[9px] px-1.5 py-0.5 bg-white border rounded font-bold text-slate-500 hover:bg-slate-50 transition-colors ${
                                      !editMemberColor ? 'border-slate-800 text-slate-850' : 'border-slate-200'
                                    }`}
                                  >
                                    Limpar
                                  </button>
                                </div>
                              </div>
                              <div className="flex gap-1">
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
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold uppercase inline-block">
                                  Status: {sec.status}
                                </span>
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold uppercase inline-block">
                                  Secretária
                                </span>
                              </div>
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
                
                {/* SUB-TABS INTERNAS DO FINANCEIRO */}
                <div className="flex gap-2 sm:gap-4 border-b border-slate-200">
                  <button
                    onClick={() => setFinanceSubTab('dashboard')}
                    className={`px-4 py-3 text-sm font-bold border-b-2 -mb-[2px] transition-all ${
                      financeSubTab === 'dashboard' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Painel em Tempo Real
                  </button>
                  <button
                    onClick={async () => {
                      setFinanceSubTab('fechamentos')
                      // Carregar histórico de fechamentos
                      const history = await fechamentoService.getFechamentosByGroup(id as string)
                      setFechamentosHistory(history)
                    }}
                    className={`px-4 py-3 text-sm font-bold border-b-2 -mb-[2px] transition-all ${
                      financeSubTab === 'fechamentos' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Fechamentos (Extratos)
                  </button>
                </div>

                {financeSubTab === 'dashboard' && (
                  <div className="space-y-6">
                    {/* Dashboard Financeiro com Gráficos */}
                    {group && (
                      <FinanceiroDashboardWrapper
                        groupId={id as string}
                        groupName={group.name}
                        groupMembers={group.group_members || []}
                        currentUserId={user?.id}
                        groupType={group.type}
                        refreshKey={dashboardRefreshKey}
                      />
                    )}

                {/* ── DESPESAS DO GRUPO ── */}
                <section className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-red-500" />
                        Despesas do Grupo
                      </h3>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">Registre gastos do grupo que serão deduzidos do faturamento</p>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      {groupDespesas.length > 0 && (
                        <span className="text-sm font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-xl shrink-0 hidden sm:inline-block">
                          Total: {formatCurrency(groupDespesas.reduce((s, d) => s + (d.valor || 0), 0))}
                        </span>
                      )}
                      <button
                        onClick={async () => {
                          if (!showNewDespesaForm && groupDespesas.length === 0 && !loadingDespesas) {
                            setLoadingDespesas(true)
                            const data = await despesaService.getByGroup(id as string)
                            setGroupDespesas(data)
                            setLoadingDespesas(false)
                          }
                          setShowNewDespesaForm(v => !v)
                        }}
                        className="flex w-full sm:w-auto justify-center items-center gap-1.5 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-all"
                      >
                        <Plus className="w-4 h-4 shrink-0" /> Nova Despesa
                      </button>
                    </div>
                  </div>

                  {/* Formulário nova despesa */}
                  {showNewDespesaForm && (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Descrição (ex: INSS, Gasolina, Aluguel...)"
                          value={newDespesa.descricao}
                          onChange={e => setNewDespesa(prev => ({ ...prev, descricao: e.target.value }))}
                          className="sm:col-span-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none bg-white"
                        />
                        <select
                          value={newDespesa.categoria}
                          onChange={e => setNewDespesa(prev => ({ ...prev, categoria: e.target.value }))}
                          className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none bg-white"
                        >
                          {CATEGORIAS_DESPESA.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          placeholder="Valor (R$)"
                          min="0"
                          step="0.01"
                          value={newDespesa.valor}
                          onChange={e => setNewDespesa(prev => ({ ...prev, valor: e.target.value }))}
                          className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none bg-white"
                        />
                        <input
                          type="date"
                          value={newDespesa.data_despesa}
                          onChange={e => setNewDespesa(prev => ({ ...prev, data_despesa: e.target.value }))}
                          className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none bg-white"
                        />
                        <select
                          value={newDespesa.anesthesiologist_id}
                          onChange={e => setNewDespesa(prev => ({ ...prev, anesthesiologist_id: e.target.value }))}
                          className="sm:col-span-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none bg-white font-medium"
                        >
                          <option value="">👥 Vinculado ao Grupo</option>
                          {group?.group_members?.map((m: any, idx: number) => (
                            <option key={m.id || idx} value={m.user_id || m.users?.id || ''}>👤 Vinculado a: {m.users?.name || 'Membro'}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowNewDespesaForm(false)}
                          className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-all"
                        >
                          Cancelar
                        </button>
                        <button
                          disabled={!newDespesa.descricao || !newDespesa.valor || savingDespesa}
                          onClick={async () => {
                            if (!newDespesa.descricao || !newDespesa.valor) return
                            setSavingDespesa(true)
                            const created = await despesaService.createGroupDespesa(id as string, {
                              descricao: newDespesa.descricao,
                              categoria: newDespesa.categoria,
                              valor: parseFloat(newDespesa.valor),
                              data_despesa: newDespesa.data_despesa,
                              anesthesiologist_id: newDespesa.anesthesiologist_id || null
                            })
                            if (created) {
                              setGroupDespesas(prev => [created, ...prev])
                              setNewDespesa({ descricao: '', categoria: 'outros', valor: '', data_despesa: new Date().toISOString().split('T')[0], anesthesiologist_id: '' })
                              setShowNewDespesaForm(false)
                            }
                            setSavingDespesa(false)
                          }}
                          className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                        >
                          {savingDespesa
                            ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : <Check className="w-4 h-4" />}
                          Salvar Despesa
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Lista de despesas */}
                  {loadingDespesas ? (
                    <div className="flex justify-center py-6">
                      <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : groupDespesas.length === 0 && !showNewDespesaForm ? (
                    <div
                      className="text-center py-8 cursor-pointer"
                      onClick={async () => {
                        setLoadingDespesas(true)
                        const data = await despesaService.getByGroup(id as string)
                        setGroupDespesas(data)
                        setLoadingDespesas(false)
                        setShowNewDespesaForm(true)
                      }}
                    >
                      <DollarSign className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                      <p className="text-sm text-slate-400 font-medium">Nenhuma despesa registrada</p>
                      <p className="text-xs text-slate-300">Clique em "Nova Despesa" para adicionar</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {groupDespesas.map((d) => (
                        <div key={d.id} className="flex items-center gap-4 px-4 py-3 bg-red-50 border border-red-100 rounded-2xl group/item">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-bold text-red-500 uppercase bg-red-100 px-2 py-0.5 rounded-lg shrink-0">
                                {CATEGORIAS_DESPESA.find(c => c.value === d.categoria)?.label || d.categoria}
                              </span>
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg shrink-0">
                                {d.anesthesiologist_id 
                                  ? (group?.group_members?.find((m: any) => m.user_id === d.anesthesiologist_id)?.users?.name || 'Membro')
                                  : 'Grupo'}
                              </span>
                              <span className="font-semibold text-slate-800 text-sm truncate">{d.descricao}</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {new Date(d.data_despesa + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                          <span className="font-bold text-red-600 text-base shrink-0">{formatCurrency(d.valor)}</span>
                          <button
                            onClick={() => setDespesaToDelete({ id: d.id!, descricao: d.descricao })}
                            className="p-1.5 text-slate-200 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-all shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
                  </div>
                )} {/* FIM DA VIEW DASHBOARD */}

                {/* ==========================================
                    VIEW: FECHAMENTOS (EXTRATOS)
                    ========================================== */}
                {financeSubTab === 'fechamentos' && (
                  <div className="space-y-8 animate-in fade-in duration-300">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">Ciclos de Fechamento</h2>
                        <p className="text-sm text-slate-500">Gere e visualize os extratos financeiros do grupo.</p>
                      </div>
                      <button
                        onClick={() => setShowFechamentoWizard(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md transition-all text-sm w-full sm:w-auto justify-center"
                      >
                        <Plus className="w-4 h-4" /> Realizar Novo Fechamento
                      </button>
                    </div>

                    {/* Lista de Fechamentos Antigos */}
                    {fechamentosHistory.length === 0 ? (
                      <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400">
                        Nenhum fechamento registrado no grupo ainda.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {fechamentosHistory.map(fechamento => (
                          <div key={fechamento.id} className="bg-white rounded-3xl border border-slate-100 shadow-md p-6 space-y-4 hover:shadow-lg transition-all relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                              <Lock className="w-24 h-24" />
                            </div>
                            <div className="flex justify-between items-start relative z-10">
                              <div>
                                <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-lg font-black uppercase">
                                  Fechado
                                </span>
                                <h4 className="font-black text-slate-900 text-lg mt-2">{fechamento.competencia}</h4>
                                <p className="text-xs text-slate-500 mt-1">Data: {new Date(fechamento.data_fechamento).toLocaleDateString('pt-BR')}</p>
                              </div>
                            </div>
                            <div className="pt-4 border-t border-slate-100 space-y-2 relative z-10">
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-500 font-medium">Faturamento</span>
                                <span className="font-bold text-slate-900">{formatCurrency(fechamento.total_faturamento)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-red-400 font-medium">Despesas Grupo</span>
                                <span className="font-bold text-red-500">-{formatCurrency(fechamento.total_despesas_grupo)}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                // ABRIR MODAL COM EXTRATO
                                setFechamentoPreview({
                                  faturamentoBruto: fechamento.total_faturamento,
                                  despesasGrupoTotal: fechamento.total_despesas_grupo,
                                  liquidoDistribuivel: fechamento.total_faturamento - fechamento.total_despesas_grupo,
                                  extratoMembros: fechamento.extrato_membros,
                                  isViewOnly: true
                                })
                                setShowFechamentoWizard(true)
                                setFechamentoCompetencia(fechamento.competencia)
                              }}
                              className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-sm transition-all relative z-10"
                            >
                              Ver Extrato Detalhado
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

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
                     {groupShifts.map(shift => {
                       const assignedMemberColor = shift.assigned_user_id ? getMemberColor(shift.assigned_user_id) : null
                       return (
                         <div 
                           key={shift.id} 
                           className="bg-white rounded-3xl border border-slate-100 shadow-lg p-6 space-y-4 hover:shadow-xl transition-shadow relative"
                           style={assignedMemberColor ? { borderLeft: `6px solid ${assignedMemberColor}` } : undefined}
                         >
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
                                 <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                   {assignedMemberColor && (
                                     <span 
                                       className="w-2 h-2 rounded-full shrink-0" 
                                       style={{ backgroundColor: assignedMemberColor }}
                                     />
                                   )}
                                   <span>{shift.assigned.name} {shift.professional_role ? `(${shift.professional_role === 'principal' ? 'Principal' : 'Auxiliar'})` : ''}</span>
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
                    ); })}
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
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => openMapaModal(agendaSelectedDate)}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl font-bold transition-all text-xs"
                    >
                      <Layers className="w-4 h-4 text-teal-600" /> Mapa do Dia
                    </button>
                    <button
                      onClick={() => { setNewDespesa({ descricao: '', categoria: 'outros', valor: '', data_despesa: new Date().toISOString().split('T')[0] }); setShowDespesaModal(true) }}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-red-50 border border-red-200 text-red-600 rounded-xl font-bold transition-all text-xs"
                    >
                      <DollarSign className="w-4 h-4" /> Despesas
                    </button>
                    <Link
                      href={`/procedimentos/novo?groupId=${id}`}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-md transition-all text-xs"
                    >
                      <Plus className="w-4 h-4" /> Novo Procedimento
                    </Link>
                  </div>
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
                              const executorId = proc.anesthesiologist_user_id || proc.user_id
                              const memberColor = getMemberColor(executorId)
                              const conflict = proc.anesthesiologist_user_id ? checkAnesthesiologistConflict(
                                proc.anesthesiologist_user_id,
                                proc.id,
                                proc.procedure_date,
                                proc.horario || '',
                                proc.duration_minutes || 60
                              ) : null;
                              const isParcelado = proc.payment_method === 'Parcelado' || proc.forma_pagamento === 'Parcelado'
                              const hasOpenParcelas = isParcelado && proc.numero_parcelas && (proc.parcelas_recebidas || 0) < proc.numero_parcelas
                              const effectiveStatus = hasOpenParcelas ? 'pending' : proc.payment_status
                              return (
                                <div
                                  key={proc.id}
                                  onClick={() => handleOpenProcDetails(proc)}
                                  className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-teal-200 transition-all p-3 sm:p-5 flex flex-col md:flex-row justify-between md:items-center gap-3 sm:gap-4 cursor-pointer group"
                                  style={memberColor ? { borderLeft: `6px solid ${memberColor}` } : undefined}
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
                                        getTabStatusColor(effectiveStatus)
                                      )}>
                                        {getTabStatusText(effectiveStatus)}
                                      </span>
                                      {(proc.payment_method === 'Parcelado' || proc.forma_pagamento === 'Parcelado') && proc.numero_parcelas && (
                                        <span className="px-2 py-0.5 text-[10px] font-bold rounded uppercase bg-purple-50 text-purple-700 flex items-center gap-1">
                                          <CreditCard className="w-3 h-3" />
                                          {proc.parcelas_recebidas || 0}/{proc.numero_parcelas} parcelas
                                        </span>
                                      )}
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
                {/* HEADER DA ABA */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Lançamentos do Grupo</h3>
                    <p className="text-xs text-slate-500 font-medium">Procedimentos e despesas registrados no grupo.</p>
                  </div>
                  <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => openMapaModal(new Date())}
                      className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl font-bold transition-all text-xs"
                    >
                      <Layers className="w-4 h-4 text-teal-600" /> <span className="hidden xs:inline">Mapa do Dia</span>
                    </button>
                    <button
                      onClick={() => { setNewDespesa({ descricao: '', categoria: 'outros', valor: '', data_despesa: new Date().toISOString().split('T')[0] }); setShowDespesaModal(true) }}
                      className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2.5 bg-white hover:bg-red-50 border border-red-200 text-red-600 rounded-xl font-bold transition-all text-xs"
                    >
                      <DollarSign className="w-4 h-4" /> <span className="hidden xs:inline">Despesas</span>
                    </button>
                    <Link
                      href={`/procedimentos/novo?groupId=${id}`}
                      className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-md transition-all text-xs"
                    >
                      <Plus className="w-4 h-4" /> <span className="hidden xs:inline">Novo</span>
                    </Link>
                  </div>
                </div>

                {/* CARD DE FILTROS E BUSCA */}
                <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 p-4 sm:p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 sm:gap-4 items-end">
                    {/* Barra de Pesquisa */}
                    <div className="md:col-span-3 space-y-2">
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

                    {/* Tipo de Lançamento */}
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Tipo</label>
                      <select
                        value={tabProceduresTypeFilter}
                        onChange={(e) => setTabProceduresTypeFilter(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-teal-500 outline-none transition-all font-medium bg-white text-sm"
                      >
                        <option value="all">Todos</option>
                        <option value="procedures">Procedimentos</option>
                        <option value="expenses">Despesas</option>
                      </select>
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
                        <option value="pending">Aguardando</option>
                        <option value="cancelled">Cancelado</option>
                        <option value="sent">Enviado</option>
                      </select>
                    </div>

                    {/* Executor / Membro */}
                    <div className="md:col-span-2 space-y-2">
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
                  <div className="flex flex-col sm:flex-row justify-end gap-3 mt-4 pt-4 border-t border-slate-50">
                    {(tabProceduresSearch || tabProceduresStatusFilter !== 'all' || tabProceduresMemberFilter !== 'all' || tabProceduresStartDate || tabProceduresEndDate) && (
                      <button
                        onClick={() => {
                          setTabProceduresSearch('')
                          setTabProceduresTypeFilter('all')
                          setTabProceduresStatusFilter('all')
                          setTabProceduresMemberFilter('all')
                          setTabProceduresStartDate('')
                          setTabProceduresEndDate('')
                          setTimeout(() => loadTabProcedures(false), 50)
                        }}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold text-xs transition-all"
                      >
                        Limpar Filtros
                      </button>
                    )}
                    <button
                      onClick={() => openMapaModal(new Date())}
                      className="w-full sm:w-auto justify-center bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-5 py-2.5 rounded-2xl font-bold text-xs transition-all flex items-center gap-2"
                    >
                      <Layers className="w-3.5 h-3.5 text-teal-600" />
                      Mapa do Dia
                    </button>
                    <button
                      onClick={() => loadTabProcedures(false)}
                      className="w-full sm:w-auto justify-center bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-2xl font-bold text-xs transition-all shadow-md shadow-teal-100 flex items-center gap-2"
                    >
                      <Search className="w-3.5 h-3.5" />
                      Buscar
                    </button>
                  </div>
                </div>

                {/* LANÇAMENTOS CONTAINER (procedimentos + despesas) */}
                {(() => {
                  const allProcedures = tabProceduresTypeFilter !== 'expenses' ? tabProceduresList.map(p => ({ ...p, _tipo: 'procedimento' as const })) : []
                  
                  let filteredDespesas = tabProceduresTypeFilter !== 'procedures' ? groupDespesas.map((d: any) => ({ ...d, _tipo: 'despesa' as const })) : []
                  
                  if (tabProceduresSearch.trim() !== '') {
                    const s = tabProceduresSearch.toLowerCase()
                    filteredDespesas = filteredDespesas.filter((d: any) => 
                      d.descricao.toLowerCase().includes(s) || 
                      d.categoria.toLowerCase().includes(s)
                    )
                  }
                  if (tabProceduresStartDate) {
                    filteredDespesas = filteredDespesas.filter((d: any) => d.data_despesa >= tabProceduresStartDate)
                  }
                  if (tabProceduresEndDate) {
                    filteredDespesas = filteredDespesas.filter((d: any) => d.data_despesa <= tabProceduresEndDate)
                  }
                  
                  const lancamentos = [
                    ...allProcedures,
                    ...filteredDespesas,
                  ].sort((a, b) => {
                    const dA = a._tipo === 'procedimento' ? a.procedure_date : a.data_despesa
                    const dB = b._tipo === 'procedimento' ? b.procedure_date : b.data_despesa
                    return new Date(dB + 'T12:00:00').getTime() - new Date(dA + 'T12:00:00').getTime()
                  })

                  if (tabProceduresLoading && lancamentos.length === 0) return (
                  <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50">
                    <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-slate-500 text-sm font-bold">Carregando lançamentos...</p>
                  </div>
                  )

                  if (lancamentos.length === 0) return (
                  <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 text-center px-6">
                    <div className="w-16 h-16 bg-slate-50 border border-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mb-4">
                      <FileText className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-black text-slate-800">Nenhum lançamento encontrado</h3>
                    <p className="text-slate-400 text-sm mt-1 max-w-sm">
                      Nenhum procedimento ou despesa foi encontrado para os filtros selecionados.
                    </p>
                  </div>
                  )

                  return (
                  <div className="space-y-6">
                    {/* Grid de Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {lancamentos.map((item) => {
                        if (item._tipo === 'despesa') {
                          const d = item as any
                          return (
                            <div
                              key={`desp-${d.id}`}
                              className="col-span-full flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 py-3 bg-white border border-red-100 rounded-xl shadow-sm group/desp hover:border-red-200 transition-all relative"
                              style={{ borderLeft: '4px solid #ef4444' }}
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                {/* Ícone */}
                                <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center shrink-0">
                                  <DollarSign className="w-4 h-4 text-red-400" />
                                </div>

                                {/* Categoria e Descrição num flex column em mobile */}
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 flex-1 min-w-0 overflow-hidden">
                                  <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider self-start sm:self-auto shrink-0">
                                    {CATEGORIAS_DESPESA.find(c => c.value === d.categoria)?.label || d.categoria}
                                  </span>

                                  <span className="font-bold text-slate-800 text-sm flex-1 truncate">{d.descricao}</span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pl-11 sm:pl-0 w-full sm:w-auto">
                                {/* Data */}
                                <span className="text-xs text-slate-400 font-medium shrink-0">
                                  {new Date(d.data_despesa + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>

                                {/* Valor */}
                                <span className="font-extrabold text-red-600 text-sm shrink-0 min-w-[90px] text-right">
                                  − {formatCurrency(d.valor)}
                                </span>

                                {/* Excluir */}
                                <button
                                  onClick={() => setDespesaToDelete({ id: d.id!, descricao: d.descricao })}
                                  className="p-1.5 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-lg sm:opacity-0 sm:group-hover/desp:opacity-100 transition-all shrink-0 absolute top-2 right-2 sm:static sm:top-auto sm:right-auto"
                                  title="Excluir despesa"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )
                        }

                        const proc = item as any
                        const executorId = proc.anesthesiologist_user_id || proc.user_id
                        const memberColor = getMemberColor(executorId)
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
                        const isParceladoTab = proc.payment_method === 'Parcelado' || proc.forma_pagamento === 'Parcelado'
                        const hasOpenParcelasTab = isParceladoTab && proc.numero_parcelas && (proc.parcelas_recebidas || 0) < proc.numero_parcelas
                        const effectiveStatusTab = hasOpenParcelasTab ? 'pending' : proc.payment_status

                        return (
                          <div
                            key={proc.id}
                            className="bg-white rounded-2xl border border-slate-100 shadow-md shadow-slate-200/50 overflow-hidden flex flex-col justify-between hover:shadow-slate-300/40 hover:border-slate-200/60 transition-all group"
                            style={memberColor ? { borderLeft: `4px solid ${memberColor}` } : undefined}
                          >
                            <div className="p-4 space-y-2.5">
                              {/* Header Card */}
                              <div className="flex justify-between items-start gap-2">
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider truncate max-w-[130px]" title={proc.procedure_type}>
                                  {proc.procedure_type}
                                </span>
                                <span className="text-[10px] text-slate-400 font-bold shrink-0">
                                  {formatProcDate(proc.procedure_date)}
                                </span>
                              </div>

                              {/* Patient Name */}
                              <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Paciente</p>
                                <h4 className="font-black text-slate-900 text-sm leading-tight truncate mt-0.5" title={proc.patient_name}>
                                  {proc.patient_name}
                                </h4>
                              </div>

                              {/* Details Info */}
                              <div className="space-y-1.5 pt-2 border-t border-slate-50 text-xs">
                                <p className="truncate flex items-center gap-1.5" title={proc.procedure_name || proc.procedure_type}>
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span>
                                  <span className="font-bold text-slate-400">Cirurgia:</span>
                                  <span className="text-slate-700 font-semibold">{proc.procedure_name || proc.procedure_type || '—'}</span>
                                </p>
                                <p className="truncate flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                                  <span className="font-bold text-slate-400">Cirurgião:</span>
                                  <span className="text-slate-700 font-semibold">{proc.surgeon_name || proc.nome_cirurgiao || '—'}</span>
                                </p>
                                <div className="flex items-center gap-1.5 truncate">
                                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: memberColor || '#3B82F6' }} />
                                  <span className="font-bold text-slate-400">Anest.:</span>
                                  <span className="text-slate-700 font-semibold truncate">Dr(a). {executorName}</span>
                                  {memberColor && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded font-black uppercase text-white shrink-0" style={{ backgroundColor: memberColor }}>
                                      Equipe
                                    </span>
                                  )}
                                </div>
                                {conflict && (
                                  <div className="flex items-start gap-1 text-[10px] font-bold text-red-600 bg-red-50 p-1.5 rounded leading-tight">
                                    <AlertCircle className="w-3 h-3 flex-shrink-0 mt-px" />
                                    <span className="break-words">{conflict}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Bottom Card */}
                            <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between">
                              <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Valor</p>
                                <p className="font-extrabold text-teal-600 text-sm">
                                  {formatCurrency(proc.procedure_value || 0)}
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                <span className={cn("px-2 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wider", getTabStatusColor(effectiveStatusTab))}>
                                  {getTabStatusText(effectiveStatusTab)}
                                </span>
                                {isParceladoTab && proc.numero_parcelas && (
                                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full uppercase bg-purple-50 text-purple-700 flex items-center gap-1">
                                    <CreditCard className="w-3 h-3" />
                                    {proc.parcelas_recebidas || 0}/{proc.numero_parcelas}
                                  </span>
                                )}
                                <button
                                  onClick={() => handleOpenProcDetails(proc)}
                                  className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-700 transition-all shadow-sm"
                                  title="Ver Detalhes"
                                >
                                  <Eye className="w-3.5 h-3.5" />
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
                  )
                })()}
              </div>
            )}

            {/* ==========================================
                TAB: ASSENTOS & COBRANÇA
                ========================================== */}
            {activeTab === 'billing' && (
              <section className="space-y-6">
                <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-900">Assentos e Cobrança</h2>
                      <p className="text-sm text-slate-500">
                        {group.billing_type === 'centralized' 
                          ? 'Gerencie as vagas pagas pelo grupo (Faturamento Centralizado).' 
                          : 'Seu grupo usa faturamento individual. Cada membro paga sua própria assinatura.'}
                      </p>
                    </div>
                  </div>

                  {group.billing_type === 'centralized' ? (
                    <div className="space-y-8">
                      {/* Resumo Atual */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Anestesistas (Standard)</p>
                          <div className="flex items-end gap-2">
                            <span className="text-3xl font-black text-slate-900">{group.group_members?.filter((m: any) => m.role !== 'admin').length || 0}</span>
                            <span className="text-sm font-medium text-slate-500 mb-1">usados de</span>
                            <span className="text-3xl font-black text-teal-600">{group.standard_seats_paid || 0}</span>
                          </div>
                        </div>
                        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Sec. Ajudantes (Gratuitas)</p>
                          <div className="flex items-end gap-2">
                            <span className="text-3xl font-black text-slate-900">{secretaries?.filter(s => s.role === 'ajudante').length || 0}</span>
                            <span className="text-sm font-medium text-slate-500 mb-1">usados de</span>
                            <span className="text-3xl font-black text-slate-400">5</span>
                          </div>
                        </div>
                      </div>

                      {/* Compra de Novos Assentos */}
                      <div className="p-6 rounded-3xl border-2 border-teal-50 bg-white">
                        <h3 className="font-bold text-slate-900 mb-4">Adicionar mais vagas</h3>
                        
                        {/* Seletor de Periodicidade */}
                        <div className="mb-6 space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Periodicidade do Plano</label>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { id: 'monthly', label: 'Mensal' },
                              { id: 'quarterly', label: 'Trimestral' },
                              { id: 'annual', label: 'Anual' }
                            ].map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => setBuySeatsPlanType(p.id as any)}
                                className={`p-3 rounded-xl border text-center transition-all ${
                                  buySeatsPlanType === p.id
                                    ? 'border-teal-500 bg-teal-50/30 text-teal-700 shadow-sm font-bold'
                                    : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                                }`}
                              >
                                <span className="block text-sm font-bold">{p.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">
                              Assentos para Anestesista <span className="text-teal-600 font-black">({standardUnitPriceFormatted})</span>
                            </label>
                            <input 
                              type="number" 
                              min="0"
                              value={buyStandardSeats}
                              onChange={(e) => setBuyStandardSeats(Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-teal-500 font-bold"
                            />
                          </div>
                        </div>


                        {/* Resumo do Valor */}
                        {buyStandardSeats > 0 && (
                          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 mb-6 space-y-2 text-sm text-slate-600">
                            <div className="flex justify-between">
                              <span>Periodicidade:</span>
                              <span className="font-bold text-slate-900">
                                {buySeatsPlanType === 'monthly' ? 'Mensal' : buySeatsPlanType === 'quarterly' ? 'Trimestral' : 'Anual'}
                              </span>
                            </div>
                            {buyStandardSeats > 0 && (
                              <div className="flex justify-between">
                                <span>{buyStandardSeats}x Assento Anestesista:</span>
                                <span className="font-bold text-slate-800">
                                  {totalStandardCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                              </div>
                            )}

                            <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-950 text-base">
                              <span>Total Geral:</span>
                              <span>
                                {totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                <span className="text-xs font-normal text-slate-500 ml-1">
                                  {buySeatsPlanType === 'monthly' ? '/mês' : buySeatsPlanType === 'quarterly' ? '/trimestre' : '/ano'}
                                </span>
                              </span>
                            </div>
                          </div>
                        )}

                        <button
                          onClick={handleCheckoutSeats}
                          disabled={isBuyingSeats || buyStandardSeats === 0}
                          className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-teal-600/20"
                        >
                          {isBuyingSeats ? 'Iniciando Checkout...' : `Pagar ${totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}${buySeatsPlanType === 'monthly' ? '/mês' : buySeatsPlanType === 'quarterly' ? '/tri' : '/ano'}`}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-slate-600 mb-4">
                        A gestão de assentos não está disponível para grupos com Faturamento Individual.
                      </p>
                      <button 
                        onClick={() => handleTabChange('settings')}
                        className="text-teal-600 font-bold hover:underline"
                      >
                        Alterar para Faturamento Centralizado
                      </button>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* ==========================================
                TAB: PACIENTES
                ========================================== */}
            {activeTab === 'patients' && (
              <section className="space-y-6">
                {/* SUB-TABS INTERNAS DE CADASTRO */}
                <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 p-4 sm:p-6 pb-2">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-900">Painel de Cadastros</h2>
                      <p className="text-sm text-slate-500">Gerencie pacientes, cirurgiões parceiros e anestesistas backup do grupo.</p>
                    </div>
                  </div>
                  <div className="sm:hidden flex items-center justify-end gap-1.5 text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-2">
                    <span>Arraste para os lados</span>
                    <svg className="w-3.5 h-3.5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                  </div>
                  <div className="flex border-b border-slate-100 gap-1 sm:gap-2 overflow-x-auto scrollbar-hide">
                    {[
                      { id: 'patients', label: 'Pacientes', count: patientsList.length },
                      { id: 'surgeons', label: 'Cirurgiões', count: surgeonsList.length },
                      { id: 'backups', label: 'Anestesistas Backup', count: backupsList.length }
                    ].map(sub => (
                      <button
                        key={sub.id}
                        onClick={() => setCadastroSubTab(sub.id as any)}
                        className={`px-3 sm:px-5 py-3 font-bold text-xs sm:text-sm transition-all border-b-2 -mb-[2px] flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 ${
                          cadastroSubTab === sub.id
                            ? 'border-teal-600 text-teal-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <span>{sub.label}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                          cadastroSubTab === sub.id
                            ? 'bg-teal-50 text-teal-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {sub.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* ABA INTERNA: PACIENTES */}
                {cadastroSubTab === 'patients' && (
                  <div className="space-y-6">
                    {/* BUSCA E CADASTRO */}
                    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                            Banco de Pacientes
                          </h3>
                          <p className="text-sm text-slate-500">
                            Histórico clínico e dados dos pacientes atendidos.
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setCreatePatientFormData({
                              name: '',
                              gender: '',
                              birthDate: '',
                              age: '',
                              phone: '',
                              email: '',
                              notes: '',
                              companion: '',
                              companionPhone: ''
                            })
                            setShowCreatePatientModal(true)
                          }}
                          className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-3 rounded-2xl font-bold shadow-lg shadow-teal-500/20 text-sm transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
                        >
                          <UserPlus className="w-5 h-5" />
                          <span>Cadastrar Paciente</span>
                        </button>
                      </div>

                      <div className="mt-6 pt-6 border-t border-slate-100">
                        <div className="relative max-w-md">
                          <input
                            type="text"
                            value={patientsSearch}
                            onChange={(e) => setPatientsSearch(e.target.value)}
                            placeholder="Buscar paciente por nome..."
                            className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 focus:border-teal-500 outline-none transition-all font-medium text-sm"
                          />
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        </div>
                      </div>
                    </div>

                    {/* LISTA */}
                    {patientsLoading ? (
                      <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50">
                        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-slate-500 text-sm font-bold">Carregando lista de pacientes...</p>
                      </div>
                    ) : patientsList.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 text-center px-6">
                        <div className="w-16 h-16 bg-slate-50 border border-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mb-4">
                          <Users className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-black text-slate-800">Nenhum paciente cadastrado</h3>
                        <p className="text-slate-400 text-sm mt-1 max-w-sm">
                          Os pacientes aparecem aqui automaticamente após o registro de procedimentos.
                        </p>
                      </div>
                    ) : (
                      (() => {
                        const filtered = patientsList.filter(p => 
                          p.name.toLowerCase().includes(patientsSearch.toLowerCase())
                        )

                        if (filtered.length === 0) {
                          return (
                            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 text-center px-6">
                              <p className="text-slate-400 text-sm font-bold">Nenhum paciente correspondente à busca.</p>
                            </div>
                          )
                        }

                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filtered.map((patient) => (
                              <div 
                                key={patient.name}
                                className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col justify-between hover:shadow-slate-300/40 hover:border-slate-200/60 transition-all group"
                              >
                                <div className="p-6 space-y-4">
                                  {/* Identificação */}
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 font-bold shrink-0">
                                      {patient.name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <h4 className="font-black text-slate-900 text-base leading-tight truncate" title={patient.name}>
                                        {patient.name}
                                      </h4>
                                      <p className="text-xs text-slate-400 font-bold mt-0.5">
                                        {patient.patient_age ? `${patient.patient_age} anos` : ''}
                                        {patient.data_nascimento ? ` (Nasc: ${formatProcDate(patient.data_nascimento)})` : ''}
                                        {!patient.patient_age && !patient.data_nascimento ? 'Idade não informada' : ''}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Detalhes */}
                                  <div className="space-y-2 pt-3 border-t border-slate-50 text-xs">
                                    <p className="text-slate-600 font-medium truncate flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                      <span className="font-bold text-slate-400">Convênio:</span>
                                      <span className="text-slate-800 font-bold">{patient.convenio || 'Não informado'}</span>
                                    </p>
                                    {patient.patient_phone && (
                                      <p className="text-slate-600 font-medium truncate flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                                        <span className="font-bold text-slate-400">Tel:</span>
                                        <button
                                          onClick={() => setPhoneActionsTarget(patient.patient_phone)}
                                          className="text-teal-600 hover:text-teal-700 font-bold underline transition-colors focus:outline-none"
                                        >
                                          {formatPhone(patient.patient_phone)}
                                        </button>
                                      </p>
                                    )}
                                    {patient.patient_email && (
                                      <p className="text-slate-600 font-medium truncate flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                        <span className="font-bold text-slate-400">E-mail:</span>
                                        <span className="text-slate-700 font-semibold truncate" title={patient.patient_email}>{patient.patient_email}</span>
                                      </p>
                                    )}
                                    <p className="text-slate-500 font-medium flex items-start gap-1.5 leading-tight">
                                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5"></span>
                                      <span className="font-bold text-slate-400">Último Proc.:</span>
                                      <span className="text-slate-600 font-semibold truncate">
                                        {patient.lastProcedureDate ? `${formatProcDate(patient.lastProcedureDate)} (${patient.lastProcedureType})` : 'N/A'}
                                      </span>
                                    </p>
                                  </div>
                                </div>

                                <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between">
                                  <span className="text-xs font-bold text-slate-500">
                                    {patient.proceduresCount} {patient.proceduresCount === 1 ? 'procedimento' : 'procedimentos'}
                                  </span>

                                  <button
                                    onClick={() => {
                                      setSelectedPatientDetails(patient)
                                      setShowPatientDetailsModal(true)
                                    }}
                                    className="px-3.5 py-1.5 bg-white hover:bg-teal-50 hover:text-teal-700 border border-slate-200 hover:border-teal-200 rounded-xl text-slate-600 text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    Ficha / Histórico
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      })()
                    )}
                  </div>
                )}

                {/* ABA INTERNA: CIRURGIÕES */}
                {cadastroSubTab === 'surgeons' && (
                  <div className="space-y-6">
                    {/* BUSCA E CADASTRO */}
                    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                            Cadastro de Cirurgiões
                          </h3>
                          <p className="text-sm text-slate-500">
                            Lista e cadastro de cirurgiões parceiros do grupo.
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setCreateSurgeonFormData({
                              name: '',
                              phone: '',
                              email: '',
                              specialty: ''
                            })
                            setShowCreateSurgeonModal(true)
                          }}
                          className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-3 rounded-2xl font-bold shadow-lg shadow-teal-500/20 text-sm transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
                        >
                          <UserPlus className="w-5 h-5" />
                          <span>Cadastrar Cirurgião</span>
                        </button>
                      </div>

                      <div className="mt-6 pt-6 border-t border-slate-100">
                        <div className="relative max-w-md">
                          <input
                            type="text"
                            value={surgeonsSearch}
                            onChange={(e) => setSurgeonsSearch(e.target.value)}
                            placeholder="Buscar cirurgião por nome ou especialidade..."
                            className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 focus:border-teal-500 outline-none transition-all font-medium text-sm"
                          />
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        </div>
                      </div>
                    </div>

                    {/* LISTA */}
                    {surgeonsList.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 text-center px-6">
                        <div className="w-16 h-16 bg-slate-50 border border-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mb-4">
                          <Stethoscope className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-black text-slate-800">Nenhum cirurgião cadastrado</h3>
                        <p className="text-slate-400 text-sm mt-1 max-w-sm">
                          Os cirurgiões aparecem aqui automaticamente após o registro de procedimentos.
                        </p>
                      </div>
                    ) : (
                      (() => {
                        const filtered = surgeonsList.filter(s => 
                          s.name.toLowerCase().includes(surgeonsSearch.toLowerCase()) ||
                          (s.specialty && s.specialty.toLowerCase().includes(surgeonsSearch.toLowerCase()))
                        )

                        if (filtered.length === 0) {
                          return (
                            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 text-center px-6">
                              <p className="text-slate-400 text-sm font-bold">Nenhum cirurgião correspondente à busca.</p>
                            </div>
                          )
                        }

                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filtered.map((surgeon) => (
                              <div 
                                key={surgeon.name}
                                className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col justify-between hover:shadow-slate-300/40 hover:border-slate-200/60 transition-all group"
                              >
                                <div className="p-6 space-y-4">
                                  {/* Identificação */}
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                                      {surgeon.name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <h4 className="font-black text-slate-900 text-base leading-tight truncate" title={surgeon.name}>
                                        {surgeon.name}
                                      </h4>
                                      <p className="text-xs text-slate-400 font-bold mt-0.5">
                                        {surgeon.specialty || 'Especialidade não informada'}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Detalhes */}
                                  <div className="space-y-2 pt-3 border-t border-slate-50 text-xs">
                                    {surgeon.phone && (
                                      <p className="text-slate-600 font-medium truncate flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                                        <span className="font-bold text-slate-400">Tel:</span>
                                        <button
                                          onClick={() => setPhoneActionsTarget(surgeon.phone)}
                                          className="text-indigo-600 hover:text-indigo-700 font-bold underline transition-colors focus:outline-none"
                                        >
                                          {formatPhone(surgeon.phone)}
                                        </button>
                                      </p>
                                    )}
                                    {surgeon.email && (
                                      <p className="text-slate-600 font-medium truncate flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                        <span className="font-bold text-slate-400">E-mail:</span>
                                        <span className="text-slate-700 font-semibold truncate" title={surgeon.email}>{surgeon.email}</span>
                                      </p>
                                    )}
                                    <p className="text-slate-500 font-medium flex items-start gap-1.5 leading-tight">
                                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5"></span>
                                      <span className="font-bold text-slate-400">Última Cirurgia:</span>
                                      <span className="text-slate-600 font-semibold truncate">
                                        {surgeon.lastProcedureDate ? formatProcDate(surgeon.lastProcedureDate) : 'N/A'}
                                      </span>
                                    </p>
                                  </div>
                                </div>

                                <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between">
                                  <span className="text-xs font-bold text-slate-500">
                                    {surgeon.proceduresCount} {surgeon.proceduresCount === 1 ? 'procedimento' : 'procedimentos'}
                                  </span>

                                  <button
                                    onClick={() => {
                                      setSelectedSurgeonDetails(surgeon)
                                      setShowSurgeonDetailsModal(true)
                                    }}
                                    className="px-3.5 py-1.5 bg-white hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 rounded-xl text-slate-600 text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    Histórico
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      })()
                    )}
                  </div>
                )}

                {/* ABA INTERNA: ANESTESISTAS BACKUP */}
                {cadastroSubTab === 'backups' && (
                  <div className="space-y-6">
                    {/* BUSCA E CADASTRO */}
                    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                            Cadastro de Anestesistas Backup
                          </h3>
                          <p className="text-sm text-slate-500">
                            Lista e cadastro de anestesistas externos que dão cobertura/backup ao grupo.
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setCreateBackupFormData({
                              name: '',
                              phone: '',
                              email: '',
                              notes: ''
                            })
                            setShowCreateBackupModal(true)
                          }}
                          className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-3 rounded-2xl font-bold shadow-lg shadow-teal-500/20 text-sm transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
                        >
                          <UserPlus className="w-5 h-5" />
                          <span>Cadastrar Anestesista Backup</span>
                        </button>
                      </div>

                      <div className="mt-6 pt-6 border-t border-slate-100">
                        <div className="relative max-w-md">
                          <input
                            type="text"
                            value={backupsSearch}
                            onChange={(e) => setBackupsSearch(e.target.value)}
                            placeholder="Buscar anestesista backup por nome..."
                            className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 focus:border-teal-500 outline-none transition-all font-medium text-sm"
                          />
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        </div>
                      </div>
                    </div>

                    {/* LISTA */}
                    {backupsList.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 text-center px-6">
                        <div className="w-16 h-16 bg-slate-50 border border-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mb-4">
                          <Shield className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-black text-slate-800">Nenhum anestesista backup cadastrado</h3>
                        <p className="text-slate-400 text-sm mt-1 max-w-sm">
                          Os anestesistas backup aparecem aqui automaticamente após o registro de procedimentos.
                        </p>
                      </div>
                    ) : (
                      (() => {
                        const filtered = backupsList.filter(b => 
                          b.name.toLowerCase().includes(backupsSearch.toLowerCase())
                        )

                        if (filtered.length === 0) {
                          return (
                            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 text-center px-6">
                              <p className="text-slate-400 text-sm font-bold">Nenhum anestesista backup correspondente à busca.</p>
                            </div>
                          )
                        }

                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filtered.map((backup) => (
                              <div 
                                key={backup.name}
                                className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col justify-between hover:shadow-slate-300/40 hover:border-slate-200/60 transition-all group"
                              >
                                <div className="p-6 space-y-4">
                                  {/* Identificação */}
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 font-bold shrink-0">
                                      {backup.name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <h4 className="font-black text-slate-900 text-base leading-tight truncate" title={backup.name}>
                                        {backup.name}
                                      </h4>
                                      <p className="text-xs text-slate-400 font-bold mt-0.5">
                                        Anestesista Backup / Externo
                                      </p>
                                    </div>
                                  </div>

                                  {/* Detalhes */}
                                  <div className="space-y-2 pt-3 border-t border-slate-50 text-xs">
                                    {backup.phone && (
                                      <p className="text-slate-600 font-medium truncate flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                                        <span className="font-bold text-slate-400">Tel:</span>
                                        <button
                                          onClick={() => setPhoneActionsTarget(backup.phone)}
                                          className="text-teal-600 hover:text-teal-700 font-bold underline transition-colors focus:outline-none"
                                        >
                                          {formatPhone(backup.phone)}
                                        </button>
                                      </p>
                                    )}
                                    {backup.email && (
                                      <p className="text-slate-600 font-medium truncate flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                        <span className="font-bold text-slate-400">E-mail:</span>
                                        <span className="text-slate-700 font-semibold truncate" title={backup.email}>{backup.email}</span>
                                      </p>
                                    )}
                                    <p className="text-slate-500 font-medium flex items-start gap-1.5 leading-tight">
                                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5"></span>
                                      <span className="font-bold text-slate-400">Último Lançamento:</span>
                                      <span className="text-slate-600 font-semibold truncate">
                                        {backup.lastProcedureDate ? formatProcDate(backup.lastProcedureDate) : 'N/A'}
                                      </span>
                                    </p>
                                  </div>
                                </div>

                                <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between">
                                  <span className="text-xs font-bold text-slate-500">
                                    {backup.proceduresCount} {backup.proceduresCount === 1 ? 'procedimento' : 'procedimentos'}
                                  </span>

                                  <button
                                    onClick={() => {
                                      setSelectedBackupDetails(backup)
                                      setShowBackupDetailsModal(true)
                                    }}
                                    className="px-3.5 py-1.5 bg-white hover:bg-teal-50 hover:text-teal-700 border border-slate-200 hover:border-teal-200 rounded-xl text-slate-600 text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    Ficha / Histórico
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      })()
                    )}
                  </div>
                )}
              </section>
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
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Faturamento (Stripe)</label>
                    <select
                      value={editBillingType}
                      onChange={(e: any) => setEditBillingType(e.target.value)}
                      className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:border-teal-500 outline-none transition-all font-medium"
                    >
                      <option value="individual">Individual (Cada um paga o seu)</option>
                      <option value="centralized">Centralizado (Grupo paga tudo)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Cor do Grupo</label>
                    <div className="flex gap-3 p-1 overflow-x-auto scrollbar-hide pb-2">
                      {['#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#111827'].map((c) => (
                        <button
                          key={c}
                          onClick={() => setEditColor(c)}
                          className={cn(
                            "w-8 h-8 rounded-full shrink-0 transition-all hover:scale-125",
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

                  {/* Oculto até segunda ordem */}
                  <div className="hidden bg-indigo-50 p-6 rounded-2xl border border-indigo-100 space-y-4">
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
                        Excluir / Arquivar Grupo
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
                  { id: 'procedures', label: 'Procedimentos (Lançamentos)' },
                  { id: 'patients', label: 'Cadastros (Pacientes, Cirurgiões, etc.)' },
                  { id: 'agenda', label: 'Agenda e Escalas' },
                  { id: 'financials', label: 'Financeiro e Faturamento' },
                  { id: 'secretaries', label: 'Gestão de Secretárias' }
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
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={() => { setShowProcDetailsModal(false); setIsProcEditMode(false) }}>
            <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-2xl w-full shadow-2xl relative animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 max-h-[92dvh] sm:max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>

              {/* Cabeçalho fixo */}
              <div className={`flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 flex-shrink-0 ${isProcEditMode ? 'bg-teal-50' : 'bg-white'}`}>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {isProcEditMode ? 'Editar Procedimento' : selectedProc.procedure_name || 'Detalhes do Procedimento'}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    {isProcEditMode ? 'Altere os campos e clique em Salvar.' : selectedProc.patient_name}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!isProcEditMode && (
                    <button
                      onClick={() => setIsProcEditMode(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Editar
                    </button>
                  )}
                  <button
                    onClick={() => { setShowProcDetailsModal(false); setIsProcEditMode(false) }}
                    className="p-1.5 hover:bg-slate-100 rounded-full"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Conteúdo com scroll */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

              {/* ── MODO VISUALIZAÇÃO ── */}
              {!isProcEditMode && (() => {
                const p = selectedProc
                const dv = (val: any, fallback = '—') => (val !== null && val !== undefined && val !== '') ? String(val) : fallback
                const dvBool = (val: any) => val === true ? 'Sim' : val === false ? 'Não' : '—'
                const gender: Record<string, string> = { M: 'Masculino', F: 'Feminino', Other: 'Outro' }
                const payStatus: Record<string, string> = { pending: 'Aguardando', paid: 'Pago', sent: 'Enviado', cancelled: 'Cancelado' }
                const billingLabel: Record<string, string> = { cnpj_anestesista: 'CPF/CNPJ do Anestesista', cnpj_grupo: 'CNPJ do Grupo' }
                const roleLabel: Record<string, string> = { principal: 'Principal', auxiliar: 'Auxiliar' }
                const VRow = ({ label, value }: { label: string; value: string }) => (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">{label}</p>
                    <p className={`text-sm font-medium ${value === '—' ? 'text-slate-300' : 'text-slate-800'}`}>{value}</p>
                  </div>
                )
                const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">{title}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">{children}</div>
                  </div>
                )
                const executorName = group?.group_members?.find((m: any) => m.users?.id === p.anesthesiologist_user_id)?.users?.name || dv(p.anesthesiologist_name)
                return (
                  <div className="space-y-6">
                    <Section title="Procedimento">
                      <VRow label="Nome" value={dv(p.procedure_name)} />
                      <VRow label="Técnica Anestésica" value={dv(p.tecnica_anestesica)} />
                      <VRow label="Código TSSU" value={dv(p.codigo_tssu)} />
                      <VRow label="Grupo Anestésico" value={dv(p.grupo_anestesico)} />
                      <VRow label="Data" value={p.procedure_date ? new Date(p.procedure_date + 'T12:00:00').toLocaleDateString('pt-BR') : '—'} />
                      <VRow label="Horário" value={dv(p.horario || p.procedure_time)} />
                      <VRow label="Hospital / Clínica" value={dv(p.hospital_clinic)} />
                      <VRow label="Duração" value={p.duration_minutes ? `${(p.duration_minutes / 60).toFixed(1)}h` : '—'} />
                      <div className="col-span-2 sm:col-span-3">
                        <VRow label="Observações do Procedimento" value={dv(p.observacoes_procedimento)} />
                      </div>
                    </Section>

                    <Section title="Equipe">
                      <VRow label="Cirurgião" value={dv(p.nome_cirurgiao || p.surgeon_name)} />
                      <VRow label="Especialidade" value={dv(p.especialidade_cirurgiao)} />
                      <VRow label="Nome da Equipe" value={dv(p.nome_equipe)} />
                      <VRow label="Anestesista" value={executorName} />
                      <VRow label="Função do Anestesista" value={roleLabel[p.anesthesiologist_role] || '—'} />
                    </Section>

                    <Section title="Paciente">
                      <VRow label="Nome" value={dv(p.patient_name)} />
                      <VRow label="Nascimento" value={p.data_nascimento ? new Date(p.data_nascimento + 'T12:00:00').toLocaleDateString('pt-BR') : '—'} />
                      <VRow label="Sexo" value={gender[p.patient_gender] || '—'} />
                      <VRow label="Convênio" value={dv(p.convenio)} />
                      <VRow label="Carteirinha" value={dv(p.carteirinha)} />
                      <VRow label="Telefone" value={dv(p.patient_phone)} />
                      <VRow label="Email" value={dv(p.patient_email)} />
                      <VRow label="Acompanhante" value={dv(p.patient_companion)} />
                      <VRow label="Tel. Acompanhante" value={dv(p.patient_companion_phone)} />
                      {p.patient_notes && (
                        <div className="col-span-2 sm:col-span-3">
                          <VRow label="Obs. Paciente" value={dv(p.patient_notes)} />
                        </div>
                      )}
                    </Section>

                    {(p.sangramento || p.nausea_vomito || p.dor || p.tipo_parto) && (
                      <Section title="Dados Clínicos">
                        {p.sangramento && <VRow label="Sangramento" value={dv(p.sangramento)} />}
                        {p.nausea_vomito && <VRow label="Náusea/Vômito" value={dv(p.nausea_vomito)} />}
                        {p.dor && <VRow label="Dor" value={dv(p.dor)} />}
                        {p.tipo_parto && <VRow label="Tipo de Parto" value={dv(p.tipo_parto)} />}
                        {p.tipo_cesariana && <VRow label="Tipo Cesariana" value={dv(p.tipo_cesariana)} />}
                        {p.retencao_placenta && <VRow label="Retenção Placenta" value={dv(p.retencao_placenta)} />}
                        {p.hemorragia_puerperal && <VRow label="Hemorragia Puerperal" value={dv(p.hemorragia_puerperal)} />}
                        {p.laceracao_presente && <VRow label="Laceração" value={`${p.laceracao_presente}${p.grau_laceracao ? ` (Grau ${p.grau_laceracao})` : ''}`} />}
                        {p.transfusao_realizada && <VRow label="Transfusão" value={dv(p.transfusao_realizada)} />}
                      </Section>
                    )}

                    <Section title="Financeiro">
                      <VRow label="Status" value={payStatus[p.payment_status] || dv(p.payment_status)} />
                      <VRow label="Valor Total" value={p.procedure_value != null ? `R$ ${Number(p.procedure_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'} />
                      <VRow label="Forma de Recebimento" value={dv(p.payment_method || p.forma_pagamento)} />
                      <VRow label="Titularidade" value={billingLabel[p.billing_entity_type] || (p.billing_entity_type ? dv(p.billing_entity_type) : '—')} />
                      <VRow label="Previsão de Pagamento" value={p.expected_payment_date ? new Date(p.expected_payment_date + 'T12:00:00').toLocaleDateString('pt-BR') : '—'} />
                      <VRow label="Data do Pagamento" value={p.payment_date ? new Date(p.payment_date + 'T12:00:00').toLocaleDateString('pt-BR') : '—'} />
                      {p.observacoes_financeiras && (
                        <div className="col-span-2 sm:col-span-3">
                          <VRow label="Observações Financeiras" value={dv(p.observacoes_financeiras)} />
                        </div>
                      )}
                    </Section>

                    {/* Parcelas */}
                    {procParcelas.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Parcelas</p>
                        {procParcelas.length === 0 ? (
                          <p className="text-sm text-slate-400">Carregando parcelas...</p>
                        ) : (
                          <div className="space-y-2">
                            {procParcelas.map((parc: any, i: number) => (
                              <div key={parc.id || i} className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 rounded-xl text-sm flex-wrap">
                                <span className="font-semibold text-slate-700 shrink-0">Parcela {parc.numero_parcela || parc.numero || i + 1}</span>
                                <span className="text-slate-600 font-bold shrink-0">R$ {Number(parc.valor_parcela || parc.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${parc.recebida ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                  {parc.recebida ? 'Recebida' : 'Pendente'}
                                </span>
                                {parc.recebida && parc.data_recebimento && (
                                  <span className="text-xs text-slate-400 shrink-0">{new Date(parc.data_recebimento + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                )}
                                {parc.billing_entity_type && (
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase shrink-0 ${
                                    parc.billing_entity_type === 'cnpj_grupo'
                                      ? 'bg-blue-50 text-blue-700'
                                      : 'bg-violet-50 text-violet-700'
                                  }`}>
                                    {parc.billing_entity_type === 'cnpj_grupo' ? 'CNPJ Grupo' : 'CPF/CNPJ'}
                                  </span>
                                )}
                                {parc.recebida && parc.forma_recebimento && (
                                  <span className="text-[10px] font-bold bg-teal-50 text-teal-700 px-2 py-0.5 rounded-md uppercase shrink-0">
                                    {({
                                      pix: 'PIX',
                                      transferencia: 'Transferência',
                                      dinheiro: 'Espécie',
                                      cheque: 'Cheque',
                                      cartao: 'Cartão',
                                      filantropico: 'Filantrópico',
                                    } as Record<string, string>)[parc.forma_recebimento] || parc.forma_recebimento}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Configurações</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
                        <VRow label="Visível para Secretária" value={dvBool(p.show_to_secretary !== false ? true : false)} />
                        <VRow label="Feedback Solicitado" value={dvBool(p.feedback_solicitado)} />
                        {p.feedback_solicitado && <VRow label="Email Cirurgião" value={dv(p.email_cirurgiao)} />}
                        {p.feedback_solicitado && <VRow label="Tel. Cirurgião" value={dv(p.telefone_cirurgiao)} />}
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* GRID PRINCIPAL (modo edição) */}
              {isProcEditMode && <div className="space-y-6">

                {/* ── SEÇÃO: PROCEDIMENTO ── */}
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Procedimento</p>
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
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Código TSSU</label>
                      <input
                        type="text"
                        value={procEditData.codigo_tssu}
                        onChange={e => setProcEditData((d: any) => ({ ...d, codigo_tssu: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                        placeholder="Ex: 33.02.01.02-6"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Grupo Anestésico</label>
                      <input
                        type="text"
                        value={procEditData.grupo_anestesico}
                        onChange={e => setProcEditData((d: any) => ({ ...d, grupo_anestesico: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                        placeholder="Ex: Geral, Bloqueio, Sedação..."
                      />
                    </div>
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
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Hospital / Clínica</label>
                      <input
                        type="text"
                        value={procEditData.hospital_clinic}
                        onChange={e => setProcEditData((d: any) => ({ ...d, hospital_clinic: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                      />
                    </div>
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
                        placeholder="Ex: 2"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Usado para detectar conflito de horário</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Observações do Procedimento</label>
                    <textarea
                      rows={3}
                      value={procEditData.observacoes_procedimento || ''}
                      onChange={e => setProcEditData((d: any) => ({ ...d, observacoes_procedimento: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none resize-y"
                      placeholder="Intercorrências, medicações relevantes, detalhes da cirurgia..."
                    />
                  </div>
                </div>

                {/* ── SEÇÃO: EQUIPE ── */}
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Equipe</p>
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
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Especialidade do Cirurgião</label>
                      <input
                        type="text"
                        value={procEditData.especialidade_cirurgiao}
                        onChange={e => setProcEditData((d: any) => ({ ...d, especialidade_cirurgiao: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                        placeholder="Ex: Ortopedia, Ginecologia..."
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Nome da Equipe</label>
                      <input
                        type="text"
                        value={procEditData.nome_equipe}
                        onChange={e => setProcEditData((d: any) => ({ ...d, nome_equipe: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                        placeholder="Ex: Equipe Cardiovascular..."
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
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Função do Anestesista</label>
                      <select
                        value={procEditData.anesthesiologist_role || ''}
                        onChange={e => setProcEditData((d: any) => ({ ...d, anesthesiologist_role: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none bg-white"
                      >
                        <option value="">Não especificado</option>
                        <option value="principal">Principal</option>
                        <option value="auxiliar">Auxiliar</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* ── SEÇÃO: PACIENTE ── */}
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Paciente</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Nome</label>
                      <input
                        type="text"
                        value={procEditData.patient_name}
                        onChange={e => setProcEditData((d: any) => ({ ...d, patient_name: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Data de Nascimento</label>
                      <input
                        type="date"
                        value={procEditData.data_nascimento}
                        onChange={e => setProcEditData((d: any) => ({ ...d, data_nascimento: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Sexo</label>
                      <select
                        value={procEditData.patient_gender || ''}
                        onChange={e => setProcEditData((d: any) => ({ ...d, patient_gender: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none bg-white"
                      >
                        <option value="">Não informado</option>
                        <option value="M">Masculino</option>
                        <option value="F">Feminino</option>
                        <option value="Other">Outro</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Convênio</label>
                      <input
                        type="text"
                        value={procEditData.convenio}
                        onChange={e => setProcEditData((d: any) => ({ ...d, convenio: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                        placeholder="Ex: Unimed, Bradesco..."
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Carteirinha</label>
                      <input
                        type="text"
                        value={procEditData.carteirinha}
                        onChange={e => setProcEditData((d: any) => ({ ...d, carteirinha: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                        placeholder="Número da carteirinha"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Telefone</label>
                      <input
                        type="text"
                        value={procEditData.patient_phone}
                        onChange={e => setProcEditData((d: any) => ({ ...d, patient_phone: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Email</label>
                      <input
                        type="email"
                        value={procEditData.patient_email}
                        onChange={e => setProcEditData((d: any) => ({ ...d, patient_email: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                        placeholder="email@exemplo.com"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Acompanhante</label>
                      <input
                        type="text"
                        value={procEditData.patient_companion}
                        onChange={e => setProcEditData((d: any) => ({ ...d, patient_companion: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                        placeholder="Nome do acompanhante"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Telefone do Acompanhante</label>
                      <input
                        type="text"
                        value={procEditData.patient_companion_phone}
                        onChange={e => setProcEditData((d: any) => ({ ...d, patient_companion_phone: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Observações do Paciente</label>
                      <textarea
                        rows={2}
                        value={procEditData.patient_notes || ''}
                        onChange={e => setProcEditData((d: any) => ({ ...d, patient_notes: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none resize-y"
                        placeholder="Alergias, comorbidades, observações relevantes..."
                      />
                    </div>
                  </div>
                </div>

                {/* ── SEÇÃO: DADOS ESPECÍFICOS ── */}
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Dados Clínicos</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Sangramento</label>
                      <select
                        value={procEditData.sangramento || ''}
                        onChange={e => setProcEditData((d: any) => ({ ...d, sangramento: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none bg-white"
                      >
                        <option value="">Não inf.</option>
                        <option value="Sim">Sim</option>
                        <option value="Não">Não</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Náusea/Vômito</label>
                      <select
                        value={procEditData.nausea_vomito || ''}
                        onChange={e => setProcEditData((d: any) => ({ ...d, nausea_vomito: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none bg-white"
                      >
                        <option value="">Não inf.</option>
                        <option value="Sim">Sim</option>
                        <option value="Não">Não</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Dor</label>
                      <select
                        value={procEditData.dor || ''}
                        onChange={e => setProcEditData((d: any) => ({ ...d, dor: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none bg-white"
                      >
                        <option value="">Não inf.</option>
                        <option value="Sim">Sim</option>
                        <option value="Não">Não</option>
                      </select>
                    </div>
                  </div>

                  {/* Obstétrico — aparece quando há dado preenchido ou tipo_parto preenchido */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Acompanhamento Antes</label>
                      <select
                        value={procEditData.acompanhamento_antes || ''}
                        onChange={e => setProcEditData((d: any) => ({ ...d, acompanhamento_antes: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none bg-white"
                      >
                        <option value="">Não informado</option>
                        <option value="Sim">Sim</option>
                        <option value="Não">Não</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Tipo de Parto</label>
                      <select
                        value={procEditData.tipo_parto || ''}
                        onChange={e => setProcEditData((d: any) => ({ ...d, tipo_parto: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none bg-white"
                      >
                        <option value="">Não informado</option>
                        <option value="Vaginal">Vaginal</option>
                        <option value="Cesariana">Cesariana</option>
                        <option value="Instrumentalizado">Instrumentalizado</option>
                      </select>
                    </div>
                    {procEditData.tipo_parto === 'Cesariana' && (
                      <>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Tipo de Cesariana</label>
                          <select
                            value={procEditData.tipo_cesariana || ''}
                            onChange={e => setProcEditData((d: any) => ({ ...d, tipo_cesariana: e.target.value }))}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none bg-white"
                          >
                            <option value="">Selecione...</option>
                            <option value="Nova Ráqui">Nova Ráqui</option>
                            <option value="Raquianestesia">Raquianestesia</option>
                            <option value="Geral">Geral</option>
                            <option value="Complementação pelo Cateter">Complementação pelo Cateter</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Indicação de Cesariana</label>
                          <select
                            value={procEditData.indicacao_cesariana || ''}
                            onChange={e => setProcEditData((d: any) => ({ ...d, indicacao_cesariana: e.target.value }))}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none bg-white"
                          >
                            <option value="">Não informado</option>
                            <option value="Sim">Sim</option>
                            <option value="Não">Não</option>
                          </select>
                        </div>
                        {procEditData.indicacao_cesariana === 'Sim' && (
                          <div className="sm:col-span-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Descrição da Indicação</label>
                            <input
                              type="text"
                              value={procEditData.descricao_indicacao_cesariana || ''}
                              onChange={e => setProcEditData((d: any) => ({ ...d, descricao_indicacao_cesariana: e.target.value }))}
                              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                            />
                          </div>
                        )}
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Retenção de Placenta</label>
                          <select
                            value={procEditData.retencao_placenta || ''}
                            onChange={e => setProcEditData((d: any) => ({ ...d, retencao_placenta: e.target.value }))}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none bg-white"
                          >
                            <option value="">Não informado</option>
                            <option value="Sim">Sim</option>
                            <option value="Não">Não</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Hemorragia Puerperal</label>
                          <select
                            value={procEditData.hemorragia_puerperal || ''}
                            onChange={e => setProcEditData((d: any) => ({ ...d, hemorragia_puerperal: e.target.value }))}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none bg-white"
                          >
                            <option value="">Não informado</option>
                            <option value="Sim">Sim</option>
                            <option value="Não">Não</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Laceração Presente</label>
                          <select
                            value={procEditData.laceracao_presente || ''}
                            onChange={e => setProcEditData((d: any) => ({ ...d, laceracao_presente: e.target.value }))}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none bg-white"
                          >
                            <option value="">Não informado</option>
                            <option value="Sim">Sim</option>
                            <option value="Não">Não</option>
                          </select>
                        </div>
                        {procEditData.laceracao_presente === 'Sim' && (
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Grau da Laceração</label>
                            <select
                              value={procEditData.grau_laceracao || ''}
                              onChange={e => setProcEditData((d: any) => ({ ...d, grau_laceracao: e.target.value }))}
                              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none bg-white"
                            >
                              <option value="">Selecione...</option>
                              <option value="1">Grau 1</option>
                              <option value="2">Grau 2</option>
                              <option value="3">Grau 3</option>
                              <option value="4">Grau 4</option>
                            </select>
                          </div>
                        )}
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Transfusão Realizada</label>
                          <select
                            value={procEditData.transfusao_realizada || ''}
                            onChange={e => setProcEditData((d: any) => ({ ...d, transfusao_realizada: e.target.value }))}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none bg-white"
                          >
                            <option value="">Não informado</option>
                            <option value="Sim">Sim</option>
                            <option value="Não">Não</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* ── SEÇÃO: FINANCEIRO ── */}
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Financeiro</p>
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
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Rastreabilidade (Forma de Recebimento)</label>
                      <select
                        value={procEditData.payment_method || ''}
                        onChange={e => setProcEditData((d: any) => ({ ...d, payment_method: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none bg-white"
                      >
                        <option value="">Não informado</option>
                        <option value="Parcelado">Parcelado</option>
                        <option value="pix">PIX</option>
                        <option value="transferencia">Transferência Bancária</option>
                        <option value="dinheiro">Dinheiro / Espécie</option>
                        <option value="cheque">Cheque</option>
                        <option value="cartao">Cartão</option>
                        <option value="filantropico">Filantrópico</option>
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
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Previsão de Pagamento</label>
                      <input
                        type="date"
                        value={procEditData.expected_payment_date || ''}
                        onChange={e => setProcEditData((d: any) => ({ ...d, expected_payment_date: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Observações Financeiras</label>
                      <textarea
                        rows={2}
                        value={procEditData.observacoes_financeiras || ''}
                        onChange={e => setProcEditData((d: any) => ({ ...d, observacoes_financeiras: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none resize-y"
                        placeholder="Glosa, detalhes de cobrança, parcelas..."
                      />
                    </div>
                  </div>

                  {/* Parcelas — visível quando há parcelas carregadas OU quando forma = Parcelado */}
                  {(procParcelas.length > 0 || procEditData.payment_method === 'Parcelado' || procEditData.forma_pagamento === 'Parcelado') && (
                    <div className="space-y-2 pt-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Controle de Parcelas</p>
                      {procParcelas.length === 0 ? (
                        <p className="text-sm text-slate-400 italic">Nenhuma parcela carregada para este procedimento.</p>
                      ) : (
                        <div className="space-y-2">
                          {procParcelas.map((parc: any, idx: number) => (
                            <div key={parc.id || idx} className="border border-slate-200 rounded-xl p-3 space-y-2 bg-slate-50">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-slate-700">
                                  Parcela {parc.numero_parcela || parc.numero || idx + 1}
                                </span>
                                <span className="text-sm font-bold text-teal-600">
                                  R$ {Number(parc.valor_parcela || parc.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={!!parc.recebida}
                                  onChange={e => setProcParcelas(prev => prev.map((p, i) => i === idx ? { ...p, recebida: e.target.checked } : p))}
                                  className="w-4 h-4 rounded text-teal-600 accent-teal-600"
                                />
                                <span className="text-sm text-slate-600">Recebida</span>
                              </label>
                              {parc.recebida && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Data de Recebimento</label>
                                    <input
                                      type="date"
                                      value={parc.data_recebimento || ''}
                                      onChange={e => setProcParcelas(prev => prev.map((p, i) => i === idx ? { ...p, data_recebimento: e.target.value } : p))}
                                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-teal-500 outline-none bg-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Forma de Recebimento</label>
                                    <select
                                      value={parc.forma_recebimento || ''}
                                      onChange={e => setProcParcelas(prev => prev.map((p, i) => i === idx ? { ...p, forma_recebimento: e.target.value } : p))}
                                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-teal-500 outline-none bg-white"
                                    >
                                      <option value="">Não informado</option>
                                      <option value="pix">PIX</option>
                                      <option value="transferencia">Transferência Bancária</option>
                                      <option value="dinheiro">Dinheiro / Espécie</option>
                                      <option value="cheque">Cheque</option>
                                      <option value="cartao">Cartão</option>
                                      <option value="filantropico">Filantrópico</option>
                                    </select>
                                  </div>
                                </div>
                              )}
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Entidade de Faturamento</label>
                                <select
                                  value={parc.billing_entity_type || ''}
                                  onChange={e => setProcParcelas(prev => prev.map((p, i) => i === idx ? { ...p, billing_entity_type: e.target.value } : p))}
                                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-teal-500 outline-none bg-white"
                                >
                                  <option value="">Em aberto</option>
                                  <option value="cnpj_anestesista">CPF/CNPJ do Anestesista</option>
                                  <option value="cnpj_grupo">CNPJ do Grupo</option>
                                </select>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── SEÇÃO: FEEDBACK / CONFIGURAÇÕES ── */}
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Feedback & Configurações</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Feedback Solicitado</label>
                      <select
                        value={procEditData.feedback_solicitado ? 'Sim' : 'Não'}
                        onChange={e => setProcEditData((d: any) => ({ ...d, feedback_solicitado: e.target.value === 'Sim' }))}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none bg-white"
                      >
                        <option value="Não">Não</option>
                        <option value="Sim">Sim</option>
                      </select>
                    </div>
                    {procEditData.feedback_solicitado && (
                      <>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Email do Cirurgião</label>
                          <input
                            type="email"
                            value={procEditData.email_cirurgiao || ''}
                            onChange={e => setProcEditData((d: any) => ({ ...d, email_cirurgiao: e.target.value }))}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                            placeholder="email@hospital.com"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Telefone do Cirurgião</label>
                          <input
                            type="text"
                            value={procEditData.telefone_cirurgiao || ''}
                            onChange={e => setProcEditData((d: any) => ({ ...d, telefone_cirurgiao: e.target.value }))}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                            placeholder="(00) 00000-0000"
                          />
                        </div>
                      </>
                    )}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Visível para Secretária</label>
                      <select
                        value={procEditData.show_to_secretary ? 'Sim' : 'Não'}
                        onChange={e => setProcEditData((d: any) => ({ ...d, show_to_secretary: e.target.value === 'Sim' }))}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none bg-white"
                      >
                        <option value="Sim">Sim — visível para a secretária</option>
                        <option value="Não">Não — oculto para a secretária</option>
                      </select>
                    </div>
                  </div>
                </div>

              </div>}

              </div>{/* fim scroll */}

              {/* Botões — condicionais por modo */}
              {isProcEditMode ? (
                <div className="flex gap-3 p-4 sm:p-5 border-t border-slate-100 flex-shrink-0">
                  <button
                    onClick={handleDeleteProcedure}
                    disabled={deletingProc || updatingProc}
                    className="px-4 py-3 border border-red-200 text-red-600 rounded-2xl font-bold transition-all hover:bg-red-50 disabled:opacity-50 flex items-center justify-center gap-2"
                    title="Excluir Procedimento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { setIsProcEditMode(false); setProcEditData({ ...selectedProc }) }}
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
              ) : (
                <div className="flex gap-3 p-4 sm:p-5 border-t border-slate-100 flex-shrink-0">
                  <button
                    onClick={handleDeleteProcedure}
                    disabled={deletingProc}
                    className="px-4 py-3 border border-red-200 text-red-600 rounded-2xl font-bold transition-all hover:bg-red-50 disabled:opacity-50"
                    title="Excluir Procedimento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { setShowProcDetailsModal(false); setIsProcEditMode(false) }}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-2xl font-bold transition-all"
                  >
                    Fechar
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL: NOVO PROCEDIMENTO */}
        {showCreateProcModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-teal-600" />
                  <h3 className="font-extrabold text-slate-900 text-lg">Novo Procedimento</h3>
                </div>
                <button onClick={() => setShowCreateProcModal(false)} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleCreateProcedure} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Paciente</label>
                    <input
                      type="text"
                      required
                      value={createProcFormData.patient_name}
                      onChange={e => setCreateProcFormData({ ...createProcFormData, patient_name: e.target.value })}
                      placeholder="Nome do paciente"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Procedimento / Cirurgia</label>
                    <input
                      type="text"
                      required
                      value={createProcFormData.procedure_name}
                      onChange={e => setCreateProcFormData({ ...createProcFormData, procedure_name: e.target.value })}
                      placeholder="Ex: Colecistectomia"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Valor R$</label>
                    <input
                      type="text"
                      required
                      value={createProcFormData.procedure_value}
                      onChange={e => setCreateProcFormData({ ...createProcFormData, procedure_value: e.target.value })}
                      placeholder="Ex: 1500,00"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Data</label>
                    <input
                      type="date"
                      required
                      value={createProcFormData.procedure_date}
                      onChange={e => setCreateProcFormData({ ...createProcFormData, procedure_date: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Hospital / Clínica</label>
                    <input
                      type="text"
                      value={createProcFormData.hospital_clinic}
                      onChange={e => setCreateProcFormData({ ...createProcFormData, hospital_clinic: e.target.value })}
                      placeholder="Ex: Hospital Santa Joana"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Técnica Anestésica</label>
                    <input
                      type="text"
                      value={createProcFormData.tecnica_anestesica}
                      onChange={e => setCreateProcFormData({ ...createProcFormData, tecnica_anestesica: e.target.value })}
                      placeholder="Ex: Geral + Peridural"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Médico Anestesista</label>
                    <select
                      value={createProcFormData.anesthesiologist_user_id}
                      onChange={e => setCreateProcFormData({ ...createProcFormData, anesthesiologist_user_id: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none bg-white"
                    >
                      {group?.group_members?.map((m: any) => (
                        <option key={m.users.id} value={m.users.id}>
                          Dr(a). {m.users.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Faturamento</label>
                    <select
                      value={createProcFormData.billing_entity_type}
                      onChange={e => setCreateProcFormData({ ...createProcFormData, billing_entity_type: e.target.value as any })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none bg-white"
                    >
                      <option value="cnpj_anestesista">CPF/CNPJ do Anestesista</option>
                      <option value="cnpj_grupo">CNPJ do Grupo</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateProcModal(false)}
                    className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-2xl font-bold transition-all hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingProc}
                    className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-2xl font-bold shadow-lg shadow-teal-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {isCreatingProc ? 'Registrando...' : 'Criar Procedimento'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: CADASTRAR PACIENTE */}
        {showCreatePatientModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-teal-600" />
                  <h3 className="font-extrabold text-slate-900 text-lg">Cadastrar Paciente</h3>
                </div>
                <button onClick={() => setShowCreatePatientModal(false)} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleCreatePatient} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={createPatientFormData.name}
                    onChange={e => setCreatePatientFormData({ ...createPatientFormData, name: e.target.value })}
                    placeholder="Nome do paciente"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Sexo</label>
                    <select
                      value={createPatientFormData.gender}
                      onChange={e => setCreatePatientFormData({ ...createPatientFormData, gender: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none bg-white font-medium"
                    >
                      <option value="">Selecione...</option>
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Idade (Anos)</label>
                    <input
                      type="number"
                      min="0"
                      value={createPatientFormData.age}
                      onChange={e => setCreatePatientFormData({ ...createPatientFormData, age: e.target.value })}
                      placeholder="Ex: 35"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Data de Nascimento</label>
                    <input
                      type="date"
                      value={createPatientFormData.birthDate}
                      onChange={e => setCreatePatientFormData({ ...createPatientFormData, birthDate: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none font-medium text-slate-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Telefone</label>
                    <input
                      type="text"
                      value={createPatientFormData.phone}
                      onChange={e => setCreatePatientFormData({ ...createPatientFormData, phone: e.target.value })}
                      placeholder="(00) 90000-0000"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">E-mail</label>
                  <input
                    type="email"
                    value={createPatientFormData.email}
                    onChange={e => setCreatePatientFormData({ ...createPatientFormData, email: e.target.value })}
                    placeholder="exemplo@email.com"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none font-medium"
                  />
                </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div className="space-y-1">
                     <label className="text-[10px] font-bold text-slate-400 uppercase">Nome Acompanhante / Responsável</label>
                     <input
                       type="text"
                       value={createPatientFormData.companion}
                       onChange={e => setCreatePatientFormData({ ...createPatientFormData, companion: e.target.value })}
                       placeholder="Nome do acompanhante/responsável"
                       className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none font-medium"
                     />
                   </div>
                   <div className="space-y-1">
                     <label className="text-[10px] font-bold text-slate-400 uppercase">Telefone Acompanhante / Responsável</label>
                     <input
                       type="text"
                       value={createPatientFormData.companionPhone}
                       onChange={e => setCreatePatientFormData({ ...createPatientFormData, companionPhone: e.target.value })}
                       placeholder="(00) 90000-0000"
                       className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none font-medium"
                     />
                   </div>
                 </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Observações Clínicas</label>
                  <textarea
                    rows={3}
                    value={createPatientFormData.notes}
                    onChange={e => setCreatePatientFormData({ ...createPatientFormData, notes: e.target.value })}
                    placeholder="Alergias, comorbidades, observações gerais..."
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none resize-none font-medium"
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreatePatientModal(false)}
                    className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-2xl font-bold transition-all hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingPatient}
                    className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-2xl font-bold shadow-lg shadow-teal-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    {isCreatingPatient ? 'Cadastrando...' : 'Cadastrar Paciente'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: DETALHES DO PACIENTE */}
        {showPatientDetailsModal && selectedPatientDetails && (() => {
          const patientRealProcedures = selectedPatientDetails.procedures?.filter((p: any) => p.procedure_name !== 'Cadastro de Paciente') || []
          return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
              <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-teal-600" />
                    <h3 className="font-extrabold text-slate-900 text-lg">Ficha Clínica / Histórico</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isEditingDetails && (
                      <button
                        onClick={() => {
                          setEditDetailsFormData({
                            name: selectedPatientDetails.name || '',
                            gender: selectedPatientDetails.patient_gender || '',
                            birthDate: selectedPatientDetails.data_nascimento ? selectedPatientDetails.data_nascimento.split('T')[0] : '',
                            age: selectedPatientDetails.patient_age ? String(selectedPatientDetails.patient_age) : '',
                            phone: selectedPatientDetails.patient_phone || '',
                            email: selectedPatientDetails.patient_email || '',
                            notes: selectedPatientDetails.patient_notes || '',
                            companion: selectedPatientDetails.patient_companion || '',
                            companionPhone: selectedPatientDetails.patient_companion_phone || ''
                          })
                          setIsEditingDetails(true)
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl font-bold transition-all text-xs"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Editar
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        setShowPatientDetailsModal(false)
                        setIsEditingDetails(false)
                      }} 
                      className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {isEditingDetails ? (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Nome Completo</label>
                        <input
                          type="text"
                          value={editDetailsFormData.name}
                          onChange={e => setEditDetailsFormData({ ...editDetailsFormData, name: e.target.value })}
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none font-medium"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Sexo</label>
                          <select
                            value={editDetailsFormData.gender}
                            onChange={e => setEditDetailsFormData({ ...editDetailsFormData, gender: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none font-medium bg-white"
                          >
                            <option value="">Não informado</option>
                            <option value="M">Masculino</option>
                            <option value="F">Feminino</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Data de Nascimento</label>
                          <input
                            type="date"
                            value={editDetailsFormData.birthDate}
                            onChange={e => {
                              const bDate = e.target.value
                              let computedAge = editDetailsFormData.age
                              if (bDate) {
                                const birth = new Date(bDate)
                                const today = new Date()
                                let age = today.getFullYear() - birth.getFullYear()
                                const m = today.getMonth() - birth.getMonth()
                                if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
                                  age--
                                }
                                computedAge = String(age)
                              }
                              setEditDetailsFormData({ ...editDetailsFormData, birthDate: bDate, age: computedAge })
                            }}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none font-medium"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Idade</label>
                          <input
                            type="number"
                            value={editDetailsFormData.age}
                            onChange={e => setEditDetailsFormData({ ...editDetailsFormData, age: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none font-medium"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Telefone</label>
                          <input
                            type="text"
                            value={editDetailsFormData.phone}
                            onChange={e => setEditDetailsFormData({ ...editDetailsFormData, phone: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none font-medium"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">E-mail</label>
                          <input
                            type="email"
                            value={editDetailsFormData.email}
                            onChange={e => setEditDetailsFormData({ ...editDetailsFormData, email: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none font-medium"
                          />
                        </div>
                      </div>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <div className="space-y-1">
                           <label className="text-[10px] font-bold text-slate-400 uppercase">Nome Acompanhante / Responsável</label>
                           <input
                             type="text"
                             value={editDetailsFormData.companion}
                             onChange={e => setEditDetailsFormData({ ...editDetailsFormData, companion: e.target.value })}
                             className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none font-medium"
                           />
                         </div>
                         <div className="space-y-1">
                           <label className="text-[10px] font-bold text-slate-400 uppercase">Telefone Acompanhante / Responsável</label>
                           <input
                             type="text"
                             value={editDetailsFormData.companionPhone}
                             onChange={e => setEditDetailsFormData({ ...editDetailsFormData, companionPhone: e.target.value })}
                             placeholder="(00) 90000-0000"
                             className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none font-medium"
                           />
                         </div>
                       </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Observações Clínicas</label>
                        <textarea
                          rows={3}
                          value={editDetailsFormData.notes}
                          onChange={e => setEditDetailsFormData({ ...editDetailsFormData, notes: e.target.value })}
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none resize-none font-medium"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Cabeçalho de Informações do Paciente */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Nome do Paciente</p>
                            <h4 className="font-black text-slate-900 text-lg leading-tight mt-0.5">
                              {selectedPatientDetails.name}
                            </h4>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sexo</p>
                              <p className="font-bold text-slate-800 text-sm mt-0.5">
                                {selectedPatientDetails.patient_gender === 'M' ? 'Masculino' : selectedPatientDetails.patient_gender === 'F' ? 'Feminino' : 'Não informado'}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Idade</p>
                              <p className="font-bold text-slate-800 text-sm mt-0.5">
                                {selectedPatientDetails.patient_age ? `${selectedPatientDetails.patient_age} anos` : 'Não informada'}
                                {selectedPatientDetails.data_nascimento ? ` (${formatProcDate(selectedPatientDetails.data_nascimento)})` : ''}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-4">
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Telefone</p>
                            <p className="font-bold text-slate-800 text-sm mt-0.5">
                              {selectedPatientDetails.patient_phone ? (
                                <button
                                  onClick={() => setPhoneActionsTarget(selectedPatientDetails.patient_phone)}
                                  className="text-teal-600 hover:text-teal-700 font-bold underline transition-colors focus:outline-none"
                                >
                                  {formatPhone(selectedPatientDetails.patient_phone)}
                                </button>
                              ) : (
                                'Não informado'
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">E-mail</p>
                            <p className="font-bold text-slate-800 text-sm mt-0.5 truncate" title={selectedPatientDetails.patient_email}>
                              {selectedPatientDetails.patient_email || 'Não informado'}
                            </p>
                          </div>
                           <div>
                             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Acompanhante / Responsável</p>
                             <p className="font-bold text-slate-800 text-sm mt-0.5 truncate" title={selectedPatientDetails.patient_companion}>
                               {selectedPatientDetails.patient_companion || 'Não informado'}
                             </p>
                           </div>
                           <div>
                             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Telefone Acompanhante / Responsável</p>
                             <p className="font-bold text-slate-800 text-sm mt-0.5">
                               {selectedPatientDetails.patient_companion_phone ? (
                                 <button
                                   onClick={() => setPhoneActionsTarget(selectedPatientDetails.patient_companion_phone)}
                                   className="text-teal-600 hover:text-teal-700 font-bold underline transition-colors focus:outline-none"
                                 >
                                   {formatPhone(selectedPatientDetails.patient_companion_phone)}
                                 </button>
                               ) : (
                                 'Não informado'
                               )}
                             </p>
                           </div>
                         </div>
                      </div>

                      {/* Observações / Histórico Clínico */}
                      <div className="bg-amber-50/40 border border-amber-100/60 rounded-2xl p-4 space-y-1">
                        <h4 className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Observações Clínicas</h4>
                        <p className="text-sm text-slate-700 font-medium whitespace-pre-wrap">
                          {selectedPatientDetails.patient_notes || 'Nenhuma observação clínica registrada.'}
                        </p>
                      </div>

                      {/* Lista de Procedimentos Realizados */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                          Histórico de Procedimentos no Grupo ({patientRealProcedures.length})
                        </h4>
                        <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-56 overflow-y-auto bg-slate-50/50">
                          {patientRealProcedures.length > 0 ? (
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="bg-slate-100/80 border-b text-slate-500 font-bold sticky top-0 backdrop-blur-sm z-10">
                                  <th className="p-3">Data</th>
                                  <th className="p-3">Procedimento</th>
                                  <th className="p-3">Hospital</th>
                                  <th className="p-3">Anestesista</th>
                                  <th className="p-3 text-right">Valor</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y font-medium text-slate-700">
                                {patientRealProcedures.map((proc: any) => {
                                  const executorId = proc.anesthesiologist_user_id || proc.user_id
                                  const executorName = proc.anesthesiologist_user_id 
                                    ? (group?.group_members?.find((m: any) => m.users?.id === proc.anesthesiologist_user_id)?.users?.name || proc.anesthesiologist_name || 'Membro do Grupo')
                                    : (group?.group_members?.find((m: any) => m.users?.id === proc.user_id)?.users?.name || 'Criador do Lançamento')
                                  const memberColor = getMemberColor(executorId)

                                  return (
                                    <tr key={proc.id} className="hover:bg-white transition-colors">
                                      <td className="p-3 whitespace-nowrap">{formatProcDate(proc.procedure_date)}</td>
                                      <td className="p-3 font-bold text-slate-900">{proc.procedure_name || proc.procedure_type}</td>
                                      <td className="p-3 text-slate-600 truncate max-w-[120px]" title={proc.hospital || proc.hospital_clinic}>
                                        {proc.hospital || proc.hospital_clinic || 'Não informado'}
                                      </td>
                                      <td className="p-3 text-slate-600 truncate max-w-[120px]" title={executorName}>
                                        <span className="inline-flex items-center gap-1.5">
                                          {memberColor && (
                                            <span 
                                              className="w-2 h-2 rounded-full shrink-0" 
                                              style={{ backgroundColor: memberColor }}
                                            />
                                          )}
                                          <span>Dr(a). {executorName}</span>
                                        </span>
                                      </td>
                                      <td className="p-3 font-black text-teal-600 text-right whitespace-nowrap">
                                        {formatCurrency(proc.procedure_value || 0)}
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          ) : (
                            <div className="p-8 text-center text-slate-400 text-sm font-medium">
                              Nenhum procedimento registrado para este paciente.
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    {isEditingDetails ? (
                      <>
                        <button
                          onClick={() => setIsEditingDetails(false)}
                          className="px-6 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-2xl font-bold transition-all text-sm"
                          disabled={savingDetails}
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleSavePatientEdit}
                          className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-bold transition-all text-sm disabled:opacity-50 flex items-center gap-2"
                          disabled={savingDetails}
                        >
                          {savingDetails ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setShowPatientDetailsModal(false)}
                        className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold transition-all text-sm"
                      >
                        Fechar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        {/* MODAL: CADASTRAR CIRURGIÃO */}
        {showCreateSurgeonModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-extrabold text-slate-900 text-lg">Cadastrar Cirurgião</h3>
                </div>
                <button onClick={() => setShowCreateSurgeonModal(false)} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleCreateSurgeon} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={createSurgeonFormData.name}
                    onChange={e => setCreateSurgeonFormData({ ...createSurgeonFormData, name: e.target.value })}
                    placeholder="Nome do cirurgião"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-indigo-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Especialidade</label>
                  <input
                    type="text"
                    value={createSurgeonFormData.specialty}
                    onChange={e => setCreateSurgeonFormData({ ...createSurgeonFormData, specialty: e.target.value })}
                    placeholder="Ex: Ortopedia, Ginecologia..."
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-indigo-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Telefone</label>
                    <input
                      type="text"
                      value={createSurgeonFormData.phone}
                      onChange={e => setCreateSurgeonFormData({ ...createSurgeonFormData, phone: e.target.value })}
                      placeholder="(00) 90000-0000"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-indigo-500 outline-none font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">E-mail</label>
                    <input
                      type="email"
                      value={createSurgeonFormData.email}
                      onChange={e => setCreateSurgeonFormData({ ...createSurgeonFormData, email: e.target.value })}
                      placeholder="exemplo@email.com"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-indigo-500 outline-none font-medium"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateSurgeonModal(false)}
                    className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-2xl font-bold transition-all hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingSurgeon}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-2xl font-bold shadow-lg shadow-indigo-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    {isCreatingSurgeon ? 'Cadastrando...' : 'Cadastrar Cirurgião'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: DETALHES DO CIRURGIÃO */}
        {showSurgeonDetailsModal && selectedSurgeonDetails && (() => {
          const surgeonRealProcedures = selectedSurgeonDetails.procedures?.filter((p: any) => p.procedure_name !== 'Cadastro de Cirurgião') || []
          return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
              <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-extrabold text-slate-900 text-lg">Histórico do Cirurgião</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isEditingDetails && (
                      <button
                        onClick={() => {
                          setEditDetailsFormData({
                            name: selectedSurgeonDetails.name || '',
                            phone: selectedSurgeonDetails.phone || '',
                            email: selectedSurgeonDetails.email || '',
                            specialty: selectedSurgeonDetails.specialty || ''
                          })
                          setIsEditingDetails(true)
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold transition-all text-xs"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Editar
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        setShowSurgeonDetailsModal(false)
                        setIsEditingDetails(false)
                      }} 
                      className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {isEditingDetails ? (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Nome Completo</label>
                        <input
                          type="text"
                          value={editDetailsFormData.name}
                          onChange={e => setEditDetailsFormData({ ...editDetailsFormData, name: e.target.value })}
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-indigo-500 outline-none font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Especialidade</label>
                        <input
                          type="text"
                          value={editDetailsFormData.specialty}
                          onChange={e => setEditDetailsFormData({ ...editDetailsFormData, specialty: e.target.value })}
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-indigo-500 outline-none font-medium"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Telefone</label>
                          <input
                            type="text"
                            value={editDetailsFormData.phone}
                            onChange={e => setEditDetailsFormData({ ...editDetailsFormData, phone: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-indigo-500 outline-none font-medium"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">E-mail</label>
                          <input
                            type="email"
                            value={editDetailsFormData.email}
                            onChange={e => setEditDetailsFormData({ ...editDetailsFormData, email: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-indigo-500 outline-none font-medium"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Nome do Cirurgião</p>
                            <h4 className="font-black text-slate-900 text-lg leading-tight mt-0.5">
                              {selectedSurgeonDetails.name}
                            </h4>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Especialidade</p>
                            <p className="font-bold text-slate-800 text-sm mt-0.5">
                              {selectedSurgeonDetails.specialty || 'Não informada'}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-4">
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Telefone</p>
                            <p className="font-bold text-slate-800 text-sm mt-0.5">
                              {selectedSurgeonDetails.phone ? (
                                <button
                                  onClick={() => setPhoneActionsTarget(selectedSurgeonDetails.phone)}
                                  className="text-indigo-600 hover:text-indigo-700 font-bold underline transition-colors focus:outline-none"
                                >
                                  {formatPhone(selectedSurgeonDetails.phone)}
                                </button>
                              ) : (
                                'Não informado'
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">E-mail</p>
                            <p className="font-bold text-slate-800 text-sm mt-0.5 truncate" title={selectedSurgeonDetails.email}>
                              {selectedSurgeonDetails.email || 'Não informado'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                          Cirurgias Realizadas com o Grupo ({surgeonRealProcedures.length})
                        </h4>
                        <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-56 overflow-y-auto bg-slate-50/50">
                          {surgeonRealProcedures.length > 0 ? (
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="bg-slate-100/80 border-b text-slate-500 font-bold sticky top-0 backdrop-blur-sm z-10">
                                  <th className="p-3">Data</th>
                                  <th className="p-3">Procedimento</th>
                                  <th className="p-3">Hospital</th>
                                  <th className="p-3">Anestesista</th>
                                  <th className="p-3 text-right">Valor</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y font-medium text-slate-700">
                                {surgeonRealProcedures.map((proc: any) => {
                                  const executorId = proc.anesthesiologist_user_id || proc.user_id
                                  const executorName = proc.anesthesiologist_user_id 
                                    ? (group?.group_members?.find((m: any) => m.users?.id === proc.anesthesiologist_user_id)?.users?.name || proc.anesthesiologist_name || 'Membro do Grupo')
                                    : (group?.group_members?.find((m: any) => m.users?.id === proc.user_id)?.users?.name || 'Criador do Lançamento')
                                  const memberColor = getMemberColor(executorId)

                                  return (
                                    <tr key={proc.id} className="hover:bg-white transition-colors">
                                      <td className="p-3 whitespace-nowrap">{formatProcDate(proc.procedure_date)}</td>
                                      <td className="p-3 font-bold text-slate-900">{proc.procedure_name || proc.procedure_type}</td>
                                      <td className="p-3 text-slate-600 truncate max-w-[120px]" title={proc.hospital || proc.hospital_clinic}>
                                        {proc.hospital || proc.hospital_clinic || 'Não informado'}
                                      </td>
                                      <td className="p-3 text-slate-600 truncate max-w-[120px]" title={executorName}>
                                        <span className="inline-flex items-center gap-1.5">
                                          {memberColor && (
                                            <span 
                                              className="w-2 h-2 rounded-full shrink-0" 
                                              style={{ backgroundColor: memberColor }}
                                            />
                                          )}
                                          Dr(a). {executorName}
                                        </span>
                                      </td>
                                      <td className="p-3 font-black text-teal-600 text-right whitespace-nowrap">
                                        {formatCurrency(proc.procedure_value || 0)}
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          ) : (
                            <div className="p-8 text-center text-slate-400 text-sm font-medium">
                              Nenhuma cirurgia registrada para este cirurgião.
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    {isEditingDetails ? (
                      <>
                        <button
                          onClick={() => setIsEditingDetails(false)}
                          className="px-6 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-2xl font-bold transition-all text-sm"
                          disabled={savingDetails}
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleSaveSurgeonEdit}
                          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all text-sm disabled:opacity-50 flex items-center gap-2"
                          disabled={savingDetails}
                        >
                          {savingDetails ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setShowSurgeonDetailsModal(false)}
                        className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold transition-all text-sm"
                      >
                        Fechar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        {/* MODAL: CADASTRAR ANESTESISTA BACKUP */}
        {showCreateBackupModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-teal-600" />
                  <h3 className="font-extrabold text-slate-900 text-lg">Cadastrar Anestesista Backup</h3>
                </div>
                <button onClick={() => setShowCreateBackupModal(false)} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleCreateBackup} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={createBackupFormData.name}
                    onChange={e => setCreateBackupFormData({ ...createBackupFormData, name: e.target.value })}
                    placeholder="Nome do anestesista backup"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Telefone</label>
                    <input
                      type="text"
                      value={createBackupFormData.phone}
                      onChange={e => setCreateBackupFormData({ ...createBackupFormData, phone: e.target.value })}
                      placeholder="(00) 90000-0000"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">E-mail</label>
                    <input
                      type="email"
                      value={createBackupFormData.email}
                      onChange={e => setCreateBackupFormData({ ...createBackupFormData, email: e.target.value })}
                      placeholder="exemplo@email.com"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Observações / Anotações</label>
                  <textarea
                    rows={3}
                    value={createBackupFormData.notes}
                    onChange={e => setCreateBackupFormData({ ...createBackupFormData, notes: e.target.value })}
                    placeholder="Informações bancárias, chaves PIX, disponibilidades, observações gerais..."
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none resize-none font-medium"
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateBackupModal(false)}
                    className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-2xl font-bold transition-all hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingBackup}
                    className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-2xl font-bold shadow-lg shadow-teal-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    {isCreatingBackup ? 'Cadastrando...' : 'Cadastrar Anestesista Backup'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: DETALHES DO ANESTESISTA BACKUP */}
        {showBackupDetailsModal && selectedBackupDetails && (() => {
          const backupRealProcedures = selectedBackupDetails.procedures?.filter((p: any) => p.procedure_name !== 'Cadastro de Anestesista Backup') || []
          return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
              <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-teal-600" />
                    <h3 className="font-extrabold text-slate-900 text-lg">Histórico do Anestesista Backup</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isEditingDetails && (
                      <button
                        onClick={() => {
                          setEditDetailsFormData({
                            name: selectedBackupDetails.name || '',
                            phone: selectedBackupDetails.phone || '',
                            email: selectedBackupDetails.email || '',
                            notes: selectedBackupDetails.notes || ''
                          })
                          setIsEditingDetails(true)
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl font-bold transition-all text-xs"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Editar
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        setShowBackupDetailsModal(false)
                        setIsEditingDetails(false)
                      }} 
                      className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {isEditingDetails ? (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Nome Completo</label>
                        <input
                          type="text"
                          value={editDetailsFormData.name}
                          onChange={e => setEditDetailsFormData({ ...editDetailsFormData, name: e.target.value })}
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none font-medium"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Telefone</label>
                          <input
                            type="text"
                            value={editDetailsFormData.phone}
                            onChange={e => setEditDetailsFormData({ ...editDetailsFormData, phone: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none font-medium"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">E-mail</label>
                          <input
                            type="email"
                            value={editDetailsFormData.email}
                            onChange={e => setEditDetailsFormData({ ...editDetailsFormData, email: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none font-medium"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Observações / Dados de Repasse</label>
                        <textarea
                          rows={3}
                          value={editDetailsFormData.notes}
                          onChange={e => setEditDetailsFormData({ ...editDetailsFormData, notes: e.target.value })}
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none resize-none font-medium"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Nome do Anestesista</p>
                            <h4 className="font-black text-slate-900 text-lg leading-tight mt-0.5">
                              {selectedBackupDetails.name}
                            </h4>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tipo de Profissional</p>
                            <p className="font-bold text-slate-800 text-sm mt-0.5">
                              Backup / Anestesista Externo
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-4">
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Telefone</p>
                            <p className="font-bold text-slate-800 text-sm mt-0.5">
                              {selectedBackupDetails.phone ? (
                                <button
                                  onClick={() => setPhoneActionsTarget(selectedBackupDetails.phone)}
                                  className="text-teal-600 hover:text-teal-700 font-bold underline transition-colors focus:outline-none"
                                >
                                  {formatPhone(selectedBackupDetails.phone)}
                                </button>
                              ) : (
                                'Não informado'
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">E-mail</p>
                            <p className="font-bold text-slate-800 text-sm mt-0.5 truncate" title={selectedBackupDetails.email}>
                              {selectedBackupDetails.email || 'Não informado'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-1">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Observações / Dados de Repasse</h4>
                        <p className="text-sm text-slate-700 font-medium whitespace-pre-wrap">
                          {selectedBackupDetails.notes || 'Nenhuma observação registrada.'}
                        </p>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                          Procedimentos Cobertos no Grupo ({backupRealProcedures.length})
                        </h4>
                        <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-56 overflow-y-auto bg-slate-50/50">
                          {backupRealProcedures.length > 0 ? (
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="bg-slate-100/80 border-b text-slate-500 font-bold sticky top-0 backdrop-blur-sm z-10">
                                  <th className="p-3">Data</th>
                                  <th className="p-3">Procedimento</th>
                                  <th className="p-3">Hospital</th>
                                  <th className="p-3">Cirurgião</th>
                                  <th className="p-3 text-right">Valor</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y font-medium text-slate-700">
                                {backupRealProcedures.map((proc: any) => {
                                  const surgName = proc.surgeon_name || proc.nome_cirurgiao || 'Não informado'
                                  return (
                                    <tr key={proc.id} className="hover:bg-white transition-colors">
                                      <td className="p-3 whitespace-nowrap">{formatProcDate(proc.procedure_date)}</td>
                                      <td className="p-3 font-bold text-slate-900">{proc.procedure_name || proc.procedure_type}</td>
                                      <td className="p-3 text-slate-600 truncate max-w-[120px]" title={proc.hospital || proc.hospital_clinic}>
                                        {proc.hospital || proc.hospital_clinic || 'Não informado'}
                                      </td>
                                      <td className="p-3 text-slate-600 truncate max-w-[120px]" title={surgName}>
                                        Dr(a). {surgName}
                                      </td>
                                      <td className="p-3 font-black text-teal-600 text-right whitespace-nowrap">
                                        {formatCurrency(proc.procedure_value || 0)}
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          ) : (
                            <div className="p-8 text-center text-slate-400 text-sm font-medium">
                              Nenhum procedimento registrado para este anestesista backup.
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    {isEditingDetails ? (
                      <>
                        <button
                          onClick={() => setIsEditingDetails(false)}
                          className="px-6 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-2xl font-bold transition-all text-sm"
                          disabled={savingDetails}
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleSaveBackupEdit}
                          className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-bold transition-all text-sm disabled:opacity-50 flex items-center gap-2"
                          disabled={savingDetails}
                        >
                          {savingDetails ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setShowBackupDetailsModal(false)}
                        className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold transition-all text-sm"
                      >
                        Fechar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })()}
        {phoneActionsTarget && (() => {
          const cleanNumber = phoneActionsTarget.replace(/\D/g, '')
          const baseNumber = cleanNumber.startsWith('0') ? cleanNumber.slice(1) : cleanNumber
          const fullNumber = (baseNumber.length === 10 || baseNumber.length === 11) ? `55${baseNumber}` : baseNumber
          
          const isMobile = typeof window !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
          const whatsappUrl = isMobile 
            ? `https://api.whatsapp.com/send?phone=${fullNumber}`
            : `https://web.whatsapp.com/send?phone=${fullNumber}`
          
          const callUrl = `tel:+${fullNumber}`

          return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
                <div className="text-center space-y-1">
                  <h4 className="font-extrabold text-slate-900 text-base">Ações para o Telefone</h4>
                  <p className="text-sm text-slate-500 font-bold">{formatPhone(phoneActionsTarget)}</p>
                </div>
                
                <div className="flex flex-col gap-2">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setPhoneActionsTarget(null)}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-100 transition-all text-sm"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.5-5.739-1.453L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.963C16.388 1.981 13.93 .953 11.99 .953c-5.439 0-9.86 4.372-9.864 9.802-.001 1.76.476 3.483 1.383 5.006l-1.002 3.658 3.734-.972c1.558.85 3.1 1.291 4.5 1.293zM16.924 13.43c-.27-.134-1.597-.783-1.846-.872-.249-.09-.43-.134-.61.134-.18.27-.696.872-.852 1.05-.156.18-.312.202-.581.068-1.579-.79-2.73-1.39-3.79-3.218-.28-.48.28-.445.8-.135.09-.056.18-.134.27-.202.09-.068.12-.112.18-.18.06-.068.03-.134-.015-.224-.045-.09-.43-1.03-.59-1.417-.156-.375-.328-.328-.45-.328-.113-.005-.244-.006-.375-.006-.13 0-.342.049-.52.244-.18.195-.69.675-.69 1.646 0 .97.705 1.91.803 2.046.1.136 1.39 2.13 3.37 2.98.47.2.83.32 1.12.41.48.15.91.13 1.25.08.38-.057 1.597-.652 1.822-1.282.225-.63.225-1.17.157-1.282-.07-.113-.25-.18-.52-.313z"/>
                    </svg>
                    <span>WhatsApp ({isMobile ? 'App' : 'Web'})</span>
                  </a>

                  <a
                    href={callUrl}
                    onClick={() => setPhoneActionsTarget(null)}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl shadow-lg shadow-teal-100 transition-all text-sm"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M21.384 17.791c-1.12-1.12-2.94-1.12-4.06 0l-.88.88c-.37-.23-.74-.46-1.1-.7l-1.87-1.87c-.24-.36-.47-.73-.7-1.1l.88-.88c1.12-1.12 1.12-2.94 0-4.06l-3-3c-1.12-1.12-2.94-1.12-4.06 0l-1.78 1.78c-1.16 1.16-1.5 2.87-.89 4.39 1.18 2.94 3.1 5.67 5.67 8.24s5.3 4.49 8.24 5.67c.52.21 1.07.31 1.61.31 1.05 0 2.06-.41 2.78-1.19l1.78-1.78c1.12-1.12 1.12-2.94 0-4.06l-3-3z"/>
                    </svg>
                    <span>Ligar para Número</span>
                  </a>
                  
                  <button
                    onClick={() => setPhoneActionsTarget(null)}
                    className="w-full border border-slate-200 text-slate-600 py-3 rounded-2xl font-bold transition-all hover:bg-slate-50 text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )
        })()}

        {/* ==========================================
            MODAL: NOVA DESPESA DO GRUPO
            ========================================== */}
        {showDespesaModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-0 sm:px-4" onClick={() => setShowDespesaModal(false)}>
            <div
              className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl p-6 space-y-5"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Nova Despesa</h3>
                    <p className="text-xs text-slate-400">Registrar gasto do grupo</p>
                  </div>
                </div>
                <button onClick={() => setShowDespesaModal(false)} className="p-2 text-slate-400 hover:text-slate-700 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Formulário */}
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Descrição</label>
                  <input
                    type="text"
                    autoFocus
                    placeholder="Ex: INSS, Gasolina, Aluguel..."
                    value={newDespesa.descricao}
                    onChange={e => setNewDespesa(prev => ({ ...prev, descricao: e.target.value }))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Categoria</label>
                    <select
                      value={newDespesa.categoria}
                      onChange={e => setNewDespesa(prev => ({ ...prev, categoria: e.target.value }))}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none bg-white"
                    >
                      {CATEGORIAS_DESPESA.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Valor (R$)</label>
                    <input
                      type="number"
                      placeholder="0,00"
                      min="0"
                      step="0.01"
                      value={newDespesa.valor}
                      onChange={e => setNewDespesa(prev => ({ ...prev, valor: e.target.value }))}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Data</label>
                    <input
                      type="date"
                      value={newDespesa.data_despesa}
                      onChange={e => setNewDespesa(prev => ({ ...prev, data_despesa: e.target.value }))}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Responsável</label>
                    <select
                      value={newDespesa.anesthesiologist_id || ''}
                      onChange={e => setNewDespesa(prev => ({ ...prev, anesthesiologist_id: e.target.value }))}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none bg-white font-medium truncate"
                    >
                      <option value="">👥 Grupo Inteiro</option>
                      {group?.group_members?.map((m: any, idx: number) => (
                        <option key={m.id || idx} value={m.user_id || m.users?.id || ''}>👤 {m.users?.name || 'Membro'}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowDespesaModal(false)}
                  className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  disabled={!newDespesa.descricao || !newDespesa.valor || savingDespesa}
                  onClick={async () => {
                    if (!newDespesa.descricao || !newDespesa.valor) return
                    setSavingDespesa(true)
                    const created = await despesaService.createGroupDespesa(id as string, {
                      descricao: newDespesa.descricao,
                      categoria: newDespesa.categoria,
                      valor: parseFloat(newDespesa.valor),
                      data_despesa: newDespesa.data_despesa,
                      anesthesiologist_id: newDespesa.anesthesiologist_id || null
                    })
                    if (created) {
                      setGroupDespesas(prev => [created, ...prev])
                      addToast({ title: 'Despesa registrada!', description: `${newDespesa.descricao} — ${formatCurrency(parseFloat(newDespesa.valor))}`, variant: 'success' })
                      setShowDespesaModal(false)
                      setNewDespesa({ descricao: '', categoria: 'outros', valor: '', data_despesa: new Date().toISOString().split('T')[0], anesthesiologist_id: '' })
                    }
                    setSavingDespesa(false)
                  }}
                  className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                >
                  {savingDespesa
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Check className="w-4 h-4" />}
                  Salvar Despesa
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            MODAL: MAPA DE SALA CIRÚRGICA
            ========================================== */}
        {showMapaModal && (() => {
          const START_HOUR = 6
          const END_HOUR = 22
          const PX_PER_MIN = 1.0          // largura por minuto
          const HOUR_W = 60 * PX_PER_MIN  // largura de 1 hora = 60px
          const ROW_H = 52                // altura de cada linha de membro
          const LABEL_W = 88              // largura da coluna de nomes (sticky)
          const TOTAL_W = (END_HOUR - START_HOUR) * HOUR_W

          const mapaDateStr = format(mapaDate, 'yyyy-MM-dd')
          const mapaProcs = groupProcedures.filter(p => p.procedure_date?.startsWith(mapaDateStr))
          const semHorario = mapaProcs.filter((p: any) => !p.horario)
          const comHorario = mapaProcs.filter((p: any) => !!p.horario)

          const executorIds = Array.from(new Set(mapaProcs.map((p: any) => p.anesthesiologist_user_id || p.user_id).filter(Boolean))) as string[]
          const lanes: { id: string; name: string; color: string; procs: any[] }[] = executorIds.map(eid => {
            const member = group?.group_members?.find((m: any) => m.users?.id === eid)
            return {
              id: eid,
              name: member?.users?.name || 'Membro',
              color: member?.color || '#0d9488',
              procs: comHorario.filter((p: any) => (p.anesthesiologist_user_id || p.user_id) === eid),
            }
          })
          const semExecutorProcs = comHorario.filter((p: any) => !p.anesthesiologist_user_id && !p.user_id)
          if (semExecutorProcs.length > 0) lanes.push({ id: 'none', name: 'Sem executor', color: '#94a3b8', procs: semExecutorProcs })

          const timeToMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0) }
          const hourLabels = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

          return (
            <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowMapaModal(false)}>
              <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-4xl max-h-[95vh] sm:max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="px-4 py-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center justify-between w-full sm:w-auto">
                    <div className="flex items-center gap-2 min-w-0">
                      <Layers className="w-4 h-4 text-teal-600 shrink-0" />
                      <div className="min-w-0">
                        <h2 className="text-sm font-black text-slate-900 whitespace-nowrap truncate">Mapa de Sala Cirúrgica</h2>
                        <p className="text-[11px] text-slate-400 capitalize mt-0.5 truncate">
                          {format(mapaDate, "EEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    {/* Botão fechar visível no mobile ao lado do título */}
                    <button onClick={() => setShowMapaModal(false)} className="sm:hidden ml-2 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-all shrink-0">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-1 shrink-0 justify-center w-full sm:w-auto">
                    <button onClick={() => setMapaDate(d => { const n = new Date(d); n.setDate(n.getDate() - 1); return n })} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-all">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <input
                      type="date"
                      value={format(mapaDate, 'yyyy-MM-dd')}
                      onChange={e => setMapaDate(new Date(e.target.value + 'T12:00:00'))}
                      className="text-xs font-bold text-slate-600 border border-slate-200 rounded-lg px-2 py-1.5 focus:border-teal-500 outline-none w-full sm:w-auto text-center"
                    />
                    <button onClick={() => setMapaDate(d => { const n = new Date(d); n.setDate(n.getDate() + 1); return n })} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-all">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    {/* Botão fechar visível no desktop */}
                    <button onClick={() => setShowMapaModal(false)} className="hidden sm:block ml-2 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-all shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Corpo principal */}
                <div className="flex-1 overflow-hidden min-h-0">
                  {mapaProcs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-12 text-center px-6">
                      <CalendarDays className="w-10 h-10 text-slate-200 mb-3" />
                      <p className="font-bold text-slate-500 text-sm">Nenhum procedimento neste dia</p>
                      <p className="text-xs text-slate-400 mt-1">Selecione outra data ou adicione procedimentos.</p>
                    </div>
                  ) : (
                    /* Container único com scroll horizontal — header de horas + linhas de membros tudo junto */
                    <div className="overflow-auto h-full">
                      <div style={{ minWidth: LABEL_W + TOTAL_W }}>

                        {/* ── HEADER DE HORAS ── */}
                        <div className="flex sticky top-0 z-20 bg-white border-b border-slate-100">
                          {/* Canto vazio (sobre a coluna de nomes) */}
                          <div className="shrink-0 border-r border-slate-100" style={{ width: LABEL_W }} />
                          {/* Células de hora com sub-marcas */}
                          <div className="relative" style={{ width: TOTAL_W, height: 32 }}>
                            {hourLabels.map(h => {
                              const baseLeft = (h - START_HOUR) * HOUR_W
                              return (
                                <div key={h} className="absolute top-0 bottom-0" style={{ left: baseLeft, width: HOUR_W }}>
                                  {/* Linha e label da hora */}
                                  <div className="absolute top-0 bottom-0 left-0 border-l border-slate-200" />
                                  <span className="absolute top-1 left-1.5 text-[10px] font-bold text-slate-500 leading-none">
                                    {String(h).padStart(2,'0')}h
                                  </span>
                                  {/* Marca de 30min */}
                                  <div className="absolute top-0 bottom-0 border-l border-slate-100" style={{ left: HOUR_W * 0.5 }} />
                                  <span className="absolute bottom-1 text-[8px] text-slate-300 font-medium leading-none" style={{ left: HOUR_W * 0.5 + 2 }}>
                                    :30
                                  </span>
                                  {/* Marcas de 15min e 45min */}
                                  <div className="absolute border-l border-dotted border-slate-100" style={{ left: HOUR_W * 0.25, top: '40%', bottom: 0 }} />
                                  <div className="absolute border-l border-dotted border-slate-100" style={{ left: HOUR_W * 0.75, top: '40%', bottom: 0 }} />
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* ── LINHAS POR MEMBRO ── */}
                        {lanes.map((lane, laneIdx) => (
                          <div
                            key={lane.id}
                            className={cn("flex", laneIdx > 0 && "border-t border-slate-100")}
                            style={{ height: ROW_H }}
                          >
                            {/* Coluna sticky com nome do membro */}
                            <div
                              className="shrink-0 sticky left-0 z-10 bg-white border-r border-slate-100 flex items-center gap-2 px-2"
                              style={{ width: LABEL_W }}
                            >
                              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: lane.color }} />
                              <span className="text-[11px] font-black text-slate-700 truncate leading-tight">{lane.name}</span>
                            </div>

                            {/* Área da timeline desta linha */}
                            <div className="relative" style={{ width: TOTAL_W, height: ROW_H }}>
                              {/* Grade vertical: horas + 30min + 15min */}
                              {hourLabels.map(h => {
                                const base = (h - START_HOUR) * HOUR_W
                                return (
                                  <div key={h}>
                                    {/* Linha de hora — mais visível */}
                                    <div className="absolute top-0 bottom-0 border-l border-slate-200" style={{ left: base }} />
                                    {/* Linha de 30min — média */}
                                    <div className="absolute top-0 bottom-0 border-l border-dashed border-slate-100" style={{ left: base + HOUR_W * 0.5 }} />
                                    {/* Linhas de 15min e 45min — bem sutis */}
                                    <div className="absolute top-0 bottom-0 border-l border-dotted" style={{ left: base + HOUR_W * 0.25, borderColor: '#f1f5f9' }} />
                                    <div className="absolute top-0 bottom-0 border-l border-dotted" style={{ left: base + HOUR_W * 0.75, borderColor: '#f1f5f9' }} />
                                  </div>
                                )
                              })}
                              {/* Fundo colorido suave da linha */}
                              <div
                                className="absolute inset-y-1 left-0"
                                style={{ width: TOTAL_W, backgroundColor: lane.color + '08' }}
                              />

                              {/* Blocos de procedimento */}
                              {lane.procs.map((proc: any) => {
                                const startMin = timeToMin(proc.horario)
                                const dur = proc.duration_minutes || 60
                                const leftPx = (startMin - START_HOUR * 60) * PX_PER_MIN
                                const widthPx = Math.max(dur * PX_PER_MIN, 32)
                                if (startMin < START_HOUR * 60 || startMin >= END_HOUR * 60) return null
                                const isNarrow = widthPx < 70
                                const isMedium = widthPx >= 70 && widthPx < 120

                                return (
                                  <div
                                    key={proc.id}
                                    className="absolute top-2 bottom-2 rounded-lg cursor-pointer hover:opacity-90 hover:shadow-md transition-all shadow-sm overflow-hidden px-1.5 flex flex-col justify-center"
                                    style={{
                                      left: leftPx,
                                      width: widthPx,
                                      backgroundColor: lane.color + '25',
                                      borderTop: `1px solid ${lane.color}50`,
                                      borderRight: `1px solid ${lane.color}50`,
                                      borderBottom: `1px solid ${lane.color}50`,
                                      borderLeft: `3px solid ${lane.color}`,
                                    }}
                                    onClick={() => { setShowMapaModal(false); handleOpenProcDetails(proc) }}
                                    title={`${proc.patient_name} — ${proc.procedure_name}\n${proc.horario}, ${dur}min`}
                                  >
                                    <p className="text-[9px] font-black truncate leading-none" style={{ color: lane.color }}>
                                      {proc.horario}{!isNarrow && ` · ${dur}min`}
                                    </p>
                                    {!isNarrow && (
                                      <p className="text-[10px] font-bold text-slate-800 truncate leading-tight mt-0.5">{proc.patient_name}</p>
                                    )}
                                    {!isMedium && !isNarrow && (
                                      <p className="text-[9px] text-slate-500 truncate leading-tight">{proc.procedure_name}</p>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sem horário */}
                {semHorario.length > 0 && (
                  <div className="px-4 py-2.5 border-t border-slate-100 shrink-0">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Sem horário definido</p>
                    <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                      {semHorario.map((proc: any) => {
                        const eid = proc.anesthesiologist_user_id || proc.user_id
                        const color = getMemberColor(eid) || '#94a3b8'
                        return (
                          <div
                            key={proc.id}
                            className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-all"
                            style={{ borderLeft: `3px solid ${color}` }}
                            onClick={() => { setShowMapaModal(false); handleOpenProcDetails(proc) }}
                          >
                            <span className="text-[10px] font-bold text-slate-700 truncate max-w-[120px]">{proc.patient_name}</span>
                            <span className={cn("text-[9px] font-black px-1 py-0.5 rounded-full uppercase shrink-0", getTabStatusColor(proc.payment_status))}>
                              {getTabStatusText(proc.payment_status)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between shrink-0">
                  <span className="text-[10px] text-slate-400 font-medium">
                    {mapaProcs.length} proc. · {comHorario.length} c/ horário · {semHorario.length} s/ horário
                  </span>
                  <button onClick={() => setShowMapaModal(false)} className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs transition-all">
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          )
        })()}

      {/* MODAL CONFIRMAÇÃO DE EXCLUSÃO DE DESPESA */}
      {despesaToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setDespesaToDelete(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Excluir esta despesa?</h3>
                <p className="text-sm text-slate-500 mt-1 break-words">
                  <span className="font-semibold text-slate-700">{despesaToDelete.descricao}</span> será removida permanentemente. Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setDespesaToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-all"
              >
                Cancelar
              </button>
              <button
                disabled={isDeletingDespesa}
                onClick={async () => {
                  if (!despesaToDelete) return
                  const despesa = groupDespesas.find(x => x.id === despesaToDelete.id)
                  if (despesa && (despesa as any).fechamento_id) {
                    addToast({ title: 'Período fechado', description: 'Não é possível excluir despesas de um período já encerrado.', variant: 'error' })
                    setDespesaToDelete(null)
                    return
                  }
                  setIsDeletingDespesa(true)
                  try {
                    await despesaService.deleteDespesa(despesaToDelete.id)
                    setGroupDespesas(prev => prev.filter(x => x.id !== despesaToDelete.id))
                    setDashboardRefreshKey(prev => prev + 1)
                    setDespesaToDelete(null)
                  } finally {
                    setIsDeletingDespesa(false)
                  }
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeletingDespesa ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FECHAMENTO WIZARD */}
      {showFechamentoWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowFechamentoWizard(false)} />
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{fechamentoPreview?.isViewOnly ? 'Extrato do Fechamento' : 'Novo Fechamento'}</h3>
                {fechamentoPreview?.isViewOnly ? (
                  <p className="text-xs text-slate-500 font-medium">Competência: {fechamentoCompetencia}</p>
                ) : (
                  <p className="text-xs text-slate-500 font-medium">Calcule o repasse abatendo as despesas automaticamente.</p>
                )}
              </div>
              <button onClick={() => setShowFechamentoWizard(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50">
              {!fechamentoPreview ? (
                <div className="max-w-md mx-auto bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Competência (Ex: Maio/2026)</label>
                    <input
                      type="text"
                      placeholder="Nome do Ciclo"
                      value={fechamentoCompetencia}
                      onChange={e => setFechamentoCompetencia(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none text-slate-800 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Data de Corte (Apenas para base de dados)</label>
                    <input
                      type="date"
                      value={fechamentoEndDate}
                      onChange={e => setFechamentoEndDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none text-slate-800 font-bold"
                    />
                  </div>
                  <button
                    onClick={async () => {
                      if (!fechamentoCompetencia) return
                      setIsGeneratingFechamento(true)
                      try {
                        const preview = await fechamentoService.previewFechamento(id as string, fechamentoEndDate, group?.group_members || [])
                        setFechamentoPreview(preview)
                      } catch (e) {
                        addToast({ title: 'Erro ao gerar prévia', variant: 'error' })
                      } finally {
                        setIsGeneratingFechamento(false)
                      }
                    }}
                    disabled={isGeneratingFechamento || !fechamentoCompetencia}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-md transition-all flex justify-center items-center gap-2"
                  >
                    {isGeneratingFechamento ? 'Processando dados...' : 'Gerar Prévia de Extratos'}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Cards Resumo */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Faturamento Bruto</span>
                      <span className="text-2xl font-black text-teal-600 mt-1">{formatCurrency(fechamentoPreview.faturamentoBruto)}</span>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm flex flex-col justify-center">
                      <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Despesas Comuns do Grupo</span>
                      <span className="text-2xl font-black text-red-500 mt-1">-{formatCurrency(fechamentoPreview.despesasGrupoTotal)}</span>
                    </div>
                    <div className="bg-indigo-600 p-5 rounded-2xl shadow-md flex flex-col justify-center">
                      <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">Líquido Distribuível</span>
                      <span className="text-2xl font-black text-white mt-1">{formatCurrency(fechamentoPreview.liquidoDistribuivel)}</span>
                    </div>
                  </div>

                  {/* Detalhamento por Membro */}
                  <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-slate-50 bg-slate-50/50">
                      <h4 className="font-bold text-slate-800">Extratos Individuais</h4>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {fechamentoPreview.extratoMembros.map((m: any, idx: number) => (
                        <div key={idx} className="p-5 flex flex-col sm:flex-row justify-between gap-4">
                          <div>
                            <p className="font-bold text-slate-900">{m.nome}</p>
                            {group?.type === 'com_cotas' ? (
                              <p className="text-[10px] font-bold text-slate-500 uppercase">Cota de {m.cota}% ({formatCurrency(m.valorCotaGeral)})</p>
                            ) : (
                              <p className="text-[10px] font-bold text-slate-500 uppercase">Produção Bruta: {formatCurrency(m.producaoBruta)}</p>
                            )}
                          </div>
                          
                          <div className="flex gap-4 items-center">
                            {m.despesasVinculadas > 0 && (
                              <div className="text-right">
                                <span className="text-[10px] font-bold text-red-400 block">DEDUÇÃO INDIVIDUAL</span>
                                <span className="text-sm font-bold text-red-600">-{formatCurrency(m.despesasVinculadas)}</span>
                              </div>
                            )}
                            <div className="text-right pl-4 sm:border-l border-slate-100">
                              <span className="text-[10px] font-bold text-indigo-400 block">LÍQUIDO A PAGAR</span>
                              <span className="text-lg font-black text-indigo-700">{formatCurrency(Math.max(0, m.liquidoReceber))}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer do Modal */}
            <div className="p-6 border-t border-slate-100 bg-white flex justify-between gap-3 shrink-0 flex-wrap">
              <div>
                {fechamentoPreview?.isViewOnly && (
                  <button
                    onClick={() => {
                      if (!fechamentoPreview) return
                      const rows: string[][] = [
                        ['Competência', fechamentoCompetencia],
                        ['Faturamento Bruto', String(fechamentoPreview.faturamentoBruto)],
                        ['Despesas do Grupo', String(fechamentoPreview.despesasGrupoTotal)],
                        ['Líquido Distribuível', String(fechamentoPreview.liquidoDistribuivel)],
                        [],
                        ['Médico', 'Cota (%)', 'Produção Bruta', 'Deduções Individuais', 'Líquido a Receber'],
                        ...(fechamentoPreview.extratoMembros || []).map((m: any) => [
                          m.nome,
                          String(m.cota),
                          String(m.producaoBruta),
                          String(m.despesasVinculadas),
                          String(Math.max(0, m.liquidoReceber))
                        ])
                      ]
                      const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
                      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `extrato-${fechamentoCompetencia.replace(/\//g, '-')}.csv`
                      a.click()
                      URL.revokeObjectURL(url)
                    }}
                    className="px-5 py-2.5 bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold rounded-xl text-sm transition-all flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" /> Exportar CSV
                  </button>
                )}
              </div>
              <div className="flex gap-3">
              <button
                onClick={() => {
                  if (!fechamentoPreview || fechamentoPreview.isViewOnly) {
                    setShowFechamentoWizard(false)
                    setFechamentoPreview(null)
                  } else {
                    setFechamentoPreview(null) // Voltar
                  }
                }}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all"
              >
                {fechamentoPreview?.isViewOnly ? 'Fechar' : (fechamentoPreview ? 'Voltar' : 'Cancelar')}
              </button>

              {fechamentoPreview && !fechamentoPreview.isViewOnly && (
                <button
                  onClick={async () => {
                    setIsGeneratingFechamento(true)
                    try {
                      const res = await fechamentoService.executeFechamento(id as string, fechamentoCompetencia, fechamentoPreview)
                      if (res) {
                        addToast({ title: 'Fechamento finalizado!', variant: 'success' })
                        setFechamentosHistory(prev => [res, ...prev])
                        setShowFechamentoWizard(false)
                        setFechamentoPreview(null)
                      }
                    } catch (e) {
                      addToast({ title: 'Erro ao fechar mês', variant: 'error' })
                    } finally {
                      setIsGeneratingFechamento(false)
                    }
                  }}
                  disabled={isGeneratingFechamento}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center gap-2"
                >
                  {isGeneratingFechamento ? 'Salvando...' : <><Lock className="w-4 h-4" /> Efetivar Fechamento</>}
                </button>
              )}
              </div>
            </div>
          </div>
        </div>
      )}

      </Layout>
    </ProtectedRoute>
  )
}

// Wrapper para o Dashboard Financeiro (usa o hook separadamente para evitar rerenders desnecessários)
function FinanceiroDashboardWrapper({ groupId, groupName, groupMembers, currentUserId, groupType, refreshKey }: {
  groupId: string,
  groupName: string,
  groupMembers: any[],
  currentUserId?: string,
  groupType?: string
  refreshKey?: number
}) {
  const { dados, loading, erro } = useFinanceiroDashboard({ groupId, groupName, groupMembers, currentUserId, groupType, refreshKey })
  return <DashboardFinanceiroGrupo dados={dados} loading={loading} erro={erro} />
}
