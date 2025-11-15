'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Stethoscope, 
  TrendingUp, 
  Shield, 
  Users, 
  Star,
  ArrowRight,
  CheckCircle,
  BarChart3,
  DollarSign,
  FileText,
  Activity,
  Award
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Logo } from '@/components/ui/Logo'
import { useAuth } from '@/contexts/AuthContext'
import { Navigation } from '@/components/layout/Navigation'

export default function Home() {
  const { user, isAuthenticated, isEmailConfirmed, isLoading, logout } = useAuth()
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const hasRedirected = useRef(false)

  // Redirecionamento automático para dashboard quando autenticado (especialmente em mobile)
  useEffect(() => {
    // Evitar múltiplos redirecionamentos
    if (hasRedirected.current) return

    // Aguardar carregamento completo
    if (isLoading) return

    // Se estiver autenticado e email confirmado, redirecionar para dashboard
    if (isAuthenticated && user && isEmailConfirmed) {
      // Verificar se é mobile
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        typeof window !== 'undefined' ? navigator.userAgent : ''
      )

      // Em mobile, redirecionar imediatamente
      // Em desktop, dar um pequeno delay para permitir visualização da página
      const delay = isMobile ? 0 : 2000

      hasRedirected.current = true
      
      setTimeout(() => {
        router.replace('/dashboard')
      }, delay)
    }
  }, [isAuthenticated, isEmailConfirmed, isLoading, user, router])

  // Controlar o vídeo de fundo
  useEffect(() => {
    const video = videoRef.current
    if (video) {
      video.play().catch((error) => {
        // Erro silencioso ao reproduzir vídeo
      })
    }
  }, [])

  // Mostrar loading enquanto verifica autenticação
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        {/* Navigation sempre visível em mobile */}
        <Navigation />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] pt-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Verificando autenticação...</p>
          </div>
        </div>
      </div>
    )
  }

  // Removido bloqueio de renderização - usuário pode ver a página inicial mesmo logado
  const features = [
    {
      icon: BarChart3,
      title: 'Dashboard Inteligente',
      description: 'Visualize métricas importantes em tempo real com gráficos interativos.'
    },
    {
      icon: FileText,
      title: 'Gestão de Procedimentos',
      description: 'Organize e acompanhe todos os seus procedimentos de forma eficiente.'
    },
    {
      icon: DollarSign,
      title: 'Controle Financeiro',
      description: 'Gerencie receitas, despesas e pagamentos com relatórios detalhados.'
    },
    {
      icon: Shield,
      title: 'Segurança Total',
      description: 'Seus dados protegidos com criptografia de nível bancário.'
    }
  ]

  const stats = [
    { label: 'Redução no tempo com a gestão financeira', value: '+4HRs/mês' },
    { label: 'Satisfação', value: '98%' },
    { label: 'Suporte', value: '24/7' },
    { label: 'Segurança', value: '100%' }
  ]

  const testimonials = [
    {
      name: 'Dr. Ana Silva',
      role: 'Anestesiologista',
      content: 'O AnestEasy revolucionou minha gestão financeira. Agora tenho controle total dos meus procedimentos.',
      rating: 5
    },
    {
      name: 'Dr. Carlos Santos',
      role: 'Anestesiologista',
      content: 'Interface intuitiva e relatórios detalhados. Recomendo para todos os colegas.',
      rating: 5
    },
    {
      name: 'Dra. Maria Oliveira',
      role: 'Anestesiologista',
      content: 'Economizei horas de trabalho administrativo. O sistema é incrível!',
      rating: 5
    }
  ]

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'transparent' }}>
      {/* Header */}
      <header className="backdrop-blur-lg border-b border-white/30 sticky top-0 z-50 bg-black/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="focus:outline-none">
              <Logo size="md" showText={false} />
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              {isAuthenticated && user ? (
                // Usuário logado
                <div className="flex items-center space-x-2 sm:space-x-4">
                  {isEmailConfirmed ? (
                    // Email confirmado - mostrar botão para dashboard
                    <Link href="/dashboard" className="flex items-center" data-testid="dashboard-button-link">
                      <Button 
                        size="sm" 
                        className="text-xs sm:text-sm px-3 sm:px-6 py-2 sm:py-3 bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-xl shadow-emerald-600/30 min-h-[44px] font-semibold w-full sm:w-auto"
                        data-testid="dashboard-button"
                        aria-label="Ir para Dashboard"
                      >
                        <span className="hidden sm:inline">Dashboard</span>
                        <span className="sm:hidden">Dashboard</span>
                      </Button>
                    </Link>
                  ) : (
                    // Email não confirmado - mostrar botão para confirmação
                    <Link href={`/confirm-email?email=${encodeURIComponent(user.email)}`}>
                      <Button size="sm" className="text-xs sm:text-sm px-3 sm:px-6 py-2 sm:py-3 bg-yellow-600 hover:bg-yellow-700 text-white border-0 shadow-xl shadow-yellow-600/30 min-h-[44px] font-semibold">
                        <span className="hidden sm:inline">Confirmar Email</span>
                        <span className="sm:hidden">Confirmar</span>
                      </Button>
                    </Link>
                  )}
                  <Button 
                    variant="ghost" 
                    className="text-white hover:text-emerald-300 hover:bg-white/20 border border-white/40 min-h-[44px] px-3 sm:px-4 font-medium"
                    onClick={logout}
                  >
                    <span className="hidden sm:inline">Sair</span>
                    <span className="sm:hidden">Sair</span>
                  </Button>
                </div>
              ) : (
                // Usuário não logado
                <>
                  <Link href="/login">
                    <Button variant="ghost" className="text-white hover:text-emerald-300 hover:bg-white/20 border border-white/40 min-h-[44px] px-3 sm:px-4 py-2 sm:py-3 font-medium">
                      <span className="hidden sm:inline">Entrar</span>
                      <span className="sm:hidden">Login</span>
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button size="sm" className="text-xs sm:text-sm px-3 sm:px-6 py-2 sm:py-3 bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-xl shadow-emerald-600/30 min-h-[44px] font-semibold">
                      <span className="hidden sm:inline">Começar Grátis</span>
                      <span className="sm:hidden">Começar</span>
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - AnestEasy */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden py-24 pt-32 pb-20 -mt-16" style={{ backgroundColor: 'transparent' }}>
        {/* Video Background - Começa atrás do header */}
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ zIndex: 1, top: 0 }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        >
          <source src="/videos/hero-background.mp4" type="video/mp4" />
          Seu navegador não suporta vídeos HTML5.
        </video>
        
        {/* Overlay sutil apenas para legibilidade do texto */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/40 via-black/20 to-transparent"></div>
        </div>

        {/* Floating Elements REMOVIDOS para visual mais limpo */}
        {/* <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
          <div className="absolute top-20 left-20 text-4xl opacity-20 animate-bounce" style={{animationDelay: '0s', animationDuration: '6s'}}>💰</div>
          <div className="absolute top-40 right-32 text-3xl opacity-20 animate-bounce" style={{animationDelay: '1.5s', animationDuration: '6s'}}>📊</div>
          <div className="absolute bottom-40 left-32 text-4xl opacity-20 animate-bounce" style={{animationDelay: '3s', animationDuration: '6s'}}>🏥</div>
          <div className="absolute bottom-20 right-20 text-3xl opacity-20 animate-bounce" style={{animationDelay: '4.5s', animationDuration: '6s'}}>⚕️</div>
        </div> */}
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center" style={{ zIndex: 20, backgroundColor: 'transparent' }}>
          <div className="max-w-5xl mx-auto p-6 sm:p-8 lg:p-12" style={{ backgroundColor: 'transparent' }}>
            {/* Main Heading */}
            <h1 className="hero-subtitle text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tighter mb-6 leading-tight text-emerald-500" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
              <span className="block">
                AnestEasy
              </span>
            </h1>
            
            {/* Badge */}
            <div className="hero-content inline-flex items-center px-6 py-3 rounded-full text-emerald-300 text-lg font-semibold mb-8" style={{ backgroundColor: 'transparent' }}>
              ✨ Gestão Financeira Especializada
            </div>
            
            {/* Subheadline */}
            <h2 className="hero-description text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-semibold text-white mb-8" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}>
              Revolucione sua Gestão Financeira
            </h2>
            
            {/* Description */}
            <p className="hero-description text-sm sm:text-base md:text-lg lg:text-xl text-gray-200 mb-12 max-w-4xl mx-auto leading-relaxed" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
              A primeira plataforma de gestão financeira desenvolvida para anestesiologistas.
              <br />
              <span className="font-semibold text-emerald-400">Controle seus honorários</span>, 
              <span className="font-semibold text-emerald-400"> organize sua agenda</span>, 
              <span className="font-semibold text-emerald-400"> monitore seus resultados</span> e 
              <span className="font-semibold text-emerald-400"> maximize sua rentabilidade com IA</span>.
            </p>
            
            {/* CTA Principal */}
            <div className="cta-container flex justify-center mb-16" style={{ backgroundColor: 'transparent' }}>
              <Link href="/register">
                <Button size="lg" className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-12 py-5 text-xl font-bold shadow-2xl shadow-emerald-500/30 transition-all duration-300 hover:scale-105 rounded-xl flex flex-col items-center">
                  <span className="flex items-center">
                    Comece gratuitamente
                    <ArrowRight className="w-6 h-6 ml-3" />
                  </span>
                  <span className="text-sm font-normal mt-1 opacity-90">
                    Free trial 7 dias
                  </span>
                </Button>
              </Link>
            </div>

            {/* Statistics REMOVIDOS para visual mais limpo */}
            {/* <div className="stats-container grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto" style={{ backgroundColor: 'transparent' }}>
              <div className="text-center p-6 bg-gray-600/40 backdrop-blur-sm rounded-2xl border border-gray-500/50 hover:bg-gray-600/50 transition-all duration-300">
                <div className="text-3xl mb-2">👨‍⚕️</div>
                <div className="text-3xl font-bold text-white mb-1">2.5k+</div>
                <div className="text-emerald-400 font-semibold text-sm">Anestesiologistas</div>
                <div className="text-slate-400 text-xs">Profissionais ativos</div>
              </div>

              <div className="text-center p-6 bg-gray-600/40 backdrop-blur-sm rounded-2xl border border-gray-500/50 hover:bg-gray-600/50 transition-all duration-300">
                <div className="text-3xl mb-2">💰</div>
                <div className="text-3xl font-bold text-white mb-1">R$ 50M+</div>
                <div className="text-emerald-400 font-semibold text-sm">Gerenciados</div>
                <div className="text-slate-400 text-xs">Volume financeiro</div>
              </div>

              <div className="text-center p-6 bg-gray-600/40 backdrop-blur-sm rounded-2xl border border-gray-500/50 hover:bg-gray-600/50 transition-all duration-300">
                <div className="text-3xl mb-2">📈</div>
                <div className="text-3xl font-bold text-white mb-1">35%</div>
                <div className="text-emerald-400 font-semibold text-sm">Aumento</div>
                <div className="text-slate-400 text-xs">Crescimento médio</div>
              </div>

              <div className="text-center p-6 bg-gray-600/40 backdrop-blur-sm rounded-2xl border border-gray-500/50 hover:bg-gray-600/50 transition-all duration-300">
                <div className="text-3xl mb-2">⚡</div>
                <div className="text-3xl font-bold text-white mb-1">99.9%</div>
                <div className="text-emerald-400 font-semibold text-sm">Uptime</div>
                <div className="text-slate-400 text-xs">Disponibilidade</div>
              </div>
            </div> */}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Planos que se Adaptam ao Seu Negócio
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Escolha o plano ideal para sua prática médica. Todos os planos incluem acesso completo à plataforma.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Plano Mensal */}
            <Card className="relative border-2 border-slate-200 hover:border-emerald-500 transition-all duration-300 hover:shadow-2xl">
              <CardHeader className="p-8">
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Plano Mensal</h3>
                  <p className="text-slate-600 mb-6">Ideal para começar</p>
                  <div className="mb-6">
                    <span className="text-5xl font-bold text-slate-900">R$ 79</span>
                    <span className="text-slate-600">/mês</span>
                  </div>
                  <Link href="/planos">
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                      Assinar Agora
                    </Button>
                  </Link>
                </div>
                <div className="mt-8 space-y-4">
                  <div className="flex items-center text-slate-700">
                    <CheckCircle className="w-5 h-5 text-emerald-600 mr-3 flex-shrink-0" />
                    <span className="text-sm">Acesso completo à plataforma</span>
                  </div>
                  <div className="flex items-center text-slate-700">
                    <CheckCircle className="w-5 h-5 text-emerald-600 mr-3 flex-shrink-0" />
                    <span className="text-sm">Gestão ilimitada de procedimentos</span>
                  </div>
                  <div className="flex items-center text-slate-700">
                    <CheckCircle className="w-5 h-5 text-emerald-600 mr-3 flex-shrink-0" />
                    <span className="text-sm">Relatórios e estatísticas</span>
                  </div>
                  <div className="flex items-center text-slate-700">
                    <CheckCircle className="w-5 h-5 text-emerald-600 mr-3 flex-shrink-0" />
                    <span className="text-sm">Suporte por email</span>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Plano Trimestral - Popular */}
            <Card className="relative border-2 border-emerald-500 hover:border-emerald-600 transition-all duration-300 hover:shadow-2xl transform hover:scale-105">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-emerald-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Mais Popular
                </span>
              </div>
              <CardHeader className="p-8">
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Plano Trimestral</h3>
                  <p className="text-slate-600 mb-2">Economia de 5%</p>
                  <div className="mb-2">
                    <span className="text-sm text-slate-500 line-through">R$ 237</span>
                    <span className="text-slate-600 ml-2">por trimestre</span>
                  </div>
                  <div className="mb-6">
                    <span className="text-5xl font-bold text-emerald-600">R$ 225</span>
                    <span className="text-slate-600">/trimestre</span>
                  </div>
                  <p className="text-sm text-emerald-600 font-semibold mb-4">Economize R$ 12,00</p>
                  <Link href="/planos">
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                      Assinar Agora
                    </Button>
                  </Link>
                </div>
                <div className="mt-8 space-y-4">
                  <div className="flex items-center text-slate-700">
                    <CheckCircle className="w-5 h-5 text-emerald-600 mr-3 flex-shrink-0" />
                    <span className="text-sm">Tudo do plano mensal</span>
                  </div>
                  <div className="flex items-center text-slate-700">
                    <CheckCircle className="w-5 h-5 text-emerald-600 mr-3 flex-shrink-0" />
                    <span className="text-sm">5% de desconto</span>
                  </div>
                  <div className="flex items-center text-slate-700">
                    <CheckCircle className="w-5 h-5 text-emerald-600 mr-3 flex-shrink-0" />
                    <span className="text-sm">Cobrança trimestral</span>
                  </div>
                  <div className="flex items-center text-slate-700">
                    <CheckCircle className="w-5 h-5 text-emerald-600 mr-3 flex-shrink-0" />
                    <span className="text-sm">Prioridade no suporte</span>
                  </div>
                  <div className="flex items-center text-slate-700">
                    <CheckCircle className="w-5 h-5 text-emerald-600 mr-3 flex-shrink-0" />
                    <span className="text-sm">Relatórios avançados</span>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Plano Anual */}
            <Card className="relative border-2 border-slate-200 hover:border-emerald-500 transition-all duration-300 hover:shadow-2xl">
              <CardHeader className="p-8">
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Plano Anual</h3>
                  <p className="text-slate-600 mb-2">Melhor custo-benefício</p>
                  <div className="mb-2">
                    <span className="text-sm text-slate-500 line-through">R$ 948</span>
                    <span className="text-slate-600 ml-2">por ano</span>
                  </div>
                  <div className="mb-6">
                    <span className="text-5xl font-bold text-slate-900">R$ 850</span>
                    <span className="text-slate-600">/ano</span>
                  </div>
                  <p className="text-sm text-emerald-600 font-semibold mb-4">Economize R$ 98,00</p>
                  <Link href="/planos">
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                      Assinar Agora
                    </Button>
                  </Link>
                </div>
                <div className="mt-8 space-y-4">
                  <div className="flex items-center text-slate-700">
                    <CheckCircle className="w-5 h-5 text-emerald-600 mr-3 flex-shrink-0" />
                    <span className="text-sm">Tudo do plano trimestral</span>
                  </div>
                  <div className="flex items-center text-slate-700">
                    <CheckCircle className="w-5 h-5 text-emerald-600 mr-3 flex-shrink-0" />
                    <span className="text-sm">10% de desconto</span>
                  </div>
                  <div className="flex items-center text-slate-700">
                    <CheckCircle className="w-5 h-5 text-emerald-600 mr-3 flex-shrink-0" />
                    <span className="text-sm">Cobrança anual única</span>
                  </div>
                  <div className="flex items-center text-slate-700">
                    <CheckCircle className="w-5 h-5 text-emerald-600 mr-3 flex-shrink-0" />
                    <span className="text-sm">Suporte prioritário</span>
                  </div>
                  <div className="flex items-center text-slate-700">
                    <CheckCircle className="w-5 h-5 text-emerald-600 mr-3 flex-shrink-0" />
                    <span className="text-sm">Acesso a recursos beta</span>
                  </div>
                  <div className="flex items-center text-slate-700">
                    <CheckCircle className="w-5 h-5 text-emerald-600 mr-3 flex-shrink-0" />
                    <span className="text-sm">Consultoria personalizada</span>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>
          
          <div className="text-center mt-12">
            <p className="text-slate-600 mb-4">
              Todos os planos incluem renovação automática e podem ser cancelados a qualquer momento.
            </p>
            <Link href="/planos" className="text-emerald-600 hover:text-emerald-700 font-semibold underline">
              Ver detalhes completos dos planos
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Números que Comprovam a Excelência
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              A plataforma mais confiável e utilizada por anestesiologistas em todo o Brasil
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
            {stats.map((stat, index) => (
              <Card key={index} className="text-center p-4 sm:p-6 md:p-8 border-0 shadow-lg hover:shadow-xl transition-all duration-300" style={{ backgroundColor: 'transparent' }}>
                <CardHeader className="p-0">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-emerald-600" />
                  </div>
                  <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-2 sm:mb-3">{stat.value}</div>
                  <div className="text-xs sm:text-sm md:text-base text-slate-600 font-medium leading-tight">{stat.label}</div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24" style={{ backgroundColor: 'transparent' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
              Tecnologia Médica de Ponta
            </h2>
            <p className="text-xl text-slate-600 max-w-4xl mx-auto leading-relaxed">
              Recursos avançados desenvolvidos especificamente para anestesiologistas, 
              com foco em segurança, eficiência e conformidade médica
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-2xl transition-all duration-300 border-0 shadow-lg hover:scale-105" style={{ backgroundColor: 'transparent' }}>
                <CardHeader className="p-8">
                  <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <feature.icon className="w-8 h-8 text-emerald-600" />
                  </div>
                  <CardTitle className="text-xl mb-4 text-slate-900 font-bold">{feature.title}</CardTitle>
                  <p className="text-slate-600 leading-relaxed text-sm">{feature.description}</p>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
              Depoimentos de Especialistas
            </h2>
            <p className="text-xl text-slate-600 max-w-4xl mx-auto leading-relaxed">
              Anestesiologistas renomados compartilham suas experiências com a plataforma AnestEasy
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="shadow-xl hover:shadow-2xl transition-all duration-300 border-0 hover:scale-105" style={{ backgroundColor: 'transparent' }}>
                <CardHeader className="p-8">
                  <div className="flex items-center mb-8">
                    <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center text-white text-xl font-bold mr-4">
                      {testimonial.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-lg">{testimonial.name}</h4>
                      <p className="text-emerald-600 text-sm font-medium">{testimonial.role}</p>
                    </div>
                  </div>
                  <div className="flex mb-6">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-emerald-500 fill-current" />
                    ))}
                  </div>
                  <p className="text-slate-700 italic leading-relaxed text-lg">&ldquo;{testimonial.content}&rdquo;</p>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-slate-900 to-slate-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 rounded-full blur-3xl" style={{ backgroundColor: 'transparent' }}></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 rounded-full blur-3xl" style={{ backgroundColor: 'transparent' }}></div>
        </div>
        <div className="relative max-w-5xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
            Pronto para Revolucionar sua Gestão Médica?
          </h2>
          <p className="text-xl md:text-2xl text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            Organize seus procedimentos e finanças de forma prática e segura com o AnestEasy, a plataforma feita especialmente para anestesiologistas.
          </p>
          <div className="flex justify-center mb-12">
            <Link href="/register">
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xl px-12 py-5 text-xl font-bold rounded-xl flex flex-col items-center">
                <span className="flex items-center">
                  Comece gratuitamente
                  <ArrowRight className="w-6 h-6 ml-3" />
                </span>
                <span className="text-sm font-normal mt-1 opacity-90">
                  Free trial 7 dias
                </span>
              </Button>
            </Link>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-12 text-slate-300">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span className="text-sm font-medium">Sem cartão de crédito</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span className="text-sm font-medium">Setup em 2 minutos</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span className="text-sm font-medium">Suporte médico 24/7</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center mb-8">
            <div className="focus:outline-none">
              <Logo size="md" showText={false} className="text-white" />
            </div>
          </div>
          
          {/* Links legais */}
          <div className="flex flex-wrap justify-center gap-6 mb-6">
            <Link href="/termos" className="text-gray-400 hover:text-white transition-colors text-sm">
              Termos de Uso
            </Link>
            <Link href="/politica-privacidade" className="text-gray-400 hover:text-white transition-colors text-sm">
              Política de Privacidade
            </Link>
            <Link href="/responsabilidade" className="text-gray-400 hover:text-white transition-colors text-sm">
              Responsabilidade
            </Link>
          </div>
          
          <p className="text-center text-gray-400">
            © 2024 AnestEasy. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}
