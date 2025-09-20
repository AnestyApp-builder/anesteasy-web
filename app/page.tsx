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

export default function Home() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)

  // Redirecionar se já estiver logado
  useEffect(() => {
    if (isAuthenticated && user) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, user, router])

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
              <Link href="/login">
                <Button variant="ghost" className="text-white hover:text-emerald-300 hover:bg-white/20 border border-white/40 min-h-[44px] px-3 sm:px-4 font-medium">
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
                <Button size="lg" className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-12 py-5 text-xl font-bold shadow-2xl shadow-emerald-500/30 transition-all duration-300 hover:scale-105 rounded-xl">
                  Começar Gratuitamente
                  <ArrowRight className="w-6 h-6 ml-3" />
                </Button>
              </Link>
            </div>
            
            {/* Link secundário discreto */}
            <div className="text-center mb-16">
              <p className="text-gray-300 text-sm mb-4">Já tem uma conta?</p>
              <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-medium underline transition-colors">
                Fazer login na plataforma
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <Card key={index} className="text-center p-8 border-0 shadow-lg hover:shadow-xl transition-all duration-300" style={{ backgroundColor: 'transparent' }}>
                <CardHeader>
                  <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="w-8 h-8 text-emerald-600" />
                  </div>
                  <div className="text-4xl font-bold text-slate-900 mb-2">{stat.value}</div>
                  <div className="text-slate-600 font-medium">{stat.label}</div>
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
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xl px-12 py-5 text-xl font-bold rounded-xl">
                Começar Gratuitamente
                <ArrowRight className="w-6 h-6 ml-3" />
              </Button>
            </Link>
          </div>
          
          {/* Link secundário discreto */}
          <div className="text-center mb-12">
            <Link href="/login" className="text-slate-300 hover:text-white font-medium underline transition-colors">
              Já tem uma conta? Fazer login
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
          <p className="text-center text-gray-400">
            © 2024 AnestEasy. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}
