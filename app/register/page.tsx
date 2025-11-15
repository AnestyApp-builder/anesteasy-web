'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Stethoscope, Mail, Lock, User, Eye, EyeOff, CheckCircle, AlertCircle, Users, UserCheck, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Logo } from '@/components/ui/Logo'
import { useAuth } from '@/contexts/AuthContext'
import { authService } from '@/lib/auth'
import { validateCPF, formatCPF } from '@/lib/utils'

export default function Register() {
  const [activeTab, setActiveTab] = useState<'anestesista' | 'secretaria'>('anestesista')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  
  // Formulário para anestesista
  const [anestesistaForm, setAnestesistaForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    specialty: '',
    crm: '',
    gender: '',
    phone: '',
    cpf: ''
  })
  
  // Formulário para secretaria
  const [secretariaForm, setSecretariaForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    cpf: ''
  })

  const { register, user, isAuthenticated } = useAuth()
  const router = useRouter()

  // Redirecionar se já estiver logado
  useEffect(() => {
    if (isAuthenticated && user) {
      router.push('/dashboard')
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
    
    // Prevenir múltiplos cliques
    if (isRegistering) {
      return
    }
    
    setError('')
    setSuccess('')
    setIsRegistering(true)
    
    if (activeTab === 'anestesista') {
      // Validação para anestesista
      if (!anestesistaForm.name || !anestesistaForm.email || !anestesistaForm.password || !anestesistaForm.specialty || !anestesistaForm.crm || !anestesistaForm.gender || !anestesistaForm.phone || !anestesistaForm.cpf) {
        setError('Por favor, preencha todos os campos obrigatórios')
        setIsRegistering(false)
        return
      }

      // Validar CPF
      if (!validateCPF(anestesistaForm.cpf)) {
        setError('CPF inválido. Por favor, verifique o CPF informado.')
        setIsRegistering(false)
        return
      }

      if (anestesistaForm.password.length < 6) {
        setError('A senha deve ter pelo menos 6 caracteres')
        setIsRegistering(false)
        return
      }

      if (anestesistaForm.password !== anestesistaForm.confirmPassword) {
        setError('As senhas não coincidem')
        setIsRegistering(false)
        return
      }

      // Salvar email antes de limpar formulário
      const userEmail = anestesistaForm.email.trim().toLowerCase()
      
      const result = await register(userEmail, anestesistaForm.password, {
        name: anestesistaForm.name,
        specialty: anestesistaForm.specialty,
        crm: anestesistaForm.crm,
        gender: anestesistaForm.gender,
        phone: anestesistaForm.phone,
        cpf: formatCPF(anestesistaForm.cpf)
      })

      if (!result.success) {
        setError(result.message)
        
        // Se for rate limit, mostrar instruções adicionais
        if (result.message.includes('Muitas tentativas')) {
          setTimeout(() => {
            setError('Muitas tentativas. Aguarde alguns minutos e tente novamente. Dica: O rate limit do Supabase é temporário e geralmente passa em 5-10 minutos.')
          }, 2000)
        }
        setIsRegistering(false)
      } else {
        // Limpar formulário
        setAnestesistaForm({
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
          specialty: '',
          crm: '',
          gender: '',
          phone: '',
          cpf: ''
        })
        
        // Redirecionar imediatamente para confirmação de email
        console.log('✅ [REGISTER] Registro bem-sucedido, redirecionando para confirmação de email...')
        router.push('/confirm-email?email=' + encodeURIComponent(userEmail))
        
        // Não definir setIsRegistering(false) aqui, pois será redirecionado
      }
    } else {
      // Validação para secretaria
      if (!secretariaForm.name || !secretariaForm.email || !secretariaForm.password || !secretariaForm.cpf) {
        setError('Por favor, preencha todos os campos obrigatórios')
        setIsRegistering(false)
        return
      }

      // Validar CPF
      if (!validateCPF(secretariaForm.cpf)) {
        setError('CPF inválido. Por favor, verifique o CPF informado.')
        setIsRegistering(false)
        return
      }

      if (secretariaForm.password.length < 6) {
        setError('A senha deve ter pelo menos 6 caracteres')
        setIsRegistering(false)
        return
      }

      if (secretariaForm.password !== secretariaForm.confirmPassword) {
        setError('As senhas não coincidem')
        setIsRegistering(false)
        return
      }

      try {
        const result = await authService.createSecretariaAccount(
          secretariaForm.email,
          secretariaForm.password,
          secretariaForm.name,
          secretariaForm.phone || undefined,
          formatCPF(secretariaForm.cpf)
        )

        if (result.success) {
          // Salvar email antes de limpar formulário
          const userEmail = secretariaForm.email.trim().toLowerCase()
          
          // Limpar formulário
          setSecretariaForm({
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
            phone: '',
            cpf: ''
          })
          
          // Redirecionar imediatamente para página de confirmação de email
          console.log('✅ [REGISTER] Conta de secretaria criada com sucesso, redirecionando para confirmação de email...')
          router.push('/confirm-email?email=' + encodeURIComponent(userEmail))
          
          // Não definir setIsRegistering(false) aqui, pois será redirecionado
        } else {
          setError('Erro ao criar conta da secretaria. Tente novamente.')
          setIsRegistering(false)
        }
      } catch (error) {
        console.error('Erro ao criar conta de secretaria:', error)
        setError('Erro interno. Tente novamente.')
        setIsRegistering(false)
      }
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="text-center">
          <Link href="/" className="inline-block">
            <Logo size="lg" showText={false} />
          </Link>
        </div>

        {/* Register Form */}
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-gray-900">
              Criar sua conta
            </CardTitle>
            <p className="text-center text-gray-600 mt-2">
              Comece sua jornada profissional conosco
            </p>
          </CardHeader>
          
          {/* Tabs */}
          <div className="px-6 pt-0">
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveTab('anestesista')}
                className={`flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'anestesista'
                    ? 'bg-white text-teal-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <UserCheck className="w-4 h-4 mr-2" />
                Anestesista
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('secretaria')}
                className={`flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'secretaria'
                    ? 'bg-white text-teal-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Users className="w-4 h-4 mr-2" />
                Secretaria
              </button>
            </div>
          </div>
          
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

            {/* Campos comuns */}
            <Input
              label="Nome completo"
              type="text"
              placeholder={activeTab === 'anestesista' ? 'Dr. João Silva' : 'Maria Silva'}
              icon={<User className="w-5 h-5" />}
              value={activeTab === 'anestesista' ? anestesistaForm.name : secretariaForm.name}
              onChange={(e) => {
                if (activeTab === 'anestesista') {
                  setAnestesistaForm({ ...anestesistaForm, name: e.target.value })
                } else {
                  setSecretariaForm({ ...secretariaForm, name: e.target.value })
                }
              }}
              required
            />

            <Input
              label="Email"
              type="email"
              placeholder="seu@email.com"
              icon={<Mail className="w-5 h-5" />}
              value={activeTab === 'anestesista' ? anestesistaForm.email : secretariaForm.email}
              onChange={(e) => {
                if (activeTab === 'anestesista') {
                  setAnestesistaForm({ ...anestesistaForm, email: e.target.value })
                } else {
                  setSecretariaForm({ ...secretariaForm, email: e.target.value })
                }
              }}
              required
            />

            <Input
              label="CPF"
              type="text"
              placeholder="000.000.000-00"
              icon={<CreditCard className="w-5 h-5" />}
              value={(() => {
                const cpfValue = activeTab === 'anestesista' ? anestesistaForm.cpf : secretariaForm.cpf
                if (cpfValue && cpfValue.length === 11) {
                  return formatCPF(cpfValue)
                }
                return cpfValue || ''
              })()}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '')
                const formatted = value.length <= 11 ? value : value.slice(0, 11)
                if (activeTab === 'anestesista') {
                  setAnestesistaForm({ ...anestesistaForm, cpf: formatted })
                } else {
                  setSecretariaForm({ ...secretariaForm, cpf: formatted })
                }
              }}
              maxLength={14}
              required
            />

            {/* Campos específicos para anestesista */}
            {activeTab === 'anestesista' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Especialidade"
                    type="text"
                    placeholder="Anestesiologia"
                    value={anestesistaForm.specialty}
                    onChange={(e) => setAnestesistaForm({ ...anestesistaForm, specialty: e.target.value })}
                    required
                  />
                  <Input
                    label="CRM"
                    type="text"
                    placeholder="123456"
                    value={anestesistaForm.crm}
                    onChange={(e) => setAnestesistaForm({ ...anestesistaForm, crm: e.target.value })}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Sexo *
                    </label>
                    <select
                      value={anestesistaForm.gender}
                      onChange={(e) => setAnestesistaForm({ ...anestesistaForm, gender: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white text-gray-900"
                      required
                      style={{
                        color: anestesistaForm.gender ? '#111827' : '#9CA3AF'
                      }}
                    >
                      <option value="" disabled hidden>Selecione o sexo</option>
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                      <option value="Other">Outro</option>
                    </select>
                  </div>
                  <Input
                    label="Telefone"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={anestesistaForm.phone}
                    onChange={(e) => setAnestesistaForm({ ...anestesistaForm, phone: e.target.value })}
                    required
                  />
                </div>
              </>
            )}

            {/* Campos específicos para secretaria */}
            {activeTab === 'secretaria' && (
              <Input
                label="Telefone"
                type="tel"
                placeholder="(11) 99999-9999"
                value={secretariaForm.phone}
                onChange={(e) => setSecretariaForm({ ...secretariaForm, phone: e.target.value })}
                required
              />
            )}
            
            <div className="relative">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Senha <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    icon={<Lock className="w-5 h-5" />}
                    value={activeTab === 'anestesista' ? anestesistaForm.password : secretariaForm.password}
                    onChange={(e) => {
                      if (activeTab === 'anestesista') {
                        setAnestesistaForm({ ...anestesistaForm, password: e.target.value })
                      } else {
                        setSecretariaForm({ ...secretariaForm, password: e.target.value })
                      }
                    }}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 flex items-center justify-center w-5 h-5 z-10"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Confirmar senha <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Digite a senha novamente"
                    icon={<Lock className="w-5 h-5" />}
                    value={activeTab === 'anestesista' ? anestesistaForm.confirmPassword : secretariaForm.confirmPassword}
                    onChange={(e) => {
                      if (activeTab === 'anestesista') {
                        setAnestesistaForm({ ...anestesistaForm, confirmPassword: e.target.value })
                      } else {
                        setSecretariaForm({ ...secretariaForm, confirmPassword: e.target.value })
                      }
                    }}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 flex items-center justify-center w-5 h-5 z-10"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  defaultChecked
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="terms" className="text-gray-700">
                  Eu concordo com os{' '}
                  <Link href="/termos" className="text-primary-600 hover:text-primary-500">
                    Termos de Uso
                  </Link>{' '}
                  e{' '}
                  <Link href="/politica-privacidade" className="text-primary-600 hover:text-primary-500">
                    Política de Privacidade
                  </Link>
                </label>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isRegistering}>
              {isRegistering ? 'Criando conta...' : `Criar conta de ${activeTab === 'anestesista' ? 'Anestesista' : 'Secretaria'}`}
            </Button>
            
            <p className="text-xs text-gray-500 text-center mt-4">
              Campos marcados com <span className="text-red-500">*</span> são obrigatórios
            </p>
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

            <div className="mt-6 text-center space-y-2">
              <p className="text-sm text-gray-600">
                Já tem uma conta?{' '}
                <Link href="/login" className="font-medium text-primary-600 hover:text-primary-500">
                  Faça login
                </Link>
              </p>
              {activeTab === 'secretaria' && (
                <p className="text-xs text-gray-500">
                  Secretarias fazem login na mesma tela que anestesistas
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
