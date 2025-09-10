'use client'

import { useState, useEffect } from 'react'
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Palette,
  Database,
  Download,
  Upload,
  Check,
  AlertCircle
} from 'lucide-react'
import { Layout } from '@/components/layout/Layout'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'

export default function Configuracoes() {
  const { user, updateUser, isLoading } = useAuth()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    crm: '',
    specialty: '',
    phone: '',
    gender: ''
  })
  const [isSaving, setIsSaving] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  // Carregar dados do usuário
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        crm: user.crm || '',
        specialty: user.specialty || '',
        phone: '',
        gender: user.gender || ''
      })
    }
  }, [user])

  // Função para atualizar campo
  const updateField = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Função para salvar alterações
  const saveProfile = async () => {
    if (!user) return

    setIsSaving(true)
    setFeedbackMessage(null)

    try {
      const success = await updateUser(formData)
      
      if (success) {
        setFeedbackMessage({ type: 'success', message: 'Perfil atualizado com sucesso!' })
        setTimeout(() => setFeedbackMessage(null), 3000)
      } else {
        setFeedbackMessage({ type: 'error', message: 'Erro ao atualizar perfil. Tente novamente.' })
        setTimeout(() => setFeedbackMessage(null), 5000)
      }
    } catch (error) {
      console.error('Erro ao salvar perfil:', error)
      setFeedbackMessage({ type: 'error', message: 'Erro ao salvar alterações.' })
      setTimeout(() => setFeedbackMessage(null), 5000)
    } finally {
      setIsSaving(false)
    }
  }
  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
            <p className="text-gray-600 mt-1">Gerencie suas preferências e configurações</p>
          </div>
        </div>

        {/* Feedback Message */}
        {feedbackMessage && (
          <div className={`p-4 rounded-lg flex items-center ${
            feedbackMessage.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {feedbackMessage.type === 'success' ? (
              <Check className="w-5 h-5 mr-2" />
            ) : (
              <AlertCircle className="w-5 h-5 mr-2" />
            )}
            {feedbackMessage.message}
          </div>
        )}

        {/* Settings Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Perfil
              </CardTitle>
            </CardHeader>
            <div className="p-6 space-y-4">
              <Input 
                label="Nome completo" 
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Digite seu nome completo"
              />
              <Input 
                label="Email" 
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                type="email"
                placeholder="Digite seu email"
              />
              <Input 
                label="CRM" 
                value={formData.crm}
                onChange={(e) => updateField('crm', e.target.value)}
                placeholder="Digite seu CRM"
              />
              <Input 
                label="Especialidade" 
                value={formData.specialty}
                onChange={(e) => updateField('specialty', e.target.value)}
                placeholder="Digite sua especialidade"
              />
              <Input 
                label="Telefone" 
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="Digite seu telefone"
              />
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-600">Sexo</label>
                <select
                  value={formData.gender}
                  onChange={(e) => updateField('gender', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="">Selecione seu sexo</option>
                  <option value="masculino">Masculino</option>
                  <option value="feminino">Feminino</option>
                </select>
              </div>
              <Button 
                onClick={saveProfile}
                disabled={isSaving || isLoading}
                className="w-full"
              >
                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="w-5 h-5 mr-2" />
                Notificações
              </CardTitle>
            </CardHeader>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email de procedimentos</p>
                  <p className="text-sm text-gray-600">Receber notificações por email</p>
                </div>
                <input type="checkbox" defaultChecked className="h-4 w-4 text-primary-600" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Lembretes de pagamento</p>
                  <p className="text-sm text-gray-600">Notificações de pagamentos pendentes</p>
                </div>
                <input type="checkbox" defaultChecked className="h-4 w-4 text-primary-600" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Relatórios semanais</p>
                  <p className="text-sm text-gray-600">Resumo semanal por email</p>
                </div>
                <input type="checkbox" className="h-4 w-4 text-primary-600" />
              </div>
            </div>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Segurança
              </CardTitle>
            </CardHeader>
            <div className="p-6 space-y-4">
              <Button variant="outline" className="w-full">
                Alterar Senha
              </Button>
              <Button variant="outline" className="w-full">
                Configurar 2FA
              </Button>
              <Button variant="outline" className="w-full">
                Sessões Ativas
              </Button>
            </div>
          </Card>

          {/* Data Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="w-5 h-5 mr-2" />
                Dados
              </CardTitle>
            </CardHeader>
            <div className="p-6 space-y-4">
              <Button variant="outline" className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Exportar Dados
              </Button>
              <Button variant="outline" className="w-full">
                <Upload className="w-4 h-4 mr-2" />
                Importar Dados
              </Button>
              <Button variant="destructive" className="w-full">
                Excluir Conta
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  )
}
