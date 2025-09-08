import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity, 
  Calendar, 
  Clock,
  Users,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  Zap,
  Star,
  Award,
  AlertTriangle,
  Stethoscope,
  Bell,
  Settings,
  FileText,
  BarChart3,
  PieChart,
  Heart,
  CreditCard,
  TrendingDown as TrendingDownIcon,
  CheckCircle,
  Circle,
  Plus,
  Filter,
  Search
} from 'lucide-react';
import { ResponsiveLayout } from '../components/layout/ResponsiveLayout';
import { ResponsiveCard } from '../components/ui/ResponsiveCard';
import { ResponsiveGrid } from '../components/ui/ResponsiveGrid';
import { SmartNavigation } from '../components/navigation/SmartNavigation';
import { 
  Area, 
  AreaChart, 
  XAxis,
  CartesianGrid,
  YAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  LineChart,
  Line
} from 'recharts';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

// Dados para os gráficos
const monthlyRevenueData = [
  { month: 'Jan', revenue: 45000, procedures: 28, target: 50000 },
  { month: 'Fev', revenue: 52000, procedures: 32, target: 50000 },
  { month: 'Mar', revenue: 48000, procedures: 30, target: 50000 },
  { month: 'Abr', revenue: 61000, procedures: 38, target: 50000 },
  { month: 'Mai', revenue: 55000, procedures: 35, target: 50000 },
  { month: 'Jun', revenue: 67000, procedures: 42, target: 50000 },
];

// Configuração do gráfico de receita
const revenueChartConfig = {
  revenue: {
    label: "Receita",
    color: "#14b8a6",
  },
  target: {
    label: "Meta",
    color: "#e2e8f0",
  },
};

// Dados dos procedimentos recentes
const recentProcedures = [
  { id: 1, patient: 'Maria Silva', procedure: 'Anestesia Geral', date: '08/12', status: 'completed', value: 2500 },
  { id: 2, patient: 'João Santos', procedure: 'Raquidiana', date: '07/12', status: 'pending', value: 800 },
  { id: 3, patient: 'Ana Costa', procedure: 'Sedação', date: '06/12', status: 'completed', value: 600 },
  { id: 4, patient: 'Pedro Lima', procedure: 'Anestesia Geral', date: '05/12', status: 'completed', value: 1800 },
];

