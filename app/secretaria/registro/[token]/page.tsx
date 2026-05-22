'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle, Lock, Phone, User, ShieldCheck, Mail } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Logo } from '@/components/ui/Logo'
import { useToast } from '@/contexts/ToastContext'

export default function SecretaryRegisterPage() {
  const { token } = useParams()
  const router = useRouter()
  const { addToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inviteData, setInviteData] = useState<{ email: string; groupName: string } | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    confirmPassword: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) return

    const verifyToken = async () => {
      try {
        const response = await fetch(`/api/secretary/register?token=${token}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Erro ao validar convite')
        }

        setInviteData(data)
      } catch (err: any) {
        setError(err.message || 'Convite inválido')
      } finally {
        setLoading(false)
      }
    }

    verifyToken()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.phone || !formData.password || !formData.confirmPassword) {
      addToast({ title: 'Preencha todos os campos', variant: 'error' })
      return
    }

    if (formData.password.length < 6) {
      addToast({ title: 'A senha deve ter no mínimo 6 caracteres', variant: 'error' })
      return
    }

    if (formData.password !== formData.confirmPassword) {
      addToast({ title: 'As senhas não coincidem', variant: 'error' })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/secretary/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          name: formData.name,
          phone: formData.phone,
          password: formData.password
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao registrar conta')
      }

      setSuccess(true)
      addToast({ title: 'Cadastro concluído com sucesso!', variant: 'success' })
      setTimeout(() => {
        router.push('/secretaria/login')
      }, 3000)
    } catch (err: any) {
      addToast({ title: err.message || 'Erro ao registrar', variant: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium">Validando convite de acesso...</p>
        </div>
      </div>
    )
  }

  if (error || !inviteData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-red-100">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Convite Inválido</h1>
          <p className="text-gray-600 mb-8">{error || 'O link de convite é inválido ou expirou.'}</p>
          <Button onClick={() => router.push('/')} className="w-full bg-teal-600 hover:bg-teal-700">
            Ir para Home
          </Button>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-green-100">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Cadastro Concluído!</h1>
          <p className="text-gray-600 mb-8">Sua conta de secretária do grupo **{inviteData.groupName}** foi ativada. Redirecionando para a página de login...</p>
          <Button onClick={() => router.push('/secretaria/login')} className="w-full bg-teal-600 hover:bg-teal-700">
            Fazer Login Agora
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 animate-in fade-in duration-500">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <Logo size="lg" showText={false} className="bg-teal-600 rounded-2xl p-2 shadow-xl shadow-teal-500/20" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Ativar Acesso</h1>
          <p className="text-slate-500 font-medium">Equipe de Anestesia • {inviteData.groupName}</p>
        </div>

        <Card className="shadow-2xl border-0 ring-1 ring-slate-200/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-center text-slate-900 flex items-center justify-center gap-2">
              <ShieldCheck className="w-5 h-5 text-teal-600" />
              Complete seu Cadastro
            </CardTitle>
          </CardHeader>

          <form onSubmit={handleSubmit} className="space-y-4 p-6 pt-0">
            <div className="space-y-1 bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4 text-sm text-slate-600">
              <p><strong>E-mail:</strong> {inviteData.email}</p>
              <p><strong>Grupo:</strong> {inviteData.groupName}</p>
            </div>

            <Input
              label="Seu Nome Completo"
              type="text"
              placeholder="Maria da Silva"
              icon={<User className="w-5 h-5" />}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              disabled={isSubmitting}
            />

            <Input
              label="Telefone / WhatsApp"
              type="tel"
              placeholder="(11) 99999-9999"
              icon={<Phone className="w-5 h-5" />}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
              disabled={isSubmitting}
            />

            <Input
              label="Senha de Acesso"
              type="password"
              placeholder="Mínimo 6 caracteres"
              icon={<Lock className="w-5 h-5" />}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              disabled={isSubmitting}
            />

            <Input
              label="Confirmar Senha"
              type="password"
              placeholder="Digite a senha novamente"
              icon={<Lock className="w-5 h-5" />}
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
              disabled={isSubmitting}
            />

            <Button
              type="submit"
              className="w-full py-4 text-base font-bold bg-teal-600 hover:bg-teal-700 shadow-xl shadow-teal-600/20 mt-6"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Registrando...' : 'Concluir Cadastro'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
