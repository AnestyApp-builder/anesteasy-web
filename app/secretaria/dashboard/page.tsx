'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Users, 
  Calendar, 
  DollarSign, 
  Search, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  LogOut, 
  Filter, 
  ArrowUpRight, 
  PlusCircle, 
  Activity, 
  ChevronRight, 
  Info, 
  Loader2, 
  Building,
  User,
  ShieldCheck,
  Plus,
  TrendingUp,
  Percent,
  Check
} from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'

interface SecretarySession {
  id: string
  nome: string
  email: string
  groupId: string
  type: string
  permissions: string[]
}

interface GroupMember {
  id: string
  name: string
  email: string
  crm: string
  cpf: string
  cnpj: string
  quota_percent: number
}

interface Procedure {
  id: string
  patient_name: string
  procedure_name: string
  procedure_type: string
  procedure_value: number
  procedure_date: string
  payment_status: 'pending' | 'paid' | 'cancelled' | 'sent'
  payment_date: string | null
  notes: string | null
  hospital_clinic: string | null
  anesthesiologist_user_id: string | null
  billing_entity_type: 'cnpj_anestesista' | 'cnpj_grupo' | null
  tecnica_anestesica: string | null
  user_id: string
}

export default function SecretaryDashboard() {
  const router = useRouter()
  const { addToast } = useToast()
  
  // Auth & States
  const [session, setSession] = useState<SecretarySession | null>(null)
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'procedures' | 'agenda' | 'financials'>('overview')
  
  // Lists
  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [filteredProcedures, setFilteredProcedures] = useState<Procedure[]>([])
  const [members, setMembers] = useState<GroupMember[]>([])
  const [closings, setClosings] = useState<any[]>([])
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [doctorFilter, setDoctorFilter] = useState('all')
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null)
  
  // Create / Edit Form States
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createFormData, setCreateFormData] = useState({
    patient_name: '',
    procedure_name: '',
    procedure_value: '',
    procedure_date: new Date().toISOString().split('T')[0],
    tecnica_anestesica: '',
    hospital_clinic: '',
    anesthesiologist_user_id: '',
    billing_entity_type: 'cnpj_anestesista' as 'cnpj_anestesista' | 'cnpj_grupo'
  })
  
  const [editFormData, setEditFormData] = useState({
    payment_status: 'pending' as 'pending' | 'paid' | 'cancelled' | 'sent',
    payment_date: '',
    procedure_value: '',
    notes: '',
    anesthesiologist_user_id: '',
    billing_entity_type: 'cnpj_anestesista' as 'cnpj_anestesista' | 'cnpj_grupo'
  })

  // Simulated Faturamento total
  const [simulatedTotal, setSimulatedTotal] = useState<string>('')

  // Load Session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/secretary/session')
        if (!res.ok) {
          throw new Error('Sessão expirada')
        }
        const data = await res.json()
        setSession(data.session)
        // Chamado após setSession para ter os dados, mas a API lê do cookie
        loadDashboardData()
      } catch (err) {
        router.replace('/secretaria/login')
      }
    };
    checkSession()
  }, [])

  // Filter Procedures
  useEffect(() => {
    let result = procedures
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(p => 
        p.patient_name.toLowerCase().includes(term) || 
        p.procedure_name.toLowerCase().includes(term) || 
        (p.hospital_clinic && p.hospital_clinic.toLowerCase().includes(term))
      )
    }

    if (statusFilter !== 'all') {
      result = result.filter(p => p.payment_status === statusFilter)
    }

    if (doctorFilter !== 'all') {
      result = result.filter(p => p.anesthesiologist_user_id === doctorFilter)
    }

    setFilteredProcedures(result)
  }, [searchTerm, statusFilter, doctorFilter, procedures])

  // Fetch Dashboard Data
  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/secretary/dashboard/data')
      if (!res.ok) {
        throw new Error('Erro ao carregar dados do painel')
      }
      const data = await res.json()
      setDashboardData(data)
      setProcedures(data.procedures || [])
      setFilteredProcedures(data.procedures || [])
      setMembers(data.members || [])
      setClosings(data.closings || [])
      
      // Defina médico padrão no form se existirem membros
      if (data.members && data.members.length > 0) {
        setCreateFormData(prev => ({
          ...prev,
          anesthesiologist_user_id: data.members[0].id
        }))
      }
    } catch (err: any) {
      addToast({
        title: 'Erro de conexão',
        description: err.message || 'Não foi possível carregar as informações do grupo.',
        variant: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  // Handle Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/secretary/logout', { method: 'POST' })
    } catch (err) {
      console.error('Erro ao efetuar logout no servidor:', err)
    }
    addToast({
      title: 'Sessão encerrada',
      description: 'Você saiu do portal da secretária.',
      variant: 'info'
    })
    router.replace('/secretaria/login')
  }

  // Handle Create Procedure
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) return

    if (!createFormData.patient_name || !createFormData.procedure_name || !createFormData.procedure_value) {
      addToast({
        title: 'Campos obrigatórios',
        description: 'Preencha paciente, procedimento e valor.',
        variant: 'warning'
      })
      return
    }

    setIsSubmitting(true)
    try {
      const val = parseFloat(createFormData.procedure_value.replace(/[^\d,]/g, '').replace(',', '.')) || 0
      
      const payload = {
        procedureData: {
          procedure_name: createFormData.procedure_name,
          procedure_type: createFormData.procedure_name,
          procedure_value: val,
          procedure_date: createFormData.procedure_date,
          patient_name: createFormData.patient_name,
          tecnica_anestesica: createFormData.tecnica_anestesica,
          hospital_clinic: createFormData.hospital_clinic,
          group_id: session.groupId,
          anesthesiologist_user_id: createFormData.anesthesiologist_user_id,
          billing_entity_type: createFormData.billing_entity_type,
          show_to_secretary: true
        },
        userId: createFormData.anesthesiologist_user_id // Criado no escopo do executor
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

      addToast({
        title: 'Procedimento criado!',
        description: 'Vínculo ao Grupo PRO estabelecido com sucesso.',
        variant: 'success'
      })
      
      setShowCreateModal(false)
      // Reset form
      setCreateFormData(prev => ({
        ...prev,
        patient_name: '',
        procedure_name: '',
        procedure_value: '',
        tecnica_anestesica: '',
        hospital_clinic: ''
      }))

      loadDashboardData()
    } catch (err: any) {
      addToast({
        title: 'Erro ao criar',
        description: err.message,
        variant: 'error'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Open Edit Modal
  const openEditModal = (proc: Procedure) => {
    setSelectedProcedure(proc)
    setEditFormData({
      payment_status: proc.payment_status || 'pending',
      payment_date: proc.payment_date || '',
      procedure_value: proc.procedure_value.toString(),
      notes: proc.notes || '',
      anesthesiologist_user_id: proc.anesthesiologist_user_id || '',
      billing_entity_type: proc.billing_entity_type || 'cnpj_anestesista'
    })
    setShowEditModal(true)
  }

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session || !selectedProcedure) return

    setIsSubmitting(true)
    try {
      const val = parseFloat(editFormData.procedure_value) || 0
      
      const res = await fetch('/api/secretary/dashboard/update-procedure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          procedureId: selectedProcedure.id,
          updates: {
            payment_status: editFormData.payment_status,
            payment_date: editFormData.payment_date,
            procedure_value: val,
            notes: editFormData.notes,
            anesthesiologist_user_id: editFormData.anesthesiologist_user_id,
            billing_entity_type: editFormData.billing_entity_type
          }
        })
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Erro ao salvar alterações')
      }

      addToast({
        title: 'Procedimento atualizado!',
        description: 'As alterações foram salvas com sucesso.',
        variant: 'success'
      })

      setShowEditModal(false)
      loadDashboardData()
    } catch (err: any) {
      addToast({
        title: 'Erro ao atualizar',
        description: err.message,
        variant: 'error'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculation statistics helper
  const getStats = () => {
    const totalCount = procedures.length
    const pendingCount = procedures.filter(p => p.payment_status === 'pending').length
    const paidCount = procedures.filter(p => p.payment_status === 'paid').length
    const sentCount = procedures.filter(p => p.payment_status === 'sent').length
    
    const totalValue = procedures.reduce((acc, curr) => acc + curr.procedure_value, 0)
    const paidValue = procedures
      .filter(p => p.payment_status === 'paid')
      .reduce((acc, curr) => acc + curr.procedure_value, 0)
    const pendingValue = procedures
      .filter(p => p.payment_status === 'pending')
      .reduce((acc, curr) => acc + curr.procedure_value, 0)

    return {
      totalCount,
      pendingCount,
      paidCount,
      sentCount,
      totalValue,
      paidValue,
      pendingValue
    }
  }

  const stats = getStats()

  if (loading && !dashboardData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center flex-col">
        <Loader2 className="w-12 h-12 text-teal-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium animate-pulse">Carregando painel do Grupo PRO...</p>
      </div>
    )
  }

  const groupInfo = dashboardData?.group || {}
  const isComCotas = groupInfo.type === 'com_cotas'

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="bg-teal-600 text-white rounded-xl p-2 shadow-lg shadow-teal-500/20">
              <ShieldCheck className="w-6 h-6 sm:w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-bold text-teal-600 tracking-wider uppercase">Portal da Secretária</span>
              <h2 className="text-base sm:text-xl font-extrabold text-slate-800 flex items-center">
                {groupInfo.name || 'Grupo Anestesiologia'}
                <span className="ml-2 px-2 py-0.5 text-[10px] bg-teal-50 text-teal-700 border border-teal-200 rounded-full font-bold">
                  {isComCotas ? 'Com Cotas' : 'Sem Cotas'}
                </span>
              </h2>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-sm font-semibold text-slate-800">{session?.nome}</span>
              <span className="text-xs text-slate-400 font-medium">Secretária Vinculada</span>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 sm:px-3 sm:py-2 border border-slate-200 text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-100 rounded-lg transition-all flex items-center gap-2"
              title="Sair do Portal"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline font-semibold text-sm">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col md:flex-row gap-6 sm:gap-8">
        
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 flex flex-row md:flex-col gap-2 p-1 bg-white md:bg-transparent rounded-xl border border-slate-200/60 md:border-0 shadow-sm md:shadow-none overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-3 px-4 py-3 sm:py-3.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'overview' 
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/25' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Activity className="w-5 h-5" />
            <span>Visão Geral</span>
          </button>
          
          {session?.permissions.includes('procedures') && (
            <button
              onClick={() => setActiveTab('procedures')}
              className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-3 px-4 py-3 sm:py-3.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === 'procedures' 
                  ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/25' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-5 h-5" />
              <span>Procedimentos</span>
            </button>
          )}

          {session?.permissions.includes('agenda') && (
            <button
              onClick={() => setActiveTab('agenda')}
              className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-3 px-4 py-3 sm:py-3.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === 'agenda' 
                  ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/25' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Calendar className="w-5 h-5" />
              <span>Agenda / Escalas</span>
            </button>
          )}

          {session?.permissions.includes('financials') && (
            <button
              onClick={() => setActiveTab('financials')}
              className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-3 px-4 py-3 sm:py-3.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === 'financials' 
                  ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/25' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <DollarSign className="w-5 h-5" />
              <span>Faturamento & Cotas</span>
            </button>
          )}
        </aside>

        {/* Dynamic Tab Content Area */}
        <section className="flex-1 min-w-0">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
              
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="bg-white rounded-2xl p-6 border border-slate-200/70 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Faturado</span>
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-1">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalValue)}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium mt-1">Acumulado do grupo</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200/70 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Procedimentos</span>
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-1">{stats.totalCount}</h3>
                    <p className="text-[11px] text-slate-400 font-medium mt-1">
                      <span className="text-amber-500 font-semibold">{stats.pendingCount} pendentes</span> faturamento
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
                    <FileText className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200/70 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Médicos Ativos</span>
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-1">{members.length}</h3>
                    <p className="text-[11px] text-slate-400 font-medium mt-1">Integrantes da escala</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Equipe / Members Card */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">Membros do Grupo</h3>
                    <p className="text-xs text-slate-400">Médicos anestesistas com cotas ou atuação na escala</p>
                  </div>
                  <Users className="w-5 h-5 text-teal-600" />
                </div>
                <div className="divide-y divide-slate-100">
                  {members.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 font-medium">
                      Nenhum médico ativo no grupo.
                    </div>
                  ) : (
                    members.map(member => (
                      <div key={member.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/40 transition-colors">
                        <div className="flex items-center space-x-3.5">
                          <div className="w-10 h-10 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center">
                            <User className="w-5 h-5 text-teal-600" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 text-sm sm:text-base">{member.name}</h4>
                            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span>CRM: {member.crm || 'N/A'}</span>
                              {member.cnpj && <span>• CNPJ: {member.cnpj}</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {isComCotas && (
                            <div className="px-3 py-1 bg-teal-50 text-teal-700 border border-teal-100 rounded-lg text-xs font-extrabold flex items-center gap-1">
                              <Percent className="w-3.5 h-3.5" />
                              Cota: {member.quota_percent}%
                            </div>
                          )}
                          <span className="px-2.5 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-bold">
                            Ativo
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROCEDURES */}
          {activeTab === 'procedures' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Header and Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Gerenciamento de Procedimentos</h3>
                  <p className="text-xs text-slate-400">Verifique status, informe recebimentos e gerencie lançamentos.</p>
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-3 rounded-xl font-bold shadow-lg shadow-teal-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  <span>Novo Procedimento</span>
                </button>
              </div>

              {/* Filters Panel */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Pesquisar por paciente, procedimento ou clínica..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm transition-all"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3 sm:w-96">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white text-sm h-[46px] focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    <option value="all">Todos os Status</option>
                    <option value="pending">Pendentes</option>
                    <option value="paid">Pagos</option>
                    <option value="sent">Enviados</option>
                    <option value="cancelled">Cancelados</option>
                  </select>
                  
                  <select
                    value={doctorFilter}
                    onChange={(e) => setDoctorFilter(e.target.value)}
                    className="px-3 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white text-sm h-[46px] focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    <option value="all">Todos os Médicos</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Procedures Table */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-400 font-bold text-xs uppercase tracking-wider">
                        <th className="p-4 sm:p-5">Data / Paciente</th>
                        <th className="p-4 sm:p-5">Procedimento</th>
                        <th className="p-4 sm:p-5">Executor</th>
                        <th className="p-4 sm:p-5">Valor</th>
                        <th className="p-4 sm:p-5 text-center">Status</th>
                        <th className="p-4 sm:p-5 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredProcedures.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-12 text-center text-slate-400 font-medium">
                            Nenhum procedimento encontrado com os filtros aplicados.
                          </td>
                        </tr>
                      ) : (
                        filteredProcedures.map(proc => {
                          const executor = members.find(m => m.id === proc.anesthesiologist_user_id)
                          return (
                            <tr key={proc.id} className="hover:bg-slate-50/30 transition-colors">
                              <td className="p-4 sm:p-5">
                                <span className="font-semibold text-slate-500 text-xs block">
                                  {new Date(proc.procedure_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                </span>
                                <span className="font-bold text-slate-800 text-sm sm:text-base mt-0.5 block">
                                  {proc.patient_name}
                                </span>
                              </td>
                              <td className="p-4 sm:p-5">
                                <span className="text-slate-800 font-medium block text-sm sm:text-base">
                                  {proc.procedure_name}
                                </span>
                                <span className="text-slate-400 text-xs mt-0.5 block">
                                  {proc.hospital_clinic || 'Hospital não inf.'}
                                </span>
                              </td>
                              <td className="p-4 sm:p-5">
                                <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold">
                                  {executor ? executor.name : 'Não definido'}
                                </span>
                              </td>
                              <td className="p-4 sm:p-5 font-extrabold text-slate-800 text-sm sm:text-base">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proc.procedure_value)}
                              </td>
                              <td className="p-4 sm:p-5">
                                <div className="flex justify-center">
                                  {proc.payment_status === 'paid' && (
                                    <span className="px-2.5 py-1 bg-green-50 border border-green-200 text-green-700 rounded-full text-xs font-bold flex items-center gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5" /> Pago
                                    </span>
                                  )}
                                  {proc.payment_status === 'pending' && (
                                    <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-xs font-bold flex items-center gap-1">
                                      <Clock className="w-3.5 h-3.5" /> Pendente
                                    </span>
                                  )}
                                  {proc.payment_status === 'sent' && (
                                    <span className="px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-xs font-bold flex items-center gap-1">
                                      <Info className="w-3.5 h-3.5" /> Enviado
                                    </span>
                                  )}
                                  {proc.payment_status === 'cancelled' && (
                                    <span className="px-2.5 py-1 bg-red-50 border border-red-200 text-red-700 rounded-full text-xs font-bold flex items-center gap-1">
                                      <XCircle className="w-3.5 h-3.5" /> Cancelado
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-4 sm:p-5 text-right">
                                <button
                                  onClick={() => openEditModal(proc)}
                                  className="text-teal-600 hover:text-teal-800 font-bold text-sm bg-teal-50 hover:bg-teal-100 px-3.5 py-2 rounded-lg transition-colors inline-flex items-center gap-1"
                                >
                                  <span>Editar</span>
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AGENDA & SCHEDULING */}
          {activeTab === 'agenda' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Agenda Integrada & Escalas</h3>
                <p className="text-xs text-slate-400">Escala cronológica de atendimentos do grupo.</p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden p-6">
                <div className="space-y-4">
                  {procedures.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      Nenhum procedimento agendado para o grupo.
                    </div>
                  ) : (
                    procedures
                      .slice()
                      .sort((a, b) => new Date(a.procedure_date).getTime() - new Date(b.procedure_date).getTime())
                      .map(proc => {
                        const executor = members.find(m => m.id === proc.anesthesiologist_user_id)
                        return (
                          <div key={proc.id} className="p-4 bg-slate-50 border border-slate-200/50 rounded-xl hover:border-teal-200 hover:bg-teal-50/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-start space-x-4">
                              <div className="bg-teal-100 text-teal-700 px-3.5 py-2.5 rounded-xl text-center flex flex-col justify-center min-w-[70px]">
                                <span className="text-[10px] uppercase font-extrabold tracking-wider">
                                  {new Date(proc.procedure_date).toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' })}
                                </span>
                                <span className="text-xl font-extrabold leading-none mt-1">
                                  {new Date(proc.procedure_date).toLocaleDateString('pt-BR', { day: '2-digit', timeZone: 'UTC' })}
                                </span>
                              </div>
                              <div>
                                <h4 className="font-extrabold text-slate-800 text-base">{proc.patient_name}</h4>
                                <div className="flex flex-wrap gap-2 items-center mt-1.5 text-xs text-slate-400 font-semibold">
                                  <span className="text-slate-700">{proc.procedure_name}</span>
                                  <span>•</span>
                                  <span>{proc.hospital_clinic || 'Hospital não inf.'}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-0 pt-3 sm:pt-0 border-slate-200/60">
                              <div className="flex items-center space-x-2">
                                <User className="w-4 h-4 text-teal-600" />
                                <span className="text-sm font-bold text-slate-700">{executor ? executor.name : 'Não definido'}</span>
                              </div>
                              <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-xs font-bold">
                                Escala Agendada
                              </span>
                            </div>
                          </div>
                        )
                      })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: FINANCIALS & QUOTAS SIMULATOR */}
          {activeTab === 'financials' && (
            <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Faturamento & Repasses Financeiros</h3>
                <p className="text-xs text-slate-400">Verifique a distribuição de cotas e simule fechamentos do grupo.</p>
              </div>

              {/* Real Earnings breakdown by executor (For Sem Cotas or general info) */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden p-6">
                <h4 className="font-bold text-slate-800 text-base mb-4 flex items-center">
                  <DollarSign className="w-5 h-5 text-teal-600 mr-2" />
                  Produção Real dos Médicos (Procedimentos Lançados)
                </h4>
                
                <div className="space-y-4">
                  {members.map(member => {
                    const docProcs = procedures.filter(p => p.anesthesiologist_user_id === member.id)
                    const totalDocValue = docProcs.reduce((acc, curr) => acc + curr.procedure_value, 0)
                    const paidDocValue = docProcs.filter(p => p.payment_status === 'paid').reduce((acc, curr) => acc + curr.procedure_value, 0)
                    const pendingDocValue = docProcs.filter(p => p.payment_status === 'pending').reduce((acc, curr) => acc + curr.procedure_value, 0)

                    return (
                      <div key={member.id} className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <span className="font-extrabold text-slate-800 block">{member.name}</span>
                          <span className="text-xs text-slate-400 font-medium">CRM: {member.crm || 'N/A'} • {docProcs.length} procedimentos</span>
                        </div>
                        <div className="grid grid-cols-3 gap-6 text-right">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total</span>
                            <span className="font-extrabold text-slate-800 text-sm">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalDocValue)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-green-500 block">Pago</span>
                            <span className="font-extrabold text-green-600 text-sm">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(paidDocValue)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-amber-500 block">Pendente</span>
                            <span className="font-extrabold text-amber-600 text-sm">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pendingDocValue)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Quota distribution simulator (Exclusive for Com Cotas type) */}
              {isComCotas && (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden p-6">
                  <h4 className="font-bold text-slate-800 text-base mb-2 flex items-center">
                    <Percent className="w-5 h-5 text-teal-600 mr-2" />
                    Simulador de Distribuição por Cotas
                  </h4>
                  <p className="text-xs text-slate-400 mb-6">Insira um valor para simular a divisão conforme as cotas definidas.</p>
                  
                  <div className="max-w-md mb-6">
                    <label className="text-sm font-semibold text-slate-700 block mb-2">Valor Total a Distribuir</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-extrabold text-sm">R$</span>
                      <input
                        type="text"
                        placeholder="Ex: 50.000,00"
                        value={simulatedTotal}
                        onChange={(e) => setSimulatedTotal(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-slate-50 border border-slate-200/40 rounded-xl p-4">
                      <div className="grid grid-cols-3 font-bold text-xs uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-200/60 mb-3">
                        <span>Anestesista</span>
                        <span className="text-center">Cota (%)</span>
                        <span className="text-right">Valor Simulado</span>
                      </div>
                      
                      {members.map(member => {
                        const totalVal = parseFloat(simulatedTotal.replace(/[^\d,]/g, '').replace(',', '.')) || 0
                        const simulatedVal = (totalVal * (member.quota_percent || 0)) / 100

                        return (
                          <div key={member.id} className="grid grid-cols-3 py-2.5 text-sm sm:text-base border-b border-slate-100 last:border-0 font-medium">
                            <span className="text-slate-800 font-bold">{member.name}</span>
                            <span className="text-center text-slate-500">{member.quota_percent}%</span>
                            <span className="text-right text-teal-600 font-extrabold">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(simulatedVal)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* MODAL 1: REGISTRAR PROCEDIMENTO */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200 my-8">
            <div className="px-6 py-5 bg-teal-600 text-white flex justify-between items-center">
              <h3 className="font-extrabold text-lg flex items-center gap-2">
                <PlusCircle className="w-6 h-6" />
                Registrar Procedimento no Grupo
              </h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1 rounded-lg text-sm transition-all"
              >
                Fechar
              </button>
            </div>
            
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 block">Nome do Paciente *</label>
                  <input
                    type="text"
                    required
                    value={createFormData.patient_name}
                    onChange={(e) => setCreateFormData({ ...createFormData, patient_name: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    placeholder="Nome completo do paciente"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 block">Procedimento / Tipo *</label>
                  <input
                    type="text"
                    required
                    value={createFormData.procedure_name}
                    onChange={(e) => setCreateFormData({ ...createFormData, procedure_name: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    placeholder="Ex: Colecistectomia"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 block">Valor cobrado (R$) *</label>
                  <input
                    type="text"
                    required
                    value={createFormData.procedure_value}
                    onChange={(e) => setCreateFormData({ ...createFormData, procedure_value: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-semibold"
                    placeholder="0,00"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 block">Data do Procedimento *</label>
                  <input
                    type="date"
                    required
                    value={createFormData.procedure_date}
                    onChange={(e) => setCreateFormData({ ...createFormData, procedure_date: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 block">Técnica Anestésica</label>
                  <input
                    type="text"
                    value={createFormData.tecnica_anestesica}
                    onChange={(e) => setCreateFormData({ ...createFormData, tecnica_anestesica: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    placeholder="Ex: Geral + Raqui"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 block">Hospital / Clínica</label>
                  <input
                    type="text"
                    value={createFormData.hospital_clinic}
                    onChange={(e) => setCreateFormData({ ...createFormData, hospital_clinic: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    placeholder="Nome da clínica ou hospital"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 block">Médico Executor *</label>
                  <select
                    value={createFormData.anesthesiologist_user_id}
                    onChange={(e) => setCreateFormData({ ...createFormData, anesthesiologist_user_id: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
                  >
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 block">Entidade de Faturamento *</label>
                  <select
                    value={createFormData.billing_entity_type}
                    onChange={(e) => setCreateFormData({ ...createFormData, billing_entity_type: e.target.value as any })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
                  >
                    <option value="cnpj_anestesista">Faturar por CPF/CNPJ do Anestesista</option>
                    <option value="cnpj_grupo">Faturar por CNPJ do Grupo</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-lg shadow-teal-500/25 transition-all flex items-center gap-1.5"
                >
                  {isSubmitting ? 'Registrando...' : 'Registrar Procedimento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDITAR PROCEDIMENTO */}
      {showEditModal && selectedProcedure && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 bg-teal-600 text-white flex justify-between items-center">
              <div>
                <span className="text-xs uppercase font-extrabold tracking-wider opacity-90">Editar Procedimento</span>
                <h3 className="font-extrabold text-lg leading-none mt-1">
                  Paciente: {selectedProcedure.patient_name}
                </h3>
              </div>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1 rounded-lg text-sm transition-all"
              >
                Fechar
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 gap-5">
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 block">Status do Pagamento</label>
                    <select
                      value={editFormData.payment_status}
                      onChange={(e) => setEditFormData({ ...editFormData, payment_status: e.target.value as any })}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
                    >
                      <option value="pending">Pendente</option>
                      <option value="sent">Enviado</option>
                      <option value="paid">Pago</option>
                      <option value="cancelled">Cancelado</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 block">Data do Recebimento</label>
                    <input
                      type="date"
                      value={editFormData.payment_date}
                      onChange={(e) => setEditFormData({ ...editFormData, payment_date: e.target.value })}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 block">Valor Ajustado (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editFormData.procedure_value}
                    onChange={(e) => setEditFormData({ ...editFormData, procedure_value: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-semibold"
                    placeholder="Valor do procedimento"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 block">Médico Executor</label>
                    <select
                      value={editFormData.anesthesiologist_user_id}
                      onChange={(e) => setEditFormData({ ...editFormData, anesthesiologist_user_id: e.target.value })}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
                    >
                      <option value="">Nenhum</option>
                      {members.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 block">Entidade de Faturamento</label>
                    <select
                      value={editFormData.billing_entity_type}
                      onChange={(e) => setEditFormData({ ...editFormData, billing_entity_type: e.target.value as any })}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
                    >
                      <option value="cnpj_anestesista">CPF/CNPJ do Anestesista</option>
                      <option value="cnpj_grupo">CNPJ do Grupo</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 block">Observações / Notas</label>
                  <textarea
                    value={editFormData.notes}
                    onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 h-24 resize-none"
                    placeholder="Digite observações sobre o faturamento..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-lg shadow-teal-500/25 transition-all"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
