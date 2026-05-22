'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff, AlertCircle, Shield, Sparkles } from 'lucide-react'
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
    
    if (!formData.email || !formData.password) {
      setError('Por favor, preencha todos os campos')
      return
    }

    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      return
    }

    if (isSubmitting) return

    setError('')
    setIsSubmitting(true)

    try {
      console.log('🔐 [ADMIN LOGIN] Iniciando login...')
      
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email.trim().toLowerCase(),
        password: formData.password
      })

      if (authError) {
        console.error('❌ [ADMIN LOGIN] Erro no Auth:', authError)
        setError('Acesso negado: Credenciais inválidas')
        setIsSubmitting(false)
        return
      }

      if (!authData?.user) {
        setError('Acesso negado')
        setIsSubmitting(false)
        return
      }

      console.log('✅ [ADMIN LOGIN] Login Auth bem-sucedido, verificando permissões...')

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
        await supabase.auth.signOut()
        setError(errorData.error || 'Acesso negado')
        setIsSubmitting(false)
        return
      }

      const verifyData = await response.json()

      if (!verifyData.isAdmin) {
        await supabase.auth.signOut()
        setError('Acesso negado: você não tem permissão de administrador')
        setIsSubmitting(false)
        return
      }

      console.log('✅ [ADMIN LOGIN] É admin! Atualizando last_login_at...')
      
      try {
        await fetch('/api/admin/update-login-time', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: authData.user.id
          })
        })
      } catch (updateError) {
        console.warn('⚠️ [ADMIN LOGIN] Erro ao atualizar last_login_at:', updateError)
      }
      
      // Pequeno delay para garantir a persistência dos cookies de sessão
      await new Promise(resolve => setTimeout(resolve, 400))
      
      window.location.href = '/admin/dashboard'
      
    } catch (error: any) {
      console.error('❌ [ADMIN LOGIN] Erro no login admin:', error)
      setError(`Erro ao fazer login: ${error.message || 'Tente novamente'}`)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Círculos decorativos de fundo com desfoque elegante */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full space-y-8 z-10">
        <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-center mb-4">
            <div className="relative inline-flex p-3 rounded-2xl bg-white shadow-md border border-slate-100">
              <Logo size="md" showText={false} className="w-12 h-12" />
              <div className="absolute -top-1.5 -right-1.5 bg-teal-500 text-white rounded-full p-1 shadow-sm border-2 border-white">
                <Shield className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center justify-center gap-2">
            Portal Administrativo
          </h1>
          <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
            Acesso exclusivo para gestão do sistema CRM e monitoramento da plataforma AnestEasy.
          </p>
        </div>

        <Card className="border border-slate-200/80 shadow-xl rounded-2xl bg-white overflow-hidden animate-in fade-in zoom-in-95 duration-500 delay-150">
          <CardHeader className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-800/80 py-6 px-8 text-white relative">
            {/* Linha de sotaque de gradiente */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-teal-400 to-cyan-500" />
            
            <CardTitle className="text-xl font-bold text-white flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-teal-400" />
              <span>Autenticação Segura</span>
            </CardTitle>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              Insira suas credenciais corporativas abaixo
            </p>
          </CardHeader>
          
          <form onSubmit={handleSubmit} className="space-y-5 p-8 pt-6">
            {error && (
              <div className="flex items-center space-x-3 p-3.5 bg-rose-50 border border-rose-100 rounded-xl animate-in fade-in duration-200">
                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                <span className="text-xs font-semibold text-rose-700">{error}</span>
              </div>
            )}

            <div>
              <Input
                label="E-mail Administrativo"
                type="email"
                placeholder="admin@anesteasy.com"
                icon={<Mail className="w-4 h-4 text-slate-400" />}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={isSubmitting}
                className="rounded-xl border-slate-200 focus:ring-teal-500 text-sm"
              />
            </div>
            
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Senha Administrativa
                </label>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  icon={<Lock className="w-4 h-4 text-slate-400" />}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  disabled={isSubmitting}
                  className="rounded-xl border-slate-200 focus:ring-teal-500 text-sm pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors z-10"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  disabled={isSubmitting}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full py-6 text-sm font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-md shadow-teal-600/15 hover:shadow-lg hover:shadow-teal-600/25 transition-all duration-200 mt-2" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Conectando...
                </span>
              ) : (
                'Acessar Painel CRM'
              )}
            </Button>
          </form>

          <div className="px-8 pb-6 pt-2 bg-slate-50/50 border-t border-slate-100">
            <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5 font-medium">
              <Shield className="w-3.5 h-3.5 text-teal-500" />
              Conexão criptografada e monitorada
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
