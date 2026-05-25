'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Logo } from '@/components/ui/Logo'

export default function SecretaryResetPasswordPage() {
  const params = useParams()
  const token = params.token as string
  const router = useRouter()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres')
      return
    }
    if (password !== confirm) {
      setError('As senhas não coincidem')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/secretary/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erro ao redefinir senha')
        return
      }

      setSuccess(true)
      setTimeout(() => router.replace('/login'), 3000)
    } catch {
      setError('Erro interno. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-dvh bg-slate-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <Logo size="md" showText={false} className="inline-block" />
          </div>
          <Card className="shadow-xl border-0 ring-1 ring-slate-200/60">
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Senha redefinida!</h2>
              <p className="text-slate-500">Sua nova senha foi salva com sucesso. Redirecionando para o login…</p>
              <Link href="/login">
                <Button className="w-full mt-2">Ir para o Login</Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-slate-50 flex items-center justify-center py-12 px-4">
      <div className="absolute top-4 left-4">
        <Link href="/login">
          <Button variant="ghost" size="sm" className="flex items-center space-x-2 text-slate-600 hover:text-teal-600">
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao login</span>
          </Button>
        </Link>
      </div>

      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Logo size="md" showText={false} className="inline-block" />
        </div>

        <Card className="shadow-xl border-0 ring-1 ring-slate-200/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl font-bold text-center text-slate-900">
              Nova senha
            </CardTitle>
            <p className="text-center text-sm text-slate-500 mt-1">
              Crie uma senha segura para sua conta
            </p>
          </CardHeader>

          <form onSubmit={handleSubmit} className="space-y-5 p-6 pt-4">
            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <span className="text-sm text-red-600">{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Nova senha</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 8 caracteres"
                  icon={<Lock className="w-5 h-5" />}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 w-5 h-5 flex items-center justify-center z-10"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Confirmar nova senha</label>
              <div className="relative">
                <Input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Repita a senha"
                  icon={<Lock className="w-5 h-5" />}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 w-5 h-5 flex items-center justify-center z-10"
                  onClick={() => setShowConfirm(!showConfirm)}
                  disabled={isSubmitting}
                >
                  {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full py-6 text-lg font-bold bg-teal-600 hover:bg-teal-700 shadow-xl shadow-teal-600/20"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Salvando...' : 'Salvar nova senha'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
