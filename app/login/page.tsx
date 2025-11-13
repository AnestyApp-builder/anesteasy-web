'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Stethoscope, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Logo } from '@/components/ui/Logo'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const { login, isLoading, user, isAuthenticated } = useAuth()
  const router = useRouter()

  // Redirecionar se já estiver logado
  useEffect(() => {
    if (isAuthenticated && user) {
      // Verificar se é uma secretaria logada
      const checkIfSecretaria = async () => {
        try {
          const { data: secretaria, error: secretariaError } = await supabase
            .from('secretarias')
            .select('id')
            .eq('id', user.id)
            .maybeSingle()

          if (secretaria && !secretariaError) {
            // É secretaria, redirecionar para dashboard da secretaria
            router.push('/secretaria/dashboard')
            return
          }

          // É anestesista, redirecionar para dashboard normal
          router.push('/dashboard')
        } catch (error) {
          console.error('Erro ao verificar tipo de usuário:', error)
          // Em caso de erro, redirecionar para dashboard normal
          router.push('/dashboard')
        }
      }

      checkIfSecretaria()
    }
  }, [isAuthenticated, user, router])

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

  // Não renderizar se já estiver logado (será redirecionado)
  if (isAuthenticated && user) {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!formData.email || !formData.password) {
      setError('Por favor, preencha todos os campos')
      return
    }

    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      return
    }

    try {
      console.log('🔐 [LOGIN] Iniciando processo de login para:', formData.email)
      
      // Primeiro, fazer login direto com Supabase Auth para verificar credenciais
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email.trim().toLowerCase(),
        password: formData.password
      })

      if (authError) {
        console.error('❌ [LOGIN] Erro Supabase Auth:', authError)
        if (authError.message?.includes('Invalid login credentials')) {
          setError('Email ou senha incorretos. Verifique se você digitou corretamente ou use "Esqueceu a senha?" para redefinir.')
        } else if (authError.message?.includes('Email not confirmed') || authError.message?.includes('email_confirmed_at')) {
          setError('Email não confirmado. Verifique sua caixa de entrada e confirme seu email antes de fazer login.')
        } else if (authError.message?.includes('User not found')) {
          setError('Usuário não encontrado. Verifique se o email está correto ou cadastre-se primeiro.')
        } else if (authError.message?.includes('Too many requests')) {
          setError('Muitas tentativas. Aguarde alguns minutos e tente novamente.')
        } else {
          setError(`Erro ao fazer login: ${authError.message || 'Tente novamente ou entre em contato com o suporte'}`)
        }
        return
      }

      if (!authData?.user) {
        setError('Erro ao fazer login. Tente novamente.')
        return
      }

      console.log('✅ [LOGIN] Login Supabase Auth bem-sucedido. User ID:', authData.user.id)

      // Verificar se é secretária ANTES de tentar usar o contexto de anestesistas
      const { data: secretaria, error: secretariaError } = await supabase
        .from('secretarias')
        .select('id')
        .eq('id', authData.user.id)
        .maybeSingle()

      if (secretaria && !secretariaError) {
        console.log('👩‍💼 [LOGIN] É secretária, redirecionando...')
        router.push('/secretaria/dashboard')
        return
      }

      // Se não é secretária, é anestesista - usar o contexto de auth para carregar dados
      console.log('👨‍⚕️ [LOGIN] É anestesista, carregando dados do usuário...')
      const loginSuccess = await login(formData.email, formData.password)
      
      if (loginSuccess) {
        console.log('✅ [LOGIN] Login bem-sucedido via contexto')
        router.push('/dashboard')
      } else {
        console.error('❌ [LOGIN] Login falhou via contexto para anestesista')
        
        // Verificar qual foi o problema específico
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, email, name, subscription_status')
          .eq('id', authData.user.id)
          .maybeSingle()
        
        console.log('🔍 [LOGIN] Dados do usuário na tabela:', { userData, userError })
        
        if (userError) {
          console.error('❌ [LOGIN] Erro ao buscar usuário:', userError)
          setError('Erro ao buscar dados do usuário. Tente novamente ou entre em contato com o suporte.')
        } else if (!userData) {
          console.error('❌ [LOGIN] Usuário não encontrado na tabela users')
          setError('Usuário não encontrado no sistema. Entre em contato com o suporte para verificar sua conta.')
        } else {
          console.error('❌ [LOGIN] Usuário encontrado mas login falhou. Status:', userData.subscription_status)
          setError('Erro ao carregar dados do usuário. Tente novamente ou entre em contato com o suporte.')
        }
        
        // Fazer logout para limpar sessão
        await supabase.auth.signOut()
      }
    } catch (error) {
      console.error('❌ [LOGIN] Erro geral no login:', error)
      setError('Erro interno. Tente novamente.')
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8 relative">
      {/* Botão Voltar */}
      <div className="absolute top-6 left-6">
        <Link href="/">
          <Button 
            variant="ghost" 
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Voltar</span>
          </Button>
        </Link>
      </div>

      <div className="max-w-md w-full">
        {/* Logo - Centralizado com o card */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-block">
            <Logo size="md" showText={false} />
          </Link>
        </div>

        {/* Login Form */}
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-gray-900">
              Bem-vindo de volta
            </CardTitle>
            <p className="text-center text-gray-600 mt-2">
              Entre na sua conta para continuar
            </p>
            <p className="text-center text-sm text-gray-500 mt-1">
              Para anestesistas e secretárias
            </p>
          </CardHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6 p-6 pt-0">
            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
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
            />
            
            <div className="relative">
              <Input
                label="Senha"
                type={showPassword ? 'text' : 'password'}
                placeholder="Sua senha"
                icon={<Lock className="w-5 h-5" />}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 flex items-center justify-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
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
              disabled={isLoading}
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <div className="px-6 pb-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Ou</span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Não tem uma conta?{' '}
                <Link href="/register" className="font-medium text-primary-600 hover:text-primary-500">
                  Cadastre-se gratuitamente
                </Link>
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
