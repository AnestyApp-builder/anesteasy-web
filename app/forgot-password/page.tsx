'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Stethoscope, Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Logo } from '@/components/ui/Logo'
import { useAuth } from '@/contexts/AuthContext'
import { authService } from '@/lib/auth'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()

  // Redirecionar se já estiver logado
  useEffect(() => {
    if (isAuthenticated && user) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, user, router])

  // Mostrar loading enquanto verifica autenticação
  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    )
  }

  // Não renderizar se já estiver logado (será redirecionado)
  if (isAuthenticated && user) {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsLoading(true)

    try {
      const result = await authService.resetPassword(email)
      
      if (result.success) {
        setSuccess(result.message)
        setIsSubmitted(true)
      } else {
        setError(result.message)
      }
    } catch (error) {
      
      setError('Erro interno. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <Link href="/" className="inline-block">
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
                  Email Enviado!
                </CardTitle>
                <p className="text-gray-600 mt-2">
                  Enviamos um link de recuperação para <strong>{email}</strong>
                </p>
              </div>
            </CardHeader>
            
            <div className="p-6 pt-0">
              <div className="text-center space-y-4">
                <p className="text-sm text-gray-600">
                  Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
                </p>
                <div className="space-y-2">
                  <Link href="/login">
                    <Button className="w-full">
                      Voltar ao Login
                    </Button>
                  </Link>
                  <Button 
                    variant="ghost" 
                    className="w-full"
                    onClick={() => setIsSubmitted(false)}
                  >
                    Tentar outro email
                  </Button>
                </div>
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
        {/* Logo - Apenas símbolo centralizado */}
        <div className="text-center">
          <Link href="/" className="inline-block">
            <Logo size="md" showText={false} />
          </Link>
        </div>

        {/* Forgot Password Form */}
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-gray-900">
              Recuperar senha
            </CardTitle>
            <p className="text-center text-gray-600 mt-2">
              Digite seu email para receber um link de recuperação
            </p>
          </CardHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6 p-6 pt-0">
            {/* Mensagens de erro e sucesso */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-600">{success}</p>
              </div>
            )}

            <Input
              label="Email"
              type="email"
              placeholder="seu@email.com"
              icon={<Mail className="w-5 h-5" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />

            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Enviando...' : 'Enviar link de recuperação'}
            </Button>
          </form>

          <div className="px-6 pb-6">
            <div className="text-center">
              <Link href="/login" className="inline-flex items-center text-sm text-primary-600 hover:text-primary-500">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Voltar ao login
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
