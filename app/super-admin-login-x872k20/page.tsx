'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff, AlertCircle, Shield } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Logo } from '@/components/ui/Logo'
import { supabase } from '@/lib/supabase'

export default function SuperAdminLogin() {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const router = useRouter()

  // Prevenir indexação e rastreamento
  useEffect(() => {
    // Adicionar meta tag para prevenir indexação
    const metaRobots = document.createElement('meta')
    metaRobots.name = 'robots'
    metaRobots.content = 'noindex, nofollow, noarchive, nosnippet'
    document.head.appendChild(metaRobots)

    return () => {
      document.head.removeChild(metaRobots)
    }
  }, [])

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
      console.log('🔐 [ADMIN LOGIN] Iniciando login...')
      
      // Fazer login direto no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email.trim().toLowerCase(),
        password: formData.password
      })

      if (authError) {
        console.error('❌ [ADMIN LOGIN] Erro no Auth:', authError)
        setError('Acesso negado')
        setIsSubmitting(false)
        return
      }

      if (!authData?.user) {
        console.error('❌ [ADMIN LOGIN] Usuário não retornado')
        setError('Acesso negado')
        setIsSubmitting(false)
        return
      }

      console.log('✅ [ADMIN LOGIN] Login Auth bem-sucedido, verificando admin...')

      // Verificar se é admin via API
      const response = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: authData.user.id
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ [ADMIN LOGIN] Erro na verificação:', response.status, errorData)
        await supabase.auth.signOut()
        setError(errorData.error || 'Acesso negado')
        setIsSubmitting(false)
        return
      }

      const verifyData = await response.json()
      console.log('📋 [ADMIN LOGIN] Dados de verificação:', verifyData)

      if (!verifyData.isAdmin) {
        console.error('❌ [ADMIN LOGIN] Usuário não é admin. Dados:', verifyData)
        await supabase.auth.signOut()
        setError('Acesso negado: você não tem permissão de administrador')
        setIsSubmitting(false)
        return
      }

      console.log('✅ [ADMIN LOGIN] É admin! Atualizando last_login_at...')
      
      // Atualizar last_login_at via API (bypass RLS)
      try {
        const updateResponse = await fetch('/api/admin/update-login-time', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: authData.user.id
          })
        })
        
        if (!updateResponse.ok) {
          console.warn('⚠️ [ADMIN LOGIN] Não foi possível atualizar last_login_at, mas continuando...')
        } else {
          console.log('✅ [ADMIN LOGIN] last_login_at atualizado.')
        }
      } catch (updateError) {
        console.warn('⚠️ [ADMIN LOGIN] Erro ao atualizar last_login_at:', updateError)
        // Não bloquear o login por causa disso
      }
      
      console.log('✅ [ADMIN LOGIN] Redirecionando...')
      
      // Aguardar um momento para garantir que a sessão está configurada
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // É admin - redirecionar para dashboard
      // Usar window.location para forçar reload completo e garantir que a sessão seja reconhecida
      window.location.href = '/admin/dashboard'
      
    } catch (error: any) {
      console.error('❌ [ADMIN LOGIN] Erro no login admin:', error)
      setError(`Erro ao fazer login: ${error.message || 'Tente novamente'}`)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Logo size="lg" showText={false} />
              <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5">
                <Shield className="w-4 h-4" />
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Acesso Administrativo
          </h1>
          <p className="text-gray-600">
            Área restrita - Acesso autorizado apenas
          </p>
        </div>

        <Card className="border-2 border-red-200 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-200">
            <CardTitle className="text-2xl font-bold text-center text-gray-900 flex items-center justify-center gap-2">
              <Shield className="w-6 h-6 text-red-600" />
              Login Administrativo
            </CardTitle>
            <p className="text-center text-sm text-gray-500 mt-2">
              Credenciais de administrador do sistema
            </p>
          </CardHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6 p-6 pt-6">
            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <span className="text-sm text-red-600">{error}</span>
              </div>
            )}

            <Input
              label="Email Administrativo"
              type="email"
              placeholder="admin@anesteasy.com"
              icon={<Mail className="w-5 h-5" />}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={isSubmitting}
            />
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Senha Administrativa
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Sua senha administrativa"
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

            <Button 
              type="submit" 
              className="w-full py-4 text-lg font-medium bg-red-600 hover:bg-red-700 text-white" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Verificando...' : 'Acessar Painel Admin'}
            </Button>
          </form>

          <div className="px-6 pb-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-xs text-yellow-800 text-center">
                ⚠️ Esta é uma área restrita. Todas as tentativas de acesso são registradas e monitoradas.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

