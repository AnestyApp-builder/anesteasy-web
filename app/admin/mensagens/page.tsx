'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  MessageSquare,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  User,
  Filter,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'

interface AdminMessage {
  id: string
  admin_user_id: string
  target_user_id: string
  target_phone: string
  message_text: string
  channel: string
  status: string
  whatsapp_message_id: string | null
  error_message: string | null
  created_at: string
  target_user_name: string
  target_user_email: string
}

export default function MensagensPage() {
  const [messages, setMessages] = useState<AdminMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const itemsPerPage = 30

  const loadMessages = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      })

      if (statusFilter) params.set('status', statusFilter)

      const response = await fetch(`/api/admin/mensagens?${params}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })

      if (!response.ok) return

      const data = await response.json()
      setMessages(data.data || [])
      setTotalItems(data.total || 0)
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error)
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, statusFilter])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  const totalPages = Math.ceil(totalItems / itemsPerPage)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'delivered': return <CheckCircle className="w-4 h-4 text-blue-500" />
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />
      case 'read': return <CheckCircle className="w-4 h-4 text-indigo-500" />
      default: return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      sent: 'Enviada',
      delivered: 'Entregue',
      failed: 'Falhou',
      read: 'Lida',
    }
    return labels[status] || status
  }

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      sent: 'bg-green-50 text-green-700 border-green-200',
      delivered: 'bg-blue-50 text-blue-700 border-blue-200',
      failed: 'bg-red-50 text-red-700 border-red-200',
      read: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    }
    return colors[status] || 'bg-gray-50 text-gray-700 border-gray-200'
  }

  // Contagem por status
  const sentCount = messages.filter(m => m.status === 'sent').length
  const failedCount = messages.filter(m => m.status === 'failed').length

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header Premium */}
      <div className="bg-white border-b border-slate-200/80 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Histórico de Mensagens</h1>
              <span className="bg-teal-50 text-teal-700 text-xs font-bold px-2 py-0.5 rounded-full border border-teal-100">Logs Meta API</span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Auditoria e registro de disparos de WhatsApp corporativo</p>
          </div>
          <Button onClick={loadMessages} variant="outline" size="sm" disabled={isLoading} className="rounded-xl border-slate-200 hover:bg-slate-50 font-semibold text-xs transition-all shadow-sm">
            <RefreshCw className={`w-3.5 h-3.5 mr-2 text-teal-600 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar Status
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Filtros de status */}
        <div className="flex gap-2 flex-wrap">
          {[
            { value: '', label: 'Todas', count: totalItems },
            { value: 'sent', label: 'Enviadas', count: null },
            { value: 'failed', label: 'Falharam', count: null },
          ].map(filter => (
            <button
              key={filter.value}
              onClick={() => { setStatusFilter(filter.value); setCurrentPage(1) }}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                statusFilter === filter.value
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Lista de mensagens */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Nenhuma mensagem encontrada</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {messages.map((msg) => (
                <div key={msg.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Link
                          href={`/admin/clientes/${msg.target_user_id}`}
                          className="flex items-center gap-1.5 text-sm font-medium text-gray-900 hover:text-primary-600 transition-colors"
                        >
                          <User className="w-4 h-4 text-gray-400" />
                          {msg.target_user_name}
                        </Link>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">{msg.target_phone}</span>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2">{msg.message_text}</p>
                      {msg.error_message && (
                        <p className="text-xs text-red-500 mt-1">❌ {msg.error_message}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border ${getStatusBadgeColor(msg.status)}`}>
                        {getStatusIcon(msg.status)}
                        {getStatusLabel(msg.status)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(msg.created_at).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
              <p className="text-sm text-gray-600">
                Página {currentPage} de {totalPages} ({totalItems} mensagens)
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
