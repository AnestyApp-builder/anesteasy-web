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
  Trash2,
  Copy,
  CheckCircle2,
  Clock,
  RefreshCw
} from 'lucide-react'
import { Layout } from '@/components/layout/Layout'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/contexts/AuthContext'
import { useSecretaria } from '@/contexts/SecretariaContext'
import { supabase } from '@/lib/supabase'

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
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [pendingRequest, setPendingRequest] = useState<{
    id: string
    secretaria_id?: string
    secretaria_email: string
    secretaria_nome?: string
    created_at: string
    type: 'link_request' | 'invite'
  } | null>(null)
  const [isLoadingPendingRequest, setIsLoadingPendingRequest] = useState(true)
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

  // Carregar solicitações pendentes de vinculação
  useEffect(() => {
    const loadPendingRequests = async () => {
      if (!user) {
        setPendingRequest(null)
        setIsLoadingPendingRequest(false)
        return
      }

      if (secretaria) {
        // Se já tem secretária vinculada, não precisa verificar pendências
        setPendingRequest(null)
        setIsLoadingPendingRequest(false)
        return
      }

      setIsLoadingPendingRequest(true)

      try {
        console.log('🔍 [CONFIG] Buscando solicitações pendentes para anestesista:', user.id)
        
        // Primeiro buscar solicitação de vinculação (secretária existente)
        console.log('🔍 [CONFIG] Buscando solicitações de vinculação...')
        console.log('   Anestesista ID:', user.id)
        
        const { data: requestsData, error: requestsError } = await supabase
          .from('secretaria_link_requests')
          .select('id, secretaria_id, created_at')
          .eq('anestesista_id', user.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)

        console.log('📦 [CONFIG] Resultado da busca de solicitações:', {
          requestsData,
          requestsError,
          count: requestsData?.length || 0,
          hasData: !!requestsData && requestsData.length > 0
        })

        if (requestsError) {
          console.error('❌ [CONFIG] Erro ao buscar solicitações:', requestsError)
          console.error('   Detalhes do erro:', JSON.stringify(requestsError, null, 2))
        }

        if (requestsData && requestsData.length > 0) {
          const request = requestsData[0]
          console.log('✅ [CONFIG] Solicitação de vinculação encontrada:', request)
          console.log('   Request ID:', request.id)
          console.log('   Secretaria ID:', request.secretaria_id)

          // Buscar dados da secretária
          const { data: secretariaData, error: secretariaError } = await supabase
            .from('secretarias')
            .select('id, email, nome')
            .eq('id', request.secretaria_id)
            .single()

          console.log('📋 [CONFIG] Resultado da busca da secretária:', {
            secretariaData,
            secretariaError,
            hasData: !!secretariaData
          })

          if (secretariaError) {
            console.error('❌ [CONFIG] Erro ao buscar dados da secretária:', secretariaError)
            // Mesmo com erro, vamos tentar usar os dados que temos
            setPendingRequest({
              id: request.id,
              secretaria_id: request.secretaria_id,
              secretaria_email: 'Email não disponível',
              secretaria_nome: 'Nome não disponível',
              created_at: request.created_at || '',
              type: 'link_request'
            })
            setIsLoadingPendingRequest(false)
            return
          }

          if (secretariaData) {
            console.log('✅ [CONFIG] Dados da secretária carregados:', secretariaData)

            setPendingRequest({
              id: request.id,
              secretaria_id: request.secretaria_id,
              secretaria_email: secretariaData.email || '',
              secretaria_nome: secretariaData.nome || '',
              created_at: request.created_at || '',
              type: 'link_request'
            })
            
            console.log('✅ [CONFIG] Estado atualizado com solicitação de vinculação')
            setIsLoadingPendingRequest(false)
            return
          } else {
            console.warn('⚠️ [CONFIG] Solicitação encontrada mas dados da secretária não disponíveis')
            // Mesmo sem dados completos, mostrar a solicitação
            setPendingRequest({
              id: request.id,
              secretaria_id: request.secretaria_id,
              secretaria_email: 'Email não disponível',
              secretaria_nome: 'Nome não disponível',
              created_at: request.created_at || '',
              type: 'link_request'
            })
            setIsLoadingPendingRequest(false)
            return
          }
        } else {
          console.log('ℹ️ [CONFIG] Nenhuma solicitação de vinculação encontrada')
          console.log('   Requests data:', requestsData)
          console.log('   Requests error:', requestsError)
        }

        // Se não encontrou solicitação, buscar convites pendentes (secretária nova)
        console.log('🔍 [CONFIG] Buscando convites pendentes...')
        console.log('   User ID:', user.id)
        console.log('   Auth UID:', (await supabase.auth.getUser()).data.user?.id)
        
        // Primeiro verificar qual é o auth.uid() atual
        const { data: { user: authUser } } = await supabase.auth.getUser()
        const authUserId = authUser?.id
        
        console.log('   Comparando: user.id =', user.id, 'vs auth.uid() =', authUserId)
        
        // Usar authUserId se disponível, senão usar user.id
        const userIdToSearch = authUserId || user.id
        
        const { data: invitesData, error: invitesError } = await supabase
          .from('secretaria_invites')
          .select('id, email, created_at, anestesista_id')
          .eq('anestesista_id', userIdToSearch)
          .is('used_at', null)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(5) // Buscar mais para debug

        console.log('📦 [CONFIG] Resultado da busca de convites:', { 
          invitesData, 
          invitesError,
          count: invitesData?.length || 0
        })

        if (invitesError) {
          console.error('❌ [CONFIG] Erro ao buscar convites:', invitesError)
        }

        if (invitesData && invitesData.length > 0) {
          const invite = invitesData[0]
          console.log('✅ [CONFIG] Convite pendente encontrado:', invite)
          console.log('   Convite anestesista_id:', invite.anestesista_id)
          console.log('   Comparando com user.id:', user.id)
          console.log('   Comparando com authUserId:', authUserId)

          setPendingRequest({
            id: invite.id,
            secretaria_email: invite.email || '',
            created_at: invite.created_at || '',
            type: 'invite'
          })
          
          console.log('✅ [CONFIG] Estado atualizado com convite pendente')
          setIsLoadingPendingRequest(false)
          return
        }

        console.log('ℹ️ [CONFIG] Nenhuma solicitação ou convite pendente encontrado')
        setPendingRequest(null)
      } catch (error) {
        console.error('❌ [CONFIG] Erro ao carregar solicitações pendentes:', error)
        setPendingRequest(null)
      } finally {
        setIsLoadingPendingRequest(false)
      }
    }

    loadPendingRequests()

    // Escutar mudanças em tempo real
    if (user && !secretaria) {
      const channel = supabase
        .channel(`link_requests:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'secretaria_link_requests',
            filter: `anestesista_id=eq.${user.id}`
          },
          () => {
            loadPendingRequests()
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'secretaria_invites',
            filter: `anestesista_id=eq.${user.id}`
          },
          () => {
            loadPendingRequests()
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'anestesista_secretaria',
            filter: `anestesista_id=eq.${user.id}`
          },
          () => {
            // Quando vinculação for criada, limpar pendência
            setPendingRequest(null)
            // Recarregar secretária do contexto
            if (secretariaLoading === false) {
              // O contexto vai atualizar automaticamente
            }
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [user, secretaria, secretariaLoading])
  
  // Debug: Log quando pendingRequest mudar
  useEffect(() => {
    console.log('🔄 [CONFIG] Estado pendingRequest mudou:', pendingRequest)
  }, [pendingRequest])

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

  // Função para gerar link de convite de secretária
  const handleGenerateInvite = async () => {
    if (!secretariaForm.email.trim()) {
      setFeedbackMessage({ type: 'error', message: 'Email é obrigatório.' })
      setTimeout(() => setFeedbackMessage(null), 3000)
      return
    }

    setIsLinkingSecretaria(true)
    setFeedbackMessage(null)

    try {
      // Obter token de autenticação
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        setFeedbackMessage({ type: 'error', message: 'Sessão expirada. Faça login novamente.' })
        setTimeout(() => {
          router.push('/login')
        }, 2000)
        return
      }

      const response = await fetch('/api/secretaria/generate-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          email: secretariaForm.email.trim()
        })
      })

      const data = await response.json()

      if (data.success) {
        if (data.exists) {
          // Secretária já existe - notificação foi criada
          setFeedbackMessage({ 
            type: 'success', 
            message: `Secretária já cadastrada! Uma notificação foi enviada para ${data.secretaria.email}.` 
          })
          setSecretariaForm({ email: '', nome: '', telefone: '' })
          setShowSecretariaForm(false)
          
          // Forçar recarregamento das solicitações pendentes após criar notificação
          // Isso vai buscar tanto link_requests quanto invites
          setTimeout(() => {
            // O useEffect vai recarregar automaticamente via realtime
            // Mas forçamos um reload manual também
            if (user && !secretaria) {
              // Recarregar será feito pelo useEffect
            }
          }, 1500)
        } else {
          // Nova secretária - mostrar modal com link
          setInviteLink(data.invite.inviteUrl)
          setInviteEmail(data.invite.email)
          setShowInviteModal(true)
          setShowSecretariaForm(false)
          
          // Atualizar estado com convite pendente
          setTimeout(async () => {
            if (user && !secretaria) {
              try {
                const { data: invitesData } = await supabase
                  .from('secretaria_invites')
                  .select('id, email, created_at')
                  .eq('anestesista_id', user.id)
                  .is('used_at', null)
                  .gt('expires_at', new Date().toISOString())
                  .order('created_at', { ascending: false })
                  .limit(1)

                if (invitesData && invitesData.length > 0) {
                  const invite = invitesData[0]
                  setPendingRequest({
                    id: invite.id,
                    secretaria_email: invite.email || '',
                    created_at: invite.created_at || '',
                    type: 'invite'
                  })
                  console.log('✅ [CONFIG] Convite pendente atualizado após gerar link')
                }
              } catch (error) {
                console.error('Erro ao atualizar convite pendente:', error)
              }
            }
          }, 1000)
        }
        setTimeout(() => setFeedbackMessage(null), 6000)
      } else {
        setFeedbackMessage({ type: 'error', message: data.error || 'Erro ao gerar link de convite.' })
        setTimeout(() => setFeedbackMessage(null), 5000)
      }
    } catch (error) {
      console.error('Erro ao gerar convite:', error)
      setFeedbackMessage({ type: 'error', message: 'Erro ao gerar link de convite. Tente novamente.' })
      setTimeout(() => setFeedbackMessage(null), 5000)
    } finally {
      setIsLinkingSecretaria(false)
    }
  }

  // Função para copiar link
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (error) {
      console.error('Erro ao copiar link:', error)
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
              {/* Debug: Log do estado atual */}
              {process.env.NODE_ENV === 'development' && (
                <div className="text-xs text-gray-400 mb-2">
                  Debug: isLoading={String(isLoadingPendingRequest)}, 
                  hasSecretaria={String(!!secretaria)}, 
                  hasPendingRequest={String(!!pendingRequest)}
                </div>
              )}
              
              {isLoadingPendingRequest && !secretaria ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-4"></div>
                  <p className="text-sm text-gray-600">Verificando solicitações pendentes...</p>
                </div>
              ) : secretaria ? (
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
              ) : pendingRequest ? (
                <div className="space-y-4">
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <Clock className="w-5 h-5 text-yellow-600 mt-0.5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-yellow-900 mb-1">
                          {pendingRequest.type === 'invite' 
                            ? 'Aguardando cadastro da secretária' 
                            : 'Aguardando confirmação da secretária'}
                        </h3>
                        <div className="space-y-1 mt-2">
                          <div className="flex items-center text-sm text-yellow-800">
                            <Mail className="w-4 h-4 mr-1" />
                            {pendingRequest.secretaria_email}
                          </div>
                          {pendingRequest.secretaria_nome && (
                            <div className="flex items-center text-sm text-yellow-800">
                              <Users className="w-4 h-4 mr-1" />
                              {pendingRequest.secretaria_nome}
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-yellow-700 mt-3">
                          {pendingRequest.type === 'invite' 
                            ? 'Um link de cadastro foi gerado para esta secretária. Ela precisa acessar o link e criar sua conta para que a vinculação seja concluída.' 
                            : 'Uma solicitação de vinculação foi enviada para esta secretária. Ela precisa aceitar no dashboard dela para que a vinculação seja concluída.'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={async () => {
                        // Forçar recarregamento completo
                        setIsLoadingPendingRequest(true)
                        try {
                          if (user && !secretaria) {
                            // Buscar solicitações de vinculação
                            const { data: requestsData } = await supabase
                              .from('secretaria_link_requests')
                              .select('id, secretaria_id, created_at')
                              .eq('anestesista_id', user.id)
                              .eq('status', 'pending')
                              .order('created_at', { ascending: false })
                              .limit(1)

                            if (requestsData && requestsData.length > 0) {
                              const request = requestsData[0]
                              const { data: secretariaData } = await supabase
                                .from('secretarias')
                                .select('id, email, nome')
                                .eq('id', request.secretaria_id)
                                .single()

                              if (secretariaData) {
                                setPendingRequest({
                                  id: request.id,
                                  secretaria_id: request.secretaria_id,
                                  secretaria_email: secretariaData.email || '',
                                  secretaria_nome: secretariaData.nome || '',
                                  created_at: request.created_at || '',
                                  type: 'link_request'
                                })
                                setIsLoadingPendingRequest(false)
                                return
                              }
                            }

                            // Buscar convites pendentes
                            const { data: invitesData } = await supabase
                              .from('secretaria_invites')
                              .select('id, email, created_at')
                              .eq('anestesista_id', user.id)
                              .is('used_at', null)
                              .gt('expires_at', new Date().toISOString())
                              .order('created_at', { ascending: false })
                              .limit(1)

                            if (invitesData && invitesData.length > 0) {
                              const invite = invitesData[0]
                              setPendingRequest({
                                id: invite.id,
                                secretaria_email: invite.email || '',
                                created_at: invite.created_at || '',
                                type: 'invite'
                              })
                            } else {
                              setPendingRequest(null)
                            }
                          }
                        } catch (error) {
                          console.error('Erro ao recarregar:', error)
                          setPendingRequest(null)
                        } finally {
                          setIsLoadingPendingRequest(false)
                        }
                      }}
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => setShowSecretariaForm(true)}
                      variant="outline"
                      className="flex-1"
                    >
                      Enviar Nova Solicitação
                    </Button>
                  </div>
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
                      onClick={handleGenerateInvite}
                      disabled={isLinkingSecretaria || !secretariaForm.email.trim()}
                      className="flex-1"
                    >
                      {isLinkingSecretaria ? 'Gerando link...' : 'Gerar Link de Cadastro'}
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
                    Um link de cadastro será gerado para a secretária. 
                    Se ela já estiver cadastrada, receberá uma notificação no dashboard.
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

      {/* Modal de Link de Convite */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => {
          setShowInviteModal(false)
          setInviteLink('')
          setInviteEmail('')
          setLinkCopied(false)
        }}
        title="Link de Cadastro Gerado"
        size="lg"
      >
        <div className="space-y-6">
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-teal-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-teal-900">
                  Link gerado com sucesso!
                </p>
                <p className="text-xs text-teal-700 mt-1">
                  Copie o link abaixo e envie para <strong>{inviteEmail}</strong> para que ela possa criar sua conta de secretária.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Link de Cadastro
            </label>
            <div className="flex space-x-2">
              <div className="flex-1 bg-gray-50 border border-gray-300 rounded-lg p-3 break-all">
                <code className="text-sm text-gray-800">{inviteLink}</code>
              </div>
              <Button
                onClick={handleCopyLink}
                variant={linkCopied ? "outline" : "default"}
                className="shrink-0"
              >
                {linkCopied ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-xs text-blue-800">
              <strong>📋 Instruções:</strong>
            </p>
            <ol className="text-xs text-blue-700 mt-2 space-y-1 list-decimal list-inside">
              <li>Copie o link acima</li>
              <li>Envie o link para a secretária por email ou WhatsApp</li>
              <li>A secretária acessará o link e preencherá o cadastro</li>
              <li>Após confirmar o email, ela terá acesso ao dashboard</li>
              <li>O link expira em 7 dias</li>
            </ol>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => {
                setShowInviteModal(false)
                setInviteLink('')
                setInviteEmail('')
                setLinkCopied(false)
              }}
            >
              Fechar
            </Button>
          </div>
        </div>
      </Modal>
    </Layout>
  )
}
