'use client'

import { useEffect, useState } from 'react'
import { systemStatsService, SystemStats } from '@/lib/system-stats'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  Users, 
  RefreshCw,
  TrendingUp,
  Calendar
} from 'lucide-react'

export default function AdminStatsPage() {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<string>('')

  const loadStats = async () => {
    setIsLoading(true)
    try {
      const data = await systemStatsService.getStats()
      setStats(data)
      if (data?.last_updated) {
        setLastUpdate(new Date(data.last_updated).toLocaleString('pt-BR'))
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await systemStatsService.refreshStats()
      await loadStats()
    } catch (error) {
      console.error('Erro ao atualizar estatísticas:', error)
    } finally {
      setIsRefreshing(false)
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

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600">Carregando estatísticas detalhadas...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-red-600 mb-4">Erro ao carregar estatísticas</p>
          <Button onClick={loadStats}>Tentar novamente</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Estatísticas do Sistema
          </h1>
          {lastUpdate && (
            <p className="text-sm text-gray-500">
              Última atualização: {lastUpdate}
            </p>
          )}
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Grid de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Usuários */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Usuários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total:</span>
                <span className="text-2xl font-bold text-gray-900">
                  {stats.total_users}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Ativos (30 dias):</span>
                <span className="text-xl font-semibold text-green-600">
                  {stats.active_users}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Pagando:</span>
                <span className="text-xl font-semibold text-blue-600">
                  {stats.paying_users}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Médicos/Anestesistas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-green-500" />
              Médicos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total:</span>
                <span className="text-2xl font-bold text-gray-900">
                  {stats.total_medicos}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Ativos (30 dias):</span>
                <span className="text-xl font-semibold text-green-600">
                  {stats.active_medicos}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>


        {/* Procedimentos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-500" />
              Procedimentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total:</span>
                <span className="text-2xl font-bold text-gray-900">
                  {stats.total_procedures}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Este mês:
                </span>
                <span className="text-xl font-semibold text-blue-600">
                  {stats.procedures_this_month}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  Este ano:
                </span>
                <span className="text-xl font-semibold text-green-600">
                  {stats.procedures_this_year}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assinaturas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-500" />
              Assinaturas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total:</span>
                <span className="text-2xl font-bold text-gray-900">
                  {stats.total_subscriptions}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Ativas:</span>
                <span className="text-xl font-semibold text-green-600">
                  {stats.active_subscriptions}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Pendentes:</span>
                <span className="text-xl font-semibold text-yellow-600">
                  {stats.pending_subscriptions}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumo */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Resumo Geral</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Usuários Ativos</p>
              <p className="text-2xl font-bold text-green-600">
                {stats.active_users}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Usuários Pagando</p>
              <p className="text-2xl font-bold text-blue-600">
                {stats.paying_users}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Procedimentos (Mês)</p>
              <p className="text-2xl font-bold text-orange-600">
                {stats.procedures_this_month}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

