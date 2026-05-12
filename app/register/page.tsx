'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, User, Eye, EyeOff, CheckCircle, AlertCircle, UserCheck, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Logo } from '@/components/ui/Logo'
import { authService } from '@/lib/auth'
import { validateCPF, formatCPF } from '@/lib/utils'

export default function Register() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    specialty: 'Anestesiologia',
    crm: '',
    gender: '',
    phone: '',
    cpf: ''
  })
  
  const router = useRouter()

  // Redirecionar se já estiver logado
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { supabase } = await import('@/lib/supabase')
      const { data } = await supabase.auth.getSession()
      if (!cancelled && data.session?.user) router.replace('/dashboard')
    })()
    return () => {
      cancelled = true
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isRegistering) return
    
    setError('')
    setSuccess('')
    setIsRegistering(true)
    
    // Validação
    if (!form.name || !form.email || !form.password || !form.specialty || !form.crm || !form.gender || !form.phone || !form.cpf) {
      setError('Por favor, preencha todos os campos obrigatórios')
      setIsRegistering(false)
      return
    }

    // Validar CPF
    if (!validateCPF(form.cpf)) {
      setError('CPF inválido. Por favor, verifique o CPF informado.')
      setIsRegistering(false)
      return
    }

    if (form.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      setIsRegistering(false)
      return
    }

    if (form.password !== form.confirmPassword) {
      setError('As senhas não coincidem')
      setIsRegistering(false)
      return
    }

    const userEmail = form.email.trim().toLowerCase()
    
    const result = await authService.register(userEmail, form.password, {
      name: form.name,
      specialty: form.specialty,
      crm: form.crm,
      gender: form.gender,
      phone: form.phone,
      cpf: formatCPF(form.cpf)
    })

    if (!result.success) {
      setError(result.message)
      if (result.message.includes('Muitas tentativas')) {
        setTimeout(() => {
          setError('Muitas tentativas. Aguarde alguns minutos e tente novamente.')
        }, 2000)
      }
      setIsRegistering(false)
    } else {
      router.push('/confirm-email?email=' + encodeURIComponent(userEmail))
    }
  }

  return (
    <div className="min-h-dvh bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-x-hidden">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center animate-in fade-in slide-in-from-top duration-500">
          <Link href="/" className="inline-block group">
            <Logo size="lg" showText={false} className="bg-teal-600 rounded-2xl p-2 shadow-xl shadow-teal-500/20 group-hover:scale-105 transition-transform" />
          </Link>
        </div>

        <Card className="shadow-2xl border-0 ring-1 ring-slate-200/60 animate-in zoom-in-95 duration-500">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold text-center text-slate-900">
              Criar sua conta
            </CardTitle>
            <p className="text-center text-sm text-slate-500 mt-1">
              Comece sua jornada com AnestEasy
            </p>
          </CardHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6 p-6 pt-0">
            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-sm text-red-600">{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-600">{success}</span>
              </div>
            )}

            <Input
              label="Nome completo"
              type="text"
              placeholder="Ex: Dr. João Silva"
              icon={<User className="w-5 h-5" />}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />

            <Input
              label="Email"
              type="email"
              placeholder="Ex: seu.email@exemplo.com"
              icon={<Mail className="w-5 h-5" />}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />

            <Input
              label="CPF"
              type="text"
              placeholder="Ex: 000.000.000-00"
              icon={<CreditCard className="w-5 h-5" />}
              value={form.cpf.length === 11 ? formatCPF(form.cpf) : form.cpf}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '')
                setForm({ ...form, cpf: value.slice(0, 11) })
              }}
              maxLength={14}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Especialidade"
                type="text"
                placeholder="Anestesiologia"
                value={form.specialty}
                onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                required
              />
              <Input
                label="CRM"
                type="text"
                placeholder="Ex: 123456"
                value={form.crm}
                onChange={(e) => setForm({ ...form, crm: e.target.value })}
                required
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Sexo *
                </label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200 bg-white text-slate-900"
                  required
                >
                  <option value="" disabled hidden>Selecione</option>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                  <option value="Other">Outro</option>
                </select>
              </div>
              <Input
                label="Telefone"
                type="tel"
                placeholder="Ex: (11) 99999-9999"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Senha *</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  icon={<Lock className="w-5 h-5" />}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Confirmar senha *</label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Digite a senha novamente"
                  icon={<Lock className="w-5 h-5" />}
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full py-6 text-lg font-bold bg-teal-600 hover:bg-teal-700 shadow-xl shadow-teal-600/20 active:scale-[0.98] transition-all" 
              disabled={isRegistering}
            >
              {isRegistering ? 'Criando conta...' : 'Criar conta gratuita'}
            </Button>
          </form>

          <div className="px-6 pb-6">
            <div className="relative flex justify-center text-sm mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <span className="relative px-2 bg-white text-gray-500">Ou</span>
            </div>

            <p className="text-sm text-gray-600 text-center">
              Já tem uma conta?{' '}
              <Link href="/login" className="font-medium text-primary-600 hover:text-primary-500">
                Faça login
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
