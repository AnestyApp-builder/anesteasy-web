'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Palette,
  Database,
  Check,
  AlertCircle,
  Users,
  Plus,
  X,
  Mail,
  Phone,
  Trash2
} from 'lucide-react'
import { Layout } from '@/components/layout/Layout'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'
import { useSecretaria } from '@/contexts/SecretariaContext'

export default function Configuracoes() {
  const { user, updateUser, deleteAccount, isLoading, isAuthenticated } = useAuth()
  const { secretaria, linkSecretaria, unlinkSecretaria, isLoading: secretariaLoading } = useSecretaria()
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    crm: '',
    specialty: '',
    phone: '',
    gender: ''
  })
  const [secretariaForm, setSecretariaForm] = useState({
    email: '',
    nome: '',
    telefone: ''
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isLinkingSecretaria, setIsLinkingSecretaria] = useState(false)
  const [showSecretariaForm, setShowSecretariaForm] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

  // Verificar autenticação e redirecionar se necessário
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, router])

  // Carregar dados do usuário
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        crm: user.crm || '',
        specialty: user.specialty || '',
        phone: user.phone || '',
        gender: user.gender || ''
      })
    }
  }, [user])

  // Mostrar loading enquanto verifica autenticação
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    )
  }

  // Não renderizar se não estiver autenticado (será redirecionado)
  if (!isAuthenticated) {
    return null
  }

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
      
      setFeedbackMessage({ type: 'error', message: 'Erro ao salvar alterações.' })
      setTimeout(() => setFeedbackMessage(null), 5000)
    } finally {
      setIsSaving(false)
    }
  }

  // Função para vincular secretaria
  const handleLinkSecretaria = async () => {
    if (!secretariaForm.email.trim()) {
      setFeedbackMessage({ type: 'error', message: 'Email é obrigatório.' })
      setTimeout(() => setFeedbackMessage(null), 3000)
      return
    }

    setIsLinkingSecretaria(true)
    setFeedbackMessage(null)

    try {
      const success = await linkSecretaria(
        secretariaForm.email,
        secretariaForm.nome || undefined,
        secretariaForm.telefone || undefined
      )
      
      if (success) {
        setFeedbackMessage({ type: 'success', message: 'Secretaria vinculada com sucesso!' })
        setSecretariaForm({ email: '', nome: '', telefone: '' })
        setShowSecretariaForm(false)
        setTimeout(() => setFeedbackMessage(null), 3000)
      } else {
        setFeedbackMessage({ type: 'error', message: 'Erro ao vincular secretaria. Tente novamente.' })
        setTimeout(() => setFeedbackMessage(null), 5000)
      }
    } catch (error) {
      
      setFeedbackMessage({ type: 'error', message: 'Erro ao vincular secretaria.' })
      setTimeout(() => setFeedbackMessage(null), 5000)
    } finally {
      setIsLinkingSecretaria(false)
    }
  }

  // Função para desvincular secretaria
  const handleUnlinkSecretaria = async () => {
    if (!secretaria) return

    setIsLinkingSecretaria(true)
    setFeedbackMessage(null)

    try {
      const success = await unlinkSecretaria()
      
      if (success) {
        setFeedbackMessage({ type: 'success', message: 'Secretaria desvinculada com sucesso!' })
        setTimeout(() => setFeedbackMessage(null), 3000)
      } else {
        setFeedbackMessage({ type: 'error', message: 'Erro ao desvincular secretaria. Tente novamente.' })
        setTimeout(() => setFeedbackMessage(null), 5000)
      }
    } catch (error) {
      
      setFeedbackMessage({ type: 'error', message: 'Erro ao desvincular secretaria.' })
      setTimeout(() => setFeedbackMessage(null), 5000)
    } finally {
      setIsLinkingSecretaria(false)
    }
  }

  // Função para alterar senha
  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setFeedbackMessage({ type: 'error', message: 'Preencha todos os campos.' })
      setTimeout(() => setFeedbackMessage(null), 3000)
      return
    }

    if (passwordForm.newPassword.length < 6) {
      setFeedbackMessage({ type: 'error', message: 'A nova senha deve ter pelo menos 6 caracteres.' })
      setTimeout(() => setFeedbackMessage(null), 3000)
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setFeedbackMessage({ type: 'error', message: 'As senhas não coincidem.' })
      setTimeout(() => setFeedbackMessage(null), 3000)
      return
    }

    setIsUpdatingPassword(true)
    setFeedbackMessage(null)

    try {
      // Importar authService dinamicamente para evitar problemas de SSR
      const { authService } = await import('@/lib/auth')
      
      const result = await authService.updatePassword(passwordForm.newPassword)
      
      if (result.success) {
        setFeedbackMessage({ type: 'success', message: 'Senha alterada com sucesso!' })
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
        setShowPasswordModal(false)
        setTimeout(() => setFeedbackMessage(null), 3000)
      } else {
        setFeedbackMessage({ type: 'error', message: result.message || 'Erro ao alterar senha.' })
        setTimeout(() => setFeedbackMessage(null), 5000)
      }
    } catch (error) {
      setFeedbackMessage({ type: 'error', message: 'Erro interno ao alterar senha.' })
      setTimeout(() => setFeedbackMessage(null), 5000)
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  // Função para excluir conta
  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'EXCLUIR') {
      setFeedbackMessage({ type: 'error', message: 'Digite "EXCLUIR" para confirmar a exclusão.' })
      setTimeout(() => setFeedbackMessage(null), 5000)
      return
    }

    setIsDeleting(true)
    setFeedbackMessage(null)

    try {
      
      const success = await deleteAccount()
      
      if (success) {
        
        setFeedbackMessage({ 
          type: 'success', 
          message: 'Conta excluída com sucesso! Todos os dados foram removidos.' 
        })
        setShowDeleteModal(false)
        setDeleteConfirmation('')
        
        // Aguardar um pouco antes de redirecionar para mostrar a mensagem
        setTimeout(() => {
          // O redirecionamento será feito automaticamente pelo contexto
        }, 2000)
      } else {
        
        setFeedbackMessage({ 
          type: 'error', 
          message: 'Erro ao excluir conta. Verifique o console para mais detalhes.' 
        })
        setTimeout(() => setFeedbackMessage(null), 8000)
      }
    } catch (error) {
      
      setFeedbackMessage({ 
        type: 'error', 
        message: 'Erro interno ao excluir conta. Verifique o console para mais detalhes.' 
      })
      setTimeout(() => setFeedbackMessage(null), 8000)
    } finally {
      setIsDeleting(false)
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
          {/* Secretaria Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Secretaria
              </CardTitle>
            </CardHeader>
            <div className="p-6 space-y-4">
              {secretaria ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-green-800">{secretaria.nome}</h3>
                        <div className="flex items-center text-sm text-green-600 mt-1">
                          <Mail className="w-4 h-4 mr-1" />
                          {secretaria.email}
                        </div>
                        {secretaria.telefone && (
                          <div className="flex items-center text-sm text-green-600 mt-1">
                            <Phone className="w-4 h-4 mr-1" />
                            {secretaria.telefone}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleUnlinkSecretaria}
                        disabled={isLinkingSecretaria}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    Sua secretaria pode acessar e editar seus procedimentos. 
                    Você receberá notificações quando ela fizer alterações.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma secretaria vinculada</h3>
                    <p className="text-gray-600 mb-4">
                      Vincule uma secretaria para que ela possa ajudar com seus procedimentos.
                    </p>
                    <Button
                      onClick={() => setShowSecretariaForm(true)}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Vincular Secretaria
                    </Button>
                  </div>
                </div>
              )}

              {showSecretariaForm && (
                <div className="space-y-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Vincular Nova Secretaria</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSecretariaForm(false)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <Input
                    label="Email da Secretaria *"
                    value={secretariaForm.email}
                    onChange={(e) => setSecretariaForm(prev => ({ ...prev, email: e.target.value }))}
                    type="email"
                    placeholder="secretaria@exemplo.com"
                  />
                  
                  <Input
                    label="Nome (opcional)"
                    value={secretariaForm.nome}
                    onChange={(e) => setSecretariaForm(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder="Nome da secretaria"
                  />
                  
                  <Input
                    label="Telefone (opcional)"
                    value={secretariaForm.telefone}
                    onChange={(e) => setSecretariaForm(prev => ({ ...prev, telefone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                  />
                  
                  <div className="flex space-x-2">
                    <Button
                      onClick={handleLinkSecretaria}
                      disabled={isLinkingSecretaria || !secretariaForm.email.trim()}
                      className="flex-1"
                    >
                      {isLinkingSecretaria ? 'Vinculando...' : 'Vincular'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowSecretariaForm(false)}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                  </div>
                  
                  <p className="text-xs text-gray-600">
                    Se o email já existir no sistema, a secretaria será vinculada automaticamente. 
                    Caso contrário, uma nova conta será criada.
                  </p>
                </div>
              )}
            </div>
          </Card>
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
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                  <option value="Other">Outro</option>
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
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setShowPasswordModal(true)}
              >
                Alterar Senha
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
              <Button 
                variant="destructive" 
                className="w-full"
                onClick={() => setShowDeleteModal(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir Conta
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Modal de Alteração de Senha */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Alterar Senha
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowPasswordModal(false)
                  setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <Input
                label="Senha Atual"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                placeholder="Digite sua senha atual"
              />
              
              <Input
                label="Nova Senha"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                placeholder="Digite sua nova senha (mín. 6 caracteres)"
              />
              
              <Input
                label="Confirmar Nova Senha"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Confirme sua nova senha"
              />
            </div>

            <div className="flex space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPasswordModal(false)
                  setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
                }}
                className="flex-1"
                disabled={isUpdatingPassword}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleChangePassword}
                disabled={isUpdatingPassword || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                className="flex-1"
              >
                {isUpdatingPassword ? 'Alterando...' : 'Alterar Senha'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 mx-auto flex items-center justify-center rounded-full bg-red-100">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
            </div>
            
            <div className="text-center mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Excluir Conta
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Esta ação é <strong>irreversível</strong>. Todos os seus dados serão permanentemente excluídos, incluindo:
              </p>
              <ul className="text-sm text-gray-600 text-left mb-4 space-y-1">
                <li>• Todos os procedimentos cadastrados</li>
                <li>• Dados financeiros e pagamentos</li>
                <li>• Relatórios e estatísticas</li>
                <li>• Configurações e preferências</li>
                <li>• Vínculos com secretarias</li>
                <li>• Feedback de cirurgiões</li>
              </ul>
              <p className="text-sm text-gray-600 mb-4">
                Digite <strong>"EXCLUIR"</strong> para confirmar:
              </p>
            </div>

            <div className="mb-6">
              <Input
                label="Confirmação"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="Digite EXCLUIR"
                className="text-center font-mono"
              />
            </div>

            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteConfirmation('')
                }}
                className="flex-1"
                disabled={isDeleting}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={isDeleting || deleteConfirmation !== 'EXCLUIR'}
                className="flex-1"
              >
                {isDeleting ? 'Excluindo...' : 'Excluir Conta'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
