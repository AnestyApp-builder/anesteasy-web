'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  Calendar,
  DollarSign,
  User,
  MoreHorizontal,
  Edit,
  Trash2
} from 'lucide-react'
import { Layout } from '@/components/layout/Layout'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { procedureService, Procedure } from '@/lib/procedures'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Loading } from '@/components/ui/Loading'

export default function Procedimentos() {
  const [searchTerm, setSearchTerm] = useState('')
  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [loading, setLoading] = useState(true)
  const [filteredProcedures, setFilteredProcedures] = useState<Procedure[]>([])
  const { user } = useAuth()

  useEffect(() => {
    if (user?.id) {
      loadProcedures()
    }
  }, [user])

  useEffect(() => {
    if (searchTerm) {
      const filtered = procedures.filter(procedure =>
        procedure.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        procedure.procedure_type.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredProcedures(filtered)
    } else {
      setFilteredProcedures(procedures)
    }
  }, [searchTerm, procedures])

  const loadProcedures = async () => {
    if (!user?.id) return
    
    setLoading(true)
    try {
      const data = await procedureService.getProcedures(user.id)
      setProcedures(data)
    } catch (error) {
      console.error('Erro ao carregar procedimentos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProcedure = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este procedimento?')) {
      const success = await procedureService.deleteProcedure(id)
      if (success) {
        setProcedures(procedures.filter(p => p.id !== id))
      }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'faturado':
        return 'bg-blue-100 text-blue-800'
      case 'recebido':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Pago'
      case 'pending':
        return 'Pendente'
      case 'cancelled':
        return 'Cancelado'
      case 'faturado':
        return 'Faturado'
      case 'recebido':
        return 'Recebido'
      default:
        return status
    }
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Procedimentos</h1>
            <p className="text-gray-600 mt-1">Gerencie todos os seus procedimentos</p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Link href="/procedimentos/novo">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Novo Procedimento
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <div className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Buscar procedimentos..."
                  icon={<Search className="w-5 h-5" />}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                Filtros
              </Button>
            </div>
          </div>
        </Card>

        {/* Procedures List */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Procedimentos</CardTitle>
          </CardHeader>
          <div className="p-6">
            {loading ? (
              <Loading text="Carregando procedimentos..." />
            ) : filteredProcedures.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Nenhum procedimento encontrado</p>
                <p className="text-sm text-gray-500 mt-1">
                  {searchTerm ? 'Tente ajustar os filtros de busca' : 'Comece criando seu primeiro procedimento'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredProcedures.map((procedure) => (
                  <div key={procedure.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                        <FileText className="w-6 h-6 text-primary-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{procedure.patient_name}</p>
                        <p className="text-sm text-gray-600">{procedure.procedure_type}</p>
                        <div className="flex items-center space-x-4 mt-1">
                          <div className="flex items-center text-sm text-gray-500">
                            <Calendar className="w-4 h-4 mr-1" />
                            {formatDate(procedure.procedure_date)} às {procedure.procedure_time}
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <User className="w-4 h-4 mr-1" />
                            {user?.name}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="font-medium text-gray-900 flex items-center">
                          <DollarSign className="w-4 h-4 mr-1" />
                          {formatCurrency(procedure.procedure_value)}
                        </p>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(procedure.payment_status || 'pending')}`}>
                          {getStatusText(procedure.payment_status || 'pending')}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm" title="Editar">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          title="Excluir"
                          onClick={() => handleDeleteProcedure(procedure.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  )
}
