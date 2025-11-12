'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { supabase } from '@/lib/supabase'
import { useSecretariaAuth } from '@/contexts/SecretariaAuthContext'

export default function ChangePassword() {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [mustChangePassword, setMustChangePassword] = useState(false)
  const router = useRouter()
  const { secretaria, isAuthenticated, isLoading: authLoading } = useSecretariaAuth()

  useEffect(() => {
    const checkMustChangePassword = async () => {
      if (authLoading) return

      if (!isAuthenticated || !secretaria) {
        router.push('/login')
        return
      }

      // Verificar se precisa trocar senha
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.user_metadata?.mustChangePassword) {
          setMustChangePassword(true)
        } else {
          // Se não precisa trocar senha, redirecionar para dashboard
          router.push('/secretaria/dashboard')
        }
      } catch (error) {
        console.error('Erro ao verificar necessidade de troca de senha:', error)
        router.push('/login')
      }
    }

    checkMustChangePassword()
  }, [isAuthenticated, secretaria, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsLoading(true)

    // Verificar usuário autenticado
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Usuário não autenticado')
      setIsLoading(false)
      return
    }

    // Verificar se é primeiro login (precisa trocar senha)
    const isFirstLogin = user.user_metadata?.mustChangePassword === true

    // Validações
    if (!isFirstLogin && !formData.currentPassword) {
      setError('Por favor, preencha a senha atual')
      setIsLoading(false)
      return
    }

    if (!formData.newPassword || !formData.confirmPassword) {
      setError('Por favor, preencha todos os campos obrigatórios')
      setIsLoading(false)
      return
    }

    if (formData.newPassword.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres')
      setIsLoading(false)
      return
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('As senhas não coincidem')
      setIsLoading(false)
      return
    }

    if (!isFirstLogin && formData.currentPassword === formData.newPassword) {
      setError('A nova senha deve ser diferente da senha atual')
      setIsLoading(false)
      return
    }

    try {
      // Para primeiro login, não precisamos verificar senha atual
      // A secretaria já está autenticada (fez login com senha temporária)
      // Para trocas posteriores, vamos verificar a senha atual
      
      if (!isFirstLogin) {
        // Verificar senha atual fazendo um teste de login
        // Salvar sessão atual antes
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        
        if (currentSession) {
          // Fazer logout temporário
          await supabase.auth.signOut()
          
          // Tentar fazer login com a senha informada
          const { data: loginData, error: signInError } = await supabase.auth.signInWithPassword({
            email: user.email || '',
            password: formData.currentPassword || ''
          })

          if (signInError || !loginData.user) {
            setError('Senha atual incorreta.')
            setIsLoading(false)
            // Restaurar sessão anterior
            if (currentSession) {
              await supabase.auth.setSession({
                access_token: currentSession.access_token,
                refresh_token: currentSession.refresh_token
              })
            }
            return
          }
        }
      }

      // Atualizar senha
      // No primeiro login, usuário já está autenticado
      // Em trocas posteriores, acabamos de fazer login com a senha correta
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.newPassword,
        data: {
          mustChangePassword: false,
          tempPassword: null // Remover senha temporária dos metadados
        }
      })

      if (updateError) {
        setError('Erro ao atualizar senha. Tente novamente.')
        setIsLoading(false)
        return
      }

      setSuccess('Senha alterada com sucesso! Redirecionando...')
      
      // Redirecionar para dashboard após 2 segundos
      setTimeout(() => {
        router.push('/secretaria/dashboard')
      }, 2000)
    } catch (error) {
      console.error('Erro ao trocar senha:', error)
      setError('Erro interno ao trocar senha. Tente novamente.')
      setIsLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!mustChangePassword) {
    return null // Será redirecionado pelo useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Trocar Senha</CardTitle>
          <p className="text-center text-sm text-gray-600 mt-2">
            {mustChangePassword 
              ? 'Por questões de segurança, você precisa trocar sua senha temporária antes de continuar.'
              : 'Por questões de segurança, você precisa informar sua senha atual para alterá-la.'
            }
          </p>
          {mustChangePassword && (
            <p className="text-center text-xs text-gray-500 mt-2">
              Use a senha temporária que você recebeu por email.
            </p>
          )}
        </CardHeader>
        <div className="p-6">
          {error && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!mustChangePassword && (
              <div>
                <Input
                  label="Senha Atual"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={formData.currentPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  placeholder="Digite sua senha atual"
                  icon={showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  onIconClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  required
                />
              </div>
            )}

            <div>
              <Input
                label="Nova Senha"
                type={showNewPassword ? 'text' : 'password'}
                value={formData.newPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                placeholder="Digite sua nova senha (mín. 6 caracteres)"
                icon={showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                onIconClick={() => setShowNewPassword(!showNewPassword)}
                required
              />
            </div>

            <div>
              <Input
                label="Confirmar Nova Senha"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Confirme sua nova senha"
                icon={showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                onIconClick={() => setShowConfirmPassword(!showConfirmPassword)}
                required
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
            >
              <Lock className="w-4 h-4 mr-2" />
              {isLoading ? 'Alterando senha...' : 'Alterar Senha'}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  )
}

