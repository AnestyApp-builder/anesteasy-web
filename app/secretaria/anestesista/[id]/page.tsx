'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  UserCheck, 
  FileText, 
  Calendar,
  Edit,
  Search,
  Filter,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useSecretariaAuth } from '@/contexts/SecretariaAuthContext'

interface Anestesista {
  id: string
  name: string
  email: string
  specialty: string
  crm: string
  created_at: string
}

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

export default function AnestesistaProcedimentos({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const { secretaria, isLoading: authLoading } = useSecretariaAuth()
  const [anestesista, setAnestesista] = useState<Anestesista | null>(null)
  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [filteredProcedures, setFilteredProcedures] = useState<Procedure[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const loadData = async () => {
      if (authLoading) {
        return
      }

      if (!secretaria) {
        router.push('/secretaria/login')
        return
      }

      try {
        const anestesistaId = resolvedParams.id
        console.log('🔍 [ANESTESISTA PROCEDIMENTOS] Carregando dados...')
        console.log('   Anestesista ID:', anestesistaId)
        console.log('   Secretaria ID:', secretaria.id)

        // Verificar se a secretaria tem acesso a este anestesista
        const { data: linkData, error: linkError } = await supabase
          .from('anestesista_secretaria')
          .select('*')
          .eq('secretaria_id', secretaria.id)
          .eq('anestesista_id', anestesistaId)
          .maybeSingle()

        console.log('📋 [ANESTESISTA PROCEDIMENTOS] Link data:', linkData)
        console.log('   Link error:', linkError)

        if (linkError) {
          console.error('❌ [ANESTESISTA PROCEDIMENTOS] Erro ao verificar link:', linkError)
          setError('Erro ao verificar acesso')
          setIsLoading(false)
          return
        }

        if (!linkData) {
          console.warn('⚠️ [ANESTESISTA PROCEDIMENTOS] Link não encontrado')
          setError('Você não tem acesso aos procedimentos deste anestesista')
          setIsLoading(false)
          return
        }

        // Buscar dados do anestesista
        const { data: anestesistaData, error: anestesistaError } = await supabase
          .from('users')
          .select('*')
          .eq('id', anestesistaId)
          .single()

        if (anestesistaError || !anestesistaData) {
          console.error('❌ [ANESTESISTA PROCEDIMENTOS] Erro ao buscar anestesista:', anestesistaError)
          setError('Anestesista não encontrado')
          setIsLoading(false)
          return
        }

        console.log('✅ [ANESTESISTA PROCEDIMENTOS] Anestesista encontrado:', anestesistaData.name)
        setAnestesista(anestesistaData)

        // Buscar apenas procedimentos do anestesista que foram vinculados a esta secretária
        // A secretária só tem acesso a procedimentos que foram explicitamente vinculados a ela
        // através do campo "Adicionar Secretaria" no formulário de criação
        console.log('🔍 [ANESTESISTA PROCEDIMENTOS] Buscando procedimentos vinculados...')
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
          .eq('user_id', anestesistaId)
          .eq('secretaria_id', secretaria.id)
          .order('procedure_date', { ascending: false })

        console.log('📦 [ANESTESISTA PROCEDIMENTOS] Resultado:', {
          proceduresData,
          proceduresError,
          count: proceduresData?.length || 0
        })

        if (proceduresError) {
          console.error('❌ [ANESTESISTA PROCEDIMENTOS] Erro ao buscar procedimentos:', proceduresError)
          setError('Erro ao carregar procedimentos')
          setIsLoading(false)
          return
        }

        console.log('✅ [ANESTESISTA PROCEDIMENTOS] Procedimentos carregados:', proceduresData?.length || 0)
        setProcedures(proceduresData || [])
        setFilteredProcedures(proceduresData || [])
      } catch (error) {
        console.error('❌ [ANESTESISTA PROCEDIMENTOS] Erro interno:', error)
        setError('Erro interno')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [resolvedParams.id, secretaria, authLoading, router])

  // Filtrar procedimentos
  useEffect(() => {
    let filtered = procedures

    // Filtrar por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(procedure =>
        procedure.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        procedure.procedure_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filtrar por status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(procedure => procedure.payment_status === statusFilter)
    }

    setFilteredProcedures(filtered)
  }, [procedures, searchTerm, statusFilter])

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'pending': { label: 'Pendente', color: 'bg-amber-500 text-white' },
      'paid': { label: 'Pago', color: 'bg-green-500 text-white' },
      'cancelled': { label: 'Cancelado', color: 'bg-red-500 text-white' }
    }
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, color: 'bg-gray-500 text-white' }
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
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
            <CardTitle className="text-center text-red-600 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              Erro
            </CardTitle>
          </CardHeader>
          <div className="p-6">
            <Alert>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={() => router.push('/secretaria/dashboard')} className="w-full mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Dashboard
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
          <div className="flex items-center h-14 sm:h-16">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/secretaria/dashboard')}
              className="mr-2 sm:mr-4 bg-white/10 border-white/20 text-white hover:bg-white/20 p-2 sm:px-3"
            >
              <ArrowLeft className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Voltar</span>
            </Button>
            <h1 className="text-base sm:text-xl font-semibold text-white truncate flex-1">
              Procedimentos do Anestesista
            </h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 lg:py-6 xl:py-8">
        {/* Anestesista Info */}
        {anestesista && (
          <Card className="mb-4 sm:mb-6">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold text-gray-900 flex items-center">
                <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-teal-600" />
                <span className="truncate">Informações do Anestesista</span>
              </CardTitle>
            </CardHeader>
            <div className="p-4 sm:p-6">
              <div className="flex items-start sm:items-center space-x-3 sm:space-x-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <UserCheck className="w-6 h-6 sm:w-8 sm:h-8 text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">{anestesista.name}</h2>
                  <p className="text-sm sm:text-base text-gray-600 truncate">{anestesista.specialty || 'Anestesiologista'}</p>
                  <p className="text-xs sm:text-sm text-gray-500 truncate">CRM: {anestesista.crm || 'N/A'}</p>
                  <p className="text-xs sm:text-sm text-gray-500 break-words">{anestesista.email}</p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
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

        {/* Filters */}
        <Card className="mb-4 sm:mb-6">
          <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por paciente ou procedimento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  icon={<Search className="w-4 h-4" />}
                />
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
            {filteredProcedures.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum procedimento encontrado</h3>
                <p className="text-gray-600">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Tente ajustar os filtros de busca.' 
                    : 'Este anestesista ainda não tem procedimentos cadastrados.'}
                </p>
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
