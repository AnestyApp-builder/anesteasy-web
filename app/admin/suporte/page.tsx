'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  MessageSquare,
  RefreshCw,
  User,
  Clock,
  Phone,
  ArrowRight,
  Search,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'

interface InboundMessage {
  id: string
  user_id: string
  phone_number: string
  text_content: string
  message_type: string
  created_at: string
  status: string
  users: {
    id: string
    name: string
    email: string
  } | null
}

export default function SuportePage() {
  const [messages, setMessages] = useState<InboundMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')

  const loadMessages = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/admin/suporte', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })

      if (!response.ok) return

      const data = await response.json()
      setMessages(data.data || [])
    } catch (error) {
      console.error('Erro ao carregar suporte:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  const filteredMessages = messages.filter(m => 
    m.text_content?.toLowerCase().includes(search.toLowerCase()) ||
    m.users?.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.phone_number.includes(search)
  )

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header Premium */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Central de Suporte</h1>
              <span className="bg-green-50 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-100 uppercase tracking-wider">Inbox Ativo</span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Acompanhe e responda às dúvidas dos usuários em tempo real</p>
          </div>
          <Button onClick={loadMessages} variant="outline" size="sm" disabled={isLoading} className="rounded-xl border-slate-200 hover:bg-slate-50 font-semibold text-xs transition-all shadow-sm">
            <RefreshCw className={`w-3.5 h-3.5 mr-2 text-teal-600 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar Conversas
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Barra de Busca */}
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por mensagem ou nome do usuário..."
              className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            />
          </div>
        </div>

        {/* Lista de Conversas */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Nenhuma mensagem de entrada encontrada</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredMessages.map((msg) => (
                <div key={msg.id} className="p-4 hover:bg-slate-50 transition-colors group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-teal-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-gray-900 truncate">
                              {msg.users?.name || 'Usuário não identificado'}
                            </h3>
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">
                              {msg.phone_number}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400 truncate">{msg.users?.email || 'N/A'}</p>
                        </div>
                      </div>
                      
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 relative">
                        {/* Indicador de direção (balão de chat) */}
                        <div className="absolute -top-2 left-4 w-4 h-4 bg-slate-50 border-l border-t border-slate-100 rotate-45" />
                        
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {msg.text_content || (msg.message_type === 'image' ? '📷 [Mídia/Ficha enviada]' : '[Mensagem sem texto]')}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3 flex-shrink-0 pt-1">
                      <span className="text-[10px] font-medium text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(msg.created_at).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>

                      <div className="flex items-center gap-2">
                        <Link href={`/admin/clientes/${msg.user_id}`}>
                          <Button variant="outline" size="sm" className="rounded-lg h-8 text-[10px] font-bold border-slate-200 hover:bg-white hover:border-primary-400 hover:text-primary-600 transition-all">
                            Ver Perfil <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
