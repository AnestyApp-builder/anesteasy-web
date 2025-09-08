import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Download, 
  Calendar,
  TrendingUp,
  Users,
  Clock,
  DollarSign,
  FileText,
  PieChart,
  Activity,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Settings,
  Filter,
  RefreshCw,
  Share2,
  Printer,
  Stethoscope,
  Search,
  Building2 as Hospital,
  CheckCircle,
  AlertCircle,
  XCircle,
  CreditCard,
  Receipt
} from 'lucide-react';
import { LogoutButton } from '../components/auth/LogoutButton';

export const RelatoriosPage: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState('overview');
  const [period, setPeriod] = useState('month');

  // Dados de exemplo
  const stats = {
    totalProcedures: 95,
    totalRevenue: 142500,
    paidProcedures: 87,
    averageProcedureValue: 1500,
    proceduresThisMonth: 18,
    revenueGrowth: 12.5
  };

  const procedureTypesData = [
    { name: 'Anestesia Geral', value: 45, color: '#14b8a6' },
    { name: 'Anestesia Regional', value: 32, color: '#0ea5e9' },
    { name: 'Sedação', value: 28, color: '#8b5cf6' },
    { name: 'Anestesia Local', value: 15, color: '#f59e0b' },
    { name: 'Outros', value: 8, color: '#ef4444' }
  ];

  const monthlyPerformance = [
    { month: 'Jan', procedures: 12, revenue: 18750, growth: 15.2 },
    { month: 'Fev', procedures: 15, revenue: 22100, growth: 8.5 },
    { month: 'Mar', procedures: 18, revenue: 25600, growth: 12.3 },
    { month: 'Abr', procedures: 14, revenue: 19800, growth: -5.2 },
    { month: 'Mai', procedures: 16, revenue: 23400, growth: 18.1 },
    { month: 'Jun', procedures: 20, revenue: 28900, growth: 23.5 }
  ];

  const reports = [
    { id: 'overview', name: 'Visão Geral', icon: BarChart3, description: 'Métricas principais e tendências' },
    { id: 'revenue', name: 'Receita', icon: DollarSign, description: 'Análise financeira detalhada' },
    { id: 'procedures', name: 'Procedimentos', icon: FileText, description: 'Estatísticas de procedimentos' },
    { id: 'performance', name: 'Performance', icon: TrendingUp, description: 'Indicadores de crescimento' }
  ];

  const periodOptions = [
    { value: 'week', label: 'Esta semana' },
    { value: 'month', label: 'Este mês' },
    { value: 'quarter', label: 'Este trimestre' },
    { value: 'year', label: 'Este ano' }
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const renderOverviewReport = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Procedimentos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalProcedures}</p>
              <p className="text-sm text-green-600 flex items-center mt-1">
                <TrendingUp className="w-4 h-4 mr-1" />
                +{stats.revenueGrowth}% este mês
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Receita Total</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalRevenue)}</p>
              <p className="text-sm text-green-600 flex items-center mt-1">
                <TrendingUp className="w-4 h-4 mr-1" />
                +{stats.revenueGrowth}% este mês
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ticket Médio</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.averageProcedureValue)}</p>
              <p className="text-sm text-gray-500">por procedimento</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Taxa de Pagamento</p>
              <p className="text-2xl font-bold text-green-600">
                {((stats.paidProcedures / stats.totalProcedures) * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-gray-500">procedimentos pagos</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Receita Mensal</h3>
            <p className="text-sm text-gray-600">Evolução da receita nos últimos meses</p>
          </div>
          <div className="h-64 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
              <p className="text-gray-600">Gráfico de Receita</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Tipos de Procedimentos</h3>
            <p className="text-sm text-gray-600">Distribuição por tipo de anestesia</p>
          </div>
          <div className="h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <PieChart className="w-12 h-12 text-blue-500 mx-auto mb-2" />
              <p className="text-gray-600">Gráfico de Procedimentos</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRevenueReport = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Análise de Receita</h3>
          <p className="text-sm text-gray-600">Detalhamento da receita por período</p>
        </div>
        <div className="h-64 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <DollarSign className="w-12 h-12 text-green-500 mx-auto mb-2" />
            <p className="text-gray-600">Gráfico de Análise de Receita</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-4">Receita por Status</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Pagos</span>
              <span className="font-semibold text-green-600">{formatCurrency(125000)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Pendentes</span>
              <span className="font-semibold text-yellow-600">{formatCurrency(17500)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Cancelados</span>
              <span className="font-semibold text-red-600">{formatCurrency(0)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-4">Performance Mensal</h4>
          <div className="space-y-3">
            {monthlyPerformance.map((month) => (
              <div key={month.month} className="flex justify-between items-center">
                <span className="text-gray-600">{month.month}</span>
                <div className="text-right">
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(month.revenue)}
                  </span>
                  <span className={`text-sm ml-2 ${month.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {month.growth > 0 ? '+' : ''}{month.growth}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderProceduresReport = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Distribuição de Procedimentos</h3>
          <p className="text-sm text-gray-600">Análise por tipo de procedimento</p>
        </div>
        <div className="h-64 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <PieChart className="w-12 h-12 text-purple-500 mx-auto mb-2" />
            <p className="text-gray-600">Gráfico de Distribuição</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-4">Procedimentos por Status</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Realizados</span>
              <span className="font-semibold text-gray-900">{stats.totalProcedures}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Pagos</span>
              <span className="font-semibold text-green-600">{stats.paidProcedures}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Pendentes</span>
              <span className="font-semibold text-yellow-600">{stats.totalProcedures - stats.paidProcedures}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-4">Estatísticas Gerais</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Procedimentos/Mês</span>
              <span className="font-semibold text-gray-900">{stats.proceduresThisMonth}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Ticket Médio</span>
              <span className="font-semibold text-gray-900">{formatCurrency(stats.averageProcedureValue)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Taxa de Sucesso</span>
              <span className="font-semibold text-green-600">
                {((stats.paidProcedures / stats.totalProcedures) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPerformanceReport = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-4">Crescimento</h4>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">+{stats.revenueGrowth}%</div>
            <p className="text-sm text-gray-600">Crescimento mensal</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-4">Eficiência</h4>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {((stats.paidProcedures / stats.totalProcedures) * 100).toFixed(0)}%
            </div>
            <p className="text-sm text-gray-600">Taxa de pagamento</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-4">Produtividade</h4>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">{stats.proceduresThisMonth}</div>
            <p className="text-sm text-gray-600">Procedimentos/mês</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Tendência de Performance</h3>
          <p className="text-sm text-gray-600">Evolução dos indicadores ao longo do tempo</p>
        </div>
        <div className="h-64 bg-gradient-to-br from-orange-50 to-red-50 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <TrendingUp className="w-12 h-12 text-orange-500 mx-auto mb-2" />
            <p className="text-gray-600">Gráfico de Performance</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSelectedReport = () => {
    switch (selectedReport) {
      case 'overview':
        return renderOverviewReport();
      case 'revenue':
        return renderRevenueReport();
      case 'procedures':
        return renderProceduresReport();
      case 'performance':
        return renderPerformanceReport();
      default:
        return renderOverviewReport();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      {/* Sidebar Premium */}
      <div className="fixed left-0 top-0 h-full w-72 bg-white/95 backdrop-blur-xl border-r border-gray-200/50 shadow-xl z-10">
        {/* Logo Section */}
        <div className="p-8 border-b border-gray-100">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Stethoscope className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                AnestEasy
              </h1>
              <p className="text-sm text-gray-500 font-medium">Gestão Profissional</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-6">
          <div className="space-y-3">
            <div className="mb-6">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Menu Principal</p>
            </div>
            
            <a href="/dashboard" className="group flex items-center space-x-4 px-4 py-3.5 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50/50 rounded-xl transition-all duration-200 hover:translate-x-1">
              <BarChart3 className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>Dashboard</span>
              <ArrowUpRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
            
            <a href="/procedimentos" className="group flex items-center space-x-4 px-4 py-3.5 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50/50 rounded-xl transition-all duration-200 hover:translate-x-1">
              <FileText className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>Procedimentos</span>
              <ArrowUpRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
            
            <a href="/financeiro" className="group flex items-center space-x-4 px-4 py-3.5 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50/50 rounded-xl transition-all duration-200 hover:translate-x-1">
              <DollarSign className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>Financeiro</span>
              <ArrowUpRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
            
            <a href="/relatorios" className="group flex items-center space-x-4 px-4 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium shadow-lg transform transition-all duration-200 hover:scale-[1.02]">
              <Activity className="w-5 h-5" />
              <span>Relatórios</span>
              <div className="ml-auto w-2 h-2 bg-white/30 rounded-full"></div>
            </a>
            
            <div className="pt-6 border-t border-gray-100 mt-6">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Configurações</p>
              <a href="/configuracoes" className="group flex items-center space-x-4 px-4 py-3.5 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50/50 rounded-xl transition-all duration-200 hover:translate-x-1">
                <Settings className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>Preferências</span>
                <ArrowUpRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            </div>
          </div>
        </nav>

        {/* User Profile */}
        <div className="p-6 border-t border-gray-100">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl flex items-center justify-center shadow-inner">
              <span className="text-emerald-600 font-bold text-lg">D</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">Dr. Usuário</p>
              <p className="text-sm text-gray-500 truncate">Anestesiologista</p>
            </div>
          </div>
          
          <LogoutButton />
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-72 flex-1 p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Relatórios</h1>
            <p className="text-lg text-gray-600">Análises e insights para seu crescimento profissional</p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200">
              <Share2 className="w-4 h-4" />
              <span>Compartilhar</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200">
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all duration-200">
              <Download className="w-4 h-4" />
              <span>Exportar</span>
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-200/50 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex items-center space-x-4">
              <Calendar className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Período:</span>
              <select 
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
              >
                {periodOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center space-x-3 ml-auto">
              <button className="flex items-center space-x-2 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200">
                <Filter className="w-4 h-4" />
                <span>Filtros</span>
              </button>
              <button className="flex items-center space-x-2 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200">
                <RefreshCw className="w-4 h-4" />
                <span>Atualizar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Report Types */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {reports.map((report) => (
            <div 
              key={report.id} 
              className={`cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 bg-white rounded-xl p-6 shadow-lg border ${
                selectedReport === report.id 
                  ? 'ring-2 ring-emerald-500 bg-emerald-50 border-emerald-200' 
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
              onClick={() => setSelectedReport(report.id)}
            >
              <div className="flex items-center space-x-3 mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  selectedReport === report.id 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  <report.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-semibold ${
                    selectedReport === report.id ? 'text-emerald-700' : 'text-gray-900'
                  }`}>
                    {report.name}
                  </h3>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                {report.description}
              </p>
              {selectedReport === report.id && (
                <div className="mt-3">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Selecionado
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Selected Report Content */}
        <div className="space-y-6">
          {renderSelectedReport()}
        </div>
      </div>
    </div>
  );
};