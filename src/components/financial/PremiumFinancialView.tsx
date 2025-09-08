import React, { useState } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  CreditCard,
  Banknote,
  PiggyBank,
  Target,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Download,
  Filter,
  Search,
  MoreHorizontal,
  CheckCircle,
  Clock,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Separator } from '@/components/ui/separator';
import { PremiumAreaChart, PremiumBarChart, KPICard } from '../charts/PremiumCharts';

// Mock data para demonstração
const financialOverview = {
  totalRevenue: 67500,
  monthlyGrowth: 12.5,
  pendingPayments: 8500,
  paidThisMonth: 59000,
  averageTicket: 1607,
  paymentRate: 94.2
};

const monthlyData = [
  { name: 'Jan', receita: 45000, despesas: 12000, lucro: 33000 },
  { name: 'Fev', receita: 52000, despesas: 14000, lucro: 38000 },
  { name: 'Mar', receita: 48000, despesas: 13000, lucro: 35000 },
  { name: 'Abr', receita: 61000, despesas: 15000, lucro: 46000 },
  { name: 'Mai', receita: 55000, despesas: 14500, lucro: 40500 },
  { name: 'Jun', receita: 67500, despesas: 16000, lucro: 51500 }
];

const paymentMethodsData = [
  { name: 'PIX', value: 45, color: '#2CB67D' },
  { name: 'Cartão Crédito', value: 30, color: '#1E2A38' },
  { name: 'Transferência', value: 15, color: '#C4C5FF' },
  { name: 'Dinheiro', value: 10, color: '#F59E0B' }
];

const recentTransactions = [
  {
    id: 1,
    type: 'receita',
    description: 'Anestesia Geral - Maria Silva',
    amount: 2500,
    date: '2024-12-08',
    status: 'completed',
    method: 'PIX'
  },
  {
    id: 2,
    type: 'receita',
    description: 'Raquidiana - João Costa',
    amount: 800,
    date: '2024-12-07',
    status: 'pending',
    method: 'Cartão Crédito'
  },
  {
    id: 3,
    type: 'despesa',
    description: 'Material Cirúrgico',
    amount: -450,
    date: '2024-12-06',
    status: 'completed',
    method: 'Transferência'
  },
  {
    id: 4,
    type: 'receita',
    description: 'Sedação - Carlos Mendes',
    amount: 600,
    date: '2024-12-06',
    status: 'completed',
    method: 'PIX'
  }
];

const FinancialKPIs: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <KPICard
        title="Receita do Mês"
        value={`R$ ${financialOverview.totalRevenue.toLocaleString('pt-BR')}`}
        change={`+${financialOverview.monthlyGrowth}%`}
        changeType="positive"
        icon={DollarSign}
        description="vs mês anterior"
        target="R$ 50.000"
        progress={135}
      />
      
      <KPICard
        title="Pagamentos Pendentes"
        value={`R$ ${financialOverview.pendingPayments.toLocaleString('pt-BR')}`}
        change="3 pendentes"
        changeType="neutral"
        icon={Clock}
        description="Aguardando pagamento"
      />
      
      <KPICard
        title="Ticket Médio"
        value={`R$ ${financialOverview.averageTicket.toLocaleString('pt-BR')}`}
        change="+8.3%"
        changeType="positive"
        icon={Target}
        description="Por procedimento"
      />
      
      <KPICard
        title="Taxa de Pagamento"
        value={`${financialOverview.paymentRate}%`}
        change="+2.1%"
        changeType="positive"
        icon={TrendingUp}
        description="Dos procedimentos"
        target="95%"
        progress={94.2}
      />
    </div>
  );
};

const RevenueChart: React.FC = () => {
  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Fluxo de Caixa</CardTitle>
            <CardDescription>
              Receitas, despesas e lucro mensal
            </CardDescription>
          </div>
          <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
            <TrendingUp className="w-3 h-3 mr-1" />
            +12.5%
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <PremiumAreaChart
          data={monthlyData}
          title=""
          dataKey="receita"
          color="#2CB67D"
          showTrend={false}
        />
      </CardContent>
    </Card>
  );
};

