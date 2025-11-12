'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Settings, 
  User, 
  Shield, 
  Check,
  AlertCircle,
  Mail,
  Phone,
  Eye,
  EyeOff,
  Save,
  LogOut,
  Users,
  Clock,
  CheckCircle2,
  X
} from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useSecretariaAuth } from '@/contexts/SecretariaAuthContext'
import { supabase } from '@/lib/supabase'

export default function SecretariaConfiguracoes() {
  const { secretaria, logout, isLoading: authLoading } = useSecretariaAuth()
  const router = useRouter()
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: ''
  })
  const [isSaving, setIsSaving] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<Array<{
    id: string
    anestesista_id: string
    anestesista_name: string
    anestesista_email: string
    created_at: string
  }>>([])
  const [isLoadingRequests, setIsLoadingRequests] = useState(true)
  const [isProcessingRequest, setIsProcessingRequest] = useState<string | null>(null)

  // Carregar dados da secretária
  useEffect(() => {
    if (secretaria) {
      setFormData({
        nome: secretaria.nome || '',
        email: secretaria.email || '',
        telefone: secretaria.telefone || ''
      })
    }
  }, [secretaria])

  // Verificar autenticação
  useEffect(() => {
    if (!authLoading && !secretaria) {
      router.push('/secretaria/login')
    }
  }, [authLoading, secretaria, router])

  // Carregar solicitações pendentes
  useEffect(() => {
    const loadPendingRequests = async () => {
      if (!secretaria) {
        setPendingRequests([])
        setIsLoadingRequests(false)
        return
      }

      setIsLoadingRequests(true)
      try {
        const { data: requestsData, error: requestsError } = await supabase
          .from('secretaria_link_requests')
          .select(`
            id,
            anestesista_id,
            created_at,
            users (
              id,
              name,
              email
            )
          `)
          .eq('secretaria_id', secretaria.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })

        if (requestsError) {
          console.error('Erro ao carregar solicitações:', requestsError)
          setPendingRequests([])
        } else {
          const formattedRequests = (requestsData || []).map((req: any) => ({
            id: req.id,
            anestesista_id: req.anestesista_id,
            anestesista_name: req.users?.name || 'Nome não disponível',
            anestesista_email: req.users?.email || 'Email não disponível',
            created_at: req.created_at || ''
          }))
          setPendingRequests(formattedRequests)
        }
      } catch (error) {
        console.error('Erro ao carregar solicitações:', error)
        setPendingRequests([])
      } finally {
        setIsLoadingRequests(false)
      }
    }

    loadPendingRequests()

    // Escutar mudanças em tempo real
    if (secretaria) {
      const channel = supabase
        .channel(`link_requests:${secretaria.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'secretaria_link_requests',
            filter: `secretaria_id=eq.${secretaria.id}`
          },
          () => {
            loadPendingRequests()
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [secretaria])

  const handleSaveProfile = async () => {
    if (!secretaria) return

    setIsSaving(true)
    setFeedbackMessage(null)

    try {
      // Atualizar dados na tabela secretarias
      const { error } = await supabase
        .from('secretarias')
        .update({
          nome: formData.nome.trim(),
          telefone: formData.telefone.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', secretaria.id)

      if (error) {
        console.error('Erro ao atualizar perfil:', error)
        setFeedbackMessage({
          type: 'error',
          message: 'Erro ao atualizar perfil. Tente novamente.'
        })
        return
      }

      // Atualizar email no Supabase Auth (se mudou)
      if (formData.email !== secretaria.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: formData.email.trim()
        })

        if (emailError) {
          console.error('Erro ao atualizar email:', emailError)
          setFeedbackMessage({
            type: 'error',
            message: 'Erro ao atualizar email. Tente novamente.'
          })
          return
        }

        // Atualizar email na tabela secretarias também
        const { error: updateEmailError } = await supabase
          .from('secretarias')
          .update({
            email: formData.email.trim()
          })
          .eq('id', secretaria.id)

        if (updateEmailError) {
          console.error('Erro ao atualizar email na tabela:', updateEmailError)
        }
      }

      setFeedbackMessage({
        type: 'success',
        message: 'Perfil atualizado com sucesso!'
      })

      // Atualizar dados no contexto recarregando da base
      const { data: updatedSecretaria } = await supabase
        .from('secretarias')
        .select('*')
        .eq('id', secretaria.id)
        .single()

      if (updatedSecretaria) {
        // Forçar atualização do contexto recarregando a página após 1 segundo
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      }
    } catch (error) {
      console.error('Erro ao salvar perfil:', error)
      setFeedbackMessage({
        type: 'error',
        message: 'Erro interno. Tente novamente.'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAcceptRequest = async (requestId: string) => {
    if (!secretaria) return

    setIsProcessingRequest(requestId)
    setFeedbackMessage(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        setFeedbackMessage({
          type: 'error',
          message: 'Sessão expirada. Faça login novamente.'
        })
        return
      }

      const response = await fetch('/api/secretaria/accept-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ requestId })
      })

      const data = await response.json()

      if (data.success) {
        setFeedbackMessage({
          type: 'success',
          message: data.message || 'Solicitação aceita com sucesso!'
        })
        // Recarregar solicitações
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        setFeedbackMessage({
          type: 'error',
          message: data.error || 'Erro ao aceitar solicitação.'
        })
      }
    } catch (error) {
      console.error('Erro ao aceitar solicitação:', error)
      setFeedbackMessage({
        type: 'error',
        message: 'Erro ao aceitar solicitação. Tente novamente.'
      })
    } finally {
      setIsProcessingRequest(null)
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    if (!secretaria) return

    setIsProcessingRequest(requestId)
    setFeedbackMessage(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        setFeedbackMessage({
          type: 'error',
          message: 'Sessão expirada. Faça login novamente.'
        })
        return
      }

      const response = await fetch('/api/secretaria/reject-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ requestId })
      })

      const data = await response.json()

      if (data.success) {
        setFeedbackMessage({
          type: 'success',
          message: data.message || 'Solicitação recusada.'
        })
        // Recarregar solicitações
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        setFeedbackMessage({
          type: 'error',
          message: data.error || 'Erro ao recusar solicitação.'
        })
      }
    } catch (error) {
      console.error('Erro ao recusar solicitação:', error)
      setFeedbackMessage({
        type: 'error',
        message: 'Erro ao recusar solicitação. Tente novamente.'
      })
    } finally {
      setIsProcessingRequest(null)
    }
  }

  const handleUpdatePassword = async () => {
    if (!secretaria) return

    // Validações
    if (!passwordForm.currentPassword) {
      setFeedbackMessage({
        type: 'error',
        message: 'Digite sua senha atual'
      })
      return
    }

    if (passwordForm.newPassword.length < 6) {
      setFeedbackMessage({
        type: 'error',
        message: 'A nova senha deve ter pelo menos 6 caracteres'
      })
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setFeedbackMessage({
        type: 'error',
        message: 'As senhas não coincidem'
      })
      return
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setFeedbackMessage({
        type: 'error',
        message: 'A nova senha deve ser diferente da senha atual'
      })
      return
    }

    setIsUpdatingPassword(true)
    setFeedbackMessage(null)

    try {
      // Verificar senha atual fazendo login
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: secretaria.email,
        password: passwordForm.currentPassword
      })

      if (signInError) {
        setFeedbackMessage({
          type: 'error',
          message: 'Senha atual incorreta'
        })
        setIsUpdatingPassword(false)
        return
      }

      // Atualizar senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      })

      if (updateError) {
        console.error('Erro ao atualizar senha:', updateError)
        setFeedbackMessage({
          type: 'error',
          message: 'Erro ao atualizar senha. Tente novamente.'
        })
        return
      }

      setFeedbackMessage({
        type: 'success',
        message: 'Senha atualizada com sucesso!'
      })

      // Limpar formulário e fechar modal
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
      setShowPasswordModal(false)

      // Limpar mensagem após 3 segundos
      setTimeout(() => {
        setFeedbackMessage(null)
      }, 3000)
    } catch (error) {
      console.error('Erro ao atualizar senha:', error)
      setFeedbackMessage({
        type: 'error',
        message: 'Erro interno. Tente novamente.'
      })
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen user-area-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!secretaria) {
    return null
  }

  return (
    <div className="min-h-screen user-area-bg">
      {/* Header */}
      <header className="bg-gradient-to-r from-teal-600 to-teal-700 border-b border-teal-800 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Settings className="w-8 h-8 text-white mr-3" />
              <div>
                <h1 className="text-xl font-semibold text-white">Configurações</h1>
                <p className="text-sm text-teal-100">Gerenciar perfil e conta</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => router.push('/secretaria/dashboard')}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              Voltar ao Dashboard
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Mensagens de feedback */}
        {feedbackMessage && (
          <div className={`mb-6 p-4 rounded-lg flex items-start space-x-3 ${
            feedbackMessage.type === 'success' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            {feedbackMessage.type === 'success' ? (
              <Check className="w-5 h-5 text-green-600 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            )}
            <p className={`text-sm ${
              feedbackMessage.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}>
              {feedbackMessage.message}
            </p>
          </div>
        )}

        <div className="space-y-6">
          {/* Solicitações Pendentes */}
          {pendingRequests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-teal-600" />
                  Solicitações de Vinculação
                </CardTitle>
              </CardHeader>
              <div className="p-6 space-y-4">
                {pendingRequests.map((request) => (
                  <div key={request.id} className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-yellow-900 mb-2">
                          {request.anestesista_name}
                        </h3>
                        <div className="flex items-center text-sm text-yellow-800 mb-3">
                          <Mail className="w-4 h-4 mr-1" />
                          {request.anestesista_email}
                        </div>
                        <p className="text-xs text-yellow-700">
                          Deseja vincular você como secretária
                        </p>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <Button
                          size="sm"
                          onClick={() => handleAcceptRequest(request.id)}
                          disabled={isProcessingRequest === request.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {isProcessingRequest === request.id ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectRequest(request.id)}
                          disabled={isProcessingRequest === request.id}
                          className="border-red-300 text-red-600 hover:bg-red-50"
                        >
                          {isProcessingRequest === request.id ? (
                            <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Perfil */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 flex items-center">
                <User className="w-5 h-5 mr-2 text-teal-600" />
                Perfil
              </CardTitle>
            </CardHeader>
            <div className="p-6 space-y-4">
              <Input
                label="Nome Completo *"
                type="text"
                placeholder="Seu nome completo"
                icon={<User className="w-5 h-5" />}
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                disabled={isSaving}
              />

              <Input
                label="Email *"
                type="email"
                placeholder="seu@email.com"
                icon={<Mail className="w-5 h-5" />}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={isSaving}
              />

              <Input
                label="Telefone"
                type="tel"
                placeholder="(11) 99999-9999"
                icon={<Phone className="w-5 h-5" />}
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                disabled={isSaving}
              />

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="min-w-[120px]"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {/* Segurança */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 flex items-center">
                <Shield className="w-5 h-5 mr-2 text-teal-600" />
                Segurança
              </CardTitle>
            </CardHeader>
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Senha</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Altere sua senha para manter sua conta segura.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setShowPasswordModal(true)}
                >
                  Alterar Senha
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Modal de Troca de Senha */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false)
          setPasswordForm({
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          })
          setFeedbackMessage(null)
        }}
        title="Alterar Senha"
      >
        <div className="space-y-4">
          {feedbackMessage && (
            <div className={`p-3 rounded-lg flex items-start space-x-2 ${
              feedbackMessage.type === 'success' 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              {feedbackMessage.type === 'success' ? (
                <Check className="w-4 h-4 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
              )}
              <p className={`text-sm ${
                feedbackMessage.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {feedbackMessage.message}
              </p>
            </div>
          )}

          <div className="relative">
            <Input
              label="Senha Atual *"
              type={showCurrentPassword ? 'text' : 'password'}
              placeholder="Digite sua senha atual"
              icon={<Shield className="w-5 h-5" />}
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              disabled={isUpdatingPassword}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
            >
              {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div className="relative">
            <Input
              label="Nova Senha *"
              type={showNewPassword ? 'text' : 'password'}
              placeholder="Mínimo 6 caracteres"
              icon={<Shield className="w-5 h-5" />}
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              disabled={isUpdatingPassword}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={() => setShowNewPassword(!showNewPassword)}
            >
              {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div className="relative">
            <Input
              label="Confirmar Nova Senha *"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Digite a nova senha novamente"
              icon={<Shield className="w-5 h-5" />}
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              disabled={isUpdatingPassword}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowPasswordModal(false)
                setPasswordForm({
                  currentPassword: '',
                  newPassword: '',
                  confirmPassword: ''
                })
                setFeedbackMessage(null)
              }}
              disabled={isUpdatingPassword}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpdatePassword}
              disabled={isUpdatingPassword}
            >
              {isUpdatingPassword ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Atualizando...
                </>
              ) : (
                'Atualizar Senha'
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

