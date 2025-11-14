'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Logo } from '@/components/ui/Logo'
import { useAuth } from '@/contexts/AuthContext'

export default function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const { isLoading, user, isAuthenticated } = useAuth()
  const router = useRouter()

  // Redirecionar se já estiver logado - SIMPLES E DIRETO
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      console.log('✅ Já autenticado, redirecionando para dashboard')
      router.replace('/dashboard')
    }
  }, [isLoading, isAuthenticated, user, router])

  // Mostrar loading enquanto verifica autenticação inicial
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  // Não renderizar se já estiver logado
  if (isAuthenticated && user) {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validação básica
    if (!formData.email || !formData.password) {
      setError('Por favor, preencha todos os campos')
      return
    }

    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      return
    }

    // Prevenir múltiplos submits
    if (isSubmitting) {
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      console.log('🔐 Iniciando login para:', formData.email)
      
      // Importar diretamente o supabase para fazer login simples
      const { supabase } = await import('@/lib/supabase')
      
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email.trim().toLowerCase(),
        password: formData.password
      })

      if (authError) {
        console.error('❌ Erro no login:', authError.message)
        
        if (authError.message.includes('Invalid login credentials')) {
          setError('Email ou senha incorretos')
        } else if (authError.message.includes('Email not confirmed')) {
          setError('Email não confirmado. Verifique sua caixa de entrada')
        } else {
          setError('Erro ao fazer login. Tente novamente')
        }
        setIsSubmitting(false)
        return
      }

      if (!data?.user) {
        setError('Erro ao fazer login. Tente novamente')
        setIsSubmitting(false)
        return
      }

      console.log('✅ Login bem-sucedido, redirecionando...')
      
      // O AuthContext vai detectar a mudança de sessão e atualizar o estado
      // Aguardar um momento para o contexto processar
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Redirecionar para dashboard - o middleware vai lidar com secretarias
      router.replace('/dashboard')
      
    } catch (error: any) {
      console.error('❌ Erro no login:', error)
      setError('Erro ao fazer login. Tente novamente')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8 relative">
      {/* Botão Voltar */}
      <div className="absolute top-6 left-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="flex items-center space-x-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </Button>
        </Link>
      </div>

      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Logo size="lg" className="mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Bem-vindo de volta
          </h1>
          <p className="text-gray-600">
            Faça login para continuar
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center text-gray-900">
              Entrar
            </CardTitle>
            <p className="text-center text-sm text-gray-500 mt-1">
              Para anestesistas e secretárias
            </p>
          </CardHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6 p-6 pt-0">
            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <span className="text-sm text-red-600">{error}</span>
              </div>
            )}

            <Input
              label="Email"
              type="email"
              placeholder="seu@email.com"
              icon={<Mail className="w-5 h-5" />}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={isSubmitting}
            />
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Senha
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Sua senha"
                  icon={<Lock className="w-5 h-5" />}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 flex items-center justify-center w-5 h-5 z-10"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  disabled={isSubmitting}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  disabled={isSubmitting}
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Lembrar de mim
                </label>
              </div>
              <Link href="/forgot-password" className="text-sm text-primary-600 hover:text-primary-500">
                Esqueceu a senha?
              </Link>
            </div>

            <Button 
              type="submit" 
              className="w-full py-4 text-lg font-medium" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <div className="px-6 pb-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Novo por aqui?</span>
              </div>
            </div>
            <div className="mt-6">
              <Link href="/register">
                <Button variant="outline" className="w-full">
                  Criar uma conta
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
