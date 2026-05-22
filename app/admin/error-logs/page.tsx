'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/badge'
import { 
  AlertCircle, 
  RefreshCw, 
  Search, 
  Filter,
  ChevronLeft,
  ChevronRight,
  Bug,
  TestTube,
  Bell,
  BellOff,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/contexts/ToastContext'

interface AppError {
  id: string
  user_id: string | null
  screen: string
  action: string
  error_message: string
  device: string
  app_version: string
  created_at: string
  users?: {
    id: string
    name: string
    email: string
  } | null
}

interface ErrorFilters {
  userId: string
  screen: string
  dateRange: '24h' | '7d' | '30d' | 'all'
  appVersion: string
}

export default function AdminErrorLogs() {
  const [errors, setErrors] = useState<AppError[]>([])
  const [filteredErrors, setFilteredErrors] = useState<AppError[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [realtimeEnabled, setRealtimeEnabled] = useState(false)
  const itemsPerPage = 20
  const { addToast } = useToast()

  const [filters, setFilters] = useState<ErrorFilters>({
    userId: '',
    screen: '',
    dateRange: 'all',
    appVersion: ''
  })

  const [availableScreens, setAvailableScreens] = useState<string[]>([])
  const [availableVersions, setAvailableVersions] = useState<string[]>([])
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; name: string; email: string }>>([])

  // Carregar erros do banco via API (bypass RLS)
  const loadErrors = useCallback(async () => {
    try {
      setIsLoading(true)
      setIsRefreshing(true)

      // Obter token de sessão
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        addToast({
          title: 'Erro de autenticação',
          description: 'Sessão expirada. Faça login novamente.',
          variant: 'error'
        })
        setIsLoading(false)
        setIsRefreshing(false)
        return
      }

      // Construir URL com filtros
      const params = new URLSearchParams()
      if (filters.userId) params.append('userId', filters.userId)
      if (filters.screen) params.append('screen', filters.screen)
      if (filters.dateRange) params.append('dateRange', filters.dateRange)
      if (filters.appVersion) params.append('appVersion', filters.appVersion)

      // Buscar via API route (usa Service Role Key, bypass RLS)
      const response = await fetch(`/api/admin/error-logs?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao carregar logs')
      }

      const result = await response.json()
      const data = result.data || []

      setErrors(data as AppError[])
      
      // Calcular paginação
      const total = data.length
      setTotalPages(Math.ceil(total / itemsPerPage))
      
      // Resetar página se necessário
      if (currentPage > Math.ceil(total / itemsPerPage) && total > 0) {
        setCurrentPage(1)
      }
    } catch (error) {
      console.error('❌ Erro ao carregar logs:', error)
      addToast({
        title: 'Erro ao carregar logs',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'error'
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [filters, addToast, currentPage])

  // Carregar opções de filtro
  const loadFilterOptions = useCallback(async () => {
    try {
      // Carregar telas únicas
      const { data: screensData } = await supabase
        .from('app_errors')
        .select('screen')
        .order('screen')

      if (screensData) {
        const uniqueScreens = [...new Set(screensData.map(s => s.screen))].sort()
        setAvailableScreens(uniqueScreens)
      }

      // Carregar versões únicas
      const { data: versionsData } = await supabase
        .from('app_errors')
        .select('app_version')
        .order('app_version', { ascending: false })

      if (versionsData) {
        const uniqueVersions = [...new Set(versionsData.map(v => v.app_version))].sort()
        setAvailableVersions(uniqueVersions)
      }

      // Carregar usuários que têm erros (sem join para evitar recursão RLS)
      // Buscar apenas user_ids únicos e depois buscar dados dos usuários via API
      const { data: errorsData } = await supabase
        .from('app_errors')
        .select('user_id')
        .not('user_id', 'is', null)

      if (errorsData) {
        const uniqueUserIds = [...new Set(errorsData.map(e => e.user_id).filter(Boolean))]
        
        // Buscar dados dos usuários via API admin (bypass RLS)
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          try {
            const response = await fetch('/api/admin/get-users', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
              body: JSON.stringify({ userIds: uniqueUserIds })
            })

            if (response.ok) {
              const result = await response.json()
              if (result.data) {
                setAvailableUsers(result.data)
              }
            }
          } catch (error) {
            console.warn('⚠️ Erro ao carregar usuários para filtro:', error)
          }
        }
      }
    } catch (error) {
      console.error('❌ Erro ao carregar opções de filtro:', error)
    }
  }, [])

  // Aplicar filtros e paginação
  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    setFilteredErrors(errors.slice(startIndex, endIndex))
  }, [errors, currentPage])

  // Carregar dados iniciais
  useEffect(() => {
    loadFilterOptions()
  }, [loadFilterOptions])

  useEffect(() => {
    loadErrors()
  }, [loadErrors])

  // Configurar realtime
  useEffect(() => {
    if (!realtimeEnabled) return

    const channel = supabase
      .channel('app_errors_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'app_errors'
        },
        (payload) => {
          const newError = payload.new as AppError
          
          addToast({
            title: 'Novo erro registrado',
            description: `${newError.screen}: ${newError.error_message.substring(0, 50)}...`,
            variant: 'error',
            duration: 8000
          })

          // Recarregar erros
          loadErrors()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [realtimeEnabled, loadErrors, addToast])

  // Função para gerar erro de teste
  const generateTestError = async () => {
    try {
      // Obter token de sessão
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        addToast({
          title: 'Erro de autenticação',
          description: 'Sessão expirada. Faça login novamente.',
          variant: 'error'
        })
        return
      }

      // Inserir via API (bypass RLS)
      const response = await fetch('/api/admin/error-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          user_id: null,
          screen: 'TestScreen',
          action: 'TestAction',
          error_message: 'Erro de teste gerado pelo administrador',
          device: 'web',
          app_version: 'test'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao gerar teste')
      }

      addToast({
        title: 'Erro de teste gerado',
        description: 'Um novo erro de teste foi adicionado aos logs',
        variant: 'success'
      })

      // Recarregar erros
      await loadErrors()
    } catch (error) {
      addToast({
        title: 'Erro ao gerar teste',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'error'
      })
    }
  }

  // Formatar data
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Limpar filtros
  const clearFilters = () => {
    setFilters({
      userId: '',
      screen: '',
      dateRange: 'all',
      appVersion: ''
    })
    setCurrentPage(1)
  }

  return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <Link href="/admin/dashboard" className="flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-1 sm:gap-2 text-gray-600 hover:text-gray-900 p-1 sm:p-2"
                  >
                    <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Voltar</span>
                  </Button>
                </Link>
                <Bug className="w-6 h-6 sm:w-8 sm:h-8 text-red-600 flex-shrink-0" />
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Logs de Erro</h1>
                  <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Monitoramento de erros do aplicativo</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto flex-wrap">
                <Button
                  onClick={() => setRealtimeEnabled(!realtimeEnabled)}
                  variant={realtimeEnabled ? "default" : "outline"}
                  size="sm"
                  className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm flex-1 sm:flex-initial"
                >
                  {realtimeEnabled ? (
                    <>
                      <Bell className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Realtime Ativo</span>
                      <span className="sm:hidden">Ativo</span>
                    </>
                  ) : (
                    <>
                      <BellOff className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Ativar Realtime</span>
                      <span className="sm:hidden">Realtime</span>
                    </>
                  )}
                </Button>
                <Button
                  onClick={generateTestError}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm flex-1 sm:flex-initial"
                >
                  <TestTube className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Gerar Erro de Teste</span>
                  <span className="sm:hidden">Teste</span>
                </Button>
                <Button
                  onClick={(e) => {
                    e.preventDefault()
                    loadErrors()
                  }}
                  disabled={isRefreshing || isLoading}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm flex-1 sm:flex-initial"
                >
                  <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${isRefreshing || isLoading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{isRefreshing || isLoading ? 'Atualizando...' : 'Atualizar'}</span>
                  <span className="sm:hidden">{isRefreshing || isLoading ? '...' : 'Atualizar'}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filtros */}
          <Card className="mb-6 border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Filter className="w-5 h-5 text-blue-500" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Filtro de Usuário */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Usuário
                  </label>
                  <select
                    value={filters.userId}
                    onChange={(e) => {
                      setFilters({ ...filters, userId: e.target.value })
                      setCurrentPage(1)
                    }}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    <option value="">Todos os usuários</option>
                    {availableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtro de Tela */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Tela
                  </label>
                  <select
                    value={filters.screen}
                    onChange={(e) => {
                      setFilters({ ...filters, screen: e.target.value })
                      setCurrentPage(1)
                    }}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    <option value="">Todas as telas</option>
                    {availableScreens.map((screen) => (
                      <option key={screen} value={screen}>
                        {screen}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtro de Data */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Período
                  </label>
                  <select
                    value={filters.dateRange}
                    onChange={(e) => {
                      setFilters({ ...filters, dateRange: e.target.value as ErrorFilters['dateRange'] })
                      setCurrentPage(1)
                    }}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    <option value="all">Todos</option>
                    <option value="24h">Últimas 24 horas</option>
                    <option value="7d">Últimos 7 dias</option>
                    <option value="30d">Últimos 30 dias</option>
                  </select>
                </div>

                {/* Filtro de Versão */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Versão do App
                  </label>
                  <select
                    value={filters.appVersion}
                    onChange={(e) => {
                      setFilters({ ...filters, appVersion: e.target.value })
                      setCurrentPage(1)
                    }}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    <option value="">Todas as versões</option>
                    {availableVersions.map((version) => (
                      <option key={version} value={version}>
                        {version}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <Button
                  onClick={clearFilters}
                  variant="outline"
                  size="sm"
                >
                  Limpar Filtros
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Listagem de Erros */}
          {isLoading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-500" />
                <p className="text-gray-600">Carregando logs de erro...</p>
              </div>
            </div>
          ) : filteredErrors.length === 0 ? (
            <Card className="border-l-4 border-l-gray-300">
              <CardContent className="py-12 text-center">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Nenhum erro encontrado com os filtros aplicados</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="border-l-4 border-l-red-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    Erros ({errors.length} total)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Usuário</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Tela</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Ação</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Mensagem</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Versão</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Device</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Data/Hora</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredErrors.map((error) => (
                          <tr key={error.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              {error.users ? (
                                <div>
                                  <div className="font-medium text-gray-900">{error.users.name}</div>
                                  <div className="text-xs text-gray-500">{error.users.email}</div>
                                </div>
                              ) : (
                                <span className="text-gray-400">Anônimo</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="outline">{error.screen}</Badge>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-700">{error.action}</td>
                            <td className="py-3 px-4">
                              <div className="max-w-md">
                                <p className="text-sm text-gray-900 truncate" title={error.error_message}>
                                  {error.error_message}
                                </p>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="secondary">{error.app_version}</Badge>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant={error.device === 'web' ? 'default' : 'outline'}>
                                {error.device}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {formatDate(error.created_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Página {currentPage} de {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      variant="outline"
                      size="sm"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Anterior
                    </Button>
                    <Button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      variant="outline"
                      size="sm"
                    >
                      Próxima
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
  )
}

