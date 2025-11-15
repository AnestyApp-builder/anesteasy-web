'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Settings, 
  User, 
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
  RefreshCw,
  CreditCard,
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2
} from 'lucide-react'
import { Layout } from '@/components/layout/Layout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/contexts/AuthContext'
import { useSecretaria } from '@/contexts/SecretariaContext'
import { supabase } from '@/lib/supabase'

function ConfiguracoesContent() {
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
  const [secretariaEmail, setSecretariaEmail] = useState('')
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
  
  // Estados para gerenciamento de assinatura
  const [subscription, setSubscription] = useState<any>(null)
  const [subscriptionLoading, setSubscriptionLoading] = useState(true)
  const [isCancelling, setIsCancelling] = useState(false)
  const [showChangePlanModal, setShowChangePlanModal] = useState(false)
  const [isChangingPlan, setIsChangingPlan] = useState(false)
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [isProcessingRefund, setIsProcessingRefund] = useState(false)
  const [refundEligibility, setRefundEligibility] = useState<{eligible: boolean, daysUsed: number, reason?: string} | null>(null)

  // Verificar autenticação e redirecionar se necessário
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
      return
    }

    // Verificar se é secretária e redirecionar (secretárias não devem acessar configurações de anestesistas)
    if (user && !isLoading) {
      const checkIfSecretaria = async () => {
        try {
          const { isSecretaria } = await import('@/lib/user-utils')
          const isSec = await isSecretaria(user.id)
          
          if (isSec) {
            // Secretária tentando acessar configurações de anestesista - bloquear acesso
            console.warn('⚠️ Tentativa de acesso não autorizado: Secretária tentando acessar configurações de anestesista')
            router.push('/secretaria/dashboard')
          }
        } catch (error) {
          console.error('Erro ao verificar tipo de usuário:', error)
        }
      }

      checkIfSecretaria()
    }
  }, [isLoading, isAuthenticated, user, router])

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

  // Carregar assinatura do usuário
  useEffect(() => {
    const loadSubscription = async () => {
      if (!user) {
        setSubscriptionLoading(false)
        return
      }

      try {
        setSubscriptionLoading(true)
        const { supabase } = await import('@/lib/supabase')
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session?.access_token) {
          setSubscriptionLoading(false)
          return
        }

        const response = await fetch('/api/stripe/subscription', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          setSubscription(data.subscription)
          
          // Verificar elegibilidade para reembolso se tiver assinatura
          if (data.subscription && data.subscription.id) {
            const { checkRefundEligibility } = await import('@/lib/subscription-access')
            const eligibility = await checkRefundEligibility(data.subscription.id)
            setRefundEligibility(eligibility)
          }
        } else if (response.status === 404) {
          setSubscription(null)
        }
      } catch (error) {
        console.error('Erro ao carregar assinatura:', error)
      } finally {
        setSubscriptionLoading(false)
      }
    }

    loadSubscription()
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

      // Timeout de segurança para evitar carregamento infinito
      const timeoutId = setTimeout(() => {
        console.warn('⏱️ [CONFIG] Timeout ao carregar solicitações pendentes')
        setIsLoadingPendingRequest(false)
      }, 10000) // 10 segundos

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
        clearTimeout(timeoutId) // Limpar timeout quando a função terminar
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
    if (!user) {
      console.error('❌ [CONFIG] saveProfile: Usuário não encontrado')
      setFeedbackMessage({ type: 'error', message: 'Erro: Usuário não encontrado. Faça login novamente.' })
      setTimeout(() => setFeedbackMessage(null), 5000)
      return
    }

    console.log('💾 [CONFIG] Iniciando salvamento do perfil...')
    console.log('📋 [CONFIG] Dados do formulário:', formData)
    console.log('👤 [CONFIG] Usuário atual:', user)

    setIsSaving(true)
    setFeedbackMessage(null)

    try {
      const success = await updateUser(formData)
      
      console.log('📊 [CONFIG] Resultado do updateUser:', success)
      
      if (success) {
        console.log('✅ [CONFIG] Perfil atualizado com sucesso!')
        setFeedbackMessage({ type: 'success', message: 'Perfil atualizado com sucesso!' })
        setTimeout(() => setFeedbackMessage(null), 3000)
      } else {
        console.error('❌ [CONFIG] Falha ao atualizar perfil')
        setFeedbackMessage({ type: 'error', message: 'Erro ao atualizar perfil. Verifique o console para mais detalhes.' })
        setTimeout(() => setFeedbackMessage(null), 5000)
      }
    } catch (error) {
      console.error('❌ [CONFIG] Erro ao salvar alterações:', error)
      setFeedbackMessage({ type: 'error', message: `Erro ao salvar alterações: ${error instanceof Error ? error.message : 'Erro desconhecido'}` })
      setTimeout(() => setFeedbackMessage(null), 5000)
    } finally {
      setIsSaving(false)
    }
  }

  // Função para vincular secretária por email
  const handleLinkSecretaria = async () => {
    if (!secretariaEmail.trim()) {
      setFeedbackMessage({ type: 'error', message: 'Email é obrigatório.' })
      setTimeout(() => setFeedbackMessage(null), 3000)
      return
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(secretariaEmail.trim())) {
      setFeedbackMessage({ type: 'error', message: 'Email inválido.' })
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

      // Verificar se o email é anestesista
      const { data: existingAnestesista } = await supabase
        .from('users')
        .select('email')
        .eq('email', secretariaEmail.trim().toLowerCase())
        .maybeSingle()

      if (existingAnestesista) {
        setFeedbackMessage({ 
          type: 'error', 
          message: 'Este email já está cadastrado como anestesista. Um email de anestesista não pode ser usado como secretária.' 
        })
        setTimeout(() => setFeedbackMessage(null), 5000)
        setIsLinkingSecretaria(false)
        return
      }

      // Verificar se o email é secretária
      const { data: existingSecretaria } = await supabase
        .from('secretarias')
        .select('id, email, nome')
        .eq('email', secretariaEmail.trim().toLowerCase())
        .maybeSingle()

      if (existingSecretaria) {
        // Secretária existe - criar solicitação de vinculação
        const response = await fetch('/api/secretaria/generate-invite', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            email: secretariaEmail.trim()
          })
        })

        const data = await response.json()

        if (data.success && data.exists) {
          setFeedbackMessage({ 
            type: 'success', 
            message: `Solicitação de vinculação enviada para ${data.secretaria.email}. Aguarde a confirmação da secretária.` 
          })
          setSecretariaEmail('')
          setShowSecretariaForm(false)
          
          // Recarregar solicitações pendentes manualmente
          if (user && !secretaria) {
            try {
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
                  console.log('✅ [CONFIG] Card de pendência atualizado após criar solicitação')
                }
              }
            } catch (error) {
              console.error('Erro ao recarregar solicitações pendentes:', error)
            }
          }
        } else {
          setFeedbackMessage({ type: 'error', message: data.error || 'Erro ao criar solicitação de vinculação.' })
        }
        setTimeout(() => setFeedbackMessage(null), 6000)
      } else {
        // Email não existe em nenhuma tabela
        setFeedbackMessage({ 
          type: 'error', 
          message: 'Não existe secretária cadastrada com este email. Verifique o email e tente novamente.' 
        })
        setTimeout(() => setFeedbackMessage(null), 5000)
      }
    } catch (error) {
      console.error('Erro ao vincular secretária:', error)
      setFeedbackMessage({ type: 'error', message: 'Erro ao vincular secretária. Tente novamente.' })
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
      console.log('🔐 [CONFIG] Iniciando alteração de senha...')
      
      // Importar authService dinamicamente para evitar problemas de SSR
      const { authService } = await import('@/lib/auth')
      
      console.log('📞 [CONFIG] Chamando authService.updatePassword...')
      const result = await authService.updatePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword
      )
      
      console.log('📊 [CONFIG] Resultado do updatePassword:', result)
      
      if (result.success) {
        console.log('✅ [CONFIG] Senha alterada com sucesso!')
        setFeedbackMessage({ type: 'success', message: 'Senha alterada com sucesso!' })
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
        setShowPasswordModal(false)
        setTimeout(() => setFeedbackMessage(null), 3000)
      } else {
        console.error('❌ [CONFIG] Falha ao alterar senha:', result.message)
        setFeedbackMessage({ type: 'error', message: result.message || 'Erro ao alterar senha.' })
        setTimeout(() => setFeedbackMessage(null), 5000)
      }
    } catch (error) {
      console.error('❌ [CONFIG] Erro ao alterar senha:', error)
      setFeedbackMessage({ 
        type: 'error', 
        message: `Erro interno ao alterar senha: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
      })
      setTimeout(() => setFeedbackMessage(null), 5000)
    } finally {
      console.log('🏁 [CONFIG] Finalizando alteração de senha (finally)')
      setIsUpdatingPassword(false)
    }
  }

  // Funções de gerenciamento de assinatura
  const handleChangePlan = async (newPlanType: string) => {
    if (!subscription) return

    try {
      setIsChangingPlan(true)
      setFeedbackMessage(null)

      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        setFeedbackMessage({ type: 'error', message: 'Sessão expirada. Por favor, faça login novamente.' })
        setTimeout(() => setFeedbackMessage(null), 3000)
        return
      }

      const response = await fetch('/api/stripe/subscription/change-plan', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription_id: subscription.stripe_subscription_id,
          new_plan_type: newPlanType
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao agendar mudança de plano')
      }

      setFeedbackMessage({ type: 'success', message: data.message || 'Mudança de plano agendada com sucesso!' })
      setTimeout(() => setFeedbackMessage(null), 5000)
      setShowChangePlanModal(false)

      // Recarregar assinatura
      const reloadResponse = await fetch('/api/stripe/subscription', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      if (reloadResponse.ok) {
        const reloadData = await reloadResponse.json()
        setSubscription(reloadData.subscription)
      }

    } catch (err: any) {
      console.error('Erro ao agendar mudança de plano:', err)
      setFeedbackMessage({ 
        type: 'error', 
        message: err.message || 'Erro ao agendar mudança de plano' 
      })
      setTimeout(() => setFeedbackMessage(null), 5000)
    } finally {
      setIsChangingPlan(false)
    }
  }

  const handleRequestRefund = async () => {
    if (!subscription) return

    if (!refundEligibility?.eligible) {
      setFeedbackMessage({ 
        type: 'error', 
        message: refundEligibility?.reason || 'Você não é elegível para reembolso (mínimo de 8 dias de uso)' 
      })
      setTimeout(() => setFeedbackMessage(null), 5000)
      return
    }

    if (!confirm(`Tem certeza que deseja solicitar reembolso? Você utilizou a plataforma por ${refundEligibility.daysUsed} dias. O valor será reembolsado e sua assinatura será cancelada.`)) {
      return
    }

    try {
      setIsProcessingRefund(true)
      setFeedbackMessage(null)

      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        setFeedbackMessage({ type: 'error', message: 'Sessão expirada. Por favor, faça login novamente.' })
        setTimeout(() => setFeedbackMessage(null), 3000)
        return
      }

      const response = await fetch('/api/stripe/subscription/refund', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription_id: subscription.stripe_subscription_id
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar reembolso')
      }

      setFeedbackMessage({ type: 'success', message: data.message || 'Reembolso processado com sucesso!' })
      setTimeout(() => setFeedbackMessage(null), 8000)
      setShowRefundModal(false)

      // Recarregar assinatura
      const reloadResponse = await fetch('/api/stripe/subscription', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      if (reloadResponse.ok) {
        const reloadData = await reloadResponse.json()
        setSubscription(reloadData.subscription)
      }

    } catch (err: any) {
      console.error('Erro ao processar reembolso:', err)
      setFeedbackMessage({ 
        type: 'error', 
        message: err.message || 'Erro ao processar reembolso' 
      })
      setTimeout(() => setFeedbackMessage(null), 5000)
    } finally {
      setIsProcessingRefund(false)
    }
  }

  const getAvailablePlansForChange = () => {
    if (!subscription) return []
    
    const currentPlanIndex = ['monthly', 'quarterly', 'annual'].indexOf(subscription.plan_type)
    const allPlans = ['monthly', 'quarterly', 'annual']
    
    return allPlans.filter((plan, index) => index !== currentPlanIndex)
  }

  const PLAN_NAMES: Record<string, string> = {
    monthly: 'Plano Mensal',
    quarterly: 'Plano Trimestral',
    annual: 'Plano Anual'
  }

  const PLAN_PRICES: Record<string, number> = {
    monthly: 79.00,
    quarterly: 225.00,
    annual: 850.00
  }

  const handleCancelSubscription = async (cancelImmediately: boolean = false) => {
    if (!subscription) return

    // Verificar se já está cancelada
    if (subscription.status === 'cancelled' || subscription.status === 'expired') {
      setFeedbackMessage({ 
        type: 'error', 
        message: 'Esta assinatura já foi cancelada.' 
      })
      setTimeout(() => setFeedbackMessage(null), 3000)
      return
    }

    try {
      setIsCancelling(true)
      setFeedbackMessage(null)

      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        setFeedbackMessage({ type: 'error', message: 'Sessão expirada. Por favor, faça login novamente.' })
        setTimeout(() => setFeedbackMessage(null), 3000)
        return
      }

      const response = await fetch('/api/stripe/subscription/cancel', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription_id: subscription.stripe_subscription_id,
          cancel_immediately: cancelImmediately
        })
      })

      const data = await response.json()

      if (!response.ok) {
        // Verificar se o erro é porque já está cancelada
        const errorMessage = data.error || 'Erro ao cancelar assinatura'
        if (errorMessage.toLowerCase().includes('canceled') || errorMessage.toLowerCase().includes('cancelada')) {
          // Assinatura já estava cancelada, apenas atualizar dados
          const reloadResponse = await fetch('/api/stripe/subscription', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          })
          if (reloadResponse.ok) {
            const reloadData = await reloadResponse.json()
            setSubscription(reloadData.subscription)
          }
          setFeedbackMessage({ 
            type: 'success', 
            message: 'Esta assinatura já estava cancelada.' 
          })
          setTimeout(() => setFeedbackMessage(null), 5000)
          return
        }
        throw new Error(errorMessage)
      }

      // Mostrar mensagem de sucesso
      if (data.success) {
        setFeedbackMessage({ 
          type: 'success', 
          message: data.message || (cancelImmediately 
            ? 'Assinatura cancelada com sucesso. Você perdeu o acesso imediatamente.'
            : 'Assinatura será cancelada ao fim do período atual. Você manterá o acesso até então.')
        })
        setTimeout(() => setFeedbackMessage(null), 5000)
      }

      // Recarregar assinatura
      const reloadResponse = await fetch('/api/stripe/subscription', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      if (reloadResponse.ok) {
        const reloadData = await reloadResponse.json()
        setSubscription(reloadData.subscription)
      }

    } catch (err: any) {
      console.error('Erro ao cancelar assinatura:', err)
      const errorMessage = err.message || 'Erro ao cancelar assinatura'
      // Verificar se o erro é porque já está cancelada
      if (errorMessage.toLowerCase().includes('canceled') || errorMessage.toLowerCase().includes('cancelada')) {
        setFeedbackMessage({ 
          type: 'error', 
          message: 'Esta assinatura já está cancelada.' 
        })
        // Recarregar para atualizar status
        const { supabase } = await import('@/lib/supabase')
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          const reloadResponse = await fetch('/api/stripe/subscription', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          })
          if (reloadResponse.ok) {
            const reloadData = await reloadResponse.json()
            setSubscription(reloadData.subscription)
          }
        }
      } else {
        setFeedbackMessage({ 
          type: 'error', 
          message: errorMessage
        })
      }
      setTimeout(() => setFeedbackMessage(null), 5000)
    } finally {
      setIsCancelling(false)
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
                    <h4 className="font-medium">Vincular Secretaria</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowSecretariaForm(false)
                        setSecretariaEmail('')
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <Input
                    label="Email da Secretaria *"
                    value={secretariaEmail}
                    onChange={(e) => setSecretariaEmail(e.target.value)}
                    type="email"
                    placeholder="secretaria@exemplo.com"
                    icon={<Mail className="w-5 h-5" />}
                  />
                  
                  <div className="flex space-x-2">
                    <Button
                      onClick={handleLinkSecretaria}
                      disabled={isLinkingSecretaria || !secretariaEmail.trim()}
                      className="flex-1"
                    >
                      {isLinkingSecretaria ? 'Enviando solicitação...' : 'Vincular Secretaria'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowSecretariaForm(false)
                        setSecretariaEmail('')
                      }}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                  </div>
                  
                  <p className="text-xs text-gray-600">
                    Digite o email da secretária que deseja vincular. 
                    Se ela já estiver cadastrada, receberá uma notificação para aceitar a vinculação.
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
                disabled={isSaving}
                className="w-full"
              >
                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
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

          {/* Subscription/Plan Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="w-5 h-5 mr-2" />
                Plano
              </CardTitle>
            </CardHeader>
            <div className="p-6 space-y-4">
              {subscriptionLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Carregando informações do plano...</p>
                </div>
              ) : !subscription ? (
                <div className="text-center py-6">
                  <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm font-medium text-gray-900 mb-2">
                    Nenhuma assinatura ativa
                  </p>
                  <p className="text-xs text-gray-600 mb-4">
                    Assine um plano para continuar usando todas as funcionalidades.
                  </p>
                  <Button
                    onClick={() => router.push('/planos')}
                    className="w-full"
                  >
                    Ver Planos Disponíveis
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Status e Plano */}
                  <div className="bg-gradient-to-r from-primary-50 to-white rounded-lg p-4 border border-primary-200">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Plano Atual</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {subscription.plan_type === 'monthly' && 'Plano Mensal'}
                          {subscription.plan_type === 'quarterly' && 'Plano Trimestral'}
                          {subscription.plan_type === 'annual' && 'Plano Anual'}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        subscription.status === 'active' 
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : subscription.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                          : subscription.status === 'failed'
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : 'bg-gray-100 text-gray-800 border border-gray-200'
                      }`}>
                        {subscription.status === 'active' && 'Ativa'}
                        {subscription.status === 'pending' && 'Pendente'}
                        {subscription.status === 'failed' && 'Falha no Pagamento'}
                        {subscription.status === 'cancelled' && 'Cancelada'}
                        {subscription.status === 'expired' && 'Expirada'}
                        {subscription.status === 'suspended' && 'Suspensa'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Valor</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {new Intl.NumberFormat('pt-BR', { 
                            style: 'currency', 
                            currency: 'BRL' 
                          }).format(subscription.amount || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Próxima Renovação</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {subscription.current_period_end 
                            ? new Date(subscription.current_period_end).toLocaleDateString('pt-BR')
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                    {subscription.current_period_end && subscription.status === 'active' && (
                      <div className="mt-3 pt-3 border-t border-primary-200">
                        <p className="text-xs text-primary-700">
                          {(() => {
                            const renewalDate = new Date(subscription.current_period_end)
                            const today = new Date()
                            const daysUntilRenewal = Math.ceil((renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                            if (daysUntilRenewal > 0) {
                              return `Renovação automática em ${daysUntilRenewal} ${daysUntilRenewal === 1 ? 'dia' : 'dias'}`
                            } else if (daysUntilRenewal === 0) {
                              return 'Renovação automática hoje'
                            } else {
                              return 'Período vencido'
                            }
                          })()}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Informações sobre mudança de plano pendente */}
                  {subscription.pending_plan_type && subscription.pending_plan_change_at && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <Clock className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-blue-800 mb-1">
                            Mudança de Plano Agendada
                          </p>
                          <p className="text-xs text-blue-700 mb-2">
                            Seu plano será alterado para <strong>{PLAN_NAMES[subscription.pending_plan_type]}</strong> em{' '}
                            {new Date(subscription.pending_plan_change_at).toLocaleDateString('pt-BR')}.
                            Você continuará com o plano atual até então.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Ações */}
                  {subscription.status === 'active' && (
                    <div className="space-y-2">
                      <Button
                        onClick={() => setShowChangePlanModal(true)}
                        disabled={isChangingPlan}
                        className="w-full bg-primary-600 hover:bg-primary-700"
                      >
                        {isChangingPlan ? 'Agendando...' : 'Trocar Plano'}
                      </Button>
                      {refundEligibility?.eligible && !subscription.refund_processed_at && (
                        <Button
                          variant="outline"
                          onClick={() => setShowRefundModal(true)}
                          disabled={isProcessingRefund}
                          className="w-full border-orange-300 text-orange-600 hover:bg-orange-50"
                        >
                          {isProcessingRefund ? 'Processando...' : 'Solicitar Reembolso'}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (confirm('Tem certeza que deseja cancelar sua assinatura? Ela será cancelada ao fim do período atual e você manterá o acesso até então.')) {
                            handleCancelSubscription(false)
                          }
                        }}
                        disabled={isCancelling || subscription.status === 'cancelled' || subscription.status === 'expired'}
                        className="w-full border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isCancelling ? 'Cancelando...' : 'Cancelar Assinatura'}
                      </Button>
                    </div>
                  )}

                  {(subscription.status === 'cancelled' || subscription.status === 'expired') && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-sm font-semibold text-gray-900 mb-2">
                        Assinatura Cancelada
                      </p>
                      {subscription.cancelled_at && (
                        <p className="text-xs text-gray-600 mb-3">
                          Cancelada em {new Date(subscription.cancelled_at).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                      <Button
                        onClick={() => router.push('/planos')}
                        className="w-full bg-primary-600 hover:bg-primary-700"
                      >
                        Assinar Novo Plano
                      </Button>
                    </div>
                  )}

                  {subscription.status === 'failed' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <AlertTriangle className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-red-800 mb-1">
                            Falha no Pagamento
                          </p>
                          <p className="text-xs text-red-700 mb-3">
                            Houve um problema com o pagamento da sua assinatura. Atualize seus dados de pagamento.
                          </p>
                          <Button
                            size="sm"
                            onClick={() => router.push('/planos')}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Atualizar Pagamento
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
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

      {/* Modal de Troca de Plano */}
      {showChangePlanModal && subscription && (
        <Modal
          isOpen={showChangePlanModal}
          onClose={() => setShowChangePlanModal(false)}
          title="Trocar Plano"
        >
          <div className="space-y-4">
            <p className="text-gray-600 text-sm">
              Você continuará com seu plano atual até o fim do período ({subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString('pt-BR') : 'fim do período'}). 
              A mudança será aplicada automaticamente na próxima renovação.
            </p>
            <div className="space-y-3">
              {getAvailablePlansForChange().map((planType) => (
                <button
                  key={planType}
                  onClick={() => handleChangePlan(planType)}
                  disabled={isChangingPlan}
                  className="w-full p-4 border-2 border-primary-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {PLAN_NAMES[planType]}
                      </p>
                      <p className="text-sm text-gray-600">
                        {planType === 'monthly' && 'Renovação mensal'}
                        {planType === 'quarterly' && 'Renovação trimestral'}
                        {planType === 'annual' && 'Renovação anual'}
                      </p>
                    </div>
                    <p className="text-lg font-bold text-primary-600">
                      {new Intl.NumberFormat('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL' 
                      }).format(PLAN_PRICES[planType] || 0)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de Reembolso */}
      {showRefundModal && (
        <Modal
          isOpen={showRefundModal}
          onClose={() => setShowRefundModal(false)}
          title="Solicitar Reembolso"
        >
          <div className="space-y-4">
            {refundEligibility?.eligible ? (
              <>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800 mb-2">
                    <strong>Você é elegível para reembolso!</strong>
                  </p>
                  <p className="text-xs text-green-700">
                    Você utilizou a plataforma por <strong>{refundEligibility.daysUsed} dias</strong> (menos de 8 dias).
                    O valor completo da assinatura será reembolsado.
                  </p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-xs text-yellow-800">
                    <strong>⚠️ Atenção:</strong> Após o reembolso, sua assinatura será cancelada e você perderá o acesso à plataforma.
                    O reembolso será processado em até 5 dias úteis.
                  </p>
                </div>
                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowRefundModal(false)}
                    disabled={isProcessingRefund}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleRequestRefund}
                    disabled={isProcessingRefund}
                    className="flex-1 bg-orange-600 hover:bg-orange-700"
                  >
                    {isProcessingRefund ? 'Processando...' : 'Confirmar Reembolso'}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800 mb-2">
                    <strong>Reembolso não disponível</strong>
                  </p>
                  <p className="text-xs text-red-700">
                    {refundEligibility?.reason || 'Você utilizou a plataforma por mais de 8 dias. Reembolsos são permitidos apenas para usuários com menos de 8 dias de uso.'}
                  </p>
                </div>
                <Button
                  onClick={() => setShowRefundModal(false)}
                  className="w-full"
                >
                  Fechar
                </Button>
              </>
            )}
          </div>
        </Modal>
      )}

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

export default function Configuracoes() {
  return (
    <ProtectedRoute>
      <ConfiguracoesContent />
    </ProtectedRoute>
  )
}
