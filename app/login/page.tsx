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

  // Redirecionar se já estiver logado (apenas para anestesistas)
  useEffect(() => {
    if (isAuthenticated && user) {
      // Verificar se é uma secretaria logada
      const checkIfSecretaria = async () => {
        try {
          
          
          const { data: secretaria, error: secretariaError } = await supabase
            .from('secretarias')
            .select('*')
            .eq('email', user.email)
            .maybeSingle()

          if (secretariaError) {
            // É anestesista, redirecionar para dashboard normal
            router.push('/dashboard')
            return
          }

          if (secretaria) {
            
            // É secretaria, redirecionar para dashboard da secretaria
            router.push('/secretaria/dashboard')
          } else {
            
            // É anestesista, redirecionar para dashboard normal
            router.push('/dashboard')
          }
        } catch (error) {
          
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
      // Tentar login direto usando o contexto de auth
      const success = await login(formData.email, formData.password)
      
      if (success) {
        // Verificar se é secretaria após login bem-sucedido
        try {
          
          
          const { data: secretaria, error: secretariaError } = await supabase
            .from('secretarias')
            .select('*')
            .eq('email', formData.email)
            .maybeSingle()

          if (secretariaError) {
            // É anestesista, redirecionar para dashboard normal
            router.push('/dashboard')
            return
          }

          if (secretaria) {
            
            router.push('/secretaria/dashboard')
          } else {
            
            router.push('/dashboard')
          }
        } catch (error) {
          
          // Em caso de erro, redirecionar para dashboard normal
          router.push('/dashboard')
        }
      } else {
        // Verificar se o erro é relacionado a email não confirmado
        try {
          const { data: userData } = await supabase.auth.getUser()
          if (userData?.user && !userData.user.email_confirmed_at) {
            setError('Email não confirmado. Verifique sua caixa de entrada e confirme seu email antes de fazer login.')
          } else {
            setError('Email ou senha incorretos')
          }
        } catch {
          setError('Email ou senha incorretos')
        }
      }
    } catch (error) {
      
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
