'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  DollarSign, 
  Search,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Calendar,
  User as UserIcon,
  ShieldCheck,
  Send,
  Image as ImageIcon,
  FileText as FileIcon,
  Download
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatCurrency } from '@/lib/utils'

interface Attachment {
  id: string
  file_name: string
  file_url: string
  file_type: string
}

interface Procedure {
  id: string
  patient_name: string
  procedure_name: string
  procedure_value: number
  procedure_date: string
  payment_status: 'pending' | 'paid' | 'cancelled' | 'sent'
  payment_date?: string
  updated_at: string
  updated_by: string
  procedure_attachments?: Attachment[]
}

export default function SecretaryPage() {
  const { token } = useParams()
  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [doctorName, setDoctorName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [editingValue, setEditingValue] = useState<{ id: string, value: string } | null>(null)

  const fetchProcedures = async () => {
    try {
      const response = await fetch(`/api/secretary/procedures?token=${token}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar dados')
      }

      setProcedures(data.procedures)
      setDoctorName(data.doctorName)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      fetchProcedures()
    }
  }, [token])

  const handleUpdateValue = async (procedureId: string) => {
    if (!editingValue || !editingValue.value) return
    
    // Converter "R$ 1.234,56" ou "1234,56" para number
    const cleanValue = editingValue.value.replace(/[^\d,]/g, '').replace(',', '.')
    const numericValue = parseFloat(cleanValue)

    if (isNaN(numericValue)) {
      alert('Valor inválido')
      return
    }

    setUpdatingId(procedureId)
    try {
      const response = await fetch('/api/secretary/procedures', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          procedureId,
          value: numericValue
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao atualizar valor')
      }

      // Atualizar localmente
      setProcedures(prev => prev.map(p => 
        p.id === procedureId 
          ? { ...p, procedure_value: numericValue, updated_by: 'secretary', updated_at: new Date().toISOString() } 
          : p
      ))
      setEditingValue(null)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setUpdatingId(null)
    }
  }

  const handleUpdateStatus = async (procedureId: string, status: string) => {
    setUpdatingId(procedureId)
    try {
      const response = await fetch('/api/secretary/procedures', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          procedureId,
          status,
          paymentDate: status === 'paid' ? new Date().toISOString().split('T')[0] : null
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao atualizar')
      }

      // Atualizar localmente
      setProcedures(prev => prev.map(p => 
        p.id === procedureId 
          ? { ...p, payment_status: status as any, updated_by: 'secretary', updated_at: new Date().toISOString() } 
          : p
      ))
    } catch (err: any) {
      alert(err.message)
    } finally {
      setUpdatingId(null)
    }
  }

  const filteredProcedures = procedures.filter(p => {
    const matchesSearch = p.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.procedure_name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || p.payment_status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'paid': return { color: 'text-emerald-600 bg-emerald-50', icon: CheckCircle2, label: 'Pago' }
      case 'sent': return { color: 'text-blue-600 bg-blue-50', icon: Send, label: 'Enviado' }
      case 'pending': return { color: 'text-amber-600 bg-amber-50', icon: Clock, label: 'Pendente' }
      default: return { color: 'text-gray-600 bg-gray-50', icon: AlertCircle, label: 'Aguardando' }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 font-medium animate-pulse">Autenticando acesso seguro...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-red-100">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h1>
          <p className="text-gray-600 mb-8">{error}</p>
          <p className="text-sm text-gray-400">Solicite um novo link ao médico responsável.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header Profissional */}
      <header className="bg-white border-b sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-teal-100">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">AnestEasy Secretary</h1>
              <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                Acesso Seguro • Dr(a). {doctorName}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 mt-8">
        {/* Search & Filters */}
        <div className="space-y-4 mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Buscar paciente ou procedimento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-14 pl-12 pr-4 bg-white border-none rounded-2xl shadow-sm focus:ring-2 focus:ring-teal-500 transition-all text-gray-900 placeholder:text-gray-400"
            />
          </div>

          {/* Status Filter Carousel */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
            {[
              { id: 'all', label: 'Todos', icon: ShieldCheck },
              { id: 'pending', label: 'Pendentes', icon: Clock },
              { id: 'sent', label: 'Enviados', icon: Send },
              { id: 'paid', label: 'Pagos', icon: CheckCircle2 }
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setStatusFilter(filter.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap shadow-sm
                  ${statusFilter === filter.id 
                    ? 'bg-teal-600 text-white shadow-teal-100 ring-2 ring-teal-600 ring-offset-2' 
                    : 'bg-white text-gray-600 border border-gray-100 hover:border-teal-200 hover:bg-teal-50/50'
                  }
                `}
              >
                <filter.icon className={`w-4 h-4 ${statusFilter === filter.id ? 'text-white' : 'text-gray-400'}`} />
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* List of Procedures */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider px-2">
            Procedimentos ({filteredProcedures.length})
          </h2>
          
          {filteredProcedures.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-100">
              <p className="text-gray-400">Nenhum procedimento encontrado com os filtros atuais.</p>
            </div>
          ) : (
            filteredProcedures.map((proc) => {
              const status = getStatusConfig(proc.payment_status)
              const isExpanded = expandedId === proc.id
              
              return (
                <motion.div 
                  layout
                  key={proc.id}
                  className={`bg-white rounded-2xl shadow-sm border transition-all ${isExpanded ? 'border-teal-200 ring-4 ring-teal-50/50' : 'border-gray-100'}`}
                >
                  <div 
                    className="p-5 flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : proc.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${status.color}`}>
                        <status.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{proc.patient_name}</h3>
                        <p className="text-sm text-gray-500">{proc.procedure_name}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-right hidden sm:block">
                        <p className="font-bold text-gray-900">{formatCurrency(proc.procedure_value)}</p>
                        <p className="text-xs text-gray-400">{new Date(proc.procedure_date).toLocaleDateString('pt-BR')}</p>
                      </div>
                      {isExpanded ? <ChevronUp className="text-gray-300" /> : <ChevronDown className="text-gray-300" />}
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-gray-50"
                      >
                        <div className="p-6 bg-gray-50/30 grid grid-cols-1 md:grid-cols-2 gap-8">
                          {/* Detalhes */}
                          <div className="space-y-4">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Informações</h4>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="flex items-center gap-2 text-gray-600">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span className="text-sm">{new Date(proc.procedure_date).toLocaleDateString('pt-BR')}</span>
                              </div>
                              <div className="col-span-2 flex flex-col gap-2 p-3 bg-white border border-gray-100 rounded-xl">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Ajustar Valor</label>
                                <div className="flex items-center gap-2">
                                  <div className="relative flex-1">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input 
                                      type="text"
                                      value={editingValue?.id === proc.id ? editingValue.value : formatCurrency(proc.procedure_value).replace('R$\u00A0', '')}
                                      onChange={(e) => {
                                        const val = e.target.value.replace(/[^\d,]/g, '')
                                        setEditingValue({ id: proc.id, value: val })
                                      }}
                                      className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 transition-all"
                                      placeholder="0,00"
                                    />
                                  </div>
                                  <button 
                                    disabled={updatingId === proc.id || editingValue?.id !== proc.id}
                                    onClick={() => handleUpdateValue(proc.id)}
                                    className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-teal-700 disabled:opacity-50 transition-all"
                                  >
                                    Salvar
                                  </button>
                                </div>
                              </div>
                              {proc.updated_by === 'secretary' && (
                                <div className="col-span-2 flex items-center gap-2 text-xs text-teal-600 font-medium">
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  Última alteração feita por Secretária em {new Date(proc.updated_at).toLocaleString('pt-BR')}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Ações de Status */}
                          <div className="space-y-4">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Atualizar Status</h4>
                            <div className="flex flex-wrap gap-2">
                              {['pending', 'sent', 'paid'].map((s) => {
                                const cfg = getStatusConfig(s)
                                const isActive = proc.payment_status === s
                                const isUpdating = updatingId === proc.id
                                
                                return (
                                  <button
                                    key={s}
                                    disabled={isActive || isUpdating}
                                    onClick={() => handleUpdateStatus(proc.id, s)}
                                    className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2
                                      ${isActive 
                                        ? 'bg-teal-600 text-white shadow-lg shadow-teal-100' 
                                        : 'bg-white text-gray-600 border border-gray-200 hover:border-teal-300 hover:bg-teal-50'
                                      }
                                      ${isUpdating && updatingId === proc.id ? 'opacity-50 cursor-wait' : ''}
                                    `}
                                  >
                                    {isActive ? <CheckCircle2 className="w-4 h-4" /> : <cfg.icon className="w-4 h-4" />}
                                    {cfg.label}
                                  </button>
                                )
                              })}
                            </div>
                          </div>

                          {/* Anexos / Imagens do Procedimento */}
                          {proc.procedure_attachments && proc.procedure_attachments.length > 0 && (
                            <div className="col-span-full mt-4 pt-6 border-t border-gray-100">
                              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <ImageIcon className="w-4 h-4" />
                                Arquivos e Imagens Anexadas ({proc.procedure_attachments.length})
                              </h4>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {proc.procedure_attachments.map((file) => {
                                  const isImage = file.file_type?.startsWith('image/')
                                  return (
                                    <div key={file.id} className="group relative bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                                      <div className="aspect-square bg-gray-50 flex items-center justify-center">
                                        {isImage ? (
                                          <img 
                                            src={file.file_url} 
                                            alt={file.file_name}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <FileIcon className="w-8 h-8 text-gray-300" />
                                        )}
                                      </div>
                                      
                                      <div className="p-2 border-t border-gray-50">
                                        <p className="text-[10px] text-gray-500 truncate font-medium">{file.file_name}</p>
                                      </div>

                                      {/* Overlay com botões */}
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <a 
                                          href={file.file_url} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="p-2 bg-white rounded-full text-teal-600 hover:scale-110 transition-transform"
                                          title="Visualizar"
                                        >
                                          <ExternalLink className="w-4 h-4" />
                                        </a>
                                        <a 
                                          href={file.file_url} 
                                          download={file.file_name}
                                          className="p-2 bg-white rounded-full text-gray-600 hover:scale-110 transition-transform"
                                          title="Download"
                                        >
                                          <Download className="w-4 h-4" />
                                        </a>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })
          )}
        </div>
      </main>

      {/* Footer com Aviso Legal */}
      <footer className="mt-12 text-center text-gray-400 px-4">
        <p className="text-xs">Sistema de acesso seguro AnestEasy. Todas as alterações são monitoradas e auditadas.</p>
        <p className="text-[10px] mt-1 opacity-50">Token ID: {String(token).slice(0, 8)}...</p>
      </footer>
    </div>
  )
}
