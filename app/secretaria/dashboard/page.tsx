'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Users, 
  FileText, 
  DollarSign, 
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
  UserCheck
} from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { useSecretariaAuth } from '@/contexts/SecretariaAuthContext'

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

export default function SecretariaDashboard() {
  const { secretaria, isAuthenticated, isLoading: authLoading, logout } = useSecretariaAuth()
  const [anestesistas, setAnestesistas] = useState<Anestesista[]>([])
  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [filteredProcedures, setFilteredProcedures] = useState<Procedure[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [anestesistaFilter, setAnestesistaFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  // Carregar dados da secretaria e procedimentos
  useEffect(() => {
    const loadData = async () => {
      try {
        // Aguardar a verificação de autenticação
        if (authLoading) {
          return
        }

        // Verificar se a secretaria está autenticada
        if (!isAuthenticated || !secretaria) {
          router.push('/login')
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

        if (anestesistasError) {
          
          setError('Erro ao carregar anestesistas')
          return
        }

        const anestesistasList = anestesistasData?.map(item => item.users).filter(Boolean).flat() || []
        setAnestesistas(anestesistasList)

        // Buscar procedimentos vinculados à secretaria
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

        if (proceduresError) {
          
          setError('Erro ao carregar procedimentos')
          return
        }

        setProcedures(proceduresData || [])
        setFilteredProcedures(proceduresData || [])
      } catch (error) {
        
        setError('Erro interno')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [router, isAuthenticated, secretaria, authLoading])

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

  const handleLogout = async () => {
    await logout()
  }

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'pending': { label: 'Pendente', color: 'bg-orange-100 text-orange-800' },
      'paid': { label: 'Pago', color: 'bg-green-100 text-green-800' },
      'cancelled': { label: 'Cancelado', color: 'bg-red-100 text-red-800' }
    }
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, color: 'bg-gray-100 text-gray-800' }
    
    return (
      <Badge className={statusInfo.color}>
        {statusInfo.label}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-teal-600 mr-3" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">AnestEasy</h1>
                <p className="text-sm text-gray-600">Área da Secretaria</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{secretaria?.nome}</p>
                <p className="text-xs text-gray-600">{secretaria?.email}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Anestesistas</CardTitle>
            </CardHeader>
            <div className="px-6 pb-6">
              <div className="text-2xl font-bold text-blue-600">{anestesistas.length}</div>
            </div>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total de Procedimentos</CardTitle>
            </CardHeader>
            <div className="px-6 pb-6">
              <div className="text-2xl font-bold text-gray-900">{procedures.length}</div>
            </div>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Pendentes</CardTitle>
            </CardHeader>
            <div className="px-6 pb-6">
              <div className="text-2xl font-bold text-orange-600">
                {procedures.filter(p => p.payment_status === 'pending').length}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Pagos</CardTitle>
            </CardHeader>
            <div className="px-6 pb-6">
              <div className="text-2xl font-bold text-green-600">
                {procedures.filter(p => p.payment_status === 'paid').length}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Valor Total</CardTitle>
            </CardHeader>
            <div className="px-6 pb-6">
              <div className="text-2xl font-bold text-teal-600">
                {formatCurrency(procedures.reduce((sum, p) => sum + p.procedure_value, 0))}
              </div>
            </div>
          </Card>
        </div>

        {/* Anestesistas Vinculados */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserCheck className="w-5 h-5 mr-2" />
              Anestesistas que me adicionaram ({anestesistas.length})
            </CardTitle>
          </CardHeader>
          <div className="p-6">
            {anestesistas.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {anestesistas.map((anestesista) => (
                  <div key={anestesista.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                        <UserCheck className="w-5 h-5 text-teal-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{anestesista.name}</h3>
                        <p className="text-sm text-gray-600">{anestesista.specialty}</p>
                        <p className="text-xs text-gray-500">CRM: {anestesista.crm}</p>
                        <p className="text-xs text-gray-500">{anestesista.email}</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                          Procedimentos: {procedures.filter(p => p.users.id === anestesista.id).length}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/secretaria/anestesista/${anestesista.id}`)}
                          className="text-xs"
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
        <Card className="mb-6">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
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
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Procedimentos ({filteredProcedures.length})
            </CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paciente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Procedimento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Anestesista
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProcedures.map((procedure) => (
                  <tr key={procedure.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {procedure.patient_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {procedure.procedure_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {procedure.users.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {procedure.users.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(procedure.procedure_date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(procedure.procedure_value)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(procedure.payment_status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => router.push(`/secretaria/procedimentos/${procedure.id}`)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
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
