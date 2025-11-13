import { procedureService, Procedure } from './procedures'
import { formatCurrency, formatDate, formatDateTime } from './utils'

export interface ReportData {
  procedures: Procedure[]
  stats: {
    total: number
    completed: number
    pending: number
    cancelled: number
    totalValue: number
    completedValue: number
    pendingValue: number
  }
  period: {
    start: string
    end: string
  }
}

export const reportService = {
  // Gerar dados do relatório
  async generateReportData(userId: string, startDate?: string, endDate?: string): Promise<ReportData> {
    try {
      const [procedures, stats] = await Promise.all([
        startDate && endDate 
          ? procedureService.getProceduresByDateRange(userId, startDate, endDate)
          : procedureService.getProcedures(userId),
        procedureService.getProcedureStats(userId)
      ])

      return {
        procedures,
        stats,
        period: {
          start: startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
          end: endDate || new Date().toISOString().split('T')[0]
        }
      }
    } catch (error) {
      
      throw error
    }
  },

  // Exportar para CSV
  exportToCSV(reportData: ReportData): void {
    const headers = [
      'ID',
      'Paciente',
      'Idade',
      'Tipo de Procedimento',
      'Data',
      'Horário',
      'Valor',
      'Status',
      'Observações'
    ]

    const rows = reportData.procedures.map(procedure => [
      procedure.id,
      procedure.patient_name,
      procedure.patient_age,
      procedure.procedure_type,
      formatDate(procedure.procedure_date),
      procedure.procedure_time,
      formatCurrency(procedure.procedure_value),
      procedure.payment_status === 'paid' ? 'Concluído' : 
      procedure.payment_status === 'pending' ? 'Pendente' : 'Cancelado',
      procedure.notes || ''
    ])

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `relatorio_procedimentos_${reportData.period.start}_${reportData.period.end}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  },

  // Exportar para PDF (simulado - em produção usaria uma biblioteca como jsPDF)
  exportToPDF(reportData: ReportData): void {
    // Por enquanto, vamos simular a exportação para PDF
    // Em produção, você usaria uma biblioteca como jsPDF ou Puppeteer
    const reportContent = this.generateReportHTML(reportData)
    
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Relatório de Procedimentos</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .stats { display: flex; justify-content: space-around; margin-bottom: 30px; }
            .stat-item { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          ${reportContent}
        </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  },

  // Gerar HTML do relatório
  generateReportHTML(reportData: ReportData): string {
    const { procedures, stats, period } = reportData
    
    // Calcular estatísticas baseadas nos procedimentos filtrados (não nas stats gerais)
    const filteredStats = {
      total: procedures.length,
      completed: procedures.filter(p => p.payment_status === 'paid').length,
      pending: procedures.filter(p => p.payment_status === 'pending').length,
      cancelled: procedures.filter(p => p.payment_status === 'cancelled').length,
      totalValue: procedures.reduce((sum, p) => sum + (p.procedure_value || 0), 0),
      completedValue: procedures
        .filter(p => p.payment_status === 'paid')
        .reduce((sum, p) => sum + (p.procedure_value || 0), 0),
      pendingValue: procedures
        .filter(p => p.payment_status === 'pending')
        .reduce((sum, p) => sum + (p.procedure_value || 0), 0)
    }

    return `
      <div class="header">
        <h1>Relatório de Procedimentos</h1>
        <p>Período: ${formatDate(period.start)} a ${formatDate(period.end)}</p>
        <p>Gerado em: ${formatDateTime(new Date())}</p>
      </div>

      <div class="stats">
        <div class="stat-item">
          <h3>${filteredStats.total}</h3>
          <p>Total de Procedimentos</p>
        </div>
        <div class="stat-item">
          <h3>${filteredStats.completed}</h3>
          <p>Concluídos</p>
        </div>
        <div class="stat-item">
          <h3>${filteredStats.pending}</h3>
          <p>Pendentes</p>
        </div>
        <div class="stat-item">
          <h3>${formatCurrency(filteredStats.totalValue)}</h3>
          <p>Receita Total</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Paciente</th>
            <th>Procedimento</th>
            <th>Data</th>
            <th>Valor</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${procedures.length > 0 ? procedures.map(procedure => `
            <tr>
              <td>${procedure.patient_name || 'N/A'}</td>
              <td>${procedure.procedure_type || procedure.procedure_name || 'N/A'}</td>
              <td>${formatDate(procedure.procedure_date)}</td>
              <td>${formatCurrency(procedure.procedure_value || 0)}</td>
              <td>${procedure.payment_status === 'paid' ? 'Concluído' : 
                   procedure.payment_status === 'pending' ? 'Pendente' : 'Cancelado'}</td>
            </tr>
          `).join('') : `
            <tr>
              <td colspan="5" style="text-align: center; padding: 20px; color: #666;">
                Nenhum procedimento encontrado no período selecionado.
              </td>
            </tr>
          `}
        </tbody>
      </table>

      <div class="footer">
        <p>Relatório gerado pelo AnestEasy - Sistema de Gestão para Anestesiologistas</p>
      </div>
    `
  },

  // Gerar relatório mensal
  async generateMonthlyReport(userId: string, year: number, month: number): Promise<ReportData> {
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0]
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]
    
    return this.generateReportData(userId, startDate, endDate)
  },

  // Gerar relatório anual
  async generateYearlyReport(userId: string, year: number): Promise<ReportData> {
    const startDate = new Date(year, 0, 1).toISOString().split('T')[0]
    const endDate = new Date(year, 11, 31).toISOString().split('T')[0]
    
    return this.generateReportData(userId, startDate, endDate)
  }
}