const PaymentMethodsChart: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Métodos de Pagamento</CardTitle>
        <CardDescription>
          Distribuição por forma de pagamento
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {paymentMethodsData.map((method, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: method.color }}
                  />
                  {method.name}
                </span>
                <span className="font-medium">{method.value}%</span>
              </div>
              <Progress value={method.value} className="h-2" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const TransactionsList: React.FC = () => {
  const [filter, setFilter] = useState('all');

  const getTransactionIcon = (type: string, status: string) => {
    if (status === 'pending') {
      return <Clock className="w-4 h-4 text-yellow-500" />;
    }
    return type === 'receita' ? 
      <ArrowUpRight className="w-4 h-4 text-green-500" /> :
      <ArrowDownRight className="w-4 h-4 text-red-500" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="w-3 h-3 mr-1" />
            Concluído
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <Clock className="w-3 h-3 mr-1" />
            Pendente
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Transações Recentes</CardTitle>
            <CardDescription>
              Últimas movimentações financeiras
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="receita">Receitas</SelectItem>
                <SelectItem value="despesa">Despesas</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentTransactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between p-4 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-50 rounded-lg">
                  {getTransactionIcon(transaction.type, transaction.status)}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{transaction.description}</p>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>{new Date(transaction.date).toLocaleDateString('pt-BR')}</span>
                    <Separator orientation="vertical" className="h-3" />
                    <span>{transaction.method}</span>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <p className={`font-bold ${
                  transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transaction.amount > 0 ? '+' : ''}R$ {Math.abs(transaction.amount).toLocaleString('pt-BR')}
                </p>
                {getStatusBadge(transaction.status)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const FinancialGoals: React.FC = () => {
  const goals = [
    {
      title: 'Meta Mensal',
      current: 67500,
      target: 70000,
      percentage: 96.4,
      color: 'bg-primary-500'
    },
    {
      title: 'Meta Trimestral',
      current: 185500,
      target: 200000,
      percentage: 92.8,
      color: 'bg-blue-500'
    },
    {
      title: 'Meta Anual',
      current: 675000,
      target: 800000,
      percentage: 84.4,
      color: 'bg-purple-500'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Metas Financeiras</CardTitle>
        <CardDescription>
          Acompanhe o progresso das suas metas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {goals.map((goal, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-gray-900">{goal.title}</h4>
                <span className="text-sm text-gray-600">
                  {goal.percentage.toFixed(1)}%
                </span>
              </div>
              <Progress value={goal.percentage} className="h-3" />
              <div className="flex justify-between text-sm text-gray-600">
                <span>R$ {goal.current.toLocaleString('pt-BR')}</span>
                <span>R$ {goal.target.toLocaleString('pt-BR')}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const SmartFinancialInsights: React.FC = () => {
  const insights = [
    {
      type: 'success',
      icon: TrendingUp,
      title: 'Crescimento Excepcional',
      description: 'Sua receita cresceu 12.5% este mês. Continue investindo em qualidade!',
      action: 'Ver análise completa'
    },
    {
      type: 'warning',
      icon: AlertTriangle,
      title: 'Pagamentos Atrasados',
      description: 'R$ 8.500 em pagamentos pendentes há mais de 15 dias.',
      action: 'Gerenciar cobranças'
    },
    {
      type: 'info',
      icon: Target,
      title: 'Oportunidade de Otimização',
      description: 'Considere aumentar o uso do PIX (45% vs 60% da média do mercado).',
      action: 'Ver sugestões'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          <CardTitle>Insights Financeiros</CardTitle>
        </div>
        <CardDescription>
          Análises inteligentes para otimizar sua receita
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {insights.map((insight, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 rounded-lg border border-gray-100">
              <div className={`p-2 rounded-lg ${
                insight.type === 'success' ? 'bg-green-100 text-green-600' :
                insight.type === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                'bg-blue-100 text-blue-600'
              }`}>
                <insight.icon className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900">{insight.title}</h4>
                <p className="text-xs text-gray-600 mt-1">{insight.description}</p>
                <button className="text-xs text-primary-600 hover:text-primary-700 mt-2 font-medium">
                  {insight.action} →
                </button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export const PremiumFinancialView: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financeiro</h1>
          <p className="text-gray-600 mt-1">
            Controle completo das suas finanças e receitas
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Relatório
          </Button>
          <Button size="sm" className="bg-primary-600 hover:bg-primary-700">
            <Plus className="w-4 h-4 mr-2" />
            Nova Transação
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <FinancialKPIs />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="transactions">Transações</TabsTrigger>
          <TabsTrigger value="goals">Metas</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <RevenueChart />
            <PaymentMethodsChart />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TransactionsList />
            <SmartFinancialInsights />
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          <TransactionsList />
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FinancialGoals />
            <Card>
              <CardHeader>
                <CardTitle>Projeções</CardTitle>
                <CardDescription>
                  Previsões baseadas no seu histórico
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                    <h4 className="font-medium text-green-900 mb-2">Projeção para Dezembro</h4>
                    <p className="text-2xl font-bold text-green-600">R$ 72.000</p>
                    <p className="text-sm text-green-700 mt-1">
                      Baseado na tendência atual (+12.5% ao mês)
                    </p>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-2">Meta Anual</h4>
                    <p className="text-2xl font-bold text-blue-600">84.4%</p>
                    <p className="text-sm text-blue-700 mt-1">
                      Faltam R$ 124.500 para atingir R$ 800.000
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <SmartFinancialInsights />
        </TabsContent>
      </Tabs>
    </div>
  );
};
