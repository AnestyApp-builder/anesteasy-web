'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Logo } from '@/components/ui/Logo'
import { authService } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

function ResetPasswordContent() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isValidToken, setIsValidToken] = useState(false)
  const [isCheckingToken, setIsCheckingToken] = useState(true)
  
  const router = useRouter()
  const searchParams = useSearchParams()

  // Verificar se há token válido na URL ou se usuário está autenticado
  useEffect(() => {
    const checkToken = async () => {
      try {
        // Primeiro, verificar se há parâmetros de recuperação de senha na URL
        const accessToken = searchParams.get('access_token')
        const refreshToken = searchParams.get('refresh_token')
        const type = searchParams.get('type')

        if (type === 'recovery' && accessToken && refreshToken) {
          // Configurar sessão com os tokens
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })

          if (error) {
            setError('Link inválido ou expirado. Solicite um novo link de recuperação.')
          } else {
            setIsValidToken(true)
          }
        } else {
          // Se não há tokens na URL, permitir acesso (usuário veio do link de recuperação)
          // O Supabase já validou o link quando redirecionou para cá
          setIsValidToken(true)
        }
      } catch (error) {
        setError('Erro ao verificar link. Tente novamente.')
      } finally {
        setIsCheckingToken(false)
      }
    }

    checkToken()
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validações
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    // Verificar se a senha não é muito simples
    if (password === '123456' || password === 'password' || password === 'senha123') {
      setError('Por favor, escolha uma senha mais segura.')
      return
    }

    setIsLoading(true)

    try {
      // Verificar se há sessão ativa antes de atualizar
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        setError('Sessão expirada. Solicite um novo link de recuperação.')
        return
      }

      // Usar o método correto do Supabase para atualizar senha
      const { data, error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        // Tratar erro específico de senha igual
        if (error.message.includes('New password should be different from the old password')) {
          setError('A nova senha deve ser diferente da senha atual. Por favor, escolha uma senha diferente.')
        } else {
          setError(`Erro ao atualizar senha: ${error.message}`)
        }
      } else {
        setSuccess('Senha atualizada com sucesso! Redirecionando para login...')
        // Verificar se é secretaria para redirecionar corretamente
        const type = searchParams.get('type')
        setTimeout(() => {
          if (type === 'secretaria') {
            router.push('/secretaria/login')
          } else {
            router.push('/login')
          }
        }, 2000)
      }
    } catch (error) {
      setError('Erro interno. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  // Mostrar loading enquanto verifica token
  if (isCheckingToken) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando link...</p>
        </div>
      </div>
    )
  }

  // Mostrar erro se token inválido
  if (!isValidToken) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <Link href="/">
              <Logo size="md" showText={false} />
            </Link>
          </div>

          <Card className="animate-fade-in">
            <CardHeader>
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <CardTitle className="text-2xl text-gray-900">
                  Link Inválido
                </CardTitle>
                <p className="text-gray-600 mt-2">
                  {error}
                </p>
              </div>
            </CardHeader>
            
            <div className="p-6 pt-0">
              <div className="text-center space-y-4">
                <Link href="/forgot-password">
                  <Button className="w-full">
                    Solicitar Novo Link
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="ghost" className="w-full">
                    Voltar ao Login
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // Mostrar sucesso se senha foi alterada
  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <Link href="/">
              <Logo size="md" showText={false} />
            </Link>
          </div>

          <Card className="animate-fade-in">
            <CardHeader>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <CardTitle className="text-2xl text-gray-900">
                  Senha Alterada!
                </CardTitle>
                <p className="text-gray-600 mt-2">
                  {success}
                </p>
              </div>
            </CardHeader>
            
            <div className="p-6 pt-0">
              <div className="text-center space-y-4">
                <p className="text-sm text-gray-600">
                  Você será redirecionado para o login em alguns segundos...
                </p>
                <Link href="/login">
                  <Button className="w-full">
                    Ir para Login
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo - Centralizado */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-block">
            <Logo size="md" showText={false} />
          </Link>
        </div>

        {/* Reset Password Form */}
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-gray-900">
              Redefinir senha
            </CardTitle>
            <p className="text-center text-gray-600 mt-2">
              Digite sua nova senha
            </p>
          </CardHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6 p-6 pt-0">
            {/* Mensagem de erro */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Nova Senha */}
            <div className="relative">
              <Input
                label="Nova Senha"
                type={showPassword ? 'text' : 'password'}
                placeholder="Digite sua nova senha"
                icon={<Lock className="w-5 h-5" />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 flex items-center justify-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Confirmar Senha */}
            <div className="relative">
              <Input
                label="Confirmar Nova Senha"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirme sua nova senha"
                icon={<Lock className="w-5 h-5" />}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 flex items-center justify-center"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Alterando senha...' : 'Alterar senha'}
            </Button>
          </form>

          <div className="px-6 pb-6">
            <div className="text-center">
              <Link href="/login" className="inline-flex items-center text-sm text-primary-600 hover:text-primary-500">
                Voltar ao login
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default function ResetPassword() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
