'use client'

import React, { useState } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  CheckCircle,
  Plus,
  Filter,
  Search,
  Building2 as Hospital,
  AlertCircle,
  XCircle,
  CreditCard,
  Calendar,
  Target,
  Receipt
} from 'lucide-react';
import { ResponsiveLayout } from '../components/layout/ResponsiveLayout';
import { ResponsiveCard } from '../components/ui/ResponsiveCard';
import { ResponsiveGrid } from '../components/ui/ResponsiveGrid';

export const FinanceiroPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Dados de exemplo para pagamentos
  const payments = [
    {
      id: '1',
      patient: 'Maria Silva Santos',
      procedure: 'Anestesia Geral',
      amount: 2500,
      payment_method: 'PIX',
      payment_date: '08/12/2024',
      status: 'completed',
      hospital: 'Hospital do Coração',
      reference: 'REF-001'
    },
    {
      id: '2',
      patient: 'João Pedro Costa',
      procedure: 'Raquidiana',
      amount: 800,
      payment_method: 'Cartão de Crédito',
      payment_date: '07/12/2024',
      status: 'pending',
      hospital: 'Maternidade Santa Maria',
      reference: 'REF-002'
    },
    {
      id: '3',
      patient: 'Carlos Mendes',
      procedure: 'Sedação',
      amount: 600,
      payment_method: 'Transferência',
      payment_date: '06/12/2024',
      status: 'completed',
      hospital: 'Clínica Gastro Center',
      reference: 'REF-003'
    },
    {
      id: '4',
      patient: 'Ana Paula Lima',
      procedure: 'Anestesia Geral',
      amount: 1800,
      payment_method: 'Dinheiro',
      payment_date: '05/12/2024',
      status: 'pending',
      hospital: 'Hospital São Lucas',
      reference: 'REF-004'
    },
    {
      id: '5',
      patient: 'Pedro Santos',
      procedure: 'Peridural',
      amount: 1200,
      payment_method: 'PIX',
      payment_date: '04/12/2024',
      status: 'completed',
      hospital: 'Hospital Universitário',
      reference: 'REF-005'
    }
  ];

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.patient.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.procedure.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.hospital.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Pago
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            Pendente
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Falhou
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200">
            {status}
          </span>
        );
    }
  };

  const getStats = () => {
    const total = payments.length;
    const completed = payments.filter(p => p.status === 'completed').length;
    const pending = payments.filter(p => p.status === 'pending').length;
    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const completedAmount = payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0);
    const pendingAmount = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
    
    return { total, completed, pending, totalAmount, completedAmount, pendingAmount };
  };

  const stats = getStats();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <ResponsiveLayout>
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-4xl font-extrabold text-gray-900 mb-2">
              Financeiro
            </h1>
            <p className="text-sm lg:text-lg text-gray-600">
              Gerencie seus pagamentos e receitas
            </p>
          </div>
          <button className="flex items-center space-x-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl text-sm lg:text-base">
            <Plus className="w-4 h-4 lg:w-5 lg:h-5" />
            <span className="hidden sm:inline">Novo Pagamento</span>
            <span className="sm:hidden">Novo</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <ResponsiveGrid cols={{ mobile: 2, tablet: 2, desktop: 4 }} gap={{ mobile: 4, tablet: 6, desktop: 6 }} className="mb-6 lg:mb-10">
        {/* Receita Total */}
        <ResponsiveCard className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-xs lg:text-sm font-medium mb-1">Receita Total</p>
              <p className="text-lg lg:text-3xl font-bold">{formatCurrency(stats.totalAmount)}</p>
              <p className="text-emerald-100 text-xs lg:text-sm mt-1 flex items-center">
                <TrendingUp className="w-3 h-3 lg:w-4 lg:h-4 mr-1" />
                +12.5%
              </p>
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 lg:w-6 lg:h-6" />
            </div>
          </div>
        </ResponsiveCard>

        {/* Pagamentos Recebidos */}
        <ResponsiveCard className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-xs lg:text-sm font-medium mb-1">Recebidos</p>
              <p className="text-lg lg:text-3xl font-bold">{formatCurrency(stats.completedAmount)}</p>
              <p className="text-blue-100 text-xs lg:text-sm mt-1">
                {stats.completed} de {stats.total}
              </p>
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 lg:w-6 lg:h-6" />
            </div>
          </div>
        </ResponsiveCard>

        {/* Pagamentos Pendentes */}
        <ResponsiveCard className="bg-gradient-to-br from-amber-500 to-orange-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-xs lg:text-sm font-medium mb-1">Pendentes</p>
              <p className="text-lg lg:text-3xl font-bold">{formatCurrency(stats.pendingAmount)}</p>
              <p className="text-amber-100 text-xs lg:text-sm mt-1">
                {stats.pending} pagamentos
              </p>
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <AlertCircle className="w-5 h-5 lg:w-6 lg:h-6" />
            </div>
          </div>
        </ResponsiveCard>

        {/* Taxa de Recebimento */}
        <ResponsiveCard className="bg-gradient-to-br from-purple-500 to-pink-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-xs lg:text-sm font-medium mb-1">Taxa de Recebimento</p>
              <p className="text-lg lg:text-3xl font-bold">{Math.round((stats.completed / stats.total) * 100)}%</p>
              <p className="text-purple-100 text-xs lg:text-sm mt-1 flex items-center">
                <TrendingUp className="w-3 h-3 lg:w-4 lg:h-4 mr-1" />
                +5.3%
              </p>
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <Target className="w-5 h-5 lg:w-6 lg:h-6" />
            </div>
          </div>
        </ResponsiveCard>
      </ResponsiveGrid>

      {/* Filters */}
      <ResponsiveCard className="mb-6 lg:mb-8">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 lg:w-5 lg:h-5" />
              <input
                type="text"
                placeholder="Buscar por paciente, procedimento ou hospital..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 lg:pl-12 pr-4 py-3 lg:py-4 border border-gray-200 rounded-xl lg:rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-sm lg:text-lg"
              />
            </div>
          </div>
          <div className="flex gap-3 lg:gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 lg:px-4 py-3 lg:py-4 border border-gray-200 rounded-xl lg:rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-sm lg:text-lg min-w-[140px] lg:min-w-[180px]"
            >
              <option value="all">Todos os Status</option>
              <option value="completed">Pagos</option>
              <option value="pending">Pendentes</option>
              <option value="failed">Falharam</option>
            </select>
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
              className="flex items-center space-x-2 px-3 lg:px-6 py-3 lg:py-4 border border-gray-200 rounded-xl lg:rounded-2xl hover:bg-gray-50 transition-all duration-200 text-sm lg:text-lg"
            >
              <Filter className="w-4 h-4 lg:w-5 lg:h-5" />
              <span className="hidden sm:inline">Limpar</span>
            </button>
          </div>
        </div>
      </ResponsiveCard>

      {/* Payments List */}
      <ResponsiveCard>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg lg:text-2xl font-bold text-gray-900 mb-2">Lista de Pagamentos</h3>
            <p className="text-sm lg:text-base text-gray-600">{filteredPayments.length} pagamento(s) encontrado(s)</p>
          </div>
        </div>

        {filteredPayments.length === 0 ? (
          <div className="text-center py-12 lg:py-16">
            <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 lg:mb-6">
              <Search className="w-8 h-8 lg:w-10 lg:h-10 text-gray-400" />
            </div>
            <h3 className="text-lg lg:text-xl font-semibold text-gray-900 mb-2 lg:mb-3">
              Nenhum pagamento encontrado
            </h3>
            <p className="text-sm lg:text-base text-gray-600 mb-4 lg:mb-6">
              Tente ajustar os filtros ou criar um novo pagamento.
            </p>
            <button className="flex items-center space-x-2 px-4 lg:px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all duration-200 mx-auto text-sm lg:text-base">
              <Plus className="w-4 h-4 lg:w-5 lg:h-5" />
              <span>Novo Pagamento</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4 lg:space-y-6">
            {filteredPayments.map((payment) => (
              <div key={payment.id} className="bg-gradient-to-r from-white to-gray-50/50 rounded-xl lg:rounded-2xl p-4 lg:p-6 border border-gray-200/50 hover:shadow-lg transition-all duration-300">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
                  <div className="flex items-center space-x-3 lg:space-x-4">
                    <div className="w-12 h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl lg:rounded-2xl flex items-center justify-center shadow-inner">
                      <span className="text-emerald-600 font-bold text-sm lg:text-lg">
                        {payment.patient.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-base lg:text-xl font-bold text-gray-900 mb-1">
                        {payment.patient}
                      </h4>
                      <p className="text-sm lg:text-base text-gray-600 font-medium">
                        {payment.procedure}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col lg:flex-row lg:items-center space-y-2 lg:space-y-0 lg:space-x-3">
                    {getStatusBadge(payment.status)}
                    <div className="text-left lg:text-right">
                      <p className="text-lg lg:text-2xl font-bold text-emerald-600">
                        {formatCurrency(payment.amount)}
                      </p>
                      <p className="text-xs lg:text-sm text-gray-500">
                        {payment.payment_date}
                      </p>
                    </div>
                  </div>
                </div>

                <ResponsiveGrid cols={{ mobile: 2, tablet: 4, desktop: 4 }} gap={{ mobile: 3, tablet: 4, desktop: 4 }}>
                  <div className="flex items-center space-x-2 lg:space-x-3 text-gray-600">
                    <div className="w-6 h-6 lg:w-8 lg:h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-3 h-3 lg:w-4 lg:h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Método</p>
                      <p className="font-medium text-sm lg:text-base">{payment.payment_method}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 lg:space-x-3 text-gray-600">
                    <div className="w-6 h-6 lg:w-8 lg:h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <Receipt className="w-3 h-3 lg:w-4 lg:h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Referência</p>
                      <p className="font-medium text-sm lg:text-base">{payment.reference}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 lg:space-x-3 text-gray-600">
                    <div className="w-6 h-6 lg:w-8 lg:h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Hospital className="w-3 h-3 lg:w-4 lg:h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Hospital</p>
                      <p className="font-medium text-sm lg:text-base truncate">{payment.hospital}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 lg:space-x-3 text-gray-600">
                    <div className="w-6 h-6 lg:w-8 lg:h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-3 h-3 lg:w-4 lg:h-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Data</p>
                      <p className="font-medium text-sm lg:text-base">{payment.payment_date}</p>
                    </div>
                  </div>
                </ResponsiveGrid>
              </div>
            ))}
          </div>
        )}
      </ResponsiveCard>
    </ResponsiveLayout>
  );
};