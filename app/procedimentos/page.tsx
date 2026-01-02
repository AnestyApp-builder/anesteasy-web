'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
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
  MessageSquare,
  Image as ImageIcon,
  Download,
  Banknote,
  Stethoscope,
  Building,
  CheckCircle,
  ArrowLeft
} from 'lucide-react'
import { Layout } from '@/components/layout/Layout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { procedureService, Procedure, Parcela, ProcedureAttachment } from '@/lib/procedures'
import { feedbackService } from '@/lib/feedback'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate, handleButtonPress, handleCardPress } from '@/lib/utils'
import { Loading } from '@/components/ui/Loading'
import { SkeletonProcedureList } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/contexts/ToastContext'
import { useDebounce } from '@/hooks/useDebounce'
import { isImageFile } from '@/lib/mime-utils'
import { supabase } from '@/lib/supabase'

/**
 * Converte data ISO (YYYY-MM-DD) para formato brasileiro (DD/MM/YYYY)
 */
function isoToBrazilian(isoDate: string): string {
  if (!isoDate) return ''
  const [year, month, day] = isoDate.split('-')
  if (year && month && day) {
    return `${day}/${month}/${year}`
  }
  return isoDate
}

/**
 * Formata string numérica para formato brasileiro (DD/MM/YYYY)
 */
function formatBrazilianDate(input: string): string {
  // Remove tudo que não é número
  const cleaned = input.replace(/\D/g, '')
  
  if (cleaned.length === 0) return ''
  if (cleaned.length <= 2) return cleaned
  if (cleaned.length <= 4) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`
  return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`
}

/**
 * Converte data brasileira (DD/MM/YYYY) para formato ISO (YYYY-MM-DD)
 */
function brazilianToIso(brDate: string): string {
  if (!brDate) return ''
  // Remove caracteres não numéricos
  const cleaned = brDate.replace(/\D/g, '')
  
  if (cleaned.length === 0) return ''
  
  // Se já está no formato DD/MM/YYYY, converter para ISO
  if (cleaned.length === 8) {
    const day = cleaned.slice(0, 2)
    const month = cleaned.slice(2, 4)
    const year = cleaned.slice(4, 8)
    
    // Validação básica
    const dayNum = parseInt(day, 10)
    const monthNum = parseInt(month, 10)
    const yearNum = parseInt(year, 10)
    
    if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum >= 1900 && yearNum <= 2100) {
      return `${year}-${month}-${day}`
    }
  }
  
  return ''
}

// Componente de campo editável - Memoizado para evitar re-renders
const EditField = memo(({ 
  field, 
  label, 
  value, 
  type = 'text', 
  options = null,
  isEditingMode,
  editFormData,
  updateFormField,
  customValue
}: {
  field: string
  label: string
  value: string
  type?: 'text' | 'select' | 'date' | 'time' | 'number'
  options?: { value: string; label: string }[] | null
  isEditingMode: boolean
  editFormData: any
  updateFormField: (field: string, value: string) => void
  customValue?: string // Valor customizado para sobrescrever o value (útil para payment_date com parcelas)
}) => {
  const isDateType = type === 'date'
  const initialValue = customValue || editFormData[field] || value
  const [displayValue, setDisplayValue] = useState(
    isDateType && initialValue
      ? isoToBrazilian(initialValue) 
      : (initialValue ?? '')
  )
  const [isFocused, setIsFocused] = useState(false)

  // Atualizar display quando editFormData ou customValue mudar (apenas para dates)
  useEffect(() => {
    if (isDateType) {
      if (!isFocused) {
        const currentValue = customValue || editFormData[field] || value
        setDisplayValue(currentValue ? isoToBrazilian(currentValue) : '')
      }
    } else {
      const newValue = customValue || (editFormData[field] ?? value)
      if (newValue !== displayValue) {
        setDisplayValue(newValue)
      }
    }
  }, [editFormData, field, isDateType, isFocused, customValue, value]) // eslint-disable-line react-hooks/exhaustive-deps

  if (isEditingMode) {
    // Se tiver customValue, usar ele (útil para payment_date com última parcela)
    const currentValue = customValue || (editFormData[field] ?? '')

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

    // Handler para campos de data
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value
      const formatted = formatBrazilianDate(inputValue)
      setDisplayValue(formatted)
      
      const isoValue = brazilianToIso(formatted)
      updateFormField(field, isoValue || '')
    }

    const handleDateBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false)
      const isoValue = brazilianToIso(e.target.value)
      if (isoValue) {
        setDisplayValue(isoToBrazilian(isoValue))
      } else if (e.target.value === '') {
        setDisplayValue('')
      } else {
        setDisplayValue(currentValue ? isoToBrazilian(currentValue) : '')
      }
    }

    const handleDateFocus = () => {
      setIsFocused(true)
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
            type={isDateType ? 'text' : type}
            inputMode={isDateType ? 'numeric' : undefined}
            maxLength={isDateType ? 10 : undefined}
            value={isDateType ? displayValue : currentValue}
            onChange={isDateType ? handleDateChange : (e) => updateFormField(field, e.target.value)}
            onBlur={isDateType ? handleDateBlur : undefined}
            onFocus={isDateType ? handleDateFocus : undefined}
            placeholder={isDateType ? 'DD/MM/AAAA' : undefined}
            className="w-full h-[52px] px-3 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
          />
        )}
      </div>
    )
  }

  // Formatar valor monetário quando necessário
  const formatValue = (val: string, customValue?: string) => {
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
    
    // Se for payment_date e tiver valor customizado (última parcela), usar ele
    if (field === 'payment_date' && customValue) {
      return formatDate(customValue)
    }
    
    // Formatar datas
    if (field === 'payment_date' && val) {
      return formatDate(val)
    }
    
    // Formatar data do procedimento
    if (field === 'procedure_date' && val) {
      return formatDate(val)
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

  // Se for payment_date e tiver parcelas recebidas, usar a última data (modo visualização)
  let finalDisplayValue = customValue || (editFormData[field] ?? value)
  if (field === 'payment_date' && !customValue) {
    // Tentar buscar de editFormData.parcelas primeiro
    if (editFormData.parcelas && Array.isArray(editFormData.parcelas)) {
      const parcelasRecebidas = editFormData.parcelas.filter((p: any) => p.recebida && p.data_recebimento)
      if (parcelasRecebidas.length > 0) {
        // Ordenar por data_recebimento e pegar a mais recente
        const ultimaParcela = parcelasRecebidas.sort((a: any, b: any) => {
          const dateA = new Date(a.data_recebimento).getTime()
          const dateB = new Date(b.data_recebimento).getTime()
          return dateB - dateA
        })[0]
        finalDisplayValue = ultimaParcela.data_recebimento
      }
    }
  }
  
  // Para procedure_date, garantir que o valor completo seja usado (não apenas a parte antes do 'T')
  if (field === 'procedure_date' && !isEditingMode) {
    // Se tiver customValue (valor completo do selectedProcedure), usar ele
    if (customValue) {
      finalDisplayValue = customValue
    } else {
      // Caso contrário, tentar usar editFormData ou value
      const dateValue = editFormData[field] || value
      if (dateValue) {
        finalDisplayValue = dateValue
      }
    }
  }

  return (
    <div className="space-y-2 h-[90px]">
      <label className="text-sm font-medium text-gray-700 block h-5 truncate" title={label}>{label}</label>
      <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm h-[52px] flex items-center">
        <p className="text-gray-900 font-medium truncate">{formatValue(finalDisplayValue)}</p>
      </div>
    </div>
  )
})

