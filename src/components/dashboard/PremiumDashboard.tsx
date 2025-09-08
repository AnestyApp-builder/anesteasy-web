import React from 'react';
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
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { 
  Area, 
  AreaChart, 
  Bar, 
  BarChart, 
  Line, 
  LineChart, 
  Pie, 
  PieChart, 
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from 'recharts';
import { useAuth } from '@/context/AuthContext';

// Dados mockados para demonstração
const monthlyRevenueData = [
  { month: 'Jan', revenue: 45000, procedures: 28, target: 50000 },
  { month: 'Fev', revenue: 52000, procedures: 32, target: 50000 },
  { month: 'Mar', revenue: 48000, procedures: 30, target: 50000 },
  { month: 'Abr', revenue: 61000, procedures: 38, target: 50000 },
  { month: 'Mai', revenue: 55000, procedures: 35, target: 50000 },
  { month: 'Jun', revenue: 67000, procedures: 42, target: 50000 },
];

const procedureTypesData = [
  { name: 'Cirurgia Geral', value: 35, color: '#2CB67D' },
  { name: 'Cardíaca', value: 25, color: '#1E2A38' },
  { name: 'Neurocirurgia', value: 20, color: '#C4C5FF' },
  { name: 'Pediatria', value: 15, color: '#FF6B6B' },
  { name: 'Outros', value: 5, color: '#4ECDC4' },
];

const chartConfig = {
  revenue: {
    label: 'Receita',
    color: '#2CB67D',
  },
  procedures: {
    label: 'Procedimentos',
    color: '#1E2A38',
  },
  target: {
    label: 'Meta',
    color: '#C4C5FF',
  },
} satisfies ChartConfig;

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: React.ElementType;
  description?: string;
  trend?: number[];
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  description,
  trend
}) => {
  return (
    <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-white to-gray-50/50">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            <div className="flex items-center space-x-2">
              {changeType === 'positive' && <TrendingUp className="h-4 w-4 text-green-600" />}
              {changeType === 'negative' && <TrendingDown className="h-4 w-4 text-red-600" />}
              {changeType === 'neutral' && <Activity className="h-4 w-4 text-gray-600" />}
              <span className={`text-sm font-medium ${
                changeType === 'positive' ? 'text-green-600' : 
                changeType === 'negative' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {change}
              </span>
            </div>
            {description && (
              <p className="text-xs text-gray-500">{description}</p>
            )}
          </div>
          <div className="h-12 w-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const PremiumDashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Olá, {user?.name || 'Usuário'}! 👋
          </h1>
          <p className="text-gray-600 mt-1">
            Aqui está um resumo da sua prática profissional
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="secondary" className="bg-primary-100 text-primary-700">
            <Star className="h-3 w-3 mr-1" />
            Premium
          </Badge>
          <div className="text-right">
            <p className="text-sm text-gray-500">Plano Atual</p>
            <p className="font-medium text-gray-900 capitalize">
              {user?.subscription_plan || 'Standard'}
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Receita Mensal"
          value="R$ 67.000"
          change="+12.5%"
          changeType="positive"
          icon={DollarSign}
          description="vs mês anterior"
        />
        <MetricCard
          title="Procedimentos"
          value="42"
          change="+8.2%"
          changeType="positive"
          icon={Activity}
          description="este mês"
        />
        <MetricCard
          title="Taxa de Sucesso"
          value="98.5%"
          change="+0.3%"
          changeType="positive"
          icon={Target}
          description="média anual"
        />
        <MetricCard
          title="Tempo Médio"
          value="2.4h"
          change="-5.2%"
          changeType="positive"
          icon={Clock}
          description="por procedimento"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card className="border-0 bg-gradient-to-br from-white to-gray-50/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-primary-600" />
              <span>Receita Mensal</span>
            </CardTitle>
            <CardDescription>
              Evolução da receita nos últimos 6 meses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <AreaChart data={monthlyRevenueData}>
                <defs>
                  <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2CB67D" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2CB67D" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                <XAxis 
                  dataKey="month" 
                  className="text-xs fill-gray-600"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  className="text-xs fill-gray-600"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#2CB67D"
                  strokeWidth={2}
                  fill="url(#fillRevenue)"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Procedure Types Chart */}
        <Card className="border-0 bg-gradient-to-br from-white to-gray-50/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-primary-600" />
              <span>Tipos de Procedimentos</span>
            </CardTitle>
            <CardDescription>
              Distribuição por especialidade
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <PieChart>
                <Pie
                  data={procedureTypesData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {procedureTypesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="border-0 bg-gradient-to-br from-white to-gray-50/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-primary-600" />
            <span>Atividade Recente</span>
          </CardTitle>
          <CardDescription>
            Últimos procedimentos realizados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { procedure: 'Cirurgia Cardíaca', patient: 'João Silva', time: '2h 30min', status: 'Concluído', value: 'R$ 3.500' },
              { procedure: 'Anestesia Geral', patient: 'Maria Santos', time: '1h 45min', status: 'Concluído', value: 'R$ 1.800' },
              { procedure: 'Neurocirurgia', patient: 'Pedro Costa', time: '4h 15min', status: 'Concluído', value: 'R$ 4.200' },
              { procedure: 'Cirurgia Pediátrica', patient: 'Ana Oliveira', time: '1h 20min', status: 'Concluído', value: 'R$ 2.100' },
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-100 hover:shadow-sm transition-shadow">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <Activity className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{activity.procedure}</p>
                    <p className="text-sm text-gray-600">{activity.patient}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">{activity.value}</p>
                  <p className="text-sm text-gray-600">{activity.time}</p>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  {activity.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="border-0 bg-gradient-to-br from-white to-gray-50/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-primary-600" />
            <span>Ações Rápidas</span>
          </CardTitle>
          <CardDescription>
            Acesso rápido às funcionalidades principais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all text-left group">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <Activity className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Novo Procedimento</p>
                  <p className="text-sm text-gray-600">Registrar procedimento</p>
                </div>
              </div>
            </button>
            
            <button className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all text-left group">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Registrar Pagamento</p>
                  <p className="text-sm text-gray-600">Marcar como pago</p>
                </div>
              </div>
            </button>
            
            <button className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all text-left group">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Ver Relatórios</p>
                  <p className="text-sm text-gray-600">Análises detalhadas</p>
                </div>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};