'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  Users, 
  Stethoscope, 
  FileText,
  RefreshCw,
  TrendingUp,
  Activity,
  Clock,
  Gift,
  CreditCard,
  XCircle,
  Bug,
  TestTube,
  Hospital
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { logError } from '@/lib/logError'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'

interface DashboardStats {
  totalUsers: number
  activeUsers: number
  totalAnestesistas: number
  totalProcedures: number
  proceduresLast24h: number
  proceduresLast30Days: number
  proceduresThisMonth: number
  topHospitals: Array<{ name: string; count: number }>
  topSurgeons: Array<{ name: string; count: number }>
  recentLogins: Array<{
    id: string
    email: string
    name?: string
    last_login_at: string | null
    created_at?: string
  }>
  registerClicks: number
  freeTrialUsers: number
  paidUsers: number
  unpaidUsers: number
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
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) return

      const statsData = await response.json()
      
      setStats({
        totalUsers: statsData.totalUsers || 0,
        activeUsers: statsData.activeUsers || 0,
        totalAnestesistas: statsData.totalAnestesistas || 0,
        totalProcedures: statsData.totalProcedures || 0,
        proceduresLast24h: statsData.proceduresLast24h || 0,
        proceduresLast30Days: statsData.proceduresLast30Days || 0,
        proceduresThisMonth: statsData.proceduresThisMonth || 0,
        topHospitals: statsData.topHospitals || [],
        topSurgeons: statsData.topSurgeons || [],
        recentLogins: statsData.recentLogins || [],
        registerClicks: statsData.registerClicks || 0,
        freeTrialUsers: Number(statsData.freeTrialUsers) || 0,
        paidUsers: Number(statsData.paidUsers) || 0,
        unpaidUsers: Number(statsData.unpaidUsers) || 0
      })
    } catch (error) {
      console.error('❌ [ADMIN DASHBOARD] Erro:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadStats()
    setIsRefreshing(false)
  }



  const handleGenerateTestError = async () => {
    if (isGeneratingError) return
    setIsGeneratingError(true)
    try {
      const success = await logError({
        screen: 'AdminDashboard',
        action: 'generateTestError',
        message: `Erro de teste - ${new Date().toISOString()}`,
        userId: user?.id || null,
        device: 'web',
        version: '1.0.0'
      })
      addToast({
        type: success ? 'success' : 'error',
        message: success ? 'Erro gerado com sucesso!' : 'Erro ao gerar erro.'
      })
    } finally {
      setIsGeneratingError(false)
    }
  }

  useEffect(() => {
    loadStats()
    const interval = setInterval(loadStats, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return (
      <div className="min-h-screen bg-slate-50 font-sans">
        {/* Header Premium */}
        <div className="bg-white border-b border-slate-200/80 shadow-sm sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Painel Executivo</h1>
                <span className="bg-teal-50 text-teal-700 text-xs font-bold px-2 py-0.5 rounded-full border border-teal-100">Visão Geral</span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Estatísticas globais e métricas de engajamento em tempo real</p>
            </div>
            <Button onClick={handleRefresh} disabled={isRefreshing} variant="outline" size="sm" className="rounded-xl border-slate-200 hover:bg-slate-50 font-semibold text-xs transition-all shadow-sm">
              <RefreshCw className={`w-3.5 h-3.5 mr-2 text-teal-600 ${isRefreshing ? 'animate-spin' : ''}`} />
              Sincronizar Dados
            </Button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          {isLoading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <RefreshCw className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : stats ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <Card className="border-l-4 border-l-blue-500">
                  <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-blue-500" /> Usuários Ativos</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats.activeUsers}</div>
                    <p className="text-sm text-gray-500">de {stats.totalUsers} total</p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                  <CardHeader><CardTitle className="flex items-center gap-2"><Stethoscope className="w-5 h-5 text-green-500" /> Anestesistas</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats.totalAnestesistas}</div>
                    <p className="text-sm text-gray-500">Cadastrados</p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500">
                  <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-orange-500" /> Procedimentos</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats.totalProcedures}</div>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-gray-500 flex justify-between">
                        <span>Últimas 24h:</span>
                        <span className="font-semibold text-slate-700">{stats.proceduresLast24h}</span>
                      </p>
                      <p className="text-sm text-gray-500 flex justify-between">
                        <span>Últimos 30 dias:</span>
                        <span className="font-semibold text-slate-700">{stats.proceduresLast30Days}</span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="border-l-4 border-l-blue-500">
                  <CardHeader><CardTitle className="flex items-center gap-2"><Gift className="w-5 h-5 text-blue-500" /> Free Trial</CardTitle></CardHeader>
                  <CardContent><div className="text-3xl font-bold">{stats.freeTrialUsers}</div></CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-500">
                  <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-green-500" /> Assinantes Pagos</CardTitle></CardHeader>
                  <CardContent><div className="text-3xl font-bold">{stats.paidUsers}</div></CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-500">
                  <CardHeader><CardTitle className="flex items-center gap-2"><XCircle className="w-5 h-5 text-red-500" /> Sem Pagamento</CardTitle></CardHeader>
                  <CardContent><div className="text-3xl font-bold">{stats.unpaidUsers}</div></CardContent>
                </Card>
              </div>

              <div className="mb-8 flex gap-4">
                <Link href="/admin/error-logs">
                  <Button variant="outline"><Bug className="w-4 h-4 mr-2" /> Logs de Erro</Button>
                </Link>
                <Button variant="outline" onClick={handleGenerateTestError} disabled={isGeneratingError}>
                  <TestTube className="w-4 h-4 mr-2" /> Forçar Erro
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5 text-primary-500" /> Últimos Acessos</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {stats.recentLogins.map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{user.name || user.email}</p>
                            <p className="text-xs text-gray-500">{user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Nunca'}</p>
                          </div>
                          <Activity className="w-4 h-4 text-green-500" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary-500" /> Resumo Rápido</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                      <span>Taxa de Atividade</span>
                      <span className="font-bold">{stats.totalUsers > 0 ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}%</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span>Procedimentos/Mês</span>
                      <span className="font-bold">{stats.proceduresThisMonth}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><Hospital className="w-5 h-5 text-teal-500" /> Top 10 Hospitais</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {stats.topHospitals.map((h, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium text-gray-900">{h.name}</span>
                          <span className="bg-teal-100 text-teal-700 px-2 py-1 rounded text-xs font-bold">{h.count} casos</span>
                        </div>
                      ))}
                      {stats.topHospitals.length === 0 && <p className="text-gray-500 text-center py-4">Nenhum dado disponível</p>}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-blue-500" /> Top 10 Cirurgiões</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {stats.topSurgeons.map((s, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium text-gray-900">{s.name}</span>
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">{s.count} casos</span>
                        </div>
                      ))}
                      {stats.topSurgeons.length === 0 && <p className="text-gray-500 text-center py-4">Nenhum dado disponível</p>}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : null}
        </div>
      </div>
  )
}