EditField.displayName = 'EditField'

function ProcedimentosContent() {
  const router = useRouter()
  const { addToast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 300) // Debounce de 300ms
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
  const [showImageModal, setShowImageModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState<ProcedureAttachment | null>(null)
  const [dateFilter, setDateFilter] = useState<{start: string, end: string} | null>(null)
  const [valueFilter, setValueFilter] = useState<{min: string, max: string} | null>(null)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<string[]>([])
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [frequentSearches, setFrequentSearches] = useState<string[]>([])
  const [feedbackStatuses, setFeedbackStatuses] = useState<Record<string, {linkCriado: boolean, respondido: boolean}>>({})
  const [selectedProcedureFeedback, setSelectedProcedureFeedback] = useState<any>(null)
  const [secretariasVinculadas, setSecretariasVinculadas] = useState<Array<{ id: string; nome: string; email: string }>>([])
  const [loadingAttachments, setLoadingAttachments] = useState<Set<string>>(new Set())
  const [hasAttachments, setHasAttachments] = useState<Record<string, boolean>>({})
  const [showPaymentRegistrationBanner, setShowPaymentRegistrationBanner] = useState(false)
  const [visibleProceduresCount, setVisibleProceduresCount] = useState(10)
  const [deletedProcedure, setDeletedProcedure] = useState<{ procedure: Procedure; index: number } | null>(null)
  const [undoTimeout, setUndoTimeout] = useState<NodeJS.Timeout | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()

  // Carregar buscas frequentes do localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('procedure_frequent_searches')
      if (saved) {
        try {
          setFrequentSearches(JSON.parse(saved))
        } catch (e) {
          console.error('Erro ao carregar buscas frequentes:', e)
        }
      }
    }
  }, [])

  // Salvar busca frequente
  const saveFrequentSearch = (search: string) => {
    if (!search || search.trim().length < 2) return
    
    const trimmed = search.trim().toLowerCase()
    setFrequentSearches(prev => {
      const updated = [trimmed, ...prev.filter(s => s !== trimmed)].slice(0, 10) // Máximo 10 buscas
      if (typeof window !== 'undefined') {
        localStorage.setItem('procedure_frequent_searches', JSON.stringify(updated))
      }
      return updated
    })
  }

  // Gerar sugestões de autocomplete
  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setAutocompleteSuggestions([])
      setShowAutocomplete(false)
      return
    }

    const term = searchTerm.toLowerCase()
    const suggestions = new Set<string>()

    // Buscar em nomes de pacientes
    procedures.forEach(p => {
      if (p.patient_name?.toLowerCase().includes(term)) {
        suggestions.add(p.patient_name)
      }
      if (p.procedure_type?.toLowerCase().includes(term)) {
        suggestions.add(p.procedure_type)
      }
      if (p.procedure_name?.toLowerCase().includes(term) && p.procedure_name !== p.procedure_type) {
        suggestions.add(p.procedure_name)
      }
      if (p.hospital?.toLowerCase().includes(term)) {
        suggestions.add(p.hospital)
      }
    })

    // Adicionar buscas frequentes que correspondem
    frequentSearches.forEach(search => {
      if (search.includes(term) && !suggestions.has(search)) {
        suggestions.add(search)
      }
    })

    setAutocompleteSuggestions(Array.from(suggestions).slice(0, 8))
    setShowAutocomplete(suggestions.size > 0)
  }, [searchTerm, procedures, frequentSearches])

  // Função para limpar todos os filtros
  const clearAllFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setDateFilter(null)
    setValueFilter(null)
    setShowAdvancedFilters(false)
  }

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
        // Converter 'pending,not_launched' para 'pending' (agora inclui cancelled)
        if (statusParam === 'pending,not_launched') {
          setStatusFilter('pending')
          // Mostrar banner informativo quando vier do botão "Registrar Pagamento"
          setShowPaymentRegistrationBanner(true)
          // Remover banner após 5 segundos
          setTimeout(() => setShowPaymentRegistrationBanner(false), 5000)
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

    // Filtro por busca (usando debouncedSearchTerm para evitar re-renders excessivos)
    if (debouncedSearchTerm) {
      filtered = filtered.filter(procedure =>
        procedure.patient_name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        procedure.procedure_type?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        procedure.procedure_name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        procedure.hospital?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        procedure.nome_cirurgiao?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      )
      
      // Salvar busca frequente
      if (debouncedSearchTerm.length >= 2) {
        saveFrequentSearch(debouncedSearchTerm)
      }
    }

    // Filtro por status
    if (statusFilter !== 'all') {
      if (statusFilter === 'pending') {
        // Filtrar por pendente (inclui cancelled, que agora é tratado como pendente)
        filtered = filtered.filter(procedure => 
          procedure.payment_status === 'pending' || procedure.payment_status === 'cancelled'
        )
      } else {
        filtered = filtered.filter(procedure => procedure.payment_status === statusFilter)
      }
    }

    // Filtro por data
    if (dateFilter?.start || dateFilter?.end) {
      filtered = filtered.filter(procedure => {
        if (!procedure.procedure_date) return false
        const procDate = new Date(procedure.procedure_date)
        
        if (dateFilter.start && procDate < new Date(dateFilter.start)) return false
        if (dateFilter.end) {
          const endDate = new Date(dateFilter.end)
          endDate.setHours(23, 59, 59, 999) // Incluir o dia inteiro
          if (procDate > endDate) return false
        }
        return true
      })
    }

    // Filtro por valor
    if (valueFilter?.min || valueFilter?.max) {
      filtered = filtered.filter(procedure => {
        if (!procedure.procedure_value) return false
        const value = Number(procedure.procedure_value)
        
        if (valueFilter.min && value < Number(valueFilter.min)) return false
        if (valueFilter.max && value > Number(valueFilter.max)) return false
        return true
      })
    }

    setFilteredProcedures(filtered)
    // Resetar contador de procedimentos visíveis quando filtros mudarem
    setVisibleProceduresCount(10)
  }, [debouncedSearchTerm, statusFilter, dateFilter, valueFilter, procedures])

  const loadProcedures = async () => {
    if (!user?.id) return
    
    setLoading(true)
    try {
      const data = await procedureService.getProcedures(user.id)
      setProcedures(data)
      
      // OTIMIZAÇÃO: Lazy loading - não carregar anexos automaticamente
      // Os anexos serão carregados apenas quando o usuário expandir um procedimento
      const attachmentsMap: Record<string, ProcedureAttachment[]> = {}
      
      // OTIMIZAÇÃO: Batch queries para status de feedback e contagem de anexos
      // Buscar status de feedback e contagem de anexos para todos os procedimentos de uma vez
      const procedureIds = data.map(p => p.id)
      const feedbackStatusesMap: Record<string, {linkCriado: boolean, respondido: boolean}> = {}
      const hasAttachmentsMap: Record<string, boolean> = {}
      
      if (procedureIds.length > 0) {
        // Buscar todos os feedbacks de uma vez
        const { data: feedbackLinks } = await supabase
          .from('feedback_links')
          .select('procedure_id, responded_at')
          .in('procedure_id', procedureIds)
        
        // Buscar contagem de anexos (apenas verificar se existem, não carregar todos)
        const { data: attachmentsCount } = await supabase
          .from('procedure_attachments')
          .select('procedure_id')
          .in('procedure_id', procedureIds)
        
        // Processar resultados
        procedureIds.forEach(procedureId => {
          const feedbackLink = feedbackLinks?.find(fl => fl.procedure_id === procedureId)
          feedbackStatusesMap[procedureId] = {
            linkCriado: !!feedbackLink,
            respondido: !!feedbackLink?.responded_at
          }
          
          // Verificar se tem anexos (sem carregar os anexos)
          hasAttachmentsMap[procedureId] = !!attachmentsCount?.find(ac => ac.procedure_id === procedureId)
        })
      }
      
      setProcedureAttachments(attachmentsMap)
      setFeedbackStatuses(feedbackStatusesMap)
      
      // Salvar informações sobre quais procedimentos têm anexos (para mostrar ícone)
      setHasAttachments(hasAttachmentsMap)
    } catch (error) {
      
    } finally {
      setLoading(false)
    }
  }

  // Função para carregar anexos sob demanda (lazy loading)
  const loadAttachmentsForProcedure = async (procedureId: string) => {
    // Verificar se já está carregado
    if (procedureAttachments[procedureId]) {
      return procedureAttachments[procedureId]
    }

    // Verificar se já está carregando
    if (loadingAttachments.has(procedureId)) {
      return []
    }

    try {
      setLoadingAttachments(prev => new Set(prev).add(procedureId))
      const attachments = await procedureService.getAttachments(procedureId)
      setProcedureAttachments(prev => ({
        ...prev,
        [procedureId]: attachments
      }))
      return attachments
    } catch (error) {
      console.error('Erro ao carregar anexos:', error)
      return []
    } finally {
      setLoadingAttachments(prev => {
        const next = new Set(prev)
        next.delete(procedureId)
        return next
      })
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
      // Encontrar o índice do procedimento antes de remover
      const procedureIndex = procedures.findIndex(p => p.id === procedureToDelete.id)
      
      const success = await procedureService.deleteProcedure(procedureToDelete.id)
      if (success) {
        // Remover da lista
        const updatedProcedures = procedures.filter(p => p.id !== procedureToDelete.id)
        const updatedFiltered = filteredProcedures.filter(p => p.id !== procedureToDelete.id)
        
        setProcedures(updatedProcedures)
        setFilteredProcedures(updatedFiltered)
        setShowDeleteModal(false)
        
        // Guardar dados para possível undo
        setDeletedProcedure({
          procedure: procedureToDelete,
          index: procedureIndex
        })
        setProcedureToDelete(null)
        
        // Fechar modal de detalhes se estiver aberto
        if (showDetailsModal && selectedProcedure?.id === procedureToDelete.id) {
          closeDetailsModal()
        }
        
        // Configurar timeout para realmente excluir após 10 segundos
        const timeout = setTimeout(() => {
          setDeletedProcedure(null)
        }, 10000) // 10 segundos para desfazer
        setUndoTimeout(timeout)
        
        // Feedback de sucesso com opção de desfazer
        addToast({
          title: 'Procedimento excluído',
          description: 'O procedimento foi excluído. Você tem 10 segundos para desfazer.',
          variant: 'success',
          duration: 10000
        })
      } else {
        addToast({
          title: 'Erro ao excluir',
          description: 'Não foi possível excluir o procedimento. Tente novamente.',
          variant: 'error'
        })
      }
    } catch (error) {
      
      addToast({
        title: 'Erro de conexão',
        description: 'Não foi possível excluir o procedimento. Verifique sua conexão com a internet.',
        variant: 'error'
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleUndoDelete = async () => {
    if (!deletedProcedure) return

    try {
      // Restaurar o procedimento na lista
      const restoredProcedures = [...procedures]
      restoredProcedures.splice(deletedProcedure.index, 0, deletedProcedure.procedure)
      
      setProcedures(restoredProcedures)
      
      // Reaplicar filtros
      let restoredFiltered = restoredProcedures
      if (debouncedSearchTerm) {
        restoredFiltered = restoredFiltered.filter(procedure =>
          procedure.patient_name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          procedure.procedure_type?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          procedure.procedure_name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
        )
      }
      if (statusFilter !== 'all') {
        if (statusFilter === 'pending') {
          restoredFiltered = restoredFiltered.filter(procedure => 
            procedure.payment_status === 'pending' || procedure.payment_status === 'cancelled'
          )
        } else {
          restoredFiltered = restoredFiltered.filter(procedure => procedure.payment_status === statusFilter)
        }
      }
      setFilteredProcedures(restoredFiltered)

      // Cancelar timeout
      if (undoTimeout) {
        clearTimeout(undoTimeout)
        setUndoTimeout(null)
      }

      setDeletedProcedure(null)
      
      addToast({
        title: 'Exclusão desfeita',
        description: 'O procedimento foi restaurado com sucesso.',
        variant: 'success'
      })
    } catch (error) {
      addToast({
        title: 'Erro ao desfazer',
        description: 'Não foi possível restaurar o procedimento.',
        variant: 'error'
      })
    }
  }

  // Limpar timeout ao desmontar
  useEffect(() => {
    return () => {
      if (undoTimeout) {
        clearTimeout(undoTimeout)
      }
    }
  }, [undoTimeout])

  const handleOpenImageModal = (attachment: ProcedureAttachment) => {
    setSelectedImage(attachment)
    setShowImageModal(true)
  }

  const handleCloseImageModal = () => {
    setShowImageModal(false)
    setSelectedImage(null)
  }

  const cancelDelete = () => {
    setShowDeleteModal(false)
    setProcedureToDelete(null)
  }

  const handleProcedureClick = async (procedure: Procedure) => {
    // Buscar o procedimento completo com secretaria_id do banco
    const fullProcedure = await procedureService.getProcedureById(procedure.id)
    const procedureWithSecretaria = fullProcedure || procedure
    
    setSelectedProcedure(procedureWithSecretaria as Procedure)
    setShowDetailsModal(true)
    
    // Carregar parcelas se o procedimento for parcelado
    if (procedure.payment_method === 'Parcelado' || procedure.forma_pagamento === 'Parcelado') {
      const parcelasData = await procedureService.getParcelas(procedure.id)
      setParcelas(parcelasData)
    } else {
      setParcelas([])
    }

    // OTIMIZAÇÃO: Carregar anexos apenas quando o modal for aberto (lazy loading)
    // Verificar se já estão em cache, senão carregar
    if (procedureAttachments[procedure.id]) {
      setAttachments(procedureAttachments[procedure.id])
    } else {
      // Carregar anexos sob demanda
      const attachmentsData = await loadAttachmentsForProcedure(procedure.id)
      setAttachments(attachmentsData)
    }

    // Carregar dados do feedback se o procedimento tiver feedback solicitado
    // Sempre tentar carregar, mesmo que feedback_solicitado seja false, para verificar se há resposta
    try {
      const feedbackData = await feedbackService.getFeedbackByProcedureId(procedureWithSecretaria.id)
      setSelectedProcedureFeedback(feedbackData)
    } catch (error) {
      setSelectedProcedureFeedback(null)
    }

    // Carregar secretárias vinculadas ao anestesista
    if (user?.id) {
      try {
        const { data, error } = await supabase
          .from('anestesista_secretaria')
          .select(`
            secretarias (
              id,
              nome,
              email
            )
          `)
          .eq('anestesista_id', user.id)

        if (error) {
          setSecretariasVinculadas([])
        } else {
          const secretarias = (data || [])
            .map(item => item.secretarias)
            .filter(Boolean) as Array<{ id: string; nome: string; email: string }>
          setSecretariasVinculadas(secretarias)
        }
      } catch (error) {
        setSecretariasVinculadas([])
      }
    }
  }

  const closeDetailsModal = () => {
    setShowDetailsModal(false)
    setSelectedProcedure(null)
    setIsEditingMode(false)
    setEditFormData({})
    setFeedbackMessage(null)
    setSelectedProcedureFeedback(null)
  }


  // ===== NOVO SISTEMA DE EDIÇÃO - DO ZERO =====
  
  // Funções de edição
  const startEdit = async () => {
    setIsEditingMode(true)
    const secretariaId = (selectedProcedure as any).secretaria_id || null
    
    setEditFormData({
      ...selectedProcedure,
      secretaria_id: secretariaId || ''
    })
    
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
      const secretariaId = (selectedProcedure as any).secretaria_id || null
      
      setEditFormData({
        ...selectedProcedure,
        secretaria_id: secretariaId || ''
      }) // clona os dados originais
      
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
      
      // Garantir que secretaria_id seja null se estiver vazio
      if (updateData.secretaria_id !== undefined) {
        updateData.secretaria_id = updateData.secretaria_id && updateData.secretaria_id.trim() !== '' 
          ? updateData.secretaria_id 
          : null
      }
      
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

  // Calcular métricas dos procedimentos
  const metrics = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const total = procedures.length
    
    const monthlyCount = procedures.filter(proc => {
      if (!proc.created_at) return false
      const procDate = new Date(proc.created_at)
      return procDate.getMonth() === currentMonth && procDate.getFullYear() === currentYear
    }).length

    const paidCount = procedures.filter(proc => proc.payment_status === 'paid').length
    
    const pendingCount = procedures.filter(proc => 
      proc.payment_status === 'pending' || proc.payment_status === 'cancelled'
    ).length

    return {
      total,
      monthly: monthlyCount,
      paid: paidCount,
      pending: pendingCount
    }
  }, [procedures])

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

        {/* Métricas */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
          {/* Mobile: Grid 2x2 */}
          <div className="grid grid-cols-2 gap-3 sm:hidden">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-teal-50 flex items-center justify-center">
                <FileText className="w-3.5 h-3.5 text-teal-600" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total</span>
                <span className="text-base font-bold text-gray-900">{metrics.total}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-blue-50 flex items-center justify-center">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Este mês</span>
                <span className="text-base font-bold text-gray-900">{metrics.monthly}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-green-50 flex items-center justify-center">
                <DollarSign className="w-3.5 h-3.5 text-green-600" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pagos</span>
                <span className="text-base font-bold text-green-600">{metrics.paid}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-amber-50 flex items-center justify-center">
                <Activity className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pendentes</span>
                <span className="text-base font-bold text-amber-600">{metrics.pending}</span>
              </div>
            </div>
          </div>

          {/* Desktop: Flex Horizontal */}
          <div className="hidden sm:flex items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-teal-50 flex items-center justify-center">
                <FileText className="w-3.5 h-3.5 text-teal-600" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total</span>
                <span className="text-base font-bold text-gray-900">{metrics.total}</span>
              </div>
            </div>
            
            <div className="w-px h-6 bg-gray-300"></div>
            
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-blue-50 flex items-center justify-center">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Este mês</span>
                <span className="text-base font-bold text-gray-900">{metrics.monthly}</span>
              </div>
            </div>
            
            <div className="w-px h-6 bg-gray-300"></div>
            
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-green-50 flex items-center justify-center">
                <DollarSign className="w-3.5 h-3.5 text-green-600" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pagos</span>
                <span className="text-base font-bold text-green-600">{metrics.paid}</span>
              </div>
            </div>
            
            <div className="w-px h-6 bg-gray-300"></div>
            
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-amber-50 flex items-center justify-center">
                <Activity className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pendentes</span>
                <span className="text-base font-bold text-amber-600">{metrics.pending}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Banner informativo para registro de pagamento */}
        {showPaymentRegistrationBanner && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Banknote className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="text-sm font-semibold text-emerald-900">
                  Registro de Pagamento
                </p>
                <p className="text-xs text-emerald-700 mt-1">
                  Procedimentos pendentes estão sendo exibidos. Clique em um procedimento para registrar o pagamento.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowPaymentRegistrationBanner(false)}
              className="text-emerald-600 hover:text-emerald-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Search with Autocomplete */}
        <div className="lg:hidden">
          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Input
                  ref={searchInputRef}
                  placeholder="Buscar por nome, procedimento..."
                  icon={<Search className="w-4 h-4" />}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setShowAutocomplete(true)
                  }}
                  onFocus={() => {
                    if (autocompleteSuggestions.length > 0 || frequentSearches.length > 0) {
                      setShowAutocomplete(true)
                    }
                  }}
                  onBlur={() => {
                    // Delay para permitir clique nas sugestões
                    setTimeout(() => setShowAutocomplete(false), 200)
                  }}
                  className="text-base"
                />
                {/* Autocomplete Dropdown */}
                {(showAutocomplete && (autocompleteSuggestions.length > 0 || (frequentSearches.length > 0 && !searchTerm))) && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {!searchTerm && frequentSearches.length > 0 && (
                      <div className="p-2 border-b border-gray-200">
                        <p className="text-xs font-medium text-gray-500 px-2 py-1">Buscas frequentes</p>
                        {frequentSearches.slice(0, 5).map((search, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setSearchTerm(search)
                              setShowAutocomplete(false)
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded text-sm flex items-center gap-2"
                          >
                            <Search className="w-3 h-3 text-gray-400" />
                            {search}
                          </button>
                        ))}
                      </div>
                    )}
                    {autocompleteSuggestions.length > 0 && (
                      <div className="p-2">
                        {autocompleteSuggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setSearchTerm(suggestion)
                              setShowAutocomplete(false)
                              searchInputRef.current?.blur()
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-teal-50 rounded text-sm"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <Button 
                variant="ghost" 
                onClick={() => handleButtonPress(() => setShowAdvancedFilters(true), 'light')}
                title="Filtros avançados"
              >
                <Filter className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Desktop Search with Autocomplete */}
        <Card className="hidden lg:block">
          <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Input
                  ref={searchInputRef}
                  placeholder="Buscar por nome, procedimento, hospital, cirurgião..."
                  icon={<Search className="w-5 h-5" />}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setShowAutocomplete(true)
                  }}
                  onFocus={() => {
                    if (autocompleteSuggestions.length > 0 || frequentSearches.length > 0) {
                      setShowAutocomplete(true)
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowAutocomplete(false), 200)
                  }}
                />
                {/* Autocomplete Dropdown */}
                {(showAutocomplete && (autocompleteSuggestions.length > 0 || (frequentSearches.length > 0 && !searchTerm))) && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {!searchTerm && frequentSearches.length > 0 && (
                      <div className="p-2 border-b border-gray-200">
                        <p className="text-xs font-medium text-gray-500 px-2 py-1">Buscas frequentes</p>
                        {frequentSearches.slice(0, 5).map((search, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setSearchTerm(search)
                              setShowAutocomplete(false)
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded text-sm flex items-center gap-2"
                          >
                            <Search className="w-3 h-3 text-gray-400" />
                            {search}
                          </button>
                        ))}
                      </div>
                    )}
                    {autocompleteSuggestions.length > 0 && (
                      <div className="p-2">
                        {autocompleteSuggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setSearchTerm(suggestion)
                              setShowAutocomplete(false)
                              searchInputRef.current?.blur()
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-teal-50 rounded text-sm"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <Button 
                variant="outline" 
                onClick={() => handleButtonPress(() => setShowAdvancedFilters(true), 'light')}
                className="flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                <span>Filtros Avançados</span>
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
          </div>
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
              <SkeletonProcedureList count={5} />
          ) : filteredProcedures.length === 0 ? (
                  <EmptyState
                    icon={FileText}
                    title={debouncedSearchTerm ? 'Nenhum procedimento encontrado' : 'Nenhum procedimento ainda'}
                    description={debouncedSearchTerm ? 'Tente ajustar os filtros de busca ou limpar a pesquisa.' : 'Comece criando seu primeiro procedimento para organizar seus atendimentos.'}
                    action={debouncedSearchTerm ? undefined : {
                      label: 'Criar Procedimento',
                      onClick: () => router.push('/procedimentos/novo'),
                      variant: 'primary'
                    }}
                  />
                ) : (
            <div className="space-y-3">
                {filteredProcedures.slice(0, visibleProceduresCount).map((procedure, index) => (
                  <motion.div
                    key={procedure.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, delay: index * 0.03 }}
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
                              <p className="font-semibold text-gray-900 text-base truncate">{procedure.patient_name}</p>
                              {(hasAttachments[procedure.id] || (procedureAttachments[procedure.id] && procedureAttachments[procedure.id].length > 0)) && (
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
                          {procedure.procedure_date ? formatDate(procedure.procedure_date) : 'Data não informada'}
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
                            {(hasAttachments[procedure.id] || (procedureAttachments[procedure.id] && procedureAttachments[procedure.id].length > 0)) && (
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
                          {procedure.procedure_date 
                            ? `${formatDate(procedure.procedure_date)}${procedure.procedure_time ? ` às ${procedure.procedure_time}` : ''}`
                            : 'Data não informada'}
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
                  </motion.div>
                ))}
                {filteredProcedures.length > visibleProceduresCount && (
                  <div className="flex justify-center pt-4 pb-2">
                    <Button
                      onClick={() => setVisibleProceduresCount(prev => prev + 10)}
                      variant="outline"
                      className="w-full sm:w-auto px-6 py-3 text-base font-medium hover:bg-teal-50 hover:border-teal-300 transition-colors"
                    >
                      Ver mais {Math.min(10, filteredProcedures.length - visibleProceduresCount)} procedimentos
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
      </div>

      {/* Modal de Detalhes do Procedimento */}
      {showDetailsModal && selectedProcedure && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Header do Modal */}
            <div className="modal-header bg-gradient-to-r from-teal-500 to-teal-600 text-white p-4 sm:p-6 rounded-t-xl">
              <div className="flex items-center justify-between gap-2 sm:gap-3">
                <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg md:text-xl font-bold text-white break-words truncate">Detalhes do Procedimento</h2>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!isEditingMode ? (
                    <>
                      <button
                        onClick={startEdit}
                        className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors select-none flex-shrink-0"
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
                        className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors select-none flex-shrink-0"
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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={saveEdit}
                        disabled={isSaving}
                        className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors select-none flex-shrink-0"
                        style={{
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                          MozUserSelect: 'none',
                          msUserSelect: 'none',
                          outline: 'none',
                          border: 'none',
                          boxShadow: 'none'
                        }}
                        title={isSaving ? 'Salvando...' : 'Salvar'}
                      >
                        {isSaving ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={cancelEdit}
                        disabled={isSaving}
                        className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-lg transition-colors select-none flex-shrink-0"
                        style={{
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                          MozUserSelect: 'none',
                          msUserSelect: 'none',
                          outline: 'none',
                          border: 'none',
                          boxShadow: 'none'
                        }}
                        title="Cancelar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
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
                    customValue={!isEditingMode && selectedProcedure.procedure_date ? selectedProcedure.procedure_date : undefined}
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

              {/* Feedback do Cirurgião - Seção Unificada */}
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-6 shadow-sm border border-purple-200">
                <h3 className="text-xl font-bold text-purple-800 mb-5 flex items-center">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                    <MessageSquare className="w-5 h-5 text-purple-600" />
                  </div>
                  Feedback do Cirurgião
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

                {/* Seção de Respostas do Feedback */}
                {(selectedProcedure.feedback_solicitado || selectedProcedureFeedback) && (
                  <div className="mt-6 pt-6 border-t border-purple-200">
                    <h4 className="text-lg font-semibold text-purple-800 mb-4 flex items-center">
                      <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center mr-2">
                        <MessageSquare className="w-4 h-4 text-purple-600" />
                      </div>
                      Respostas do Cirurgião
                    </h4>
                    
                    {selectedProcedureFeedback ? (
                      <div className="bg-white rounded-lg p-4 border border-purple-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-700">Náuseas ou Vômitos?</p>
                            <p className={`text-sm font-semibold ${selectedProcedureFeedback.nauseaVomito === 'Sim' ? 'text-red-600' : 'text-green-600'}`}>
                              {selectedProcedureFeedback.nauseaVomito}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-700">Cefaleia?</p>
                            <p className={`text-sm font-semibold ${selectedProcedureFeedback.cefaleia === 'Sim' ? 'text-red-600' : 'text-green-600'}`}>
                              {selectedProcedureFeedback.cefaleia}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-700">Dor Lombar?</p>
                            <p className={`text-sm font-semibold ${selectedProcedureFeedback.dorLombar === 'Sim' ? 'text-red-600' : 'text-green-600'}`}>
                              {selectedProcedureFeedback.dorLombar}
                            </p>
                          </div>
                        </div>
                        {selectedProcedureFeedback.respondidoEm && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="text-xs text-gray-500">
                              Respondido em: {new Date(selectedProcedureFeedback.respondidoEm).toLocaleDateString('pt-BR')} às {new Date(selectedProcedureFeedback.respondidoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center mr-3">
                            <MessageSquare className="w-4 h-4 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-amber-800 font-medium">Formulário ainda não respondido</p>
                            <p className="text-amber-600 text-sm">O cirurgião ainda não preencheu o formulário de feedback</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
                        { value: 'Raquianestesia', label: 'Raquianestesia' },
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
                          customValue={(() => {
                            // Se for parcelado, buscar a última parcela recebida
                            const isParcelado = selectedProcedure.payment_method === 'Parcelado' || selectedProcedure.forma_pagamento === 'Parcelado'
                            if (isParcelado && parcelas && parcelas.length > 0) {
                              const parcelasRecebidas = parcelas.filter((p: any) => p.recebida && p.data_recebimento)
                              if (parcelasRecebidas.length > 0) {
                                // Ordenar por data_recebimento e pegar a mais recente
                                const ultimaParcela = parcelasRecebidas.sort((a: any, b: any) => {
                                  const dateA = new Date(a.data_recebimento).getTime()
                                  const dateB = new Date(b.data_recebimento).getTime()
                                  return dateB - dateA
                                })[0]
                                return ultimaParcela.data_recebimento.split('T')[0]
                              }
                            }
                            return undefined
                          })()}
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
                      <Paperclip className="w-4 h-4 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Anexos ({attachments.length})</h3>
                  </div>
                  
                  <div className="space-y-4">
                    {attachments.map((attachment) => {
                      const isImage = isImageFile(attachment.file_name) || attachment.file_type.startsWith('image/')
                      
                      return (
                        <div key={attachment.id} className="border border-gray-200 rounded-lg bg-gray-50 overflow-hidden">
                          {isImage ? (
                            // Exibição para imagens
                            <div className="p-4">
                              <div className="flex items-start space-x-4">
                                {/* Preview da imagem */}
                                <div className="flex-shrink-0">
                                  <div 
                                    className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => handleOpenImageModal(attachment)}
                                  >
                                    <img
                                      src={attachment.file_url}
                                      alt={attachment.file_name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        // Fallback se a imagem não carregar
                                        const target = e.target as HTMLImageElement
                                        target.style.display = 'none'
                                        const parent = target.parentElement
                                        if (parent) {
                                          parent.innerHTML = '<div class="w-full h-full flex items-center justify-center"><ImageIcon class="w-8 h-8 text-gray-400" /></div>'
                                        }
                                      }}
                                    />
                                  </div>
                                </div>
                                
                                {/* Informações do arquivo */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <ImageIcon className="w-4 h-4 text-green-600" />
                                    <p className="text-sm font-medium text-gray-900 truncate">{attachment.file_name}</p>
                                  </div>
                                  <p className="text-xs text-gray-500 mb-3">
                                    {(attachment.file_size / 1024).toFixed(1)} KB • {attachment.file_type}
                                  </p>
                                  
                                  {/* Botões de ação */}
                                  <div className="flex items-center space-x-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleOpenImageModal(attachment)}
                                      className="text-green-600 border-green-200 hover:bg-green-50"
                                    >
                                      <Eye className="w-4 h-4 mr-1" />
                                      Visualizar
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        // Abrir imagem em nova aba
                                        window.open(attachment.file_url, '_blank')
                                      }}
                                    >
                                      <ImageIcon className="w-4 h-4 mr-1" />
                                      Abrir
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        // Fazer download da imagem
                                        const link = document.createElement('a')
                                        link.href = attachment.file_url
                                        link.download = attachment.file_name
                                        link.click()
                                      }}
                                    >
                                      <Download className="w-4 h-4 mr-1" />
                                      Download
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            // Exibição para outros arquivos
                            <div className="p-4">
                              <div className="flex items-center justify-between">
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
                                    <Download className="w-4 h-4 mr-1" />
                                    Download
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-[10000] overflow-y-auto">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl my-4 max-h-[95vh] flex flex-col">
            {/* Header do Modal */}
            <div className="bg-gradient-to-r from-red-50 to-red-100 border-b border-red-200 p-4 sm:p-6 rounded-t-xl flex-shrink-0">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl font-bold text-red-900 break-words">Confirmar Exclusão</h3>
                  <p className="text-red-700 text-xs sm:text-sm mt-1 break-words">Tem certeza que deseja excluir este procedimento?</p>
                </div>
              </div>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-4">
                <div className="space-y-2 text-sm sm:text-base">
                  <div>
                    <span className="text-gray-500">Paciente:</span>{' '}
                    <span className="font-semibold text-gray-900 break-words">
                      {procedureToDelete.patient_name || 'Não informado'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Procedimento:</span>{' '}
                    <span className="font-semibold text-gray-900 break-words">
                      {procedureToDelete.procedure_type || 'Não informado'}
                    </span>
                  </div>
                  {procedureToDelete.procedure_date && (
                    <div>
                      <span className="text-gray-500">Data:</span>{' '}
                      <span className="font-semibold text-gray-900">
                        {formatDate(procedureToDelete.procedure_date)}
                        {procedureToDelete.procedure_time && ` às ${procedureToDelete.procedure_time}`}
                      </span>
                    </div>
                  )}
                  {procedureToDelete.procedure_value && (
                    <div>
                      <span className="text-gray-500">Valor:</span>{' '}
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(procedureToDelete.procedure_value)}
                        {procedureToDelete.payment_status && ` (${getStatusText(procedureToDelete.payment_status)})`}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-red-50 border-l-4 border-red-500 p-3 sm:p-4 rounded-r-lg">
                <p className="text-sm sm:text-base text-red-700 break-words">
                  Esta ação não pode ser desfeita. Todos os dados relacionados serão permanentemente excluídos.
                </p>
              </div>
            </div>

            {/* Footer do Modal */}
            <div className="bg-gray-50 border-t border-gray-200 p-4 sm:p-6 rounded-b-xl flex-shrink-0">
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                <button
                  onClick={cancelDelete}
                  disabled={isDeleting}
                  className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-base text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-base bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2 font-medium shadow-sm"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Excluindo...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Excluir</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notificação de Undo */}
      {deletedProcedure && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-[10001] animate-in slide-in-from-bottom-5">
          <div className="bg-white rounded-lg shadow-2xl border-2 border-green-200 p-4">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">Procedimento excluído</p>
                <p className="text-sm text-gray-600 mt-1">
                  <span className="font-medium">{deletedProcedure.procedure.patient_name}</span> foi removido da lista.
                </p>
                <button
                  onClick={handleUndoDelete}
                  className="mt-3 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium inline-flex items-center space-x-2"
                >
                  <ArrowLeft className="w-4 h-4 rotate-90" />
                  <span>Desfazer Exclusão</span>
                </button>
              </div>
              <button
                onClick={() => {
                  if (undoTimeout) clearTimeout(undoTimeout)
                  setDeletedProcedure(null)
                  setUndoTimeout(null)
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Filtros Avançados */}
      {showAdvancedFilters && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header do Modal */}
            <div className="bg-gradient-to-r from-teal-500 to-teal-600 text-white p-6 rounded-t-xl sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <Filter className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Filtros Avançados</h2>
                    <p className="text-teal-100 text-sm">Configure múltiplos filtros para refinar sua busca</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAdvancedFilters(false)}
                  className="text-white hover:text-teal-200 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6 space-y-6">
              {/* Filtro por Status */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Status de Pagamento
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['all', 'pending', 'paid'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        statusFilter === status
                          ? status === 'all' 
                            ? 'bg-teal-600 text-white shadow-md'
                            : status === 'pending'
                            ? 'bg-amber-500 text-white shadow-md'
                            : 'bg-green-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {status === 'all' ? 'Todos' : status === 'pending' ? 'Pendente' : 'Pago'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filtro por Data */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Período (Data do Procedimento)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Data Inicial
                    </label>
                    <input
                      type="date"
                      value={dateFilter?.start || ''}
                      onChange={(e) => setDateFilter(prev => ({ 
                        start: e.target.value, 
                        end: prev?.end || '' 
                      }))}
                      className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Data Final
                    </label>
                    <input
                      type="date"
                      value={dateFilter?.end || ''}
                      onChange={(e) => setDateFilter(prev => ({ 
                        start: prev?.start || '', 
                        end: e.target.value 
                      }))}
                      className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Filtro por Valor */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Valor do Procedimento
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Valor Mínimo (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={valueFilter?.min || ''}
                      onChange={(e) => setValueFilter(prev => ({ 
                        min: e.target.value, 
                        max: prev?.max || '' 
                      }))}
                      className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Valor Máximo (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Sem limite"
                      value={valueFilter?.max || ''}
                      onChange={(e) => setValueFilter(prev => ({ 
                        min: prev?.min || '', 
                        max: e.target.value 
                      }))}
                      className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Resumo de Filtros Ativos */}
              {(dateFilter?.start || dateFilter?.end || valueFilter?.min || valueFilter?.max || statusFilter !== 'all') && (
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-teal-900 mb-2">Filtros ativos:</p>
                  <div className="flex flex-wrap gap-2">
                    {statusFilter !== 'all' && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                        Status: {statusFilter === 'pending' ? 'Pendente' : 'Pago'}
                      </span>
                    )}
                    {dateFilter?.start && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                        De: {formatDate(dateFilter.start)}
                      </span>
                    )}
                    {dateFilter?.end && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                        Até: {formatDate(dateFilter.end)}
                      </span>
                    )}
                    {valueFilter?.min && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                        Mín: {formatCurrency(Number(valueFilter.min))}
                      </span>
                    )}
                    {valueFilter?.max && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                        Máx: {formatCurrency(Number(valueFilter.max))}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer do Modal */}
            <div className="bg-gray-50 border-t border-gray-200 p-4 rounded-b-xl sticky bottom-0">
              <div className="flex flex-col sm:flex-row justify-between gap-3">
                <button
                  onClick={clearAllFilters}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Limpar Todos os Filtros
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAdvancedFilters(false)}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Fechar
                  </button>
                  <button
                    onClick={() => setShowAdvancedFilters(false)}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
                  >
                    Aplicar Filtros
                  </button>
                </div>
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

      {/* Modal de Visualização de Imagem */}
      {showImageModal && selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-[10001]">
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            {/* Botão de fechar */}
            <button
              onClick={handleCloseImageModal}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-black bg-opacity-50 text-white rounded-full flex items-center justify-center hover:bg-opacity-70 transition-all"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Imagem */}
            <div className="bg-white rounded-lg overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <ImageIcon className="w-5 h-5 text-green-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedImage.file_name}</h3>
                    <p className="text-sm text-gray-500">
                      {(selectedImage.file_size / 1024).toFixed(1)} KB • {selectedImage.file_type}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-4">
                <div className="flex justify-center">
                  <img
                    src={selectedImage.file_url}
                    alt={selectedImage.file_name}
                    className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      const parent = target.parentElement
                      if (parent) {
                        parent.innerHTML = `
                          <div class="w-full h-64 flex flex-col items-center justify-center text-gray-500 bg-gray-100 rounded-lg">
                            <ImageIcon class="w-16 h-16 mb-4" />
                            <p class="text-lg font-medium">Erro ao carregar imagem</p>
                            <p class="text-sm">A imagem não pôde ser exibida</p>
                          </div>
                        `
                      }
                    }}
                  />
                </div>
              </div>

              {/* Botões de ação */}
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <div className="flex justify-center space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      window.open(selectedImage.file_url, '_blank')
                    }}
                    className="flex items-center space-x-2"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>Abrir em Nova Aba</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const link = document.createElement('a')
                      link.href = selectedImage.file_url
                      link.download = selectedImage.file_name
                      link.click()
                    }}
                    className="flex items-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </Button>
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

export default function Procedimentos() {
  return (
    <ProtectedRoute>
      <ProcedimentosContent />
    </ProtectedRoute>
  )
}
