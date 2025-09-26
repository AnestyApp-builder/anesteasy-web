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
  Check
} from 'lucide-react'
import { Layout } from '@/components/layout/Layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { procedureService, Procedure } from '@/lib/procedures'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate } from '@/lib/utils'
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
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-600">{label}</label>
          <select
            value={currentValue}
            onChange={(e) => updateFormField(field, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
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
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-600">{label}</label>
        <input
          type={type}
          value={currentValue}
          onChange={(e) => updateFormField(field, e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-gray-600">{label}</label>
      <p className="text-gray-900 font-medium">{editFormData[field] ?? value ?? 'Não informado'}</p>
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
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [procedureToDelete, setProcedureToDelete] = useState<Procedure | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
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
        procedure.procedure_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        procedure.convenio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        procedure.carteirinha?.toLowerCase().includes(searchTerm.toLowerCase())
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
    } catch (error) {
      
    } finally {
      setLoading(false)
    }
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

  const handleProcedureClick = (procedure: Procedure) => {
    setSelectedProcedure(procedure)
    setShowDetailsModal(true)
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
  const startEdit = () => {
    setIsEditingMode(true)
    setEditFormData({ ...selectedProcedure })
  }

  // Inicializar editFormData quando entrar no modo de edição
  useEffect(() => {
    if (isEditingMode && selectedProcedure) {
      setEditFormData(selectedProcedure) // clona os dados originais
    }
  }, [isEditingMode, selectedProcedure])

  const cancelEdit = () => {
    setIsEditingMode(false)
    setEditFormData({})
  }

  const updateFormField = (field: string, newValue: string) => {
    setEditFormData((prev: any) => ({
      ...prev,
      [field]: newValue,
    }))
  }

  const saveEdit = async () => {
    if (!selectedProcedure) return

    setIsSaving(true)
    setFeedbackMessage(null)
    
    try {
      const { id, user_id, created_at, updated_at, ...updateData } = editFormData
      const updatedProcedure = await procedureService.updateProcedure(selectedProcedure.id, updateData)
      
      if (updatedProcedure) {
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
    { value: 'cancelled', label: 'Não Lançado' },
    { value: 'refunded', label: 'Reembolsado' }
  ]



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-teal-100 text-teal-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'faturado':
        return 'bg-blue-100 text-blue-800'
      case 'recebido':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Pago'
      case 'pending':
        return 'Pendente'
      case 'cancelled':
        return 'Não Lançado'
      case 'faturado':
        return 'Faturado'
      case 'recebido':
        return 'Recebido'
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
          <div className="mt-4 sm:mt-0">
            <Link href="/procedimentos/novo">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Novo Procedimento
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <div className="p-6">
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
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? 'bg-teal-50 border-teal-200 text-teal-700' : ''}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filtros
              </Button>
            </div>
            
            {/* Filtros expandidos */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status de Pagamento
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    >
                      <option value="all">Todos os status</option>
                      <option value="pending">Pendente</option>
                      <option value="paid">Pago</option>
                      <option value="cancelled">Não Lançado</option>
                      <option value="pending,not_launched">Pendente + Não Lançado</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setStatusFilter('all')
                        setSearchTerm('')
                      }}
                      className="text-sm"
                    >
                      Limpar Filtros
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>


        {/* Procedures List */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Procedimentos</CardTitle>
          </CardHeader>
          <div className="p-6">
            {loading ? (
              <Loading text="Carregando procedimentos..." />
            ) : (
              <>
                {filteredProcedures.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Nenhum procedimento encontrado</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {searchTerm ? 'Tente ajustar os filtros de busca' : 'Comece criando seu primeiro procedimento'}
                    </p>
                  </div>
                ) : (
              <div className="space-y-4">
                {filteredProcedures.map((procedure) => (
                  <div 
                    key={procedure.id} 
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => handleProcedureClick(procedure)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                        <FileText className="w-6 h-6 text-teal-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{procedure.patient_name}</p>
                        <p className="text-sm text-gray-600">{procedure.procedure_type}</p>
                        <div className="flex items-center space-x-4 mt-1">
                          <div className="flex items-center text-sm text-gray-500">
                            <Calendar className="w-4 h-4 mr-1" />
                            {formatDate(procedure.procedure_date)} às {procedure.procedure_time}
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <User className="w-4 h-4 mr-1" />
                            {user?.name}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="font-medium text-gray-900 flex items-center">
                          <DollarSign className="w-4 h-4 mr-1" />
                          {formatCurrency(procedure.procedure_value)}
                        </p>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(procedure.payment_status || 'pending')}`}>
                          {getStatusText(procedure.payment_status || 'pending')}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          title="Excluir"
                          onClick={() => handleDeleteClick(procedure)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
                )}
              </>
            )}
          </div>
        </Card>
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
            
            <div className="p-6 space-y-8 overflow-y-auto max-h-[calc(90vh-200px)]" style={{ scrollbarWidth: 'thin', scrollbarColor: '#14b8a6 #f1f5f9' }}>
              {/* Informações do Paciente */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-teal-600 mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Informações do Paciente
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EditField
                    field="patient_name"
                    label="Nome"
                    value={selectedProcedure.patient_name || ''}
                    isEditingMode={isEditingMode}
                    editFormData={editFormData}
                    updateFormField={updateFormField}
                  />
                  <EditField
                    field="patient_age"
                    label="Idade"
                    value={selectedProcedure.patient_age ? selectedProcedure.patient_age.toString() : ''}
                    type="number"
                    isEditingMode={isEditingMode}
                    editFormData={editFormData}
                    updateFormField={updateFormField}
                  />
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
                </div>
              </div>

              {/* Informações do Procedimento */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-teal-600 mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Informações do Procedimento
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EditField
                    field="procedure_name"
                    label="Tipo de Procedimento"
                    value={selectedProcedure.procedure_name || ''}
                    isEditingMode={isEditingMode}
                    editFormData={editFormData}
                    updateFormField={updateFormField}
                  />
                  <EditField
                    field="procedure_type"
                    label="Tipo de Anestesia"
                    value={selectedProcedure.procedure_type || ''}
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
                </div>
              </div>

              {/* Informações da Equipe */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-teal-600 mb-4 flex items-center">
                  <Activity className="w-5 h-5 mr-2" />
                  Equipe Médica
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>
              </div>

              {/* Informações Financeiras */}
              <div className="bg-teal-50 rounded-lg p-4 border border-teal-200">
                <h3 className="text-lg font-semibold text-teal-600 mb-4 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Informações Financeiras
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    options={getPaymentStatusOptions()}
                    isEditingMode={isEditingMode}
                    editFormData={editFormData}
                    updateFormField={updateFormField}
                  />
                  <EditField
                    field="payment_method"
                    label="Forma de Pagamento"
                    value={selectedProcedure.payment_method || selectedProcedure.forma_pagamento || ''}
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
              </div>

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
    </Layout>
  )
}
