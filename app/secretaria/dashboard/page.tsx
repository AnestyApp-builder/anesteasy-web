'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Users, 
  FileText, 
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Edit,
  Eye,
  Bell,
  LogOut,
  Search,
  Filter,
  Download,
  Upload,
  UserCheck,
  Settings,
  Mail,
  CheckCircle2,
  X
} from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useSecretariaAuth } from '@/contexts/SecretariaAuthContext'
import { SecretariaNotificationsProvider } from '@/contexts/SecretariaNotificationsContext'
import { SecretariaNotificationBell } from '@/components/notifications/SecretariaNotificationBell'

interface Procedure {
  id: string
  patient_name: string
  procedure_name: string
  procedure_date: string
  procedure_value: number
  payment_status: string
  payment_date: string | null
  observacoes_financeiras: string | null
  users: {
    id: string
    name: string
    email: string
  }
}

interface Anestesista {
  id: string
  name: string
  email: string
  specialty: string
  crm: string
  created_at: string
}

function SecretariaDashboardContent() {
  const { secretaria, isAuthenticated, isLoading: authLoading, logout } = useSecretariaAuth()
  const [anestesistas, setAnestesistas] = useState<Anestesista[]>([])
  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [filteredProcedures, setFilteredProcedures] = useState<Procedure[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [anestesistaFilter, setAnestesistaFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [pendingRequests, setPendingRequests] = useState<Array<{
    id: string
    anestesista_id: string
    anestesista_name: string
    anestesista_email: string
    created_at: string
  }>>([])
  const [isLoadingRequests, setIsLoadingRequests] = useState(true)
  const [isProcessingRequest, setIsProcessingRequest] = useState<string | null>(null)
  const router = useRouter()

  // Carregar dados da secretaria e procedimentos
  useEffect(() => {
    let isMounted = true
    let channel: any = null

    const loadData = async () => {
      try {
        // Aguardar a verificação de autenticação
        if (authLoading) {
          return
        }

        // Verificar se a secretaria está autenticada
        if (!isAuthenticated || !secretaria) {
          if (isMounted) {
            router.push('/login')
          }
          return
        }

        // Buscar anestesistas vinculados à secretaria
        const { data: anestesistasData, error: anestesistasError } = await supabase
          .from('anestesista_secretaria')
          .select(`
            users (
              id,
              name,
              email,
              specialty,
              crm,
              created_at
            )
          `)
          .eq('secretaria_id', secretaria.id)
          .limit(100) // Limitar para evitar queries muito lentas

        if (!isMounted) return

        if (anestesistasError) {
          console.error('Erro ao carregar anestesistas:', anestesistasError)
          setError('Erro ao carregar anestesistas')
          return
        }

        const anestesistasList = anestesistasData?.map(item => item.users).filter(Boolean).flat() || []
        setAnestesistas(anestesistasList)

        // Buscar apenas procedimentos vinculados a esta secretária
        // A secretária só tem acesso a procedimentos que foram explicitamente vinculados a ela
        // através do campo "Adicionar Secretaria" no formulário de criação
        // Limitar a 500 procedimentos para evitar queries muito lentas
        const { data: proceduresData, error: proceduresError } = await supabase
          .from('procedures')
          .select(`
            *,
            users (
              id,
              name,
              email
            )
          `)
          .eq('secretaria_id', secretaria.id)
          .order('procedure_date', { ascending: false })
          .limit(500) // Limitar para melhorar performance

        if (!isMounted) return

        if (proceduresError) {
          console.error('Erro ao buscar procedimentos:', proceduresError)
          setError('Erro ao carregar procedimentos')
          setProcedures([])
          setFilteredProcedures([])
        } else {
          const proceduresList = proceduresData || []
          setProcedures(proceduresList)
          setFilteredProcedures(proceduresList)
        }

        // Carregar solicitações pendentes
        if (secretaria && isMounted) {
          const { data: requestsData, error: requestsError } = await supabase
            .from('secretaria_link_requests')
            .select(`
              id,
              anestesista_id,
              created_at,
              users (
                id,
                name,
                email
              )
            `)
            .eq('secretaria_id', secretaria.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(50) // Limitar solicitações pendentes

          if (!isMounted) return

          if (requestsError) {
            console.error('Erro ao carregar solicitações:', requestsError)
            setPendingRequests([])
          } else {
            const formattedRequests = (requestsData || []).map((req: any) => ({
              id: req.id,
              anestesista_id: req.anestesista_id,
              anestesista_name: req.users?.name || 'Nome não disponível',
              anestesista_email: req.users?.email || 'Email não disponível',
              created_at: req.created_at || ''
            }))
            setPendingRequests(formattedRequests)
          }
          setIsLoadingRequests(false)
        }
      } catch (error) {
        if (!isMounted) return
        console.error('Erro ao carregar dados:', error)
        setError('Erro interno')
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    // Carregar dados apenas se autenticado e não estiver carregando
    if (!authLoading && isAuthenticated && secretaria) {
      loadData()

      // Escutar mudanças em tempo real nas solicitações (apenas uma vez)
      if (secretaria && !channel) {
        channel = supabase
          .channel(`link_requests:${secretaria.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'secretaria_link_requests',
              filter: `secretaria_id=eq.${secretaria.id}`
            },
            () => {
              // Recarregar apenas solicitações, não tudo
              if (isMounted && secretaria) {
                supabase
                  .from('secretaria_link_requests')
                  .select(`
                    id,
                    anestesista_id,
                    created_at,
                    users (
                      id,
                      name,
                      email
                    )
                  `)
                  .eq('secretaria_id', secretaria.id)
                  .eq('status', 'pending')
                  .order('created_at', { ascending: false })
                  .limit(50)
                  .then(({ data: requestsData, error: requestsError }) => {
                    if (!isMounted) return
                    if (!requestsError && requestsData) {
                      const formattedRequests = requestsData.map((req: any) => ({
                        id: req.id,
                        anestesista_id: req.anestesista_id,
                        anestesista_name: req.users?.name || 'Nome não disponível',
                        anestesista_email: req.users?.email || 'Email não disponível',
                        created_at: req.created_at || ''
                      }))
                      setPendingRequests(formattedRequests)
                    }
                  })
              }
            }
          )
          .subscribe()
      }
    }

    return () => {
      isMounted = false
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [authLoading, isAuthenticated, secretaria?.id]) // Remover router das dependências para evitar re-renders

  // Filtrar procedimentos
  useEffect(() => {
    let filtered = procedures

    // Filtrar por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(procedure =>
        procedure.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        procedure.procedure_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        procedure.users.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filtrar por status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(procedure => procedure.payment_status === statusFilter)
    }

    // Filtrar por anestesista
    if (anestesistaFilter !== 'all') {
      filtered = filtered.filter(procedure => procedure.users.id === anestesistaFilter)
    }

    setFilteredProcedures(filtered)
  }, [procedures, searchTerm, statusFilter, anestesistaFilter])

  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleAcceptRequest = async (requestId: string) => {
    setIsProcessingRequest(requestId)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        alert('Sessão expirada. Faça login novamente.')
        return
      }

      const response = await fetch('/api/secretaria/accept-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ requestId })
      })

      const data = await response.json()

      if (data.success) {
        // Recarregar página para atualizar anestesistas vinculados
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        alert(data.error || 'Erro ao aceitar solicitação.')
      }
    } catch (error) {
      console.error('Erro ao aceitar solicitação:', error)
      alert('Erro ao aceitar solicitação. Tente novamente.')
    } finally {
      setIsProcessingRequest(null)
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    setIsProcessingRequest(requestId)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        alert('Sessão expirada. Faça login novamente.')
        return
      }

      const response = await fetch('/api/secretaria/reject-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ requestId })
      })

      const data = await response.json()

      if (data.success) {
        // Recarregar solicitações
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        alert(data.error || 'Erro ao recusar solicitação.')
      }
    } catch (error) {
      console.error('Erro ao recusar solicitação:', error)
      alert('Erro ao recusar solicitação. Tente novamente.')
    } finally {
      setIsProcessingRequest(null)
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
      setIsLoggingOut(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'paid': { label: 'Pago', color: 'bg-green-500 text-white shadow-sm' },
      'pending': { label: 'Pendente', color: 'bg-amber-500 text-white shadow-sm' },
      'cancelled': { label: 'Aguardando', color: 'bg-red-500 text-white shadow-sm' }
    }
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: 'Aguardando', color: 'bg-red-500 text-white shadow-sm' }
    
    return (
      <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    )
  }


  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen user-area-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen user-area-bg flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Erro</CardTitle>
          </CardHeader>
          <div className="p-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={() => router.push('/login')} className="w-full mt-4">
              Voltar ao Login
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen user-area-bg">
      {/* Header */}
      <header className="bg-gradient-to-r from-teal-600 to-teal-700 border-b border-teal-800 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center min-w-0 flex-1">
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-white mr-2 sm:mr-3 flex-shrink-0" />
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-semibold text-white truncate">AnestEasy</h1>
                <p className="text-xs sm:text-sm text-teal-100 hidden sm:block">Área da Secretaria</p>
              </div>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4 flex-shrink-0">
              <SecretariaNotificationBell />
              <div className="text-right hidden lg:block">
                <p className="text-sm font-medium text-white truncate max-w-[150px]">{secretaria?.nome}</p>
                <p className="text-xs text-teal-100 truncate max-w-[150px]">{secretaria?.email}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => router.push('/secretaria/configuracoes')}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 p-2 sm:px-3"
              >
                <Settings className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Configurações</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 p-2 sm:px-3 disabled:opacity-50"
              >
                {isLoggingOut ? (
                  <>
                    <div className="w-4 h-4 sm:mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="hidden sm:inline">Saindo...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Sair</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 lg:py-6 xl:py-8">
        {/* Header Section */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm sm:text-base lg:text-lg text-gray-600 mt-1 font-medium">
            Bem-vinda, {secretaria?.nome}
          </p>
        </div>
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
          <Card className="hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-semibold text-gray-700">Anestesistas</CardTitle>
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 flex-shrink-0" />
            </CardHeader>
            <div className="px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="text-xl sm:text-2xl font-bold text-gray-900">{anestesistas.length}</div>
            </div>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-semibold text-gray-700">Total de Procedimentos</CardTitle>
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 flex-shrink-0" />
            </CardHeader>
            <div className="px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="text-xl sm:text-2xl font-bold text-gray-900">{procedures.length}</div>
            </div>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-semibold text-gray-700">Pendentes</CardTitle>
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 flex-shrink-0" />
            </CardHeader>
            <div className="px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="text-xl sm:text-2xl font-bold text-amber-600">
                {procedures.filter(p => p.payment_status !== 'paid').length}
              </div>
            </div>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-semibold text-gray-700">Pagos</CardTitle>
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 flex-shrink-0" />
            </CardHeader>
            <div className="px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="text-xl sm:text-2xl font-bold text-green-600">
                {procedures.filter(p => p.payment_status === 'paid').length}
              </div>
            </div>
          </Card>
        </div>

        {/* Solicitações Pendentes */}
        {pendingRequests.length > 0 && (
          <Card className="mb-4 sm:mb-6">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold text-gray-900 flex items-center">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-amber-600" />
                <span className="truncate">Solicitações de Vinculação ({pendingRequests.length})</span>
              </CardTitle>
            </CardHeader>
            <div className="p-4 sm:p-6">
              <div className="space-y-3 sm:space-y-4">
                {pendingRequests.map((request) => (
                  <div key={request.id} className="p-3 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start justify-between gap-3 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-yellow-900 mb-1 text-sm sm:text-base">
                          {request.anestesista_name}
                        </h3>
                        <div className="flex items-center text-sm text-yellow-800 mb-2">
                          <Mail className="w-4 h-4 mr-1 flex-shrink-0" />
                          <span className="truncate">{request.anestesista_email}</span>
                        </div>
                        <p className="text-xs text-yellow-700">
                          Deseja vincular você como secretária
                        </p>
                      </div>
                      <div className="flex space-x-2 flex-shrink-0">
                        <Button
                          size="sm"
                          onClick={() => handleAcceptRequest(request.id)}
                          disabled={isProcessingRequest === request.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {isProcessingRequest === request.id ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectRequest(request.id)}
                          disabled={isProcessingRequest === request.id}
                          className="border-red-300 text-red-600 hover:bg-red-50"
                        >
                          {isProcessingRequest === request.id ? (
                            <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Anestesistas Vinculados */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold text-gray-900 flex items-center">
              <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-teal-600" />
              <span className="truncate">Anestesistas que me adicionaram ({anestesistas.length})</span>
            </CardTitle>
          </CardHeader>
          <div className="p-4 sm:p-6">
            {anestesistas.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {anestesistas.map((anestesista) => (
                  <div key={anestesista.id} className="p-3 sm:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <UserCheck className="w-5 h-5 text-teal-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 text-sm sm:text-base truncate">{anestesista.name}</h3>
                        <p className="text-xs sm:text-sm text-gray-600 truncate">{anestesista.specialty || 'Anestesiologista'}</p>
                        <p className="text-xs text-gray-500 truncate">CRM: {anestesista.crm || 'N/A'}</p>
                        <p className="text-xs text-gray-500 truncate break-all">{anestesista.email}</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                        <p className="text-xs sm:text-sm text-gray-600">
                          Procedimentos: <span className="font-semibold">{procedures.filter(p => p.users.id === anestesista.id).length}</span>
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/secretaria/anestesista/${anestesista.id}`)}
                          className="text-xs w-full sm:w-auto"
                        >
                          Ver Procedimentos
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <UserCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum anestesista vinculado</h3>
                <p className="text-gray-600">
                  Quando um anestesista adicionar você como secretaria, ele aparecerá aqui.
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Filters */}
        <Card className="mb-4 sm:mb-6">
          <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por paciente, procedimento ou anestesista..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  icon={<Search className="w-4 h-4" />}
                />
              </div>
              <div className="sm:w-48">
                <select
                  value={anestesistaFilter}
                  onChange={(e) => setAnestesistaFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="all">Todos os anestesistas</option>
                  {anestesistas.map((anestesista) => (
                    <option key={anestesista.id} value={anestesista.id}>
                      {anestesista.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:w-48">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="all">Todos os status</option>
                  <option value="pending">Pendente</option>
                  <option value="paid">Pago</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* Procedures List */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold text-gray-900 flex items-center">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-teal-600" />
              <span className="truncate">Procedimentos ({filteredProcedures.length})</span>
            </CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Paciente
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Procedimento
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Anestesista
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProcedures.map((procedure) => (
                    <tr key={procedure.id} className="hover:bg-gray-50">
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {procedure.patient_name}
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <div className="text-sm text-gray-900 break-words max-w-xs">
                          {procedure.procedure_name}
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {procedure.users.name}
                        </div>
                        <div className="text-xs text-gray-500 truncate max-w-[200px]">
                          {procedure.users.email}
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(procedure.procedure_date)}
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(procedure.procedure_value)}
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(procedure.payment_status)}
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => router.push(`/secretaria/procedimentos/${procedure.id}`)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-200">
              {filteredProcedures.map((procedure) => (
                <div key={procedure.id} className="p-3 sm:p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {procedure.patient_name}
                      </h3>
                      <p className="text-xs text-gray-600 mt-1 break-words">
                        {procedure.procedure_name}
                      </p>
                    </div>
                    <div className="ml-2 flex-shrink-0">
                      {getStatusBadge(procedure.payment_status)}
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Anestesista:</span>
                      <span className="text-gray-900 font-medium truncate ml-2 max-w-[60%]">
                        {procedure.users.name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Data:</span>
                      <span className="text-gray-900">{formatDate(procedure.procedure_date)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Valor:</span>
                      <span className="text-gray-900 font-semibold">{formatCurrency(procedure.procedure_value)}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => router.push(`/secretaria/procedimentos/${procedure.id}`)}
                      className="w-full"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Editar Procedimento
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            {filteredProcedures.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum procedimento encontrado</h3>
                <p className="text-gray-600">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Tente ajustar os filtros de busca.' 
                    : 'Você ainda não tem procedimentos vinculados.'}
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

export default function SecretariaDashboard() {
  const { secretaria, isLoading } = useSecretariaAuth()
  
  if (isLoading) {
    return (
      <div className="min-h-screen user-area-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }
  
  return (
    <SecretariaNotificationsProvider secretariaId={secretaria?.id || null}>
      <SecretariaDashboardContent />
    </SecretariaNotificationsProvider>
  )
}
