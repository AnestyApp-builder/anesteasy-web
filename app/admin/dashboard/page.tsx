'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AdminProtectedRoute } from '@/components/auth/AdminProtectedRoute'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  Users, 
  UserCheck, 
  Stethoscope, 
  FileText,
  RefreshCw,
  TrendingUp,
  Calendar,
  Shield,
  LogOut,
  Activity,
  Clock,
  Gift,
  CreditCard,
  XCircle,
  Bug,
  TestTube
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { logError } from '@/lib/logError'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'

interface DashboardStats {
  totalUsers: number
  activeUsers: number
  totalSecretarias: number
  activeSecretarias: number
  totalAnestesistas: number
  totalProcedures: number
  proceduresThisMonth: number
  recentLogins: Array<{
    id: string
    email: string
    name?: string
    last_login_at: string | null
    created_at?: string
  }>
  registerClicks: number // Será implementado depois
  // Estatísticas de subscription (apenas anestesistas)
  freeTrialUsers: number // Usuários em trial ativo
  paidUsers: number // Usuários com subscription ativa e paga
  unpaidUsers: number // Usuários sem pagamento (trial expirado ou sem subscription)
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isGeneratingError, setIsGeneratingError] = useState(false)
  const router = useRouter()
  const { user } = useAuth()
  const { addToast } = useToast()

  const loadStats = async () => {
    try {
      // Obter token de sessão para autenticação
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        console.error('❌ [ADMIN DASHBOARD] Sem sessão')
        return
      }

      // Buscar estatísticas via API (usa Service Role Key, bypass RLS)
      const response = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        console.error('❌ [ADMIN DASHBOARD] Erro ao buscar estatísticas:', response.status)
        return
      }

      const statsData = await response.json()
      
      console.log('📊 [ADMIN DASHBOARD] Estatísticas recebidas:', statsData)
      console.log('📊 [ADMIN DASHBOARD] Subscription stats:', {
        freeTrialUsers: statsData.freeTrialUsers,
        paidUsers: statsData.paidUsers,
        unpaidUsers: statsData.unpaidUsers
      })

      const subscriptionStats = {
        freeTrialUsers: Number(statsData.freeTrialUsers) || 0,
        paidUsers: Number(statsData.paidUsers) || 0,
        unpaidUsers: Number(statsData.unpaidUsers) || 0
      }

      console.log('📊 [ADMIN DASHBOARD] Subscription stats processados:', subscriptionStats)

      setStats({
        totalUsers: statsData.totalUsers || 0,
        activeUsers: statsData.activeUsers || 0,
        totalSecretarias: statsData.totalSecretarias || 0,
        activeSecretarias: statsData.activeSecretarias || 0,
        totalAnestesistas: statsData.totalAnestesistas || 0,
        totalProcedures: statsData.totalProcedures || 0,
        proceduresThisMonth: statsData.proceduresThisMonth || 0,
        recentLogins: statsData.recentLogins || [],
        registerClicks: statsData.registerClicks || 0,
        ...subscriptionStats
      })
    } catch (error) {
      console.error('❌ [ADMIN DASHBOARD] Erro ao carregar estatísticas:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadStats()
    setIsRefreshing(false)
  }

  const handleLogout = async (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    
    if (isLoggingOut) {
      return // Prevenir múltiplos cliques
    }
    
    setIsLoggingOut(true)
    
    try {
      console.log('🚪 [ADMIN DASHBOARD] Iniciando logout...')
      
      // Fazer logout no Supabase
      const { error: signOutError } = await supabase.auth.signOut()
      
      if (signOutError) {
        console.error('❌ [ADMIN DASHBOARD] Erro ao fazer logout:', signOutError)
        // Continuar mesmo com erro
      } else {
        console.log('✅ [ADMIN DASHBOARD] Logout bem-sucedido')
      }
      
      // Limpar localStorage
      if (typeof window !== 'undefined') {
        // Limpar cookies do Supabase primeiro
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth')) {
            localStorage.removeItem(key)
          }
        })
        // Limpar outros dados
        localStorage.removeItem('currentUser')
        localStorage.removeItem('isEmailConfirmed')
      }
      
      // Aguardar um momento antes de redirecionar
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Redirecionar para tela inicial do app
      // Usar window.location para forçar reload completo
      window.location.href = '/'
      
    } catch (error) {
      console.error('❌ [ADMIN DASHBOARD] Erro no logout:', error)
      // Mesmo com erro, redirecionar para tela inicial
      window.location.href = '/'
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleGenerateTestError = async () => {
    if (isGeneratingError) return
    
    setIsGeneratingError(true)
    
    try {
      const timestamp = new Date().toISOString()
      const success = await logError({
        screen: 'AdminDashboard',
        action: 'generateTestError',
        message: `Erro de teste gerado manualmente - ${timestamp}`,
        userId: user?.id || null,
        device: 'web',
        version: '1.0.0'
      })

      if (success) {
        addToast({
          type: 'success',
          message: 'Erro de teste gerado com sucesso! Verifique a página de logs de erro.'
        })
      } else {
        addToast({
          type: 'error',
          message: 'Erro ao gerar erro de teste. Tente novamente.'
        })
      }
    } catch (error) {
      console.error('❌ [ADMIN DASHBOARD] Erro ao gerar erro de teste:', error)
      addToast({
        type: 'error',
        message: 'Erro ao gerar erro de teste. Tente novamente.'
      })
    } finally {
      setIsGeneratingError(false)
    }
  }

  useEffect(() => {
    loadStats()
    
    // Atualizar a cada 5 minutos
    const interval = setInterval(() => {
      loadStats()
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-red-600 flex-shrink-0" />
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Painel Administrativo</h1>
                  <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Gestão e monitoramento do sistema</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <Button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1 sm:gap-2 flex-1 sm:flex-initial text-xs sm:text-sm"
                >
                  <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Atualizar</span>
                </Button>
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  size="sm"
                  disabled={isLoggingOut}
                  className="flex items-center gap-1 sm:gap-2 text-red-600 hover:text-red-700 flex-1 sm:flex-initial text-xs sm:text-sm"
                  type="button"
                >
                  <LogOut className={`w-3 h-3 sm:w-4 sm:h-4 ${isLoggingOut ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{isLoggingOut ? 'Saindo...' : 'Sair'}</span>
                  <span className="sm:hidden">{isLoggingOut ? '...' : 'Sair'}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {isLoading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-500" />
                <p className="text-gray-600">Carregando estatísticas do sistema...</p>
              </div>
            </div>
          ) : stats ? (
            <>
              {/* Grid de Estatísticas Principais */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                {/* Usuários Ativos */}
                <Card className="border-l-4 border-l-blue-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Users className="w-5 h-5 text-blue-500" />
                      Usuários Ativos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                      {stats.activeUsers}
                    </div>
                    <p className="text-sm text-gray-500">
                      de {stats.totalUsers} total (últimos 30 dias)
                    </p>
                  </CardContent>
                </Card>

                {/* Secretárias */}
                <Card className="border-l-4 border-l-purple-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <UserCheck className="w-5 h-5 text-purple-500" />
                      Secretárias
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                      {stats.totalSecretarias}
                    </div>
                    <p className="text-sm text-gray-500">
                      {stats.activeSecretarias} ativas
                    </p>
                  </CardContent>
                </Card>

                {/* Anestesistas */}
                <Card className="border-l-4 border-l-green-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Stethoscope className="w-5 h-5 text-green-500" />
                      Anestesistas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                      {stats.totalAnestesistas}
                    </div>
                    <p className="text-sm text-gray-500">
                      Cadastrados no sistema
                    </p>
                  </CardContent>
                </Card>

                {/* Procedimentos */}
                <Card className="border-l-4 border-l-orange-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FileText className="w-5 h-5 text-orange-500" />
                      Procedimentos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                      {stats.totalProcedures}
                    </div>
                    <p className="text-sm text-gray-500">
                      {stats.proceduresThisMonth} este mês
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Grid de Estatísticas de Subscription (Anestesistas) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Free Trial */}
                <Card className="border-l-4 border-l-blue-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Gift className="w-5 h-5 text-blue-500" />
                      Free Trial
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                      {stats.freeTrialUsers ?? 0}
                    </div>
                    <p className="text-sm text-gray-500">
                      Anestesistas em trial ativo
                    </p>
                  </CardContent>
                </Card>

                {/* Pagos */}
                <Card className="border-l-4 border-l-green-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <CreditCard className="w-5 h-5 text-green-500" />
                      Assinantes Pagos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                      {stats.paidUsers ?? 0}
                    </div>
                    <p className="text-sm text-gray-500">
                      Anestesistas com pagamento ativo
                    </p>
                  </CardContent>
                </Card>

                {/* Sem Pagamento */}
                <Card className="border-l-4 border-l-red-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <XCircle className="w-5 h-5 text-red-500" />
                      Sem Pagamento
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                      {stats.unpaidUsers ?? 0}
                    </div>
                    <p className="text-sm text-gray-500">
                      Anestesistas sem assinatura ativa
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Links Rápidos */}
              <div className="mb-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex flex-wrap gap-4">
                      <Link href="/admin/error-logs">
                        <Button variant="outline" className="flex items-center gap-2">
                          <Bug className="w-4 h-4" />
                          Ver Logs de Erro
                        </Button>
                      </Link>
                      <Button 
                        variant="outline" 
                        className="flex items-center gap-2"
                        onClick={handleGenerateTestError}
                        disabled={isGeneratingError}
                      >
                        <TestTube className={`w-4 h-4 ${isGeneratingError ? 'animate-spin' : ''}`} />
                        {isGeneratingError ? 'Gerando...' : 'Forçar Erro de Teste'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Grid de Informações Adicionais */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Últimos Acessos */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-primary-500" />
                      Últimos Acessos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stats.recentLogins.length > 0 ? (
                      <div className="space-y-3">
                        {stats.recentLogins
                          .filter(user => user.last_login_at || user.created_at)
                          .map((user) => {
                            const loginDate = user.last_login_at 
                              ? new Date(user.last_login_at)
                              : user.created_at 
                                ? new Date(user.created_at)
                                : null
                            
                            return (
                              <div
                                key={user.id}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                              >
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {user.name || user.email}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {loginDate 
                                      ? loginDate.toLocaleString('pt-BR')
                                      : 'Nunca acessou'}
                                  </p>
                                  {user.last_login_at && (
                                    <p className="text-xs text-green-600 mt-1">
                                      Último acesso
                                    </p>
                                  )}
                                  {!user.last_login_at && user.created_at && (
                                    <p className="text-xs text-gray-400 mt-1">
                                      Cadastrado em
                                    </p>
                                  )}
                                </div>
                                <Activity className={`w-4 h-4 ${user.last_login_at ? 'text-green-500' : 'text-gray-300'}`} />
                              </div>
                            )
                          })}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">
                        Nenhum acesso recente
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Resumo Rápido */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary-500" />
                      Resumo Rápido
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                        <div className="flex flex-col">
                          <span className="text-gray-700 font-medium">Taxa de Atividade</span>
                          <span className="text-xs text-gray-500">Login nos últimos 30 dias</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-blue-600 text-lg">
                            {stats.totalUsers > 0 
                              ? Math.round((stats.activeUsers / stats.totalUsers) * 100)
                              : 0}%
                          </span>
                          <p className="text-xs text-gray-500 mt-1">
                            {stats.activeUsers} de {stats.totalUsers}
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <span className="text-gray-700">Procedimentos/Mês</span>
                        <span className="font-bold text-green-600">
                          {stats.proceduresThisMonth}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                        <span className="text-gray-700">Secretárias/Anestesistas</span>
                        <span className="font-bold text-purple-600">
                          {stats.totalAnestesistas > 0
                            ? (stats.totalSecretarias / stats.totalAnestesistas).toFixed(2)
                            : '0'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-red-600 mb-4">Erro ao carregar estatísticas</p>
              <Button onClick={loadStats}>Tentar novamente</Button>
            </div>
          )}
        </div>
      </div>
    </AdminProtectedRoute>
  )
}

