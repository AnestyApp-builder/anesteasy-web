'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Logo } from '@/components/ui/Logo'
import { useToast } from '@/contexts/ToastContext'
import { getFullErrorMessage } from '@/lib/error-messages'

function LoginContent() {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const { addToast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Feedback pós-confirmação de email
  useEffect(() => {
    const confirmed = searchParams.get('confirmed')
    const errorParam = searchParams.get('error')
    if (confirmed === 'true') {
      setSuccessMsg('Email confirmado com sucesso! Faça login para continuar.')
    } else if (errorParam === 'creation_failed' || errorParam === 'confirmation_failed') {
      setError('Houve um problema ao confirmar sua conta. Por favor, entre em contato com o suporte.')
    }
  }, [searchParams])

  // Redirecionar se já estiver logado (sem depender do AuthContext para manter /login leve)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { supabase } = await import('@/lib/supabase')
      const { data } = await supabase.auth.getSession()
      const user = data.session?.user
      if (!cancelled && user) router.replace('/dashboard')
    })()
    return () => {
      cancelled = true
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validação básica
    if (!formData.email || !formData.password) {
      setError('Por favor, preencha todos os campos')
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      // Login no CLIENTE para garantir que a sessão seja persistida imediatamente.
      // Isso evita o caso em que o dashboard abre sem token/sessão e só carrega dados após F5.
      const { supabase } = await import('@/lib/supabase')

      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (error) {
        const msg = error.message || 'Erro ao fazer login'
        if (msg.includes('Invalid login credentials')) {
          // Tentar login como secretária antes de exibir erro
          const secRes = await fetch('/api/secretary/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: formData.email, password: formData.password })
          })
          if (secRes.ok) {
            const data = await secRes.json()
            const groupId = data.session?.groupId
            if (groupId) {
              router.replace(`/grupos/${groupId}`)
            } else {
              router.replace('/secretaria/dashboard')
            }
            return
          }
          setError('Email ou senha incorretos')
        } else if (msg.includes('Email not confirmed')) {
          setError('Email não confirmado. Verifique sua caixa de entrada')
        } else {
          setError(msg)
        }
        setIsSubmitting(false)
        return
      }

      // Limpar cache de auth para forçar nova verificação após login
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('auth_cache')
      }
      router.replace('/dashboard')
    } catch (error: any) {
      const errorMsg = getFullErrorMessage(error)
      setError(errorMsg.title)
      addToast({
        title: errorMsg.title,
        description: errorMsg.description,
        variant: errorMsg.variant
      })
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-dvh bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-x-hidden">
      {/* Botão Voltar */}
      <div className="absolute top-4 sm:top-6 left-4 sm:left-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="flex items-center space-x-2 text-slate-600 hover:text-teal-600 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="font-medium">Voltar</span>
          </Button>
        </Link>
      </div>

      <div className="max-w-md w-full space-y-8">
        <div className="text-center animate-in fade-in slide-in-from-top duration-500">
          <div className="flex justify-center mb-6">
            <Logo size="lg" showText={false} className="bg-teal-600 rounded-2xl p-2 shadow-xl shadow-teal-500/20" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">
            Bem-vindo de volta
          </h1>
          <p className="text-slate-500 font-medium">
            Gerencie seus procedimentos com AnestEasy
          </p>
        </div>

        <Card className="shadow-2xl border-0 ring-1 ring-slate-200/60 animate-in zoom-in-95 duration-500">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold text-center text-slate-900">
              Entrar
            </CardTitle>
            <p className="text-center text-sm text-slate-500 mt-1">
              Anestesiologistas e secretárias
            </p>
          </CardHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6 p-6 pt-0">
            {successMsg && (
              <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-sm text-green-700">{successMsg}</span>
              </div>
            )}
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
              className="w-full py-6 text-lg font-bold bg-teal-600 hover:bg-teal-700 shadow-xl shadow-teal-600/20 active:scale-[0.98] transition-all" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Entrando...' : 'Entrar na conta'}
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

export default function Login() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-slate-50 flex items-center justify-center"><div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <LoginContent />
    </Suspense>
  )
}
