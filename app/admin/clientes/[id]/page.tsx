'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  RefreshCw,
  MessageSquare,
  Gift,
  CreditCard,
  User,
  Mail,
  Phone,
  Calendar,
  FileText,
  Clock,
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Stethoscope,
  Send,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { SendWhatsAppModal } from '@/components/admin/SendWhatsAppModal'
import { useToast } from '@/contexts/ToastContext'

interface ClientData {
  client: any
  subscription: any
  stats: {
    procedure_count: number
    recent_procedures: any[]
  }
  whatsapp: {
    account: any
    last_inbound_at: string | null
    within_24h_window: boolean
  }
  messages: any[]
}

export default function ClienteDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<ClientData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false)
  const [extendDays, setExtendDays] = useState(7)
  const [isExtending, setIsExtending] = useState(false)
  const { addToast } = useToast()

  const loadClient = async () => {
    setIsLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/admin/clientes/${id}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })

      if (!response.ok) return

      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Erro ao carregar cliente:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExtendTrial = async () => {
    if (isExtending) return
    setIsExtending(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/admin/clientes/${id}/extend-trial`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ days: extendDays }),
      })

      const result = await response.json()

      if (result.success) {
        addToast({ type: 'success', message: result.message })
        loadClient()
      } else {
        addToast({ type: 'error', message: result.error || 'Erro ao estender trial' })
      }
    } catch (error: any) {
      addToast({ type: 'error', message: error.message || 'Erro ao estender trial' })
    } finally {
      setIsExtending(false)
    }
  }

  useEffect(() => {
    loadClient()
  }, [id])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  if (!data?.client) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-4">Cliente não encontrado</p>
          <Link href="/admin/clientes">
            <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> Voltar</Button>
          </Link>
        </div>
      </div>
    )
  }

  const { client, subscription, stats, whatsapp, messages } = data
  const trialEnd = client.trial_ends_at ? new Date(client.trial_ends_at) : null
  const isInTrial = trialEnd && trialEnd > new Date()
  const daysLeft = isInTrial ? Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0
  const phoneNumber = whatsapp?.account?.phone_number || null

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <Link href="/admin/clientes">
                <Button variant="ghost" size="sm" className="p-1.5">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{client.name || 'Sem nome'}</h1>
                <p className="text-sm text-gray-500">{client.email}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={loadClient} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
              </Button>
              <Button
                onClick={() => setShowWhatsAppModal(true)}
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Send className="w-4 h-4 mr-2" /> Enviar WhatsApp
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Info cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Status */}
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3 mb-3">
                {isInTrial ? (
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Gift className="w-5 h-5 text-blue-600" />
                  </div>
                ) : client.subscription_status === 'active' ? (
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-green-600" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-red-600" />
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="font-semibold text-gray-900">
                    {isInTrial ? `Trial (${daysLeft} dias restantes)` : client.subscription_status === 'active' ? 'Assinante Ativo' : 'Inativo'}
                  </p>
                </div>
              </div>
              {trialEnd && (
                <p className="text-xs text-gray-500">
                  Trial {isInTrial ? 'expira' : 'expirou'} em: {trialEnd.toLocaleDateString('pt-BR')}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Procedimentos */}
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Procedimentos</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.procedure_count}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* WhatsApp */}
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  whatsapp.within_24h_window ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <MessageSquare className={`w-5 h-5 ${
                    whatsapp.within_24h_window ? 'text-green-600' : 'text-gray-400'
                  }`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">WhatsApp</p>
                  <p className="font-semibold text-gray-900">
                    {whatsapp.within_24h_window ? 'Janela ativa ✅' : 'Janela expirada ⚠️'}
                  </p>
                </div>
              </div>
              {phoneNumber && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {phoneNumber}
                  </p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> 
                    {whatsapp.last_inbound_at 
                      ? `Última interação: ${new Date(whatsapp.last_inbound_at).toLocaleString('pt-BR')}`
                      : 'Nenhuma interação registrada'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Dados pessoais */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="w-5 h-5 text-primary-500" /> Dados Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { icon: User, label: 'Nome', value: client.name || '—' },
                  { icon: Mail, label: 'Email', value: client.email },
                  { icon: Phone, label: 'Telefone', value: client.phone || '—' },
                  { icon: Stethoscope, label: 'CRM', value: client.crm || '—' },
                  { icon: Shield, label: 'Role', value: client.role },
                  { icon: Calendar, label: 'Cadastro', value: new Date(client.created_at).toLocaleDateString('pt-BR') },
                  { icon: Clock, label: 'Último acesso', value: client.last_login_at ? new Date(client.last_login_at).toLocaleString('pt-BR') : 'Nunca' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="flex items-center gap-2 text-sm text-gray-500">
                      <item.icon className="w-4 h-4" /> {item.label}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Estender Trial */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Gift className="w-5 h-5 text-blue-500" /> Gerenciar Trial
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Estender o período de teste do cliente. Se o trial já expirou, a extensão começa a partir de hoje.
                </p>
                <div className="flex flex-wrap gap-2">
                  {[7, 15, 30, 60, 90].map(d => (
                    <button
                      key={d}
                      onClick={() => setExtendDays(d)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        extendDays === d
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                      }`}
                    >
                      +{d} dias
                    </button>
                  ))}
                </div>
                <Button
                  onClick={handleExtendTrial}
                  disabled={isExtending}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isExtending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Estendendo...</>
                  ) : (
                    <><Gift className="w-4 h-4 mr-2" /> Estender Trial em {extendDays} dias</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Últimos Procedimentos */}
        {stats.recent_procedures.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5 text-orange-500" /> Últimos Procedimentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Procedimento</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Data</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Valor</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Pagamento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {stats.recent_procedures.map((proc: any) => (
                      <tr key={proc.id} className="hover:bg-gray-50">
                        <td className="py-2 px-3 text-sm font-medium text-gray-900">
                          {proc.procedure_name || '—'}
                        </td>
                        <td className="py-2 px-3 text-sm text-gray-600">
                          {proc.procedure_date ? new Date(proc.procedure_date).toLocaleDateString('pt-BR') : '—'}
                        </td>
                        <td className="py-2 px-3 text-sm text-gray-900 font-medium">
                          {proc.procedure_value ? `R$ ${Number(proc.procedure_value).toFixed(2)}` : '—'}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                            proc.payment_status === 'paid'
                              ? 'bg-green-50 text-green-700'
                              : proc.payment_status === 'sent'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-yellow-50 text-yellow-700'
                          }`}>
                            {proc.payment_status === 'paid' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {proc.payment_status === 'paid' ? 'Pago' : proc.payment_status === 'sent' ? 'Enviado' : 'Pendente'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Histórico de mensagens admin */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="w-5 h-5 text-green-500" /> Mensagens Enviadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {messages.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhuma mensagem enviada para este cliente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg: any) => (
                  <div key={msg.id} className={`p-3 rounded-xl ${
                    msg.status === 'sent' ? 'bg-green-50 border border-green-100' :
                    msg.status === 'failed' ? 'bg-red-50 border border-red-100' :
                    'bg-gray-50 border border-gray-100'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">
                        {new Date(msg.created_at).toLocaleString('pt-BR')}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                        msg.status === 'sent' ? 'bg-green-100 text-green-700' :
                        msg.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {msg.status === 'sent' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {msg.status === 'sent' ? 'Enviada' : msg.status === 'failed' ? 'Falhou' : msg.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800">{msg.message_text}</p>
                    {msg.error_message && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> {msg.error_message}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* WhatsApp Modal */}
      <SendWhatsAppModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        targetUserId={id}
        targetName={client.name || client.email}
        targetPhone={phoneNumber}
        within24hWindow={whatsapp.within_24h_window}
        targetTrialDaysLeft={daysLeft}
        onMessageSent={loadClient}
      />
    </div>
  )
}
