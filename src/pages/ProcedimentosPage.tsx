'use client'

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity, 
  Clock,
  Users,
  ArrowUpRight,
  Stethoscope,
  Settings,
  FileText,
  BarChart3,
  CheckCircle,
  Plus,
  Filter,
  Search,
  Building2 as Hospital,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { LogoutButton } from '../components/auth/LogoutButton';

export const ProcedimentosPage: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Dados de exemplo
  const procedures = [
    {
      id: '1',
      patient: 'Maria Silva Santos',
      procedure: 'Anestesia Geral para Cirurgia Cardíaca',
      procedure_type: 'Anestesia Geral',
      date: '08/12/2024',
      time: '08:00',
      duration: '3h',
      value: 2500,
      status: 'paid',
      hospital: 'Hospital do Coração',
      surgeon: 'Dr. João Cardiologista',
      room: 'Sala 3',
      age: 65,
      gender: 'F',
      notes: 'Paciente com histórico de hipertensão. Procedimento sem intercorrências.'
    },
    {
      id: '2',
      patient: 'João Pedro Costa',
      procedure: 'Raquidiana para Cesariana',
      procedure_type: 'Raquidiana',
      date: '07/12/2024',
      time: '14:30',
      duration: '45min',
      value: 800,
      status: 'pending',
      hospital: 'Maternidade Santa Maria',
      surgeon: 'Dra. Ana Obstetra',
      room: 'Sala 1',
      age: 28,
      gender: 'F',
      notes: 'Primeira gestação. Paciente ansiosa, tranquilizada antes do procedimento.'
    },
    {
      id: '3',
      patient: 'Carlos Mendes',
      procedure: 'Sedação para Endoscopia',
      procedure_type: 'Sedação',
      date: '06/12/2024',
      time: '10:15',
      duration: '30min',
      value: 600,
      status: 'paid',
      hospital: 'Clínica Gastro Center',
      surgeon: 'Dr. Paulo Gastro',
      room: 'Sala 2',
      age: 45,
      gender: 'M',
      notes: 'Exame de rotina. Paciente colaborativo.'
    },
    {
      id: '4',
      patient: 'Ana Paula Lima',
      procedure: 'Anestesia Geral para Cirurgia Ortopédica',
      procedure_type: 'Anestesia Geral',
      date: '05/12/2024',
      time: '16:00',
      duration: '2h 30min',
      value: 1800,
      status: 'pending',
      hospital: 'Hospital São Lucas',
      surgeon: 'Dr. Roberto Cirurgião',
      room: 'Sala 4',
      age: 42,
      gender: 'F',
      notes: 'Cirurgia de joelho. Paciente em bom estado geral.'
    },
    {
      id: '5',
      patient: 'Pedro Santos',
      procedure: 'Peridural para Cirurgia Abdominal',
      procedure_type: 'Peridural',
      date: '04/12/2024',
      time: '09:30',
      duration: '1h 15min',
      value: 1200,
      status: 'paid',
      hospital: 'Hospital Universitário',
      surgeon: 'Dra. Maria Anestesista',
      room: 'Sala 5',
      age: 38,
      gender: 'M',
      notes: 'Cirurgia de apendicite. Procedimento de emergência.'
    }
  ];

  // Filtrar procedimentos
  const filteredProcedures = procedures.filter(procedure => {
    const matchesSearch = 
      procedure.patient.toLowerCase().includes(searchTerm.toLowerCase()) ||
      procedure.procedure.toLowerCase().includes(searchTerm.toLowerCase()) ||
      procedure.hospital.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || procedure.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Pago
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            Pendente
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200">
            {status}
          </span>
        );
    }
  };

  const getStats = () => {
    const total = procedures.length;
    const paid = procedures.filter(p => p.status === 'paid').length;
    const pending = procedures.filter(p => p.status === 'pending').length;
    const totalValue = procedures.reduce((sum, p) => sum + p.value, 0);
    
    return { total, paid, pending, totalValue };
  };

  const stats = getStats();

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
            
            <a href="/procedimentos" className="group flex items-center space-x-4 px-4 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium shadow-lg transform transition-all duration-200 hover:scale-[1.02]">
              <FileText className="w-5 h-5" />
              <span>Procedimentos</span>
              <div className="ml-auto w-2 h-2 bg-white/30 rounded-full"></div>
            </a>
            
            <a href="/financeiro" className="group flex items-center space-x-4 px-4 py-3.5 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50/50 rounded-xl transition-all duration-200 hover:translate-x-1">
              <DollarSign className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>Financeiro</span>
              <ArrowUpRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
            
            <a href="/relatorios" className="group flex items-center space-x-4 px-4 py-3.5 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50/50 rounded-xl transition-all duration-200 hover:translate-x-1">
              <Activity className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>Relatórios</span>
              <ArrowUpRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
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
              <span className="text-emerald-600 font-bold text-lg">
                {user?.name?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{user?.name || 'Dr. Usuário'}</p>
              <p className="text-sm text-gray-500 truncate">{user?.specialty || 'Anestesiologista'}</p>
            </div>
          </div>
          
          <LogoutButton />
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-72 flex-1 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
              Procedimentos
            </h1>
            <p className="text-lg text-gray-600">
              Gerencie todos os seus procedimentos anestésicos
            </p>
          </div>
          <button className="flex items-center space-x-3 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl">
            <Plus className="w-5 h-5" />
            <span className="font-medium">Novo Procedimento</span>
          </button>
        </div>

        {/* Stats Cards Premium */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {/* Total Procedimentos */}
          <div className="group relative bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <div className="flex items-center space-x-1 text-blue-100">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm font-medium">+15.2%</span>
                </div>
              </div>
              <p className="text-blue-100 text-sm font-medium mb-1">Total Procedimentos</p>
              <p className="text-3xl font-bold">{stats.total}</p>
              <p className="text-blue-100 text-sm mt-2">Este mês</p>
            </div>
          </div>

          {/* Procedimentos Pagos */}
          <div className="group relative bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div className="flex items-center space-x-1 text-emerald-100">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm font-medium">+8.5%</span>
                </div>
              </div>
              <p className="text-emerald-100 text-sm font-medium mb-1">Procedimentos Pagos</p>
              <p className="text-3xl font-bold">{stats.paid}</p>
              <p className="text-emerald-100 text-sm mt-2">Taxa de pagamento: {Math.round((stats.paid / stats.total) * 100)}%</p>
            </div>
          </div>

          {/* Procedimentos Pendentes */}
          <div className="group relative bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="flex items-center space-x-1 text-amber-100">
                  <TrendingDown className="w-4 h-4" />
                  <span className="text-sm font-medium">-2.1%</span>
                </div>
              </div>
              <p className="text-amber-100 text-sm font-medium mb-1">Pendentes</p>
              <p className="text-3xl font-bold">{stats.pending}</p>
              <p className="text-amber-100 text-sm mt-2">Aguardando pagamento</p>
            </div>
          </div>

          {/* Receita Total */}
          <div className="group relative bg-gradient-to-br from-purple-500 to-pink-600 rounded-3xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div className="flex items-center space-x-1 text-purple-100">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm font-medium">+12.3%</span>
                </div>
              </div>
              <p className="text-purple-100 text-sm font-medium mb-1">Receita Total</p>
              <p className="text-3xl font-bold">R$ {stats.totalValue.toLocaleString('pt-BR')}</p>
              <p className="text-purple-100 text-sm mt-2">Média: R$ {Math.round(stats.totalValue / stats.total).toLocaleString('pt-BR')}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-200/50 p-8 mb-8">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar por paciente, procedimento ou hospital..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-lg"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-lg min-w-[180px]"
              >
                <option value="all">Todos os Status</option>
                <option value="paid">Pagos</option>
                <option value="pending">Pendentes</option>
                <option value="cancelled">Cancelados</option>
              </select>
              <button 
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                }}
                className="flex items-center space-x-2 px-6 py-4 border border-gray-200 rounded-2xl hover:bg-gray-50 transition-all duration-200 text-lg"
              >
                <Filter className="w-5 h-5" />
                <span>Limpar Filtros</span>
              </button>
            </div>
          </div>
        </div>

        {/* Procedures List */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-200/50 p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Lista de Procedimentos</h3>
              <p className="text-gray-600">{filteredProcedures.length} procedimento(s) encontrado(s)</p>
            </div>
          </div>
          
          {filteredProcedures.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Nenhum procedimento encontrado
              </h3>
              <p className="text-gray-600 mb-6">
                Tente ajustar os filtros ou criar um novo procedimento.
              </p>
              <button className="flex items-center space-x-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all duration-200 mx-auto">
                <Plus className="w-5 h-5" />
                <span>Novo Procedimento</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredProcedures.map((procedure) => (
                <div key={procedure.id} className="bg-gradient-to-r from-white to-gray-50/50 rounded-2xl p-6 border border-gray-200/50 hover:shadow-lg transition-all duration-300 hover:scale-[1.01]">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl flex items-center justify-center shadow-inner">
                        <span className="text-emerald-600 font-bold text-lg">
                          {procedure.patient.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-gray-900 mb-1">
                          {procedure.patient}
                        </h4>
                        <p className="text-gray-600 font-medium">
                          {procedure.procedure}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {getStatusBadge(procedure.status)}
                      <div className="text-right">
                        <p className="text-2xl font-bold text-emerald-600">
                          R$ {procedure.value.toLocaleString('pt-BR')}
                        </p>
                        <p className="text-sm text-gray-500">
                          {procedure.date} às {procedure.time}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center space-x-3 text-gray-600">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Stethoscope className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Tipo</p>
                        <p className="font-medium">{procedure.procedure_type}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 text-gray-600">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <Clock className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Duração</p>
                        <p className="font-medium">{procedure.duration}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 text-gray-600">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Hospital className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Hospital</p>
                        <p className="font-medium truncate">{procedure.hospital}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 text-gray-600">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                        <Users className="w-4 h-4 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Cirurgião</p>
                        <p className="font-medium truncate">{procedure.surgeon}</p>
                      </div>
                    </div>
                  </div>

                  {procedure.notes && (
                    <div className="border-t border-gray-200 pt-4">
                      <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                        <strong>Observações:</strong> {procedure.notes}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};