import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import { 
  Stethoscope, 
  DollarSign, 
  BarChart3, 
  Shield, 
  Clock, 
  Users,
  ArrowRight,
  CheckCircle,
  Star,
  TrendingUp,
  Award,
  Target,
  Heart,
  Crown,
  Building2,
  Sparkles
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  // Debug logs
  console.log('HomePage - user:', user);
  console.log('HomePage - isLoading:', isLoading);

  // Redirecionar usuários logados para o dashboard
  useEffect(() => {
    console.log('HomePage useEffect triggered - user:', user);
    if (user) {
      console.log('HomePage - Redirecting to dashboard');
      // Usar setTimeout para garantir que o redirecionamento aconteça
      setTimeout(() => {
        navigate('/dashboard');
      }, 100);
    }
  }, [user, navigate]);

  // Se o usuário estiver logado, mostrar loading
  if (user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Stethoscope className="w-8 h-8 text-white" />
          </div>
          <p className="text-secondary-600">Redirecionando para o Dashboard...</p>
        </div>
      </div>
    );
  }

  // Mostrar loading apenas se ainda estiver carregando
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Stethoscope className="w-8 h-8 text-white" />
          </div>
          <p className="text-secondary-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Interface normal para usuários não logados
  const features = [
    {
      icon: Stethoscope,
      title: 'Gestão de Procedimentos',
      description: 'Cadastre e acompanhe todos os seus procedimentos anestésicos com facilidade.',
      color: 'bg-blue-100 text-blue-600'
    },
    {
      icon: DollarSign,
      title: 'Controle Financeiro',
      description: 'Monitore pagamentos, receitas e tenha controle total sobre sua renda.',
      color: 'bg-green-100 text-green-600'
    },
    {
      icon: BarChart3,
      title: 'Relatórios Inteligentes',
      description: 'Dashboards e relatórios que ajudam no crescimento profissional.',
      color: 'bg-purple-100 text-purple-600'
    },
    {
      icon: Shield,
      title: 'Segurança Total',
      description: 'Seus dados protegidos com criptografia de ponta e backup automático.',
      color: 'bg-orange-100 text-orange-600'
    }
  ];

  const testimonials = [
    {
      name: 'Dr. Ana Silva',
      role: 'Anestesiologista',
      content: 'O AnestEasy revolucionou minha gestão financeira. Agora tenho controle total sobre meus procedimentos.',
      avatar: '👩‍⚕️',
      rating: 5
    },
    {
      name: 'Dr. Carlos Santos',
      role: 'Anestesiologista',
      content: 'Interface intuitiva e relatórios detalhados. Recomendo para todos os colegas da área.',
      avatar: '👨‍⚕️',
      rating: 5
    },
    {
      name: 'Dra. Mariana Costa',
      role: 'Anestesiologista',
      content: 'Economizo horas por semana na organização. O dashboard é simplesmente perfeito.',
      avatar: '👩‍⚕️',
      rating: 5
    }
  ];

  const pricingPlans = [
    {
      name: 'Standard',
      price: 'R$ 89,90',
      period: '/mês',
      description: 'Ideal para anestesiologistas iniciantes',
      features: [
        'Até 100 procedimentos/mês',
        'Relatórios básicos',
        'Suporte por email',
        'Backup automático'
      ],
      popular: false,
      icon: Target
    },
    {
      name: 'Premium',
      price: 'R$ 149,00',
      period: '/mês',
      description: 'Para profissionais estabelecidos',
      features: [
        'Procedimentos ilimitados',
        'Relatórios avançados',
        'Suporte prioritário',
        'Integrações avançadas',
        'Dashboard personalizado'
      ],
      popular: true,
      icon: Crown
    },
    {
      name: 'Grupos',
      price: 'Consultar',
      period: 'preços',
      description: 'Para clínicas e grupos médicos',
      features: [
        'Múltiplos usuários',
        'Gestão centralizada',
        'Relatórios consolidados',
        'Treinamento incluído',
        'Suporte dedicado'
      ],
      popular: false,
      icon: Building2
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Navigation */}
      <nav className="relative z-10 px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-secondary-800">AnestEasy</span>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-secondary-600 hover:text-primary-600 transition-colors">Recursos</a>
            <a href="#testimonials" className="text-secondary-600 hover:text-primary-600 transition-colors">Depoimentos</a>
            <a href="#pricing" className="text-secondary-600 hover:text-primary-600 transition-colors">Preços</a>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/login">
              <Button variant="ghost">Entrar</Button>
            </Link>
            <Link to="/register">
              <Button>Começar Grátis</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary-100 text-primary-700 text-sm font-medium mb-8">
              <Award className="w-4 h-4 mr-2" />
              Plataforma #1 para Anestesistas
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-secondary-900 mb-6">
              <span className="block">Gestão Financeira</span>
              <span className="block text-primary-600">Inteligente</span>
              <span className="block text-3xl md:text-4xl lg:text-5xl font-medium text-secondary-600 mt-4">
                para Anestesistas
              </span>
            </h1>

            {/* Description */}
            <p className="text-xl text-secondary-600 mb-12 max-w-3xl mx-auto leading-relaxed">
              Organize procedimentos, controle pagamentos e acelere seu crescimento 
              profissional com a plataforma mais completa do mercado.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary-600" />
              </div>
              <div className="text-3xl font-bold text-secondary-900">1,000+</div>
              <div className="text-secondary-600">Anestesistas Ativos</div>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-primary-600" />
              </div>
              <div className="text-3xl font-bold text-secondary-900">98%</div>
              <div className="text-secondary-600">Satisfação</div>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-primary-600" />
              </div>
              <div className="text-3xl font-bold text-secondary-900">24/7</div>
              <div className="text-secondary-600">Suporte</div>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary-600" />
              </div>
              <div className="text-3xl font-bold text-secondary-900">100%</div>
              <div className="text-secondary-600">Seguro</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary-100 text-primary-700 text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4 mr-2" />
              Recursos Principais
            </div>
            <h2 className="text-4xl font-bold text-secondary-900 mb-4">
              Tudo que você precisa em um só lugar
            </h2>
            <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
              Uma plataforma completa para gerenciar sua carreira como anestesiologista
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="p-8 text-center hover:shadow-lg transition-all duration-300 border-0 bg-white">
                <div className={`w-16 h-16 ${feature.color} rounded-2xl flex items-center justify-center mx-auto mb-6`}>
                  <feature.icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-semibold text-secondary-900 mb-3">{feature.title}</h3>
                <p className="text-secondary-600 leading-relaxed">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary-100 text-primary-700 text-sm font-medium mb-4">
              <Heart className="w-4 h-4 mr-2" />
              Depoimentos
            </div>
            <h2 className="text-4xl font-bold text-secondary-900 mb-4">
              O que nossos usuários dizem
            </h2>
            <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
              Histórias reais de anestesiologistas que transformaram sua gestão
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="p-8 border-0 bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-white text-xl mr-4">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <h4 className="font-semibold text-secondary-900">{testimonial.name}</h4>
                    <p className="text-secondary-600 text-sm">{testimonial.role}</p>
                  </div>
                </div>
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-secondary-700 italic">"{testimonial.content}"</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-gradient-to-br from-primary-50 to-secondary-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary-100 text-primary-700 text-sm font-medium mb-4">
              <TrendingUp className="w-4 h-4 mr-2" />
              Planos e Preços
            </div>
            <h2 className="text-4xl font-bold text-secondary-900 mb-4">
              Escolha o plano ideal para você
            </h2>
            <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
              Planos flexíveis que crescem junto com sua prática profissional
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card key={index} className={`p-8 relative ${plan.popular ? 'border-2 border-primary-500 shadow-xl scale-105' : 'border-0'} bg-white`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-primary-500 text-white px-4 py-2 rounded-full text-sm font-medium">
                      Mais Popular
                    </div>
                  </div>
                )}
                
                <div className="text-center">
                  <div className={`w-16 h-16 ${plan.popular ? 'bg-primary-500 text-white' : 'bg-primary-100 text-primary-600'} rounded-2xl flex items-center justify-center mx-auto mb-6`}>
                    <plan.icon className="w-8 h-8" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-secondary-900 mb-2">{plan.name}</h3>
                  <p className="text-secondary-600 mb-6">{plan.description}</p>
                  
                  <div className="mb-8">
                    <span className="text-4xl font-bold text-secondary-900">{plan.price}</span>
                    <span className="text-secondary-600">{plan.period}</span>
                  </div>
                  
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-primary-600 mr-3 flex-shrink-0" />
                        <span className="text-secondary-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    className={`w-full ${plan.popular ? 'bg-primary-500 hover:bg-primary-600 text-white' : 'bg-white border-2 border-primary-500 text-primary-600 hover:bg-primary-50'}`}
                  >
                    {plan.name === 'Grupos' ? 'Falar com Vendas' : 'Começar Agora'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-secondary-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-6">
                <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                  <Stethoscope className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">AnestEasy</span>
              </div>
              <p className="text-gray-400 mb-6">
                A plataforma mais completa para gestão financeira de anestesiologistas.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Produto</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">Recursos</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Preços</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Atualizações</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Empresa</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Sobre</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Carreiras</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Suporte</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Central de Ajuda</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contato</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2024 AnestEasy. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};