'use client'

import { useState, useEffect, use } from 'react'
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
import { useSecretariaAuth } from '@/contexts/SecretariaAuthContext'

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

export default function EditarProcedimento({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const { secretaria, isLoading: authLoading } = useSecretariaAuth()
  const [procedure, setProcedure] = useState<Procedure | null>(null)
  const [formData, setFormData] = useState({
    procedure_value: '',
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
      if (authLoading) {
        return
      }

      if (!secretaria) {
        router.push('/secretaria/login')
        return
      }

      try {
        const procedureId = resolvedParams.id
        console.log('🔍 [EDITAR PROCEDIMENTO] Carregando procedimento...')
        console.log('   Procedimento ID:', procedureId)
        console.log('   Secretaria ID:', secretaria.id)

        // Buscar procedimento (a política RLS já verifica o acesso)
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
          .eq('id', procedureId)
          .single()

        console.log('📦 [EDITAR PROCEDIMENTO] Resultado:', {
          procedureData: procedureData ? 'Encontrado' : 'Não encontrado',
          procedureError,
          anestesistaId: procedureData?.user_id
        })

        if (procedureError) {
          console.error('❌ [EDITAR PROCEDIMENTO] Erro ao buscar procedimento:', procedureError)
          
          // Se for erro de permissão (RLS bloqueou)
          if (procedureError.code === 'PGRST301' || procedureError.message?.includes('permission')) {
            setError('Você não tem permissão para acessar este procedimento. Verifique se o anestesista está vinculado a você.')
          } else {
            setError('Procedimento não encontrado')
          }
          setIsLoading(false)
          return
        }

        if (!procedureData) {
          console.warn('⚠️ [EDITAR PROCEDIMENTO] Procedimento não encontrado')
          setError('Procedimento não encontrado')
          setIsLoading(false)
          return
        }

        // Verificar se a secretaria tem acesso a este procedimento
        // (verificação adicional para garantir, mas a RLS já deve ter bloqueado se não tiver acesso)
        const { data: linkData, error: linkError } = await supabase
          .from('anestesista_secretaria')
          .select('*')
          .eq('secretaria_id', secretaria.id)
          .eq('anestesista_id', procedureData.user_id)
          .maybeSingle()

        console.log('🔗 [EDITAR PROCEDIMENTO] Verificação de vínculo:', {
          linkData: linkData ? 'Vinculado' : 'Não vinculado',
          linkError
        })

        if (linkError) {
          console.error('❌ [EDITAR PROCEDIMENTO] Erro ao verificar vínculo:', linkError)
        }

        if (!linkData && !linkError) {
          console.warn('⚠️ [EDITAR PROCEDIMENTO] Anestesista não está vinculado à secretária')
          setError('Você não tem permissão para editar este procedimento. O anestesista não está vinculado a você.')
          setIsLoading(false)
          return
        }

        console.log('✅ [EDITAR PROCEDIMENTO] Procedimento carregado com sucesso')
        setProcedure(procedureData)
        
        // Formatar valor inicial
        const initialValue = procedureData.procedure_value 
          ? procedureData.procedure_value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : ''
        
        setFormData({
          procedure_value: initialValue,
          payment_status: procedureData.payment_status || 'pending',
          payment_date: procedureData.payment_date || '',
          payment_method: procedureData.payment_method || '',
          observacoes_financeiras: procedureData.observacoes_financeiras || ''
        })
      } catch (error) {
        console.error('❌ [EDITAR PROCEDIMENTO] Erro interno:', error)
        setError('Erro interno')
      } finally {
        setIsLoading(false)
      }
    }

    loadProcedure()
  }, [resolvedParams.id, secretaria, authLoading, router])

  const handleSave = async () => {
    if (!procedure || !secretaria) {
      setError('Dados não carregados. Recarregue a página.')
      return
    }

    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      console.log('💾 [EDITAR PROCEDIMENTO] Salvando procedimento...')
      console.log('   Procedimento ID:', procedure.id)
      console.log('   Secretaria ID:', secretaria.id)
      console.log('   Anestesista ID:', procedure.user_id)

      // Verificar se ainda está vinculada ao anestesista antes de salvar
      const { data: linkData, error: linkError } = await supabase
        .from('anestesista_secretaria')
        .select('*')
        .eq('secretaria_id', secretaria.id)
        .eq('anestesista_id', procedure.user_id)
        .maybeSingle()

      if (linkError || !linkData) {
        console.error('❌ [EDITAR PROCEDIMENTO] Erro ao verificar vínculo antes de salvar:', linkError)
        setError('Você não tem mais permissão para editar este procedimento. O anestesista não está mais vinculado a você.')
        setIsSaving(false)
        return
      }

      // Validar e converter valor do procedimento
      // Remover pontos (separadores de milhar) e substituir vírgula por ponto
      let valueStr = formData.procedure_value.replace(/\./g, '').replace(',', '.')
      const procedureValue = parseFloat(valueStr)
      
      if (isNaN(procedureValue) || procedureValue < 0) {
        setError('Por favor, insira um valor válido para o procedimento.')
        setIsSaving(false)
        return
      }
      
      if (procedureValue === 0) {
        setError('O valor do procedimento deve ser maior que zero.')
        setIsSaving(false)
        return
      }

      // Atualizar procedimento
      const success = await secretariaService.updateProcedure(
        procedure.id,
        {
          procedure_value: procedureValue,
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
        setSuccess('Procedimento atualizado com sucesso! O anestesista foi notificado sobre as alterações.')
        
        // Atualizar o procedimento localmente com os novos valores
        if (procedure) {
          setProcedure({
            ...procedure,
            procedure_value: procedureValue,
            payment_status: formData.payment_status,
            payment_date: formData.payment_date || null,
            payment_method: formData.payment_method || null,
            observacoes_financeiras: formData.observacoes_financeiras || null
          })
        }
        
        // Limpar mensagem de sucesso após 5 segundos
        setTimeout(() => {
          setSuccess('')
        }, 5000)
      } else {
        setError('Erro ao atualizar procedimento. Verifique sua conexão e tente novamente.')
      }
    } catch (error) {
      console.error('Erro ao salvar procedimento:', error)
      setError('Erro interno ao salvar. Tente novamente.')
    } finally {
      setIsSaving(false)
    }
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
              Editar Procedimento
            </h1>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {/* Informações do Procedimento */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 flex items-center">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-teal-600" />
                Informações do Procedimento
              </CardTitle>
            </CardHeader>
            <div className="p-4 sm:p-6 space-y-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Anestesista</label>
                <p className="text-gray-900">{procedure?.users.name}</p>
                <p className="text-sm text-gray-600">{procedure?.users.email}</p>
              </div>
              
              <div className="pt-2 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor Atual</label>
                <p className="text-gray-900 font-semibold text-lg">
                  {procedure?.procedure_value ? formatCurrency(procedure.procedure_value) : '-'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Este valor pode ser editado no campo ao lado
                </p>
              </div>
            </div>
          </Card>

          {/* Edição Financeira */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 flex items-center">
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-teal-600" />
                Informações Financeiras
              </CardTitle>
            </CardHeader>
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor do Procedimento <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.procedure_value}
                  onChange={(e) => {
                    // Permitir apenas números, vírgula e ponto
                    let value = e.target.value.replace(/[^\d,.-]/g, '')
                    
                    // Garantir apenas uma vírgula ou ponto
                    const hasComma = value.includes(',')
                    const hasDot = value.includes('.')
                    
                    if (hasComma && hasDot) {
                      // Se tiver ambos, manter apenas o último
                      const lastComma = value.lastIndexOf(',')
                      const lastDot = value.lastIndexOf('.')
                      if (lastComma > lastDot) {
                        value = value.replace(/\./g, '')
                      } else {
                        value = value.replace(/,/g, '')
                      }
                    }
                    
                    setFormData(prev => ({ ...prev, procedure_value: value }))
                  }}
                  onBlur={(e) => {
                    // Formatar como moeda ao perder o foco
                    let value = e.target.value.replace(/[^\d,.-]/g, '')
                    
                    // Converter vírgula para ponto para parsing
                    value = value.replace(',', '.')
                    const numValue = parseFloat(value)
                    
                    if (!isNaN(numValue) && numValue >= 0) {
                      // Formatar com vírgula como separador decimal
                      const formatted = numValue.toLocaleString('pt-BR', { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      })
                      setFormData(prev => ({ 
                        ...prev, 
                        procedure_value: formatted
                      }))
                    } else if (e.target.value.trim() === '') {
                      setFormData(prev => ({ ...prev, procedure_value: '' }))
                    }
                  }}
                  placeholder="0,00"
                  icon={<DollarSign className="w-4 h-4" />}
                  className="[&>div>input]:pr-12"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Digite o valor real do procedimento. Exemplo: 1.500,00 ou 1500,00
                </p>
              </div>

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
