'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Mail, Lock, User, Phone, Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Logo } from '@/components/ui/Logo'
import { authService } from '@/lib/auth'

function SecretariaRegisterContent() {
  const router = useRouter()
  const params = useParams()
  const token = params?.token as string

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isValidating, setIsValidating] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [inviteData, setInviteData] = useState<{
    email: string
    anestesista: { name: string; email: string } | null
  } | null>(null)

  // Validar token ao carregar
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('Token inválido')
        setIsValidating(false)
        return
      }

      try {
        const response = await fetch(`/api/secretaria/validate-invite?token=${token}`)
        const data = await response.json()

        if (data.success) {
          setInviteData({
            email: data.invite.email,
            anestesista: data.invite.anestesista
          })
          setFormData(prev => ({ ...prev, email: data.invite.email }))
          setError('')
        } else {
          setError(data.error || 'Convite inválido ou expirado')
        }
      } catch (error) {
        console.error('Erro ao validar token:', error)
        setError('Erro ao validar convite. Tente novamente.')
      } finally {
        setIsValidating(false)
      }
    }

    validateToken()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validações
    if (!formData.name.trim()) {
      setError('Nome é obrigatório')
      return
    }

    if (!formData.email.trim()) {
      setError('Email é obrigatório')
      return
    }

    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    // Verificar se email do formulário corresponde ao do convite
    if (inviteData && formData.email.toLowerCase().trim() !== inviteData.email.toLowerCase().trim()) {
      setError('O email deve corresponder ao email do convite')
      return
    }

    setIsLoading(true)

    try {
      // Criar conta da secretária
      const result = await authService.createSecretariaAccount(
        formData.email.trim(),
        formData.password,
        formData.name.trim(),
        formData.phone || undefined
      )

      if (result.success) {
        // Marcar convite como usado
        try {
          await fetch('/api/secretaria/use-invite', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token })
          })
        } catch (err) {
          console.error('Erro ao marcar convite como usado:', err)
          // Não bloquear o cadastro se falhar
        }

        setSuccess('Conta criada com sucesso! Verifique seu email para confirmar a conta.')
        
        // Redirecionar após 3 segundos
        setTimeout(() => {
          router.push('/secretaria/login')
        }, 3000)
      } else {
        setError('Erro ao criar conta. Tente novamente.')
      }
    } catch (error) {
      console.error('Erro ao criar conta:', error)
      setError('Erro interno. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isValidating) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-teal-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Validando convite...</p>
        </div>
      </div>
    )
  }

  if (error && !inviteData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <CardTitle className="text-xl text-red-600">Convite Inválido</CardTitle>
            </div>
          </CardHeader>
          <div className="p-6 pt-0">
            <p className="text-gray-600 text-center mb-6">{error}</p>
            <Button
              onClick={() => router.push('/login')}
              className="w-full"
            >
              Ir para Login
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Logo size="md" showText={false} />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Cadastro de Secretária</h1>
          {inviteData?.anestesista && (
            <p className="mt-2 text-sm text-gray-600">
              Você foi convidada por <strong>{inviteData.anestesista.name}</strong>
            </p>
          )}
        </div>

        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-xl text-center">
              Criar sua conta
            </CardTitle>
            <p className="text-center text-sm text-gray-600 mt-2">
              Preencha os dados abaixo para criar sua conta de secretária
            </p>
          </CardHeader>

          <form onSubmit={handleSubmit} className="space-y-4 p-6 pt-0">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-green-600">{success}</p>
                </div>
              </div>
            )}

            <Input
              label="Nome Completo *"
              type="text"
              placeholder="Seu nome completo"
              icon={<User className="w-5 h-5" />}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              disabled={isLoading || !!success}
            />

            <Input
              label="Email *"
              type="email"
              placeholder="seu@email.com"
              icon={<Mail className="w-5 h-5" />}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={isLoading || !!success || !!inviteData}
              className={inviteData ? 'bg-gray-50' : ''}
            />

            {inviteData && (
              <p className="text-xs text-gray-500 -mt-2">
                Este email foi definido pelo convite e não pode ser alterado
              </p>
            )}

            <div className="relative">
              <Input
                label="Senha *"
                type={showPassword ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                icon={<Lock className="w-5 h-5" />}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                disabled={isLoading || !!success}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <div className="relative">
              <Input
                label="Confirmar Senha *"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Digite a senha novamente"
                icon={<Lock className="w-5 h-5" />}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                disabled={isLoading || !!success}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <Input
              label="Telefone (opcional)"
              type="tel"
              placeholder="(11) 99999-9999"
              icon={<Phone className="w-5 h-5" />}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              disabled={isLoading || !!success}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !!success}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando conta...
                </>
              ) : success ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Conta criada!
                </>
              ) : (
                'Criar Conta'
              )}
            </Button>

            <p className="text-xs text-center text-gray-500 mt-4">
              Ao criar sua conta, você concorda com nossos termos de uso e política de privacidade.
            </p>
          </form>
        </Card>
      </div>
    </div>
  )
}

export default function SecretariaRegister() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-teal-600 animate-spin" />
      </div>
    }>
      <SecretariaRegisterContent />
    </Suspense>
  )
}

