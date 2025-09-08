'use client'

import { useState } from 'react'
import { 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  Calendar,
  DollarSign,
  User,
  MoreHorizontal
} from 'lucide-react'
import { Layout } from '@/components/layout/Layout'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function Procedimentos() {
  const [searchTerm, setSearchTerm] = useState('')

  const procedures = [
    {
      id: 1,
      patient: 'Maria Silva',
      procedure: 'Anestesia Geral',
      date: '2024-01-15',
      time: '14:30',
      value: 'R$ 1.200',
      status: 'Concluído',
      doctor: 'Dr. João Santos'
    },
    {
      id: 2,
      patient: 'João Santos',
      procedure: 'Anestesia Regional',
      date: '2024-01-14',
      time: '09:15',
      value: 'R$ 800',
      status: 'Pendente',
      doctor: 'Dr. Ana Costa'
    },
    {
      id: 3,
      patient: 'Ana Costa',
      procedure: 'Sedação',
      date: '2024-01-13',
      time: '16:45',
      value: 'R$ 600',
      status: 'Concluído',
      doctor: 'Dr. Carlos Lima'
    },
    {
      id: 4,
      patient: 'Pedro Oliveira',
      procedure: 'Anestesia Local',
      date: '2024-01-12',
      time: '11:20',
      value: 'R$ 400',
      status: 'Cancelado',
      doctor: 'Dr. Maria Santos'
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Concluído':
        return 'bg-green-100 text-green-800'
      case 'Pendente':
        return 'bg-yellow-100 text-yellow-800'
      case 'Cancelado':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
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
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo Procedimento
            </Button>
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
            <div className="space-y-4">
              {procedures.map((procedure) => (
                <div key={procedure.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                      <FileText className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{procedure.patient}</p>
                      <p className="text-sm text-gray-600">{procedure.procedure}</p>
                      <div className="flex items-center space-x-4 mt-1">
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="w-4 h-4 mr-1" />
                          {procedure.date} às {procedure.time}
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <User className="w-4 h-4 mr-1" />
                          {procedure.doctor}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="font-medium text-gray-900 flex items-center">
                        <DollarSign className="w-4 h-4 mr-1" />
                        {procedure.value}
                      </p>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(procedure.status)}`}>
                        {procedure.status}
                      </span>
                    </div>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  )
}
