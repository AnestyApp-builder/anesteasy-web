'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowLeft, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Logo } from '@/components/ui/Logo'
import { useToast } from '@/contexts/ToastContext'

export default function SecretaryLoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const { addToast } = useToast()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.email || !formData.password) {
      setError('Por favor, preencha todos os campos')
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/secretary/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao fazer login')
      }

      addToast({
        title: 'Login realizado!',
        description: `Bem-vinda, ${data.session.nome}`,
        variant: 'success'
      })

      router.replace('/secretaria/dashboard')
    } catch (err: any) {
      setError(err.message || 'Erro de autenticação')
      addToast({
        title: 'Erro no login',
        description: err.message || 'Credenciais inválidas',
        variant: 'error'
      })
    } finally {
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
            Portal da Secretária
          </h1>
          <p className="text-slate-500 font-medium">
            Gerenciamento integrado do Grupo PRO
          </p>
        </div>

        <Card className="shadow-2xl border-0 ring-1 ring-slate-200/60 animate-in zoom-in-95 duration-500">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold text-center text-slate-900 flex items-center justify-center gap-2">
              <ShieldCheck className="w-6 h-6 text-teal-600" />
              Acesso Restrito
            </CardTitle>
            <p className="text-center text-sm text-slate-500 mt-1">
              Faça login para gerenciar as rotinas da equipe
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
              label="E-mail profissional"
              type="email"
              placeholder="secretaria@grupo.com"
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
                  placeholder="Sua senha de acesso"
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
              className="w-full py-6 text-lg font-bold bg-teal-600 hover:bg-teal-700 shadow-xl shadow-teal-600/20 active:scale-[0.98] transition-all" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Verificando...' : 'Entrar no Painel'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
