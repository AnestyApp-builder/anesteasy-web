'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  UserCheck, 
  FileText, 
  Calendar,
  DollarSign,
  Edit,
  Search,
  Filter
} from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'

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

export default function AnestesistaProcedimentos({ params }: { params: { id: string } }) {
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
      try {
        // Obter usuário atual
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          router.push('/login')
          return
        }

        // Buscar dados da secretaria
        const { data: secretaria, error: secretariaError } = await supabase
          .from('secretarias')
          .select('*')
          .eq('email', user.email)
          .single()

        if (secretariaError || !secretaria) {
          setError('Secretaria não encontrada')
          return
        }

        // Verificar se a secretaria tem acesso a este anestesista
        const { data: linkData, error: linkError } = await supabase
          .from('anestesista_secretaria')
          .select('*')
          .eq('secretaria_id', secretaria.id)
          .eq('anestesista_id', params.id)
          .single()

        if (linkError || !linkData) {
          setError('Você não tem acesso aos procedimentos deste anestesista')
          return
        }

        // Buscar dados do anestesista
        const { data: anestesistaData, error: anestesistaError } = await supabase
          .from('users')
          .select('*')
          .eq('id', params.id)
          .single()

        if (anestesistaError || !anestesistaData) {
          setError('Anestesista não encontrado')
          return
        }

        setAnestesista(anestesistaData)

        // Buscar procedimentos do anestesista vinculados à secretaria
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
          .eq('user_id', params.id)
          .eq('secretaria_id', secretaria.id)
          .order('procedure_date', { ascending: false })

        if (proceduresError) {
          console.error('Erro ao buscar procedimentos:', proceduresError)
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
  }, [params.id, router])

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

  if (isLoading) {
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
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={() => router.push('/secretaria/dashboard')} className="w-full mt-4">
              Voltar ao Dashboard
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
          <div className="flex items-center h-16">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/secretaria/dashboard')}
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-xl font-semibold text-gray-900">Procedimentos do Anestesista</h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Anestesista Info */}
        {anestesista && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserCheck className="w-5 h-5 mr-2" />
                Informações do Anestesista
              </CardTitle>
            </CardHeader>
            <div className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center">
                  <UserCheck className="w-8 h-8 text-teal-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{anestesista.name}</h2>
                  <p className="text-gray-600">{anestesista.specialty}</p>
                  <p className="text-sm text-gray-500">CRM: {anestesista.crm}</p>
                  <p className="text-sm text-gray-500">{anestesista.email}</p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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

        {/* Filters */}
        <Card className="mb-6">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
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
            
            {filteredProcedures.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum procedimento encontrado</h3>
                <p className="text-gray-600">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Tente ajustar os filtros de busca.' 
                    : 'Este anestesista ainda não tem procedimentos vinculados a você.'}
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
