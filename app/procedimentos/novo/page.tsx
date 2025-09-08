'use client'

import { useState } from 'react'
import { 
  Save, 
  ArrowLeft, 
  User, 
  Calendar,
  DollarSign,
  FileText,
  Clock
} from 'lucide-react'
import Link from 'next/link'
import { Layout } from '@/components/layout/Layout'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function NovoProcedimento() {
  const [formData, setFormData] = useState({
    patientName: '',
    patientAge: '',
    procedure: '',
    date: '',
    time: '',
    value: '',
    notes: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Novo procedimento:', formData)
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center space-x-4 mb-2">
              <Link href="/procedimentos">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Novo Procedimento</h1>
            <p className="text-gray-600 mt-1">Cadastre um novo procedimento</p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Informações do Procedimento</CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Nome do Paciente"
                placeholder="Nome completo do paciente"
                icon={<User className="w-5 h-5" />}
                value={formData.patientName}
                onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                required
              />
              <Input
                label="Idade"
                type="number"
                placeholder="Idade do paciente"
                value={formData.patientAge}
                onChange={(e) => setFormData({ ...formData, patientAge: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Tipo de Procedimento"
                placeholder="Ex: Anestesia Geral"
                icon={<FileText className="w-5 h-5" />}
                value={formData.procedure}
                onChange={(e) => setFormData({ ...formData, procedure: e.target.value })}
                required
              />
              <Input
                label="Valor"
                placeholder="R$ 0,00"
                icon={<DollarSign className="w-5 h-5" />}
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Data"
                type="date"
                icon={<Calendar className="w-5 h-5" />}
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
              <Input
                label="Horário"
                type="time"
                icon={<Clock className="w-5 h-5" />}
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações
              </label>
              <textarea
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white"
                rows={4}
                placeholder="Observações adicionais sobre o procedimento..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <div className="flex justify-end space-x-4">
              <Link href="/procedimentos">
                <Button variant="outline">Cancelar</Button>
              </Link>
              <Button type="submit">
                <Save className="w-4 h-4 mr-2" />
                Salvar Procedimento
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </Layout>
  )
}
