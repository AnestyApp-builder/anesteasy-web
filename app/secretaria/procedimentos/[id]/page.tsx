'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Save, 
  DollarSign, 
  FileText, 
  Calendar,
  User,
  Building,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { secretariaService } from '@/lib/secretarias'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'

interface Procedure {
  id: string
  patient_name: string
  procedure_name: string
  procedure_date: string
  procedure_value: number
  payment_status: string
  payment_date: string | null
  payment_method: string | null
  observacoes_financeiras: string | null
  users: {
    id: string
    name: string
    email: string
  }
}

export default function EditarProcedimento({ params }: { params: { id: string } }) {
  const [procedure, setProcedure] = useState<Procedure | null>(null)
  const [formData, setFormData] = useState({
    payment_status: '',
    payment_date: '',
    payment_method: '',
    observacoes_financeiras: ''
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  const STATUS_OPTIONS = [
    { value: 'pending', label: 'Pendente' },
    { value: 'paid', label: 'Pago' },
    { value: 'cancelled', label: 'Cancelado' }
  ]

  const PAYMENT_METHODS = [
    'Dinheiro',
    'PIX',
    'Cartão de Débito',
    'Cartão de Crédito',
    'Transferência Bancária',
    'Cheque',
    'Convênio'
  ]

  useEffect(() => {
    const loadProcedure = async () => {
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

        // Buscar procedimento
        const { data: procedureData, error: procedureError } = await supabase
          .from('procedures')
          .select(`
            *,
            users (
              id,
              name,
              email
            )
          `)
          .eq('id', params.id)
          .eq('secretaria_id', secretaria.id)
          .single()

        if (procedureError || !procedureData) {
          setError('Procedimento não encontrado ou você não tem permissão para editá-lo')
          return
        }

        setProcedure(procedureData)
        setFormData({
          payment_status: procedureData.payment_status || 'pending',
          payment_date: procedureData.payment_date || '',
          payment_method: procedureData.payment_method || '',
          observacoes_financeiras: procedureData.observacoes_financeiras || ''
        })
      } catch (error) {
        setError('Erro interno')
      } finally {
        setIsLoading(false)
      }
    }

    loadProcedure()
  }, [params.id, router])

  const handleSave = async () => {
    if (!procedure) return

    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      // Obter usuário atual
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        setError('Usuário não autenticado')
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

      // Atualizar procedimento
      const success = await secretariaService.updateProcedure(
        procedure.id,
        {
          payment_status: formData.payment_status,
          payment_date: formData.payment_date || null,
          payment_method: formData.payment_method || null,
          observacoes_financeiras: formData.observacoes_financeiras || null
        },
        {
          id: secretaria.id,
          type: 'secretaria',
          name: secretaria.nome
        }
      )

      if (success) {
        setSuccess('Procedimento atualizado com sucesso!')
        setTimeout(() => {
          router.push('/secretaria/dashboard')
        }, 2000)
      } else {
        setError('Erro ao atualizar procedimento')
      }
    } catch (error) {
      setError('Erro interno')
    } finally {
      setIsSaving(false)
    }
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

  if (error && !procedure) {
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
            <h1 className="text-xl font-semibold text-gray-900">Editar Procedimento</h1>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Informações do Procedimento */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Informações do Procedimento
              </CardTitle>
            </CardHeader>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paciente</label>
                <p className="text-gray-900">{procedure?.patient_name}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Procedimento</label>
                <p className="text-gray-900">{procedure?.procedure_name}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                <p className="text-gray-900">
                  {procedure?.procedure_date ? new Date(procedure.procedure_date).toLocaleDateString('pt-BR') : '-'}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
                <p className="text-gray-900 font-semibold">
                  {procedure?.procedure_value ? formatCurrency(procedure.procedure_value) : '-'}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Anestesista</label>
                <p className="text-gray-900">{procedure?.users.name}</p>
                <p className="text-sm text-gray-600">{procedure?.users.email}</p>
              </div>
            </div>
          </Card>

          {/* Edição Financeira */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                Informações Financeiras
              </CardTitle>
            </CardHeader>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status do Pagamento
                </label>
                <select
                  value={formData.payment_status}
                  onChange={(e) => setFormData(prev => ({ ...prev, payment_status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {STATUS_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {formData.payment_status === 'paid' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data do Pagamento
                  </label>
                  <Input
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, payment_date: e.target.value }))}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Forma de Pagamento
                </label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Selecione a forma de pagamento</option>
                  {PAYMENT_METHODS.map(method => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observações Financeiras
                </label>
                <textarea
                  value={formData.observacoes_financeiras}
                  onChange={(e) => setFormData(prev => ({ ...prev, observacoes_financeiras: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Observações sobre pagamento, convênio, etc..."
                />
              </div>

              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
