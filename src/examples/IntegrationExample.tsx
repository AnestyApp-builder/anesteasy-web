import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProcedures } from '../hooks/useProcedures';
import { usePayments } from '../hooks/usePayments';
import { useReports } from '../hooks/useReports';
import type { ProcedureFormData, PaymentFormData } from '../types';

/**
 * Exemplo de como usar a integração completa do Supabase
 * Este componente demonstra todas as funcionalidades implementadas
 */
export const IntegrationExample: React.FC = () => {
  const { user, logout } = useAuth();
  const { 
    procedures, 
    stats: procedureStats, 
    loading: proceduresLoading,
    createProcedure,
    updateProcedure,
    deleteProcedure,
    markAsPaid
  } = useProcedures(user?.id || '');
  
  const { 
    payments, 
    stats: paymentStats, 
    loading: paymentsLoading,
    createPayment,
    updatePayment,
    deletePayment,
    markAsCompleted
  } = usePayments(user?.id || '');
  
  const { 
    reports, 
    loading: reportsLoading,
    generateMonthlyReport,
    saveReport,
    fetchRevenueChartData,
    fetchProcedureTypesChartData
  } = useReports(user?.id || '');

  const [newProcedure, setNewProcedure] = useState<ProcedureFormData>({
    procedure_name: '',
    procedure_type: '',
    procedure_date: new Date().toISOString().split('T')[0],
    procedure_value: 0,
    patient_name: '',
    patient_age: 0,
    patient_gender: 'F',
    payment_status: 'pending'
  });

  const [newPayment, setNewPayment] = useState<PaymentFormData>({
    amount: 0,
    payment_type: 'procedure',
    payment_method: 'pix',
    payment_status: 'pending'
  });

  // Exemplo: Criar um novo procedimento
  const handleCreateProcedure = async () => {
    if (!user?.id) return;

    const procedureData = {
      user_id: user.id,
      ...newProcedure
    };

    const result = await createProcedure(procedureData);
    if (result) {
      console.log('Procedimento criado:', result);
      // Limpar formulário
      setNewProcedure({
        procedure_name: '',
        procedure_type: '',
        procedure_date: new Date().toISOString().split('T')[0],
        procedure_value: 0,
        patient_name: '',
        patient_age: 0,
        patient_gender: 'F',
        payment_status: 'pending'
      });
    }
  };

  // Exemplo: Marcar procedimento como pago
  const handleMarkAsPaid = async (procedureId: string) => {
    if (!user?.id) return;

    const result = await markAsPaid(procedureId, {
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'pix'
    });

    if (result) {
      console.log('Procedimento marcado como pago:', result);
    }
  };

  // Exemplo: Criar um pagamento
  const handleCreatePayment = async () => {
    if (!user?.id) return;

    const paymentData = {
      user_id: user.id,
      ...newPayment
    };

    const result = await createPayment(paymentData);
    if (result) {
      console.log('Pagamento criado:', result);
      // Limpar formulário
      setNewPayment({
        amount: 0,
        payment_type: 'procedure',
        payment_method: 'pix',
        payment_status: 'pending'
      });
    }
  };

  // Exemplo: Gerar relatório mensal
  const handleGenerateReport = async () => {
    if (!user?.id) return;

    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const report = await generateMonthlyReport(currentMonth);
    
    if (report) {
      console.log('Relatório mensal:', report);
      
      // Salvar relatório no banco
      await saveReport({
        user_id: user.id,
        report_type: 'monthly',
        report_name: `Relatório Mensal - ${currentMonth}`,
        start_date: `${currentMonth}-01`,
        end_date: `${currentMonth}-31`,
        total_procedures: report.totalProcedures,
        total_revenue: report.totalRevenue,
        total_paid: report.paidRevenue,
        total_pending: report.pendingRevenue,
        average_procedure_value: report.averageProcedureValue,
        most_common_procedure: report.mostCommonProcedure,
        report_data: report
      });
    }
  };

  // Exemplo: Buscar dados para gráficos
  const handleFetchChartData = async () => {
    if (!user?.id) return;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6); // Últimos 6 meses
    const endDate = new Date();

    const [revenueData, procedureTypesData] = await Promise.all([
      fetchRevenueChartData(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]),
      fetchProcedureTypesChartData(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0])
    ]);

    console.log('Dados de receita:', revenueData);
    console.log('Dados de tipos de procedimentos:', procedureTypesData);
  };

  if (!user) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Usuário não autenticado
        </h2>
        <p className="text-gray-600">
          Faça login para ver os exemplos de integração
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Exemplo de Integração Supabase
        </h1>
        <p className="text-gray-600">
          Demonstração de todas as funcionalidades implementadas
        </p>
        <div className="mt-4">
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Estatísticas de Procedimentos</h3>
          {proceduresLoading ? (
            <p>Carregando...</p>
          ) : procedureStats ? (
            <div className="space-y-2">
              <p>Total: {procedureStats.total}</p>
              <p>Receita Total: R$ {procedureStats.totalValue.toFixed(2)}</p>
              <p>Pagos: R$ {procedureStats.paidValue.toFixed(2)}</p>
              <p>Pendentes: R$ {procedureStats.pendingValue.toFixed(2)}</p>
              <p>Valor Médio: R$ {procedureStats.averageValue.toFixed(2)}</p>
            </div>
          ) : (
            <p>Nenhuma estatística disponível</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Estatísticas de Pagamentos</h3>
          {paymentsLoading ? (
            <p>Carregando...</p>
          ) : paymentStats ? (
            <div className="space-y-2">
              <p>Total: {paymentStats.total}</p>
              <p>Valor Total: R$ {paymentStats.totalAmount.toFixed(2)}</p>
              <p>Concluídos: R$ {paymentStats.completedAmount.toFixed(2)}</p>
              <p>Pendentes: R$ {paymentStats.pendingAmount.toFixed(2)}</p>
              <p>Falharam: R$ {paymentStats.failedAmount.toFixed(2)}</p>
            </div>
          ) : (
            <p>Nenhuma estatística disponível</p>
          )}
        </div>
      </div>

      {/* Lista de Procedimentos */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h3 className="text-lg font-semibold mb-4">Procedimentos ({procedures.length})</h3>
        {proceduresLoading ? (
          <p>Carregando procedimentos...</p>
        ) : procedures.length > 0 ? (
          <div className="space-y-2">
            {procedures.slice(0, 5).map((procedure) => (
              <div key={procedure.id} className="flex justify-between items-center p-3 border rounded">
                <div>
                  <p className="font-medium">{procedure.procedure_name}</p>
                  <p className="text-sm text-gray-600">
                    {procedure.procedure_date} - R$ {procedure.procedure_value.toFixed(2)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    procedure.payment_status === 'paid' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {procedure.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                  </span>
                  {procedure.payment_status === 'pending' && (
                    <button
                      onClick={() => handleMarkAsPaid(procedure.id)}
                      className="px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                    >
                      Marcar como Pago
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>Nenhum procedimento encontrado</p>
        )}
      </div>

      {/* Formulário de Novo Procedimento */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h3 className="text-lg font-semibold mb-4">Criar Novo Procedimento</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome do Procedimento</label>
            <input
              type="text"
              value={newProcedure.procedure_name}
              onChange={(e) => setNewProcedure({...newProcedure, procedure_name: e.target.value})}
              className="w-full p-2 border rounded"
              placeholder="Ex: Anestesia Geral"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tipo</label>
            <input
              type="text"
              value={newProcedure.procedure_type}
              onChange={(e) => setNewProcedure({...newProcedure, procedure_type: e.target.value})}
              className="w-full p-2 border rounded"
              placeholder="Ex: Cirurgia Geral"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Data</label>
            <input
              type="date"
              value={newProcedure.procedure_date}
              onChange={(e) => setNewProcedure({...newProcedure, procedure_date: e.target.value})}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Valor (R$)</label>
            <input
              type="number"
              value={newProcedure.procedure_value}
              onChange={(e) => setNewProcedure({...newProcedure, procedure_value: Number(e.target.value)})}
              className="w-full p-2 border rounded"
              placeholder="0.00"
            />
          </div>
        </div>
        <button
          onClick={handleCreateProcedure}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Criar Procedimento
        </button>
      </div>

      {/* Ações de Exemplo */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Ações de Exemplo</h3>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={handleGenerateReport}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Gerar Relatório Mensal
          </button>
          <button
            onClick={handleFetchChartData}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Buscar Dados para Gráficos
          </button>
        </div>
      </div>
    </div>
  );
};
