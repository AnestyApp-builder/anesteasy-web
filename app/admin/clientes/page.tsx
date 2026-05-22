'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Users,
  Search,
  RefreshCw,
  MessageSquare,
  Eye,
  Gift,
  CreditCard,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowUpDown,
  Phone,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { SendWhatsAppModal } from '@/components/admin/SendWhatsAppModal'

interface Client {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
  subscription_plan: string | null
  subscription_status: string | null
  trial_ends_at: string | null
  last_login_at: string | null
  created_at: string
  crm: string | null
  free_months: number | null
  procedure_count: number
  whatsapp_phone: string | null
  last_bot_interaction: string | null
}

interface Metrics {
  total: number
  trial: number
  active: number
  inactive: number
}

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [metrics, setMetrics] = useState<Metrics>({ total: 0, trial: 0, active: 0, inactive: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortField, setSortField] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [whatsappModal, setWhatsappModal] = useState<{
    open: boolean
    userId: string
    name: string
    phone: string | null
    trialDaysLeft?: number
  }>({ open: false, userId: '', name: '', phone: null, trialDaysLeft: 0 })

  const itemsPerPage = 20

  const loadClients = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        sort: sortField,
        order: sortOrder,
      })

      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)

      const response = await fetch(`/api/admin/clientes?${params}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })

      if (!response.ok) return

      const data = await response.json()
      setClients(data.data || [])
      setTotalItems(data.total || 0)
      setMetrics(data.metrics || { total: 0, trial: 0, active: 0, inactive: 0 })
    } catch (error) {
      console.error('Erro ao carregar clientes:', error)
    } finally {
      setIsLoading(false)
    }
  }, [search, statusFilter, sortField, sortOrder, currentPage])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadClients()
    }, search ? 400 : 0) // Debounce para busca

    return () => clearTimeout(timer)
  }, [loadClients, search])

  const getStatusBadge = (client: Client) => {
    const trialEnd = client.trial_ends_at ? new Date(client.trial_ends_at) : null
    const isInTrial = trialEnd && trialEnd > new Date()

    if (isInTrial) {
      const daysLeft = Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200">
          <Gift className="w-3 h-3" />
          Trial ({daysLeft}d)
        </span>
      )
    }

    if (client.subscription_status === 'active') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-green-50 text-green-700 border border-green-200">
          <CreditCard className="w-3 h-3" />
          Ativo
        </span>
      )
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-red-50 text-red-700 border border-red-200">
        <XCircle className="w-3 h-3" />
        Inativo
      </span>
    )
  }

  const formatDate = (date: string | null) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    })
  }

  const formatRelative = (date: string | null) => {
    if (!date) return 'Nunca'
    const diff = Date.now() - new Date(date).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 60) return `${minutes}min atrás`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h atrás`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}d atrás`
    return formatDate(date)
  }

  const totalPages = Math.ceil(totalItems / itemsPerPage)

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
    setCurrentPage(1)
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header Premium */}
      <div className="bg-white border-b border-slate-200/80 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Gestão de Clientes</h1>
              <span className="bg-teal-50 text-teal-700 text-xs font-bold px-2 py-0.5 rounded-full border border-teal-100">CRM</span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">{totalItems} clientes cadastrados no banco de dados</p>
          </div>
          <Button onClick={loadClients} variant="outline" size="sm" disabled={isLoading} className="rounded-xl border-slate-200 hover:bg-slate-50 font-semibold text-xs transition-all shadow-sm">
            <RefreshCw className={`w-3.5 h-3.5 mr-2 text-teal-600 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar Dados
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Métricas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => { setStatusFilter(''); setCurrentPage(1) }}
            className={`text-left p-4 rounded-xl border-2 transition-all ${
              !statusFilter ? 'border-slate-400 bg-white shadow-md' : 'border-transparent bg-white hover:border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Users className="w-4 h-4" /> Total
            </div>
            <p className="text-2xl font-bold text-gray-900">{metrics.total}</p>
          </button>

          <button
            onClick={() => { setStatusFilter('trial'); setCurrentPage(1) }}
            className={`text-left p-4 rounded-xl border-2 transition-all ${
              statusFilter === 'trial' ? 'border-blue-400 bg-blue-50 shadow-md' : 'border-transparent bg-white hover:border-blue-200'
            }`}
          >
            <div className="flex items-center gap-2 text-sm text-blue-600 mb-1">
              <Gift className="w-4 h-4" /> Em Trial
            </div>
            <p className="text-2xl font-bold text-blue-700">{metrics.trial}</p>
          </button>

          <button
            onClick={() => { setStatusFilter('active'); setCurrentPage(1) }}
            className={`text-left p-4 rounded-xl border-2 transition-all ${
              statusFilter === 'active' ? 'border-green-400 bg-green-50 shadow-md' : 'border-transparent bg-white hover:border-green-200'
            }`}
          >
            <div className="flex items-center gap-2 text-sm text-green-600 mb-1">
              <CreditCard className="w-4 h-4" /> Pagantes
            </div>
            <p className="text-2xl font-bold text-green-700">{metrics.active}</p>
          </button>

          <button
            onClick={() => { setStatusFilter('inactive'); setCurrentPage(1) }}
            className={`text-left p-4 rounded-xl border-2 transition-all ${
              statusFilter === 'inactive' ? 'border-red-400 bg-red-50 shadow-md' : 'border-transparent bg-white hover:border-red-200'
            }`}
          >
            <div className="flex items-center gap-2 text-sm text-red-600 mb-1">
              <XCircle className="w-4 h-4" /> Inativos
            </div>
            <p className="text-2xl font-bold text-red-700">{metrics.inactive}</p>
          </button>
        </div>

        {/* Busca */}
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
              placeholder="Buscar por nome, email ou telefone..."
              className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            />
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Nenhum cliente encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left py-3 px-4">
                      <button onClick={() => handleSort('name')} className="flex items-center gap-1 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900">
                        Cliente <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">Telefone</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">Procedimentos</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">Interação Bot</th>
                    <th className="text-left py-3 px-4">
                      <button onClick={() => handleSort('last_login_at')} className="flex items-center gap-1 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900">
                        Último acesso <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="text-left py-3 px-4">
                      <button onClick={() => handleSort('created_at')} className="flex items-center gap-1 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900">
                        Cadastro <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <Link href={`/admin/clientes/${client.id}`} className="block">
                          <p className="font-medium text-gray-900 hover:text-primary-600 transition-colors">
                            {client.name || 'Sem nome'}
                          </p>
                          <p className="text-xs text-gray-500">{client.email}</p>
                        </Link>
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(client)}</td>
                      <td className="py-3 px-4 hidden lg:table-cell">
                        {client.whatsapp_phone || client.phone ? (
                          <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                            <Phone className="w-3 h-3 text-green-500" />
                            {client.whatsapp_phone || client.phone}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        <span className="text-sm font-medium text-gray-700">{client.procedure_count}</span>
                      </td>
                      <td className="py-3 px-4 hidden lg:table-cell">
                        {client.last_bot_interaction ? (
                          <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1 w-fit">
                            <MessageSquare className="w-3 h-3" />
                            {formatRelative(client.last_bot_interaction)}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Nunca</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatRelative(client.last_login_at)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-500">{formatDate(client.created_at)}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/admin/clientes/${client.id}`}>
                            <Button variant="ghost" size="sm" className="p-1.5" title="Ver perfil">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50"
                            title="Enviar WhatsApp"
                            onClick={() => {
                              const tEnd = client.trial_ends_at ? new Date(client.trial_ends_at) : null
                              const inTrial = tEnd && tEnd > new Date()
                              const dLeft = inTrial ? Math.ceil((tEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0
                              setWhatsappModal({
                                open: true,
                                userId: client.id,
                                name: client.name || client.email,
                                phone: client.whatsapp_phone,
                                trialDaysLeft: dLeft,
                              })
                            }}
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
              <p className="text-sm text-gray-600">
                Mostrando {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, totalItems)} de {totalItems}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-gray-600 px-2">
                  {currentPage}/{totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* WhatsApp Modal */}
      <SendWhatsAppModal
        isOpen={whatsappModal.open}
        onClose={() => setWhatsappModal({ open: false, userId: '', name: '', phone: null, trialDaysLeft: 0 })}
        targetUserId={whatsappModal.userId}
        targetName={whatsappModal.name}
        targetPhone={whatsappModal.phone}
        within24hWindow={true}
        targetTrialDaysLeft={whatsappModal.trialDaysLeft}
        onMessageSent={loadClients}
      />
    </div>
  )
}