// Dados para gráfico de procedimentos por tipo
const procedureTypesData = [
  { name: 'Anestesia Geral', value: 45, color: '#14b8a6' },
  { name: 'Anestesia Regional', value: 32, color: '#0ea5e9' },
  { name: 'Sedação', value: 28, color: '#8b5cf6' },
  { name: 'Anestesia Local', value: 15, color: '#f59e0b' },
];

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  const stats = {
    totalRevenue: 142500,
    totalProcedures: 95,
    averageValue: 1500,
    completionRate: 87
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Concluído
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <Clock className="w-3 h-3 mr-1" />
            Pendente
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  return (
    <ResponsiveLayout>
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-4xl font-extrabold text-gray-900 mb-2">
              Dashboard
            </h1>
            <p className="text-sm lg:text-lg text-gray-600">
              Bem-vindo de volta, {user?.name || 'Dr. Usuário'}! 👋
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 px-3 lg:px-4 py-2 lg:py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl text-sm lg:text-base">
              <Plus className="w-4 h-4 lg:w-5 lg:h-5" />
              <span className="hidden sm:inline">Novo Procedimento</span>
              <span className="sm:hidden">Novo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <ResponsiveGrid cols={{ mobile: 2, tablet: 2, desktop: 4 }} gap={{ mobile: 4, tablet: 6, desktop: 6 }} className="mb-6 lg:mb-10">
        <ResponsiveCard className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-xs lg:text-sm font-medium mb-1">Receita Total</p>
              <p className="text-xl lg:text-3xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
              <p className="text-emerald-100 text-xs lg:text-sm mt-1 flex items-center">
                <TrendingUp className="w-3 h-3 lg:w-4 lg:h-4 mr-1" />
                +12.5% este mês
              </p>
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 lg:w-6 lg:h-6" />
            </div>
          </div>
        </ResponsiveCard>

        <ResponsiveCard className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-xs lg:text-sm font-medium mb-1">Procedimentos</p>
              <p className="text-xl lg:text-3xl font-bold">{stats.totalProcedures}</p>
              <p className="text-blue-100 text-xs lg:text-sm mt-1 flex items-center">
                <TrendingUp className="w-3 h-3 lg:w-4 lg:h-4 mr-1" />
                +8.2% este mês
              </p>
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <FileText className="w-5 h-5 lg:w-6 lg:h-6" />
            </div>
          </div>
        </ResponsiveCard>

        <ResponsiveCard className="bg-gradient-to-br from-purple-500 to-pink-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-xs lg:text-sm font-medium mb-1">Ticket Médio</p>
              <p className="text-xl lg:text-3xl font-bold">{formatCurrency(stats.averageValue)}</p>
              <p className="text-purple-100 text-xs lg:text-sm mt-1">por procedimento</p>
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <Target className="w-5 h-5 lg:w-6 lg:h-6" />
            </div>
          </div>
        </ResponsiveCard>

        <ResponsiveCard className="bg-gradient-to-br from-amber-500 to-orange-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-xs lg:text-sm font-medium mb-1">Taxa de Sucesso</p>
              <p className="text-xl lg:text-3xl font-bold">{stats.completionRate}%</p>
              <p className="text-amber-100 text-xs lg:text-sm mt-1 flex items-center">
                <CheckCircle className="w-3 h-3 lg:w-4 lg:h-4 mr-1" />
                Excelente
              </p>
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <Award className="w-5 h-5 lg:w-6 lg:h-6" />
            </div>
          </div>
        </ResponsiveCard>
      </ResponsiveGrid>

      {/* Charts Section */}
      <ResponsiveGrid cols={{ mobile: 1, tablet: 1, desktop: 2 }} gap={{ mobile: 4, tablet: 6, desktop: 6 }} className="mb-6 lg:mb-10">
        {/* Revenue Chart */}
        <ResponsiveCard>
          <div className="mb-4">
            <h3 className="text-lg lg:text-xl font-semibold text-gray-900 mb-2">Receita Mensal</h3>
            <p className="text-sm text-gray-600">Evolução da receita nos últimos meses</p>
          </div>
          <div className="h-64 lg:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyRevenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#14b8a6"
                  fill="#14b8a6"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ResponsiveCard>

        {/* Procedures Chart */}
        <ResponsiveCard>
          <div className="mb-4">
            <h3 className="text-lg lg:text-xl font-semibold text-gray-900 mb-2">Tipos de Procedimentos</h3>
            <p className="text-sm text-gray-600">Distribuição por tipo de anestesia</p>
          </div>
          <div className="h-64 lg:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <ChartTooltip />
                <RechartsPieChart
                  data={procedureTypesData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {procedureTypesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </RechartsPieChart>
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </ResponsiveCard>
      </ResponsiveGrid>

      {/* Recent Procedures */}
      <ResponsiveCard>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg lg:text-xl font-semibold text-gray-900 mb-2">Procedimentos Recentes</h3>
            <p className="text-sm text-gray-600">Últimos procedimentos realizados</p>
          </div>
          <SmartNavigation 
            to="/procedimentos" 
            className="text-emerald-600 hover:text-emerald-700 font-semibold text-sm lg:text-base transition-colors"
          >
            Ver Todos →
          </SmartNavigation>
        </div>

        <div className="space-y-4">
          {recentProcedures.map((procedure) => (
            <div key={procedure.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center space-x-3 lg:space-x-4">
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl flex items-center justify-center">
                  <span className="text-emerald-600 font-bold text-sm lg:text-base">
                    {procedure.patient.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm lg:text-base">{procedure.patient}</h4>
                  <p className="text-gray-600 text-xs lg:text-sm">{procedure.procedure}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {getStatusBadge(procedure.status)}
                <div className="text-right">
                  <p className="font-semibold text-emerald-600 text-sm lg:text-base">
                    {formatCurrency(procedure.value)}
                  </p>
                  <p className="text-gray-500 text-xs">{procedure.date}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile CTA */}
        <div className="mt-6 lg:hidden">
          <SmartNavigation 
            to="/procedimentos" 
            className="block w-full py-3 text-center text-emerald-600 hover:text-emerald-700 font-semibold transition-colors border-2 border-dashed border-emerald-200 hover:border-emerald-300 rounded-xl hover:bg-emerald-50/50"
          >
            <Plus className="w-5 h-5 mx-auto mb-2" />
            Novo Procedimento
          </SmartNavigation>
        </div>
      </ResponsiveCard>
    </ResponsiveLayout>
  );
};