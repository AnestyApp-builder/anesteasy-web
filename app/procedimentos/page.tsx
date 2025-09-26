'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react'
import Link from 'next/link'
import { 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  Calendar,
  DollarSign,
  User,
  Trash2,
  X,
  AlertCircle,
  Users,
  Activity,
  Edit3,
  Save,
  Check,
  MoreVertical,
  Eye,
  Edit,
  Paperclip,
  MessageSquare
} from 'lucide-react'
import { Layout } from '@/components/layout/Layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { procedureService, Procedure, Parcela, ProcedureAttachment } from '@/lib/procedures'
import { feedbackService } from '@/lib/feedback'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate, handleButtonPress, handleCardPress } from '@/lib/utils'
import { Loading } from '@/components/ui/Loading'

// Componente de campo editável - Memoizado para evitar re-renders
const EditField = memo(({ 
  field, 
  label, 
  value, 
  type = 'text', 
  options = null,
  isEditingMode,
  editFormData,
  updateFormField
}: {
  field: string
  label: string
  value: string
  type?: 'text' | 'select' | 'date' | 'time' | 'number'
  options?: { value: string; label: string }[] | null
  isEditingMode: boolean
  editFormData: any
  updateFormField: (field: string, value: string) => void
}) => {
  if (isEditingMode) {
    const currentValue = editFormData[field] ?? ''

    if (type === 'select' && options) {
    return (
      <div className="space-y-2 h-[90px]">
        <label className="text-sm font-medium text-gray-700 block h-5 truncate" title={label}>{label}</label>
        <select
          value={currentValue}
          onChange={(e) => updateFormField(field, e.target.value)}
          className="w-full h-[52px] px-3 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    )
    }

    return (
      <div className="space-y-2 h-[90px]">
        <label className="text-sm font-medium text-gray-700 block h-5 truncate" title={label}>{label}</label>
        {field === 'procedure_value' ? (
          <div className="relative h-[52px]">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">R$</span>
            <input
              type={type}
              value={currentValue}
              onChange={(e) => updateFormField(field, e.target.value)}
              className="w-full h-full pl-10 pr-3 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
            />
          </div>
        ) : (
          <input
            type={type}
            value={currentValue}
            onChange={(e) => updateFormField(field, e.target.value)}
            className="w-full h-[52px] px-3 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
          />
        )}
      </div>
    )
  }

  // Formatar valor monetário quando necessário
  const formatValue = (val: string) => {
    if (field === 'procedure_value' && val && !isNaN(Number(val))) {
      return formatCurrency(Number(val))
    }
    if (field === 'payment_status') {
      // Mapear status do banco para português
      switch (val) {
        case 'paid': return 'Pago'
        case 'pending': return 'Pendente'
        case 'cancelled': return 'Aguardando'
        case 'refunded': return 'Não Lançado'
        default: return val ?? 'Não informado'
      }
    }
    
    // Campos de Sim/Não
    const simNaoFields = [
      'sangramento', 'nausea_vomito', 'dor', 'acompanhamento_antes',
      'indicacao_cesariana', 'retencao_placenta', 'laceracao_presente',
      'hemorragia_puerperal', 'transfusao_realizada', 'feedback_solicitado'
    ]
    
    if (simNaoFields.includes(field)) {
      if (val === 'Sim' || val === 'sim' || val === true || val === 'true') {
        return '✅ Sim'
      } else if (val === 'Não' || val === 'não' || val === 'Nao' || val === 'nao' || val === false || val === 'false') {
        return '❌ Não'
      } else if (!val || val === '' || val === null || val === undefined) {
        return '⚪ Não informado'
      }
    }
    
    // Campos especiais
    if (field === 'tipo_parto' && val) {
      const icons = {
        'Instrumentalizado': '🔧',
        'Vaginal': '👶',
        'Cesariana': '⚕️'
      }
      return `${icons[val] || '📋'} ${val}`
    }
    
    if (field === 'grau_laceracao' && val) {
      return `Grau ${val}`
    }
    
    return val ?? 'Não informado'
  }

  return (
    <div className="space-y-2 h-[90px]">
      <label className="text-sm font-medium text-gray-700 block h-5 truncate" title={label}>{label}</label>
      <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm h-[52px] flex items-center">
        <p className="text-gray-900 font-medium truncate">{formatValue(editFormData[field] ?? value)}</p>
      </div>
    </div>
  )
})

EditField.displayName = 'EditField'

export default function Procedimentos() {
  const [searchTerm, setSearchTerm] = useState('')
  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [loading, setLoading] = useState(true)
  const [filteredProcedures, setFilteredProcedures] = useState<Procedure[]>([])
  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [isEditingMode, setIsEditingMode] = useState(false)
  const [editFormData, setEditFormData] = useState<any>({})
  const [isSaving, setIsSaving] = useState(false)
  const [parcelas, setParcelas] = useState<Parcela[]>([])
  const [attachments, setAttachments] = useState<ProcedureAttachment[]>([])
  const [procedureAttachments, setProcedureAttachments] = useState<Record<string, ProcedureAttachment[]>>({})
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [procedureToDelete, setProcedureToDelete] = useState<Procedure | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null)
  const [showDateFilter, setShowDateFilter] = useState(false)
  const [dateFilter, setDateFilter] = useState<{start: string, end: string} | null>(null)
  const [feedbackStatuses, setFeedbackStatuses] = useState<Record<string, {linkCriado: boolean, respondido: boolean}>>({})
  const { user } = useAuth()

  useEffect(() => {
    if (user?.id) {
      loadProcedures()
    }
  }, [user])

  // Detectar parâmetros na URL e configurar filtros/modal automaticamente
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const procedureId = urlParams.get('procedureId')
      const statusParam = urlParams.get('status')
      
      // Configurar filtro de status se presente na URL
      if (statusParam) {
        if (statusParam === 'pending,not_launched') {
          setStatusFilter('pending,not_launched')
        } else {
          setStatusFilter(statusParam)
        }
      }
      
      if (procedureId && procedures.length > 0) {
        const procedure = procedures.find(p => p.id === procedureId)
        if (procedure) {
          setSelectedProcedure(procedure)
          setShowDetailsModal(true)
          // Limpar o parâmetro da URL
          const newUrl = window.location.pathname
          window.history.replaceState({}, '', newUrl)
        }
      }
    }
  }, [procedures.length]) // Mudança: usar procedures.length em vez de procedures

  useEffect(() => {
    let filtered = procedures

    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter(procedure =>
        procedure.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        procedure.procedure_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        procedure.procedure_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filtro por status
    if (statusFilter !== 'all') {
      if (statusFilter === 'pending,not_launched') {
        // Filtrar por pendente e não lançado
        filtered = filtered.filter(procedure => 
          procedure.payment_status === 'pending' || procedure.payment_status === 'cancelled'
        )
    } else {
        filtered = filtered.filter(procedure => procedure.payment_status === statusFilter)
      }
    }

    setFilteredProcedures(filtered)
  }, [searchTerm, statusFilter, procedures])

  const loadProcedures = async () => {
    if (!user?.id) return
    
    setLoading(true)
    try {
      const data = await procedureService.getProcedures(user.id)
      setProcedures(data)
      
      // Carregar anexos para todos os procedimentos
      const attachmentsMap: Record<string, ProcedureAttachment[]> = {}
      // Carregar status de feedback para todos os procedimentos
      const feedbackStatusesMap: Record<string, {linkCriado: boolean, respondido: boolean}> = {}
      
      for (const procedure of data) {
        const procedureAttachments = await procedureService.getAttachments(procedure.id)
        attachmentsMap[procedure.id] = procedureAttachments
        
        // Verificar status do feedback
        const feedbackStatus = await feedbackService.getFeedbackStatus(procedure.id)
        feedbackStatusesMap[procedure.id] = {
          linkCriado: feedbackStatus.linkCriado,
          respondido: feedbackStatus.respondido
        }
      }
      
      setProcedureAttachments(attachmentsMap)
      setFeedbackStatuses(feedbackStatusesMap)
    } catch (error) {
      
    } finally {
      setLoading(false)
    }
  }

  // Função para calcular status das parcelas
  const getParcelStatus = (procedure: Procedure) => {
    if (procedure.payment_method !== 'Parcelado' && procedure.forma_pagamento !== 'Parcelado') {
      return null
    }
    
    const totalParcelas = (procedure as any).numero_parcelas || 0
    const parcelasRecebidas = (procedure as any).parcelas_recebidas || 0
    
    return `${parcelasRecebidas}/${totalParcelas}`
  }

  // Função para obter o indicador de feedback
  const getFeedbackIndicator = (procedureId: string) => {
    const status = feedbackStatuses[procedureId]
    if (!status) return null

    if (status.respondido) {
      return {
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        icon: MessageSquare,
        tooltip: 'Feedback recebido'
      }
    } else if (status.linkCriado) {
      return {
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        icon: MessageSquare,
        tooltip: 'Feedback solicitado'
      }
    }

    return null
  }


  const handleDeleteClick = (procedure: Procedure) => {
    setProcedureToDelete(procedure)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!procedureToDelete) return

    setIsDeleting(true)
    try {
      const success = await procedureService.deleteProcedure(procedureToDelete.id)
      if (success) {
        setProcedures(procedures.filter(p => p.id !== procedureToDelete.id))
        setFilteredProcedures(filteredProcedures.filter(p => p.id !== procedureToDelete.id))
        setShowDeleteModal(false)
        setProcedureToDelete(null)
        
        // Fechar modal de detalhes se estiver aberto
        if (showDetailsModal && selectedProcedure?.id === procedureToDelete.id) {
          closeDetailsModal()
        }
        
        // Feedback de sucesso
        alert('Procedimento excluído com sucesso!')
      } else {
        alert('Erro ao excluir procedimento. Tente novamente.')
      }
    } catch (error) {
      
      alert('Erro ao excluir procedimento. Verifique sua conexão.')
    } finally {
      setIsDeleting(false)
    }
  }

  const cancelDelete = () => {
    setShowDeleteModal(false)
    setProcedureToDelete(null)
  }

  const handleProcedureClick = async (procedure: Procedure) => {
    setSelectedProcedure(procedure)
    setShowDetailsModal(true)
    
    // Carregar parcelas se o procedimento for parcelado
    if (procedure.payment_method === 'Parcelado' || procedure.forma_pagamento === 'Parcelado') {
      const parcelasData = await procedureService.getParcelas(procedure.id)
      setParcelas(parcelasData)
    } else {
      setParcelas([])
    }

    // Carregar anexos do procedimento
    const attachmentsData = await procedureService.getAttachments(procedure.id)
    setAttachments(attachmentsData)
  }

  const closeDetailsModal = () => {
    setShowDetailsModal(false)
    setSelectedProcedure(null)
    setIsEditingMode(false)
    setEditFormData({})
    setFeedbackMessage(null)
  }


  // ===== NOVO SISTEMA DE EDIÇÃO - DO ZERO =====
  
  // Funções de edição
  const startEdit = async () => {
    setIsEditingMode(true)
    setEditFormData({ ...selectedProcedure })
    
    // Carregar parcelas se o procedimento for parcelado
    if (selectedProcedure && (selectedProcedure.payment_method === 'Parcelado' || selectedProcedure.forma_pagamento === 'Parcelado')) {
      const parcelasData = await procedureService.getParcelas(selectedProcedure.id)
      setEditFormData((prev: any) => ({
        ...prev,
        parcelas: parcelasData
      }))
    }
  }

  // Inicializar editFormData quando entrar no modo de edição
  useEffect(() => {
    if (isEditingMode && selectedProcedure) {
      setEditFormData(selectedProcedure) // clona os dados originais
      
      // Carregar parcelas se o procedimento for parcelado
      if (selectedProcedure.payment_method === 'Parcelado' || selectedProcedure.forma_pagamento === 'Parcelado') {
        procedureService.getParcelas(selectedProcedure.id).then(parcelasData => {
          setEditFormData((prev: any) => ({
            ...prev,
            parcelas: parcelasData
          }))
        })
      }
    }
  }, [isEditingMode, selectedProcedure])

  const cancelEdit = () => {
    setIsEditingMode(false)
    setEditFormData({})
  }

  const updateFormField = (field: string, newValue: string) => {
    setEditFormData((prev: any) => {
      const newData = {
      ...prev,
        [field]: newValue,
      }
      
      // Se o número de parcelas ou valor foi alterado, regenerar parcelas
      if (field === 'numero_parcelas' || field === 'procedure_value') {
        const numParcelas = field === 'numero_parcelas' ? parseInt(newValue) || 0 : parseInt(prev.numero_parcelas) || 0
        const valorTotal = field === 'procedure_value' ? parseFloat(newValue.replace(/[^\d,]/g, '').replace(',', '.')) || 0 : parseFloat(prev.procedure_value?.toString().replace(/[^\d,]/g, '').replace(',', '.') || '0') || 0
        
        
        if (numParcelas > 0 && valorTotal > 0) {
          const valorParcela = valorTotal / numParcelas
          const parcelasExistentes = prev.parcelas || []
          
          const novasParcelas = Array.from({ length: numParcelas }, (_, index) => {
            // Tentar preservar o status da parcela existente se existir
            const parcelaExistente = parcelasExistentes.find((p: any) => p.numero === index + 1)
            
            return {
              numero: index + 1,
              valor: valorParcela,
              recebida: parcelaExistente ? parcelaExistente.recebida : false,
              data_recebimento: parcelaExistente ? parcelaExistente.data_recebimento : ''
            }
          })
          
          newData.parcelas = novasParcelas
        } else {
          newData.parcelas = []
        }
      }
      
      return newData
    })
  }

  // Função para atualizar parcelas individuais
  const updateParcela = async (parcelaId: string, field: 'recebida' | 'data_recebimento', value: any) => {
    if (!selectedProcedure) return

    try {
      const updatedParcela = await procedureService.updateParcela(parcelaId, { [field]: value })
      if (updatedParcela) {
        setParcelas(prev => prev.map(p => p.id === parcelaId ? updatedParcela : p))
        
        // Atualizar o contador de parcelas recebidas no procedimento
        if (field === 'recebida') {
          const parcelasRecebidas = parcelas.filter(p => p.id === parcelaId ? value : p.recebida).length
          
          // Atualizar o procedimento selecionado
          setSelectedProcedure(prev => prev ? {
            ...prev,
            parcelas_recebidas: parcelasRecebidas
          } as any : null)
          
          // Atualizar a lista de procedimentos
          setProcedures(prev => prev.map(p => 
            p.id === selectedProcedure.id ? {
              ...p,
              parcelas_recebidas: parcelasRecebidas
            } as any : p
          ))
        }
      }
    } catch (error) {
      
    }
  }

  // Função para atualizar parcelas no modo de edição
  const updateParcelaEdit = (index: number, field: 'recebida' | 'data_recebimento', value: any) => {
    setEditFormData((prev: any) => {
      const newParcelas = prev.parcelas?.map((parcela: any, i: number) => 
        i === index ? { ...parcela, [field]: value } : parcela
      ) || []
      
      // Calcular parcelas recebidas se o campo for 'recebida'
      let parcelasRecebidas = 0
      if (field === 'recebida') {
        parcelasRecebidas = newParcelas.filter((p: any) => p.recebida).length
      } else {
        parcelasRecebidas = prev.parcelas_recebidas || 0
      }
      
      return {
        ...prev,
        parcelas: newParcelas,
        parcelas_recebidas: parcelasRecebidas
      }
    })
  }

  // Função para obter o valor da parcela (compatível com ambos os formatos)
  const getParcelaValor = (parcela: any) => {
    return parcela.valor || parcela.valor_parcela || 0
  }

  // Função para obter o número da parcela (compatível com ambos os formatos)
  const getParcelaNumero = (parcela: any) => {
    return parcela.numero || parcela.numero_parcela || 0
  }

  const saveEdit = async () => {
    if (!selectedProcedure) return

    setIsSaving(true)
    setFeedbackMessage(null)
    
    try {
      const { id, user_id, created_at, updated_at, parcelas, ...updateData } = editFormData
      const updatedProcedure = await procedureService.updateProcedure(selectedProcedure.id, updateData)
      
      if (updatedProcedure) {
        // Se há parcelas para atualizar, deletar as antigas e criar as novas
        if (parcelas && parcelas.length > 0) {
          
          // Deletar parcelas antigas
          await procedureService.deleteParcelas(selectedProcedure.id)
          
          // Criar novas parcelas
          const parcelasData = parcelas.map((parcela: any, index: number) => {
            const parcelaData = {
              procedure_id: selectedProcedure.id,
              numero_parcela: parcela.numero || parcela.numero_parcela || (index + 1),
              valor_parcela: parcela.valor || parcela.valor_parcela || 0,
              recebida: parcela.recebida || false,
              data_recebimento: parcela.data_recebimento || null
            }
            return parcelaData
          })
          
          const novasParcelas = await procedureService.createParcelas(parcelasData)
          
          // Atualizar estado das parcelas
          setParcelas(novasParcelas)
        } else {
          // Se não há parcelas, recarregar do banco para garantir sincronização
          const parcelasRecarregadas = await procedureService.getParcelas(selectedProcedure.id)
          setParcelas(parcelasRecarregadas)
        }
        
        setSelectedProcedure(updatedProcedure)
        setProcedures(procedures.map(p => p.id === updatedProcedure.id ? updatedProcedure : p))
        setIsEditingMode(false)
        setEditFormData({})
        setFeedbackMessage({ type: 'success', message: 'Procedimento atualizado com sucesso!' })
        setTimeout(() => setFeedbackMessage(null), 3000)
      } else {
        setFeedbackMessage({ type: 'error', message: 'Erro ao atualizar procedimento.' })
        setTimeout(() => setFeedbackMessage(null), 5000)
      }
    } catch (error) {
      
      setFeedbackMessage({ type: 'error', message: 'Erro ao salvar alterações.' })
      setTimeout(() => setFeedbackMessage(null), 5000)
    } finally {
      setIsSaving(false)
    }
  }


  const getPaymentStatusOptions = () => [
    { value: 'pending', label: 'Pendente' },
    { value: 'paid', label: 'Pago' },
    { value: 'cancelled', label: 'Aguardando' }
  ]

  const getPaymentMethodOptions = (status: string) => {
    if (status === 'pending') {
      return [
        { value: 'Aguardando', label: 'Aguardando' },
        { value: 'Parcelado', label: 'Parcelado' }
      ]
    } else if (status === 'paid') {
      return [
        { value: 'À vista', label: 'À vista' },
        { value: 'Parcelado', label: 'Parcelado' }
      ]
    }
    return [
      { value: 'Aguardando', label: 'Aguardando' },
      { value: 'À vista', label: 'À vista' },
      { value: 'Parcelado', label: 'Parcelado' }
    ]
  }



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-500 text-white shadow-sm'
      case 'pending':
        return 'bg-amber-500 text-white shadow-sm'
      case 'cancelled':
        return 'bg-red-500 text-white shadow-sm'
      case 'faturado':
        return 'bg-blue-500 text-white shadow-sm'
      case 'recebido':
        return 'bg-green-500 text-white shadow-sm'
      default:
        return 'bg-gray-500 text-white shadow-sm'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Pago'
      case 'pending':
        return 'Pendente'
      case 'cancelled':
        return 'Aguardando'
      case 'refunded':
        return 'Não Lançado'
      default:
        return status
    }
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Procedimentos</h1>
            <p className="text-gray-600 mt-1">Gerencie todos os seus procedimentos</p>
          </div>
          <div className="mt-4 sm:mt-0 hidden lg:block">
            <Link href="/procedimentos/novo">
              <Button 
                onClick={() => handleButtonPress(undefined, 'medium')}
                className="text-base sm:text-sm font-semibold px-4 sm:px-6 py-3"
              >
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Novo Procedimento</span>
                <span className="sm:hidden">Novo</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="lg:hidden">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Input
                placeholder="Buscar por nome, procedimento..."
                icon={<Search className="w-4 h-4" />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-base"
              />
            </div>
            <Button 
              variant="ghost" 
              onClick={() => handleButtonPress(() => setShowDateFilter(true), 'light')}
              title="Filtrar por período"
            >
              <Calendar className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Desktop Search */}
        <Card className="hidden lg:block">
          <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por nome, procedimento, telefone ou email..."
                  icon={<Search className="w-5 h-5" />}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button 
                variant="outline" 
                onClick={() => handleButtonPress(() => setShowDateFilter(true), 'light')}
                className="flex items-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                <span>Período</span>
              </Button>
            </div>
          </div>
        </Card>

        {/* Filters */}
        <div className="lg:hidden">
          <p className="text-sm font-medium text-gray-700 mb-3">Filtrar por status:</p>
          <style dangerouslySetInnerHTML={{
            __html: `
              .filter-scroll-container::-webkit-scrollbar {
                display: none !important;
              }
              .filter-scroll-container {
                -ms-overflow-style: none !important;
                scrollbar-width: none !important;
              }
            `
          }} />
          <div 
            className="flex gap-2 pb-2 filter-scroll-container"
            style={{
              overflowX: 'auto',
              overflowY: 'hidden',
              scrollBehavior: 'smooth',
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-x',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              scrollSnapType: 'x mandatory',
              overscrollBehaviorX: 'contain'
            }}
            onScroll={(e) => {
              // Adiciona suporte adicional para scroll suave
              e.currentTarget.style.scrollBehavior = 'smooth';
            }}
          >
            <button
              onClick={() => handleButtonPress(() => setStatusFilter('all'), 'light')}
              className={`filter-chip flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => handleButtonPress(() => setStatusFilter('pending'), 'light')}
              className={`filter-chip flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                statusFilter === 'pending'
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
              }`}
            >
              Pendente
            </button>
            <button
              onClick={() => handleButtonPress(() => setStatusFilter('paid'), 'light')}
              className={`filter-chip flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                statusFilter === 'paid'
                  ? 'bg-green-500 text-white shadow-md'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              Pago
            </button>
            <button
              onClick={() => handleButtonPress(() => setStatusFilter('cancelled'), 'light')}
              className={`filter-chip flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                statusFilter === 'cancelled'
                  ? 'bg-red-500 text-white shadow-md'
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
            >
              Não Lançado
            </button>
            <button
              onClick={() => handleButtonPress(() => setStatusFilter('pending,not_launched'), 'light')}
              className={`filter-chip flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                statusFilter === 'pending,not_launched'
                  ? 'bg-purple-500 text-white shadow-md'
                  : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
              }`}
            >
              Pendente + Não Lançado
            </button>
          </div>
          
          {/* Indicadores de paginação */}
          <div className="flex justify-center items-center gap-1 mt-2 mb-1">
            <div className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
              statusFilter === 'all' ? 'bg-teal-600' : 'bg-gray-300'
            }`}></div>
            <div className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
              statusFilter === 'pending' ? 'bg-amber-500' : 'bg-gray-300'
            }`}></div>
            <div className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
              statusFilter === 'paid' ? 'bg-green-500' : 'bg-gray-300'
            }`}></div>
            <div className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
              statusFilter === 'cancelled' ? 'bg-red-500' : 'bg-gray-300'
            }`}></div>
            <div className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
              statusFilter === 'pending,not_launched' ? 'bg-purple-500' : 'bg-gray-300'
            }`}></div>
          </div>
          
          {/* Dica de texto */}
          <p className="text-xs text-gray-400 text-center">
            Deslize para o lado
          </p>
        </div>

        {/* Desktop Filters */}
        <Card className="hidden lg:block">
          <div className="p-4 sm:p-6">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? 'bg-teal-50 border-teal-200 text-teal-700' : ''}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filtros
              </Button>
            </div>
            
            {/* Desktop Filtros expandidos */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status de Pagamento
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full px-3 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    >
                      <option value="all">Todos os status</option>
                      <option value="pending">Pendente</option>
                      <option value="paid">Pago</option>
                      <option value="cancelled">Aguardando</option>
                      <option value="pending,not_launched">Pendente + Não Lançado</option>
                    </select>
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setStatusFilter('all')
                        setSearchTerm('')
                      }}
                      className="flex-1 text-base py-2"
                    >
                      Limpar Filtros
                    </Button>
                    <Button 
                      onClick={() => setShowFilters(false)}
                      className="flex-1 text-base py-2"
                    >
                      Aplicar
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>


        {/* Procedures List */}
        <div>
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Lista de Procedimentos</h2>
            {loading ? (
              <Loading text="Carregando procedimentos..." />
          ) : filteredProcedures.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Nenhum procedimento encontrado</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {searchTerm ? 'Tente ajustar os filtros de busca' : 'Comece criando seu primeiro procedimento'}
                    </p>
                  </div>
                ) : (
            <div className="space-y-3">
                {filteredProcedures.map((procedure) => (
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
                              <p className="font-semibold text-gray-900 text-base truncate">{procedure.patient_name}</p>
                              {procedureAttachments[procedure.id] && procedureAttachments[procedure.id].length > 0 && (
                                <Paperclip className="w-4 h-4 text-blue-500 flex-shrink-0" />
                              )}
                              {getFeedbackIndicator(procedure.id) && (
                                <div 
                                  className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${getFeedbackIndicator(procedure.id)?.bgColor}`}
                                  title={getFeedbackIndicator(procedure.id)?.tooltip}
                                >
                                  <MessageSquare className={`w-3 h-3 ${getFeedbackIndicator(procedure.id)?.color}`} />
                                </div>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 truncate font-medium mb-1">{procedure.procedure_type}</p>
                            {getParcelStatus(procedure) && (
                              <p className="text-xs text-teal-600 font-medium bg-teal-50 px-2 py-1 rounded-full inline-block">
                                Parcelas: {getParcelStatus(procedure)}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className={`inline-flex px-3 py-1.5 text-xs font-semibold rounded-full shadow-sm ${getStatusColor(procedure.payment_status || 'pending')}`}>
                          {getStatusText(procedure.payment_status || 'pending')}
                        </span>
                      </div>
                      
                      {/* Segunda linha: Valor + Data */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <DollarSign className="w-5 h-5 mr-2 text-gray-600" />
                          <span className="font-bold text-gray-900 text-lg">{formatCurrency(procedure.procedure_value)}</span>
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
                            <p className="font-semibold text-gray-900 text-lg">{procedure.patient_name}</p>
                            {procedureAttachments[procedure.id] && procedureAttachments[procedure.id].length > 0 && (
                              <Paperclip className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            )}
                            {getFeedbackIndicator(procedure.id) && (
                              <div 
                                className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${getFeedbackIndicator(procedure.id)?.bgColor}`}
                                title={getFeedbackIndicator(procedure.id)?.tooltip}
                              >
                                <MessageSquare className={`w-3 h-3 ${getFeedbackIndicator(procedure.id)?.color}`} />
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 font-medium mb-1">{procedure.procedure_type}</p>
                          {getParcelStatus(procedure) && (
                            <p className="text-xs text-teal-600 font-medium bg-teal-50 px-2 py-1 rounded-full inline-block">
                              Parcelas: {getParcelStatus(procedure)}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className={`inline-flex px-3 py-1.5 text-xs font-semibold rounded-full shadow-sm ${getStatusColor(procedure.payment_status || 'pending')}`}>
                        {getStatusText(procedure.payment_status || 'pending')}
                      </span>
                    </div>
                    
                    {/* Segunda linha: Informações + Valor */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-6 text-sm text-gray-500">
                        <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {formatDate(procedure.procedure_date)} às {procedure.procedure_time}
                          </div>
                        <div className="flex items-center">
                            <User className="w-4 h-4 mr-1" />
                            {user?.name}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                          <p className="font-bold text-gray-900 text-xl flex items-center justify-end">
                            <DollarSign className="w-5 h-5 mr-2 text-gray-600" />
                          {formatCurrency(procedure.procedure_value)}
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

      {/* Modal de Detalhes do Procedimento */}
      {showDetailsModal && selectedProcedure && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Header do Modal */}
            <div className="modal-header bg-gradient-to-r from-teal-500 to-teal-600 text-white p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Detalhes do Procedimento</h2>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {!isEditingMode ? (
                    <>
                      <button
                        onClick={startEdit}
                        className="flex items-center justify-center w-10 h-10 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors select-none"
                        style={{
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                          MozUserSelect: 'none',
                          msUserSelect: 'none',
                          outline: 'none',
                          border: 'none',
                          boxShadow: 'none'
                        }}
                        title="Editar Procedimento"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(selectedProcedure)}
                        className="flex items-center justify-center w-10 h-10 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors select-none"
                        style={{
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                          MozUserSelect: 'none',
                          msUserSelect: 'none',
                          outline: 'none',
                          border: 'none',
                          boxShadow: 'none'
                        }}
                        title="Excluir Procedimento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={saveEdit}
                        disabled={isSaving}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors select-none font-medium"
                        style={{
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                          MozUserSelect: 'none',
                          msUserSelect: 'none',
                          outline: 'none',
                          border: 'none',
                          boxShadow: 'none'
                        }}
                      >
                        <Save className="w-4 h-4" />
                        <span className="text-sm">{isSaving ? 'Salvando...' : 'Salvar'}</span>
                      </button>
                      <button
                        onClick={cancelEdit}
                        disabled={isSaving}
                        className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-lg transition-colors select-none font-medium"
                        style={{
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                          MozUserSelect: 'none',
                          msUserSelect: 'none',
                          outline: 'none',
                          border: 'none',
                          boxShadow: 'none'
                        }}
                      >
                        <X className="w-4 h-4" />
                        <span className="text-sm">Cancelar</span>
                      </button>
                    </div>
                  )}
                  <button
                    onClick={closeDetailsModal}
                    className="text-white hover:text-teal-200 transition-colors p-2 rounded-full hover:bg-white hover:bg-opacity-20"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Feedback Message */}
            {feedbackMessage && (
              <div className={`mx-6 mt-4 p-3 rounded-lg ${
                feedbackMessage.type === 'success' 
                  ? 'bg-green-100 text-green-800 border border-green-200' 
                  : 'bg-red-100 text-red-800 border border-red-200'
              }`}>
                <div className="flex items-center">
                  {feedbackMessage.type === 'success' ? (
                    <Check className="w-4 h-4 mr-2" />
                  ) : (
                    <X className="w-4 h-4 mr-2" />
                  )}
                  <span className="text-sm font-medium">{feedbackMessage.message}</span>
                </div>
              </div>
            )}
            
            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]" style={{ scrollbarWidth: 'thin', scrollbarColor: '#14b8a6 #f1f5f9' }}>
              {/* Informações do Paciente */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 shadow-sm">
                <h3 className="text-xl font-bold text-gray-800 mb-5 flex items-center">
                  <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center mr-3">
                    <Users className="w-5 h-5 text-teal-600" />
                  </div>
                  Informações do Paciente
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <EditField
                    field="patient_name"
                    label="Nome"
                    value={selectedProcedure.patient_name || ''}
                    isEditingMode={isEditingMode}
                    editFormData={editFormData}
                    updateFormField={updateFormField}
                  />
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Idade</label>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <span className="text-sm text-gray-600">
                        {selectedProcedure.data_nascimento ? 
                          `${Math.floor((new Date().getTime() - new Date(selectedProcedure.data_nascimento).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} anos` : 
                          'Não informado'
                        }
                      </span>
                    </div>
                  </div>
                  <EditField
                    field="data_nascimento"
                    label="Data de Nascimento"
                    value={selectedProcedure.data_nascimento ? selectedProcedure.data_nascimento.split('T')[0] : ''}
                    type="date"
                    isEditingMode={isEditingMode}
                    editFormData={editFormData}
                    updateFormField={updateFormField}
                  />
                  <EditField
                    field="convenio"
                    label="Convênio"
                    value={selectedProcedure.convenio || ''}
                    isEditingMode={isEditingMode}
                    editFormData={editFormData}
                    updateFormField={updateFormField}
                  />
                  <EditField
                    field="carteirinha"
                    label="Carteirinha"
                    value={selectedProcedure.carteirinha || ''}
                    isEditingMode={isEditingMode}
                    editFormData={editFormData}
                    updateFormField={updateFormField}
                  />
                  <EditField
                    field="patient_gender"
                    label="Sexo do Paciente"
                    value={selectedProcedure.patient_gender || ''}
                    type="select"
                    options={[
                      { value: '', label: 'Selecione...' },
                      { value: 'M', label: 'Masculino' },
                      { value: 'F', label: 'Feminino' },
                      { value: 'Other', label: 'Outro' }
                    ]}
                    isEditingMode={isEditingMode}
                    editFormData={editFormData}
                    updateFormField={updateFormField}
                  />
                </div>
              </div>

              {/* Informações do Procedimento */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6 shadow-sm">
                <h3 className="text-xl font-bold text-blue-800 mb-5 flex items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  Informações do Procedimento
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <EditField
                    field="procedure_name"
                    label="Tipo de Procedimento"
                    value={selectedProcedure.procedure_name || ''}
                    isEditingMode={isEditingMode}
                    editFormData={editFormData}
                    updateFormField={updateFormField}
                  />
                  <EditField
                    field="tecnica_anestesica"
                    label="Técnica Anestésica"
                    value={selectedProcedure.tecnica_anestesica || ''}
                    isEditingMode={isEditingMode}
                    editFormData={editFormData}
                    updateFormField={updateFormField}
                  />
                  <EditField
                    field="codigo_tssu"
                    label="Código TSSU"
                    value={selectedProcedure.codigo_tssu || ''}
                    isEditingMode={isEditingMode}
                    editFormData={editFormData}
                    updateFormField={updateFormField}
                  />
                  <EditField
                    field="procedure_date"
                    label="Data do Procedimento"
                    value={selectedProcedure.procedure_date ? selectedProcedure.procedure_date.split('T')[0] : ''}
                    type="date"
                    isEditingMode={isEditingMode}
                    editFormData={editFormData}
                    updateFormField={updateFormField}
                  />
                  <EditField
                    field="procedure_time"
                    label="Horário"
                    value={selectedProcedure.procedure_time || ''}
                    type="time"
                    isEditingMode={isEditingMode}
                    editFormData={editFormData}
                    updateFormField={updateFormField}
                  />
                  <EditField
                    field="duration_minutes"
                    label="Duração (minutos)"
                    value={selectedProcedure.duration_minutes ? selectedProcedure.duration_minutes.toString() : ''}
                    type="number"
                    isEditingMode={isEditingMode}
                    editFormData={editFormData}
                    updateFormField={updateFormField}
                  />
                  <EditField
                    field="hospital_clinic"
                    label="Hospital/Clínica"
                    value={selectedProcedure.hospital_clinic || ''}
                    isEditingMode={isEditingMode}
                    editFormData={editFormData}
                    updateFormField={updateFormField}
                  />
                  <EditField
                    field="room_number"
                    label="Número da Sala"
                    value={selectedProcedure.room_number || ''}
                    isEditingMode={isEditingMode}
                    editFormData={editFormData}
                    updateFormField={updateFormField}
                  />
                  <EditField
                    field="codigo_tssu"
                    label="Código TSSU"
                    value={selectedProcedure.codigo_tssu || ''}
                    isEditingMode={isEditingMode}
                    editFormData={editFormData}
                    updateFormField={updateFormField}
                  />
                </div>
              </div>

              {/* Informações da Equipe */}
              <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-6 shadow-sm">
                <h3 className="text-xl font-bold text-green-800 mb-5 flex items-center">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                    <Activity className="w-5 h-5 text-green-600" />
                  </div>
                  Equipe Médica
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <EditField
                    field="anesthesiologist_name"
                    label="Anestesiologista"
                    value={selectedProcedure.anesthesiologist_name || ''}
                    isEditingMode={isEditingMode}
                    editFormData={editFormData}
                    updateFormField={updateFormField}
                  />
                  <EditField
                    field="surgeon_name"
                    label="Cirurgião"
                    value={selectedProcedure.surgeon_name || selectedProcedure.nome_cirurgiao || ''}
                    isEditingMode={isEditingMode}
                    editFormData={editFormData}
                    updateFormField={updateFormField}
                  />
                  <EditField
                    field="nome_equipe"
                    label="Nome da Equipe"
                    value={selectedProcedure.nome_equipe || ''}
                    isEditingMode={isEditingMode}
                    editFormData={editFormData}
                    updateFormField={updateFormField}
                  />
                  <EditField
                    field="especialidade_cirurgiao"
                    label="Especialidade do Cirurgião"
                    value={selectedProcedure.especialidade_cirurgiao || ''}
                    isEditingMode={isEditingMode}
                    editFormData={editFormData}
                    updateFormField={updateFormField}
                  />
                </div>
              </div>

              {/* Informações de Feedback */}
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-6 shadow-sm">
                <h3 className="text-xl font-bold text-purple-800 mb-5 flex items-center">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                    <MessageSquare className="w-5 h-5 text-purple-600" />
                  </div>
                  Informações de Feedback
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <EditField
                    field="feedback_solicitado"
                    label="Feedback Solicitado"
                    value={selectedProcedure.feedback_solicitado ? 'Sim' : 'Não'}
                    type="select"
                    options={[
                      { value: '', label: 'Selecione...' },
                      { value: 'Sim', label: 'Sim' },
                      { value: 'Não', label: 'Não' }
                    ]}
                    isEditingMode={isEditingMode}
                    editFormData={editFormData}
                    updateFormField={updateFormField}
                  />
                  <EditField
                    field="email_cirurgiao"
                    label="Email do Cirurgião"
                    value={selectedProcedure.email_cirurgiao || ''}
                    isEditingMode={isEditingMode}
                    editFormData={editFormData}
                    updateFormField={updateFormField}
                  />
                  <EditField
                    field="telefone_cirurgiao"
                    label="Telefone do Cirurgião"
                    value={selectedProcedure.telefone_cirurgiao || ''}
                    isEditingMode={isEditingMode}
                    editFormData={editFormData}
                    updateFormField={updateFormField}
                  />
                </div>
              </div>

              {/* Dados Específicos do Procedimento */}
              <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-xl p-6 shadow-sm border border-indigo-200">
                <h3 className="text-xl font-bold text-indigo-800 mb-5 flex items-center">
                  <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                    <FileText className="w-5 h-5 text-indigo-600" />
                  </div>
                  Dados Específicos do Procedimento
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Campos para procedimentos não-obstétricos */}
                  {selectedProcedure.sangramento && (
                    <EditField
                      field="sangramento"
                      label="Sangramento"
                      value={selectedProcedure.sangramento}
                      type="select"
                      options={[
                        { value: '', label: 'Selecione...' },
                        { value: 'Sim', label: 'Sim' },
                        { value: 'Não', label: 'Não' }
                      ]}
                      isEditingMode={isEditingMode}
                      editFormData={editFormData}
                      updateFormField={updateFormField}
                    />
                  )}
                  {selectedProcedure.nausea_vomito && (
                    <EditField
                      field="nausea_vomito"
                      label="Náuseas e Vômitos"
                      value={selectedProcedure.nausea_vomito}
                      type="select"
                      options={[
                        { value: '', label: 'Selecione...' },
                        { value: 'Sim', label: 'Sim' },
                        { value: 'Não', label: 'Não' }
                      ]}
                      isEditingMode={isEditingMode}
                      editFormData={editFormData}
                      updateFormField={updateFormField}
                    />
                  )}
                  {selectedProcedure.dor && (
                    <EditField
                      field="dor"
                      label="Dor"
                      value={selectedProcedure.dor}
                      type="select"
                      options={[
                        { value: '', label: 'Selecione...' },
                        { value: 'Sim', label: 'Sim' },
                        { value: 'Não', label: 'Não' }
                      ]}
                      isEditingMode={isEditingMode}
                      editFormData={editFormData}
                      updateFormField={updateFormField}
                    />
                  )}
                  {selectedProcedure.observacoes_procedimento && (
                    <EditField
                      field="observacoes_procedimento"
                      label="Observações do Procedimento"
                      value={selectedProcedure.observacoes_procedimento}
                      isEditingMode={isEditingMode}
                      editFormData={editFormData}
                      updateFormField={updateFormField}
                    />
                  )}
                  
                  {/* Campos específicos para procedimentos obstétricos */}
                  {selectedProcedure.acompanhamento_antes && (
                    <EditField
                      field="acompanhamento_antes"
                      label="Acompanhamento Antes"
                      value={selectedProcedure.acompanhamento_antes}
                      type="select"
                      options={[
                        { value: '', label: 'Selecione...' },
                        { value: 'Sim', label: 'Sim' },
                        { value: 'Não', label: 'Não' }
                      ]}
                      isEditingMode={isEditingMode}
                      editFormData={editFormData}
                      updateFormField={updateFormField}
                    />
                  )}
                  {selectedProcedure.tipo_parto && (
                    <EditField
                      field="tipo_parto"
                      label="Tipo de Parto"
                      value={selectedProcedure.tipo_parto}
                      type="select"
                      options={[
                        { value: '', label: 'Selecione...' },
                        { value: 'Instrumentalizado', label: 'Instrumentalizado' },
                        { value: 'Vaginal', label: 'Vaginal' },
                        { value: 'Cesariana', label: 'Cesariana' }
                      ]}
                      isEditingMode={isEditingMode}
                      editFormData={editFormData}
                      updateFormField={updateFormField}
                    />
                  )}
                  {selectedProcedure.tipo_cesariana && (
                    <EditField
                      field="tipo_cesariana"
                      label="Tipo de Cesariana"
                      value={selectedProcedure.tipo_cesariana}
                      type="select"
                      options={[
                        { value: '', label: 'Selecione...' },
                        { value: 'Nova Ráqui', label: 'Nova Ráqui' },
                        { value: 'Geral', label: 'Geral' },
                        { value: 'Complementação pelo Cateter', label: 'Complementação pelo Cateter' }
                      ]}
                      isEditingMode={isEditingMode}
                      editFormData={editFormData}
                      updateFormField={updateFormField}
                    />
                  )}
                  {selectedProcedure.indicacao_cesariana && (
                    <EditField
                      field="indicacao_cesariana"
                      label="Indicação de Cesariana"
                      value={selectedProcedure.indicacao_cesariana}
                      type="select"
                      options={[
                        { value: '', label: 'Selecione...' },
                        { value: 'Sim', label: 'Sim' },
                        { value: 'Não', label: 'Não' }
                      ]}
                      isEditingMode={isEditingMode}
                      editFormData={editFormData}
                      updateFormField={updateFormField}
                    />
                  )}
                  {selectedProcedure.retencao_placenta && (
                    <EditField
                      field="retencao_placenta"
                      label="Retenção de Placenta"
                      value={selectedProcedure.retencao_placenta}
                      type="select"
                      options={[
                        { value: '', label: 'Selecione...' },
                        { value: 'Sim', label: 'Sim' },
                        { value: 'Não', label: 'Não' }
                      ]}
                      isEditingMode={isEditingMode}
                      editFormData={editFormData}
                      updateFormField={updateFormField}
                    />
                  )}
                  {selectedProcedure.laceracao_presente && (
                    <EditField
                      field="laceracao_presente"
                      label="Laceração Presente"
                      value={selectedProcedure.laceracao_presente}
                      type="select"
                      options={[
                        { value: '', label: 'Selecione...' },
                        { value: 'Sim', label: 'Sim' },
                        { value: 'Não', label: 'Não' }
                      ]}
                      isEditingMode={isEditingMode}
                      editFormData={editFormData}
                      updateFormField={updateFormField}
                    />
                  )}
                  {selectedProcedure.grau_laceracao && (
                    <EditField
                      field="grau_laceracao"
                      label="Grau da Laceração"
                      value={selectedProcedure.grau_laceracao}
                      type="select"
                      options={[
                        { value: '', label: 'Selecione...' },
                        { value: '1', label: 'Grau 1' },
                        { value: '2', label: 'Grau 2' },
                        { value: '3', label: 'Grau 3' },
                        { value: '4', label: 'Grau 4' }
                      ]}
                      isEditingMode={isEditingMode}
                      editFormData={editFormData}
                      updateFormField={updateFormField}
                    />
                  )}
                  {selectedProcedure.hemorragia_puerperal && (
                    <EditField
                      field="hemorragia_puerperal"
                      label="Hemorragia Puerperal"
                      value={selectedProcedure.hemorragia_puerperal}
                      type="select"
                      options={[
                        { value: '', label: 'Selecione...' },
                        { value: 'Sim', label: 'Sim' },
                        { value: 'Não', label: 'Não' }
                      ]}
                      isEditingMode={isEditingMode}
                      editFormData={editFormData}
                      updateFormField={updateFormField}
                    />
                  )}
                  {selectedProcedure.transfusao_realizada && (
                    <EditField
                      field="transfusao_realizada"
                      label="Transfusão Realizada"
                      value={selectedProcedure.transfusao_realizada}
                      type="select"
                      options={[
                        { value: '', label: 'Selecione...' },
                        { value: 'Sim', label: 'Sim' },
                        { value: 'Não', label: 'Não' }
                      ]}
                      isEditingMode={isEditingMode}
                      editFormData={editFormData}
                      updateFormField={updateFormField}
                    />
                  )}
                </div>
              </div>

              {/* Informações Financeiras */}
              <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-xl p-6 shadow-sm">
                <h3 className="text-xl font-bold text-yellow-800 mb-5 flex items-center">
                  <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                    <DollarSign className="w-5 h-5 text-yellow-600" />
                  </div>
                  Informações Financeiras
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <EditField
                    field="procedure_value"
                    label="Valor do Procedimento"
                    value={selectedProcedure.procedure_value ? selectedProcedure.procedure_value.toString() : ''}
                    type="number"
                    isEditingMode={isEditingMode}
                    editFormData={editFormData}
                    updateFormField={updateFormField}
                  />
                  <EditField
                    field="payment_status"
                    label="Status do Pagamento"
                    value={selectedProcedure.payment_status || ''}
                    type="select"
                    options={[
                      { value: '', label: 'Selecione...' },
                      { value: 'pending', label: 'Pendente' },
                      { value: 'paid', label: 'Pago' },
                      { value: 'cancelled', label: 'Aguardando' },
                      { value: 'refunded', label: 'Não Lançado' }
                    ]}
                    isEditingMode={isEditingMode}
                    editFormData={editFormData}
                    updateFormField={updateFormField}
                  />
                  <EditField
                    field="forma_pagamento"
                    label="Forma de Pagamento"
                    value={selectedProcedure.forma_pagamento || ''}
                    isEditingMode={isEditingMode}
                    editFormData={editFormData}
                    updateFormField={updateFormField}
                  />
                  <EditField
                    field="payment_date"
                    label="Data do Pagamento"
                    value={selectedProcedure.payment_date ? selectedProcedure.payment_date.split('T')[0] : ''}
                    type="date"
                    isEditingMode={isEditingMode}
                    editFormData={editFormData}
                    updateFormField={updateFormField}
                  />
                  <EditField
                    field="numero_parcelas"
                    label="Número de Parcelas"
                    value={selectedProcedure.numero_parcelas ? selectedProcedure.numero_parcelas.toString() : ''}
                    type="number"
                    isEditingMode={isEditingMode}
                    editFormData={editFormData}
                    updateFormField={updateFormField}
                  />
                  <EditField
                    field="parcelas_recebidas"
                    label="Parcelas Recebidas"
                    value={selectedProcedure.parcelas_recebidas ? selectedProcedure.parcelas_recebidas.toString() : ''}
                    type="number"
                    isEditingMode={isEditingMode}
                    editFormData={editFormData}
                    updateFormField={updateFormField}
                  />
                  <EditField
                    field="observacoes_financeiras"
                    label="Observações Financeiras"
                    value={selectedProcedure.observacoes_financeiras || ''}
                    isEditingMode={isEditingMode}
                    editFormData={editFormData}
                    updateFormField={updateFormField}
                  />
                </div>
              </div>

              {/* Informações de Feedback */}
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-6 shadow-sm border border-purple-200">
                <h3 className="text-xl font-bold text-purple-800 mb-5 flex items-center">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                    <User className="w-5 h-5 text-purple-600" />
                  </div>
                  Feedback do Cirurgião
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <EditField
                    field="feedback_solicitado"
                    label="Feedback Solicitado"
                    value={selectedProcedure.feedback_solicitado ? 'Sim' : 'Não'}
                    isEditingMode={false}
                    editFormData={editFormData}
                    updateFormField={updateFormField}
                  />
                  {selectedProcedure.feedback_solicitado && (
                    <>
                      <EditField
                        field="email_cirurgiao"
                        label="Email do Cirurgião"
                        value={selectedProcedure.email_cirurgiao || ''}
                        isEditingMode={isEditingMode}
                        editFormData={editFormData}
                        updateFormField={updateFormField}
                      />
                      <EditField
                        field="telefone_cirurgiao"
                        label="Telefone do Cirurgião"
                        value={selectedProcedure.telefone_cirurgiao || ''}
                        isEditingMode={isEditingMode}
                        editFormData={editFormData}
                        updateFormField={updateFormField}
                      />
                      <div className="col-span-2">
                        <Button
                          onClick={async () => {
                            try {
                              const link = await feedbackService.createFeedbackLinkOnly({
                                procedureId: selectedProcedure.id,
                                emailCirurgiao: selectedProcedure.email_cirurgiao,
                                telefoneCirurgiao: selectedProcedure.telefone_cirurgiao
                              });
                              
                              // Copiar o link para a área de transferência
                              await navigator.clipboard.writeText(link);
                              
                              // Mostrar mensagem de sucesso
                              setFeedbackMessage({
                                type: 'success',
                                message: 'Novo link gerado e copiado para a área de transferência!'
                              });
                              
                              setTimeout(() => setFeedbackMessage(null), 3000);
                            } catch (error) {
                              
                              setFeedbackMessage({
                                type: 'error',
                                message: 'Erro ao gerar novo link. Tente novamente.'
                              });
                              setTimeout(() => setFeedbackMessage(null), 3000);
                            }
                          }}
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          Gerar Novo Link de Feedback
                        </Button>
                        <p className="text-xs text-gray-500 mt-2 text-center">
                          O link gerado terá validade de 48 horas e será copiado automaticamente
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Informações Financeiras */}
              <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-xl p-6 shadow-sm border border-emerald-200">
                <h3 className="text-xl font-bold text-emerald-800 mb-5 flex items-center">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center mr-3">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                  </div>
                  Informações Financeiras
                </h3>
                <div className="space-y-4">
                  {/* Status do Pagamento - Primeiro item */}
                  <EditField
                    field="payment_status"
                    label="Status do Pagamento"
                    value={selectedProcedure.payment_status || ''}
                    type="select"
                    options={getPaymentStatusOptions()}
                    isEditingMode={isEditingMode}
                    editFormData={editFormData}
                    updateFormField={updateFormField}
                  />

                  {/* Campos condicionais baseados no status */}
                  {(editFormData.payment_status === 'pending' || (!isEditingMode && selectedProcedure.payment_status === 'pending')) && (
                    <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <EditField
                    field="procedure_value"
                    label="Valor do Procedimento"
                    value={selectedProcedure.procedure_value ? selectedProcedure.procedure_value.toString() : ''}
                    type="number"
                          isEditingMode={isEditingMode}
                          editFormData={editFormData}
                          updateFormField={updateFormField}
                        />
                        <EditField
                    field="payment_method"
                    label="Forma de Pagamento"
                          value={selectedProcedure.payment_method || selectedProcedure.forma_pagamento || 'Aguardando'}
                          type="select"
                          options={getPaymentMethodOptions(editFormData.payment_status || selectedProcedure.payment_status || 'pending')}
                          isEditingMode={isEditingMode}
                          editFormData={editFormData}
                          updateFormField={updateFormField}
                        />
                      </div>
                      
                      {/* Campos condicionais para parcelas */}
                      {((isEditingMode && (editFormData.payment_method === 'Parcelado' || editFormData.forma_pagamento === 'Parcelado')) || 
                        (!isEditingMode && (selectedProcedure.payment_method === 'Parcelado' || selectedProcedure.forma_pagamento === 'Parcelado'))) && (
                        <div className="space-y-4">
                          <div className="max-w-xs">
                            <EditField
                              field="numero_parcelas"
                              label="Total de Parcelas"
                              value={isEditingMode ? (editFormData.numero_parcelas || '') : ((selectedProcedure as any).numero_parcelas || '')}
                              type="number"
                              isEditingMode={isEditingMode}
                              editFormData={editFormData}
                              updateFormField={updateFormField}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              {isEditingMode 
                                ? "Informe em quantas vezes será dividido o pagamento"
                                : "Total de parcelas do pagamento"
                              }
                            </p>
                          </div>
                          
                          {/* Parcelas individuais */}
                          {((isEditingMode && (selectedProcedure?.payment_method === 'Parcelado' || selectedProcedure?.forma_pagamento === 'Parcelado')) || (!isEditingMode && parcelas.length > 0)) && (
                            <div className="space-y-3">
                              <h4 className="text-sm font-medium text-gray-700">Controle de Parcelas</h4>
                              {!isEditingMode && (
                                <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-200">
                                  💡 Para editar o status das parcelas, clique em "Editar" no cabeçalho do procedimento
                                </div>
                              )}
                              {/* Debug: mostrar quantidade de parcelas */}
                              <div className="text-xs text-blue-500">
                                Debug: {isEditingMode ? editFormData.parcelas?.length || 0 : parcelas.length} parcelas carregadas
                              </div>
                              {(isEditingMode ? editFormData.parcelas || [] : parcelas).map((parcela: any, index: number) => (
                                <div key={parcela.id} className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700">
                                      Parcela {getParcelaNumero(parcela)}
                                    </span>
                                    <span className="text-sm font-bold text-teal-600">
                                      R$ {getParcelaValor(parcela).toFixed(2).replace('.', ',')}
                                    </span>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <label className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        checked={parcela.recebida}
                                        onChange={(e) => isEditingMode ? updateParcelaEdit(index, 'recebida', e.target.checked) : null}
                                        disabled={!isEditingMode}
                                        className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                      />
                                      <span className="text-sm text-gray-600">Recebida</span>
                                    </label>
                                    
                                    {parcela.recebida && (
                                      <div className="ml-6">
                                        <label className="block text-xs text-gray-500 mb-1">
                                          Data de recebimento
                                        </label>
                                        <input
                                          type="date"
                                          value={parcela.data_recebimento || ''}
                                          onChange={(e) => isEditingMode ? updateParcelaEdit(index, 'data_recebimento', e.target.value) : null}
                                          disabled={!isEditingMode}
                                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100"
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {(editFormData.payment_status === 'paid' || (!isEditingMode && selectedProcedure.payment_status === 'paid')) && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <EditField
                          field="procedure_value"
                          label="Valor do Procedimento"
                          value={selectedProcedure.procedure_value ? selectedProcedure.procedure_value.toString() : ''}
                          type="number"
                          isEditingMode={isEditingMode}
                          editFormData={editFormData}
                          updateFormField={updateFormField}
                        />
                        <EditField
                    field="payment_date"
                    label="Data do Pagamento"
                          value={selectedProcedure.payment_date ? selectedProcedure.payment_date.split('T')[0] : ''}
                    type="date"
                          isEditingMode={isEditingMode}
                          editFormData={editFormData}
                          updateFormField={updateFormField}
                  />
                </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <EditField
                          field="payment_method"
                          label="Forma de Pagamento"
                          value={selectedProcedure.payment_method || selectedProcedure.forma_pagamento || 'Aguardando'}
                          type="select"
                          options={getPaymentMethodOptions(editFormData.payment_status || selectedProcedure.payment_status || 'pending')}
                          isEditingMode={isEditingMode}
                          editFormData={editFormData}
                          updateFormField={updateFormField}
                        />
                        
                        {/* Campos condicionais para parcelas */}
                        {((isEditingMode && (editFormData.payment_method === 'Parcelado' || editFormData.forma_pagamento === 'Parcelado')) || 
                          (!isEditingMode && (selectedProcedure.payment_method === 'Parcelado' || selectedProcedure.forma_pagamento === 'Parcelado'))) && (
                          <div className="space-y-4">
                            <EditField
                              field="numero_parcelas"
                              label="Total de Parcelas"
                              value={isEditingMode ? (editFormData.numero_parcelas || '') : ((selectedProcedure as any).numero_parcelas || '')}
                              type="number"
                              isEditingMode={isEditingMode}
                              editFormData={editFormData}
                              updateFormField={updateFormField}
                            />
                            
                            {/* Parcelas individuais */}
                            {((isEditingMode && (selectedProcedure?.payment_method === 'Parcelado' || selectedProcedure?.forma_pagamento === 'Parcelado')) || (!isEditingMode && parcelas.length > 0)) && (
                              <div className="space-y-3">
                                <h4 className="text-sm font-medium text-gray-700">Controle de Parcelas</h4>
                                {!isEditingMode && (
                                  <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-200">
                                    💡 Para editar o status das parcelas, clique em "Editar" no cabeçalho do procedimento
                                  </div>
                                )}
                                {/* Debug: mostrar quantidade de parcelas */}
                                <div className="text-xs text-blue-500">
                                  Debug: {isEditingMode ? editFormData.parcelas?.length || 0 : parcelas.length} parcelas carregadas
                                </div>
                                {(isEditingMode ? editFormData.parcelas || [] : parcelas).map((parcela: any, index: number) => (
                                  <div key={parcela.id} className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm font-medium text-gray-700">
                                        Parcela {getParcelaNumero(parcela)}
                                      </span>
                                      <span className="text-sm font-bold text-teal-600">
                                        R$ {getParcelaValor(parcela).toFixed(2).replace('.', ',')}
                                      </span>
              </div>
                                    
                                    <div className="space-y-2">
                                      <label className="flex items-center space-x-2">
                                        <input
                                          type="checkbox"
                                          checked={parcela.recebida}
                                          onChange={(e) => isEditingMode ? updateParcelaEdit(index, 'recebida', e.target.checked) : null}
                                          disabled={!isEditingMode}
                                          className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                        <span className="text-sm text-gray-600">Recebida</span>
                                      </label>
                                      
                                      {parcela.recebida && (
                                        <div className="ml-6">
                                          <label className="block text-xs text-gray-500 mb-1">
                                            Data de recebimento
                                          </label>
                                          <input
                                            type="date"
                                            value={parcela.data_recebimento || ''}
                                            onChange={(e) => isEditingMode ? updateParcelaEdit(index, 'data_recebimento', e.target.value) : null}
                                            disabled={!isEditingMode}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {((isEditingMode && (editFormData.payment_method === 'Parcelado' || editFormData.forma_pagamento === 'Parcelado')) || 
                        (!isEditingMode && (selectedProcedure.payment_method === 'Parcelado' || selectedProcedure.forma_pagamento === 'Parcelado'))) && (
                        <p className="text-xs text-gray-500">
                          {isEditingMode 
                            ? "Informe o total de parcelas e quantas já foram recebidas"
                            : "Controle de parcelas do pagamento"
                          }
                        </p>
                      )}
                    </div>
                  )}

                  {(editFormData.payment_status === 'cancelled' || (!isEditingMode && selectedProcedure.payment_status === 'cancelled')) && (
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-600">
                        Quando o valor for definido, você poderá atualizar o status do pagamento.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Seção de Anexos */}
              {attachments.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Anexos</h3>
                  </div>
                  
                  <div className="space-y-3">
                    {attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <FileText className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{attachment.file_name}</p>
                            <p className="text-xs text-gray-500">
                              {(attachment.file_size / 1024).toFixed(1)} KB • {attachment.file_type}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Abrir arquivo em nova aba
                              window.open(attachment.file_url, '_blank')
                            }}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Ver
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Fazer download do arquivo
                              const link = document.createElement('a')
                              link.href = attachment.file_url
                              link.download = attachment.file_name
                              link.click()
                            }}
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Observações */}
              {selectedProcedure.notes && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-teal-600 mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Observações
                  </h3>
                  <p className="text-gray-700 bg-white p-4 rounded-lg border border-gray-200">{selectedProcedure.notes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end p-6 bg-gray-50 border-t border-gray-200">
              <Button 
                onClick={closeDetailsModal} 
                className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && procedureToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[10000]">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
            {/* Header do Modal */}
            <div className="bg-red-50 border-b border-red-200 p-6 rounded-t-xl">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-red-800">Confirmar Exclusão</h3>
                  <p className="text-red-600 text-sm">Esta ação não pode ser desfeita</p>
                </div>
              </div>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6">
              <div className="mb-4">
                <p className="text-gray-700 mb-2">
                  Tem certeza que deseja excluir o procedimento:
                </p>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
                      <FileText className="w-4 h-4 text-teal-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{procedureToDelete.patient_name}</p>
                      <p className="text-sm text-gray-600">{procedureToDelete.procedure_type}</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(procedureToDelete.procedure_date)} às {procedureToDelete.procedure_time}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>
                  Todos os dados relacionados a este procedimento serão permanentemente removidos.
                </span>
              </div>
            </div>

            {/* Footer do Modal */}
            <div className="bg-gray-50 border-t border-gray-200 p-4 rounded-b-xl">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={cancelDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Excluindo...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Excluir Procedimento</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Filtro por Período */}
      {showDateFilter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
            {/* Header do Modal */}
            <div className="bg-gradient-to-r from-teal-500 to-teal-600 text-white p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Filtrar por Período</h2>
                    <p className="text-teal-100 text-sm">Selecione o período desejado</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDateFilter(false)}
                  className="text-white hover:text-teal-200 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data Inicial
                  </label>
                  <input
                    type="date"
                    value={dateFilter?.start || ''}
                    onChange={(e) => setDateFilter(prev => ({ 
                      start: e.target.value, 
                      end: prev?.end || '' 
                    }))}
                    className="w-full px-3 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data Final
                  </label>
                  <input
                    type="date"
                    value={dateFilter?.end || ''}
                    onChange={(e) => setDateFilter(prev => ({ 
                      start: prev?.start || '', 
                      end: e.target.value 
                    }))}
                    className="w-full px-3 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Footer do Modal */}
            <div className="bg-gray-50 border-t border-gray-200 p-4 rounded-b-xl">
              <div className="flex justify-between space-x-3">
                <button
                  onClick={() => {
                    setDateFilter(null)
                    setShowDateFilter(false)
                  }}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Limpar
                </button>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowDateFilter(false)}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      // Aqui será implementada a lógica de filtro
                      setShowDateFilter(false)
                    }}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    Aplicar Filtro
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button - Mobile */}
      <Link href="/procedimentos/novo">
        <button
          onClick={() => handleButtonPress(undefined, 'medium')}
          className="fixed bottom-6 right-6 z-50 lg:hidden w-14 h-14 bg-teal-600 hover:bg-teal-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 border-0 flex items-center justify-center"
        >
          <Plus className="w-7 h-7 stroke-2" />
        </button>
      </Link>
    </Layout>
  )
}
