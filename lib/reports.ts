import { procedureService, Procedure } from './procedures'
import { shiftService, Shift } from './shifts'
import { formatCurrency, formatDate, formatDateTime } from './utils'
import { supabase } from './supabase'

interface FeedbackStats {
  totalLinks: number
  totalResponses: number
  responseRate: number
  nauseaRate: number
  cefaleiaRate: number
  dorLombarRate: number
  anemiaTransfusaoRate: number
}

interface ObstetricStats {
  vaginalCount: number
  vaginalAvgDurationMinutes: number
  overallAvgDurationMinutes: number
}

interface ConvenioStat {
  convenio: string
  count: number
  percentage: number
  avgDurationMinutes: number
  avgDurationExcludingMinutes: number
}

export interface ReportData {
  procedures: Procedure[]
  shifts?: Shift[]
  doctorName?: string
  doctorGender?: string | null
  stats: {
    total: number
    completed: number
    pending: number
    cancelled: number
    totalValue: number
    completedValue: number
    pendingValue: number
  }
  feedbackStats: FeedbackStats
  obstetricStats: ObstetricStats
  convenioStats: ConvenioStat[]
  period: {
    start: string
    end: string
  }
}

async function computeFeedbackStats(procedures: Procedure[]): Promise<FeedbackStats> {
  if (!procedures.length) {
    return {
      totalLinks: 0,
      totalResponses: 0,
      responseRate: 0,
      nauseaRate: 0,
      cefaleiaRate: 0,
      dorLombarRate: 0,
      anemiaTransfusaoRate: 0
    }
  }

  const procedureIds = procedures.map(p => p.id)

  const { data, error } = await supabase
    .from('feedback_links')
    .select(`
      id,
      procedure_id,
      feedback_responses (
        nausea_vomito,
        cefaleia,
        dor_lombar,
        anemia_transfusao
      )
    `)
    .in('procedure_id', procedureIds)

  if (error || !data) {
    return {
      totalLinks: 0,
      totalResponses: 0,
      responseRate: 0,
      nauseaRate: 0,
      cefaleiaRate: 0,
      dorLombarRate: 0,
      anemiaTransfusaoRate: 0
    }
  }

  const links = data as any[]
  const totalLinks = links.length

  let totalResponses = 0
  let nauseaCount = 0
  let cefaleiaCount = 0
  let dorLombarCount = 0
  let anemiaTransfusaoCount = 0

  for (const link of links) {
    const response = Array.isArray(link.feedback_responses)
      ? link.feedback_responses[0]
      : link.feedback_responses

    if (response) {
      totalResponses++
      if (response.nausea_vomito) nauseaCount++
      if (response.cefaleia) cefaleiaCount++
      if (response.dor_lombar) dorLombarCount++
      if (response.anemia_transfusao) anemiaTransfusaoCount++
    }
  }

  const safeRate = (count: number, total: number) =>
    total > 0 ? Math.round((count / total) * 100) : 0

  return {
    totalLinks,
    totalResponses,
    responseRate: safeRate(totalResponses, totalLinks),
    nauseaRate: safeRate(nauseaCount, totalResponses),
    cefaleiaRate: safeRate(cefaleiaCount, totalResponses),
    dorLombarRate: safeRate(dorLombarCount, totalResponses),
    anemiaTransfusaoRate: safeRate(anemiaTransfusaoCount, totalResponses)
  }
}

function computeObstetricAndConvenioStats(procedures: Procedure[]): {
  obstetricStats: ObstetricStats
  convenioStats: ConvenioStat[]
} {
  // Tempo médio de partos vaginais
  const vaginalProcedures = procedures.filter(
    (p) => p.tipo_parto === 'Vaginal' && (p.duracao_minutos || 0) > 0
  )

  const vaginalCount = vaginalProcedures.length
  const totalVaginalDuration = vaginalProcedures.reduce(
    (sum, p) => sum + (p.duracao_minutos || 0),
    0
  )

  const vaginalAvgDurationMinutes =
    vaginalCount > 0 ? totalVaginalDuration / vaginalCount : 0

  // Distribuição por convênio + duração média
  const totalProcedures = procedures.length
  type ConvenioAgg = { count: number; totalDuration: number; durationCount: number }
  const convenioMap = new Map<string, ConvenioAgg>()
  let overallDurationTotal = 0
  let overallDurationCount = 0

  for (const p of procedures) {
    const raw = (p.convenio || '').trim()
    const convenio =
      raw.length > 0 ? raw : 'Particular / Não informado'

    const current = convenioMap.get(convenio) || {
      count: 0,
      totalDuration: 0,
      durationCount: 0
    }

    current.count += 1

    if (p.duracao_minutos && p.duracao_minutos > 0) {
      current.totalDuration += p.duracao_minutos
      current.durationCount += 1
      overallDurationTotal += p.duracao_minutos
      overallDurationCount += 1
    }

    convenioMap.set(convenio, current)
  }

  const overallAvgDurationMinutes =
    overallDurationCount > 0 ? overallDurationTotal / overallDurationCount : 0

  const convenioStats: ConvenioStat[] = Array.from(convenioMap.entries())
    .map(([convenio, agg]) => {
      const avgDurationMinutes =
        agg.durationCount > 0 ? agg.totalDuration / agg.durationCount : 0

      const otherDurationTotal = overallDurationTotal - agg.totalDuration
      const otherDurationCount = overallDurationCount - agg.durationCount
      const avgDurationExcludingMinutes =
        otherDurationCount > 0 ? otherDurationTotal / otherDurationCount : 0

      return {
        convenio,
        count: agg.count,
        percentage:
          totalProcedures > 0
            ? Math.round((agg.count / totalProcedures) * 100)
            : 0,
        avgDurationMinutes,
        avgDurationExcludingMinutes
      }
    })
    .sort((a, b) => b.count - a.count)

  return {
    obstetricStats: {
      vaginalCount,
      vaginalAvgDurationMinutes,
      overallAvgDurationMinutes
    },
    convenioStats
  }
}

export const reportService = {
  // Gerar dados do relatório
  async generateReportData(userId: string, startDate?: string, endDate?: string): Promise<ReportData> {
    try {
      const [procedures, procedureStats, shifts, shiftStats, userResult] = await Promise.all([
        startDate && endDate 
          ? procedureService.getProceduresByDateRange(userId, startDate, endDate)
          : procedureService.getProcedures(userId),
        procedureService.getProcedureStats(userId),
        startDate && endDate
          ? shiftService.getShiftsWithValuesByPeriod(userId, startDate, endDate)
          : shiftService.getShifts(userId),
        shiftService.getShiftStats(userId),
        supabase
          .from('users')
          .select('name, gender')
          .eq('id', userId)
          .maybeSingle()
      ])

      // Combinar estatísticas de procedimentos e plantões
      const combinedStats = {
        total: procedureStats.total + shiftStats.total,
        completed: procedureStats.completed + shiftStats.completed,
        pending: procedureStats.pending + shiftStats.pending,
        cancelled: procedureStats.cancelled + shiftStats.cancelled,
        totalValue: procedureStats.totalValue + shiftStats.totalValue,
        completedValue: procedureStats.completedValue + shiftStats.completedValue,
        pendingValue: procedureStats.pendingValue + shiftStats.pendingValue
      }

      const feedbackStats = await computeFeedbackStats(procedures)
      const { obstetricStats, convenioStats } = computeObstetricAndConvenioStats(procedures)

      return {
        procedures,
        shifts,
        stats: combinedStats,
        feedbackStats,
        obstetricStats,
        convenioStats,
        doctorName: userResult?.data?.name || undefined,
        doctorGender: (userResult?.data as any)?.gender ?? null,
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
      'Tipo',
      'ID',
      'Título/Paciente',
      'Data',
      'Horário',
      'Valor',
      'Status',
      'Observações'
    ]

    // Linhas de procedimentos
    const procedureRows = reportData.procedures.map(procedure => [
      'Procedimento',
      procedure.id,
      procedure.patient_name || '',
      formatDate(procedure.procedure_date),
      procedure.horario || '',
      formatCurrency(procedure.procedure_value || 0),
      procedure.payment_status === 'paid' ? 'Concluído' : 
      procedure.payment_status === 'pending' ? 'Pendente' : 'Cancelado',
      procedure.observacoes_procedimento || ''
    ])

    // Linhas de plantões
    const shiftRows = (reportData.shifts || []).map(shift => [
      'Plantão',
      shift.id,
      shift.title,
      formatDate(shift.start_date),
      `${formatDate(shift.start_date)} - ${formatDate(shift.end_date)}`,
      formatCurrency(shift.shift_value || 0),
      shift.payment_status === 'paid' ? 'Concluído' : 
      shift.payment_status === 'pending' ? 'Pendente' : 'Cancelado',
      shift.description || ''
    ])

    const rows = [...procedureRows, ...shiftRows]

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${String(field)}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `relatorio_anesteasy_${reportData.period.start}_${reportData.period.end}.csv`)
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
            body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }
            .ae-report { max-width: 1000px; margin: 0 auto; }
            .ae-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #14b8a6; padding-bottom: 12px; margin-bottom: 24px; }
            .ae-header-left { display: flex; align-items: center; gap: 12px; }
            .ae-logo-circle { width: 40px; height: 40px; border-radius: 999px; background: linear-gradient(135deg, #0f766e, #14b8a6); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 18px; }
            .ae-title { margin: 0; font-size: 20px; font-weight: 700; color: #0f172a; }
            .ae-subtitle { margin: 2px 0 0; font-size: 12px; color: #64748b; }
            .ae-header-right { text-align: right; font-size: 12px; color: #475569; }
            .ae-section-title { font-size: 14px; font-weight: 600; color: #0f172a; margin: 16px 0 8px; text-transform: uppercase; letter-spacing: 0.08em; }
            .ae-summary { margin-bottom: 12px; }
            .ae-summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
            .ae-summary-card { border-radius: 8px; border: 1px solid #e2e8f0; padding: 8px 10px; background: #f8fafc; }
            .ae-summary-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; }
            .ae-summary-value { display: block; margin-top: 4px; font-size: 16px; font-weight: 700; }
            .ae-summary-hint { display: block; margin-top: 2px; font-size: 11px; color: #94a3b8; }
            .ae-text-success { color: #16a34a; }
            .ae-text-warning { color: #ca8a04; }
            .ae-table-section { margin-top: 16px; }
            .ae-table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 11px; }
            .ae-table th, .ae-table td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; }
            .ae-table th { background-color: #f1f5f9; font-weight: 600; font-size: 11px; color: #475569; }
            .ae-table tbody tr:nth-child(even) { background-color: #f8fafc; }
            .ae-status { padding: 2px 6px; border-radius: 999px; font-size: 10px; font-weight: 600; }
            .ae-status-paid { background-color: #dcfce7; color: #166534; }
            .ae-status-pending { background-color: #fef9c3; color: #854d0e; }
            .ae-status-cancelled { background-color: #fee2e2; color: #991b1b; }
            .ae-empty { text-align: center; padding: 16px; color: #64748b; font-size: 12px; }
            .ae-footer { margin-top: 20px; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
            .ae-footer-muted { margin-top: 2px; }
            .ae-feedback-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
            .ae-feedback-card { border-radius: 8px; border: 1px solid #e2e8f0; padding: 8px 10px; background: #ffffff; }
            .ae-feedback-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; }
            .ae-feedback-value { display: block; margin-top: 4px; font-size: 16px; font-weight: 700; }
            .ae-feedback-hint { display: block; margin-top: 2px; font-size: 11px; color: #94a3b8; }
            .ae-feedback-comment { margin-top: 10px; font-size: 11px; color: #475569; line-height: 1.4; }
            .ae-convenio-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 8px; }
            .ae-convenio-card { border-radius: 8px; border: 1px solid #e2e8f0; padding: 6px 8px; background: #f8fafc; font-size: 11px; }
            .ae-convenio-name { font-weight: 600; color: #0f172a; display: block; margin-bottom: 2px; }
            .ae-convenio-meta { color: #64748b; }
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

  // Gerar HTML do relatório com template profissional e identidade AnestEasy
  generateReportHTML(reportData: ReportData): string {
    const { procedures, period, feedbackStats, obstetricStats, convenioStats } = reportData
    
    // Estatísticas calculadas apenas com os procedimentos do período
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

    const receiptRate = filteredStats.totalValue > 0
      ? Math.round((filteredStats.completedValue / filteredStats.totalValue) * 100)
      : 0

    const pendingRate = filteredStats.totalValue > 0
      ? Math.round((filteredStats.pendingValue / filteredStats.totalValue) * 100)
      : 0

    const ticketMedio = filteredStats.total > 0
      ? filteredStats.totalValue / filteredStats.total
      : 0

    const avgVaginalText =
      obstetricStats.vaginalCount > 0
        ? `${Math.round(obstetricStats.vaginalAvgDurationMinutes)} min`
        : 'Sem registros no período'

    const avgGeralText =
      obstetricStats.overallAvgDurationMinutes > 0
        ? `${Math.round(obstetricStats.overallAvgDurationMinutes)} min`
        : 'Sem registros no período'

    const convenioSection =
      convenioStats.length > 0
        ? convenioStats.map(c => {
            const avgLocal =
              c.avgDurationMinutes > 0
                ? `${Math.round(c.avgDurationMinutes)} min`
                : '—'
            const avgExcl =
              c.avgDurationExcludingMinutes > 0
                ? `${Math.round(c.avgDurationExcludingMinutes)} min`
                : '—'

            return `
              <div class="ae-convenio-card">
                <span class="ae-convenio-name">${c.convenio}</span>
                <span class="ae-convenio-meta">
                  ${c.count} procedimento(s) • ${c.percentage}% do total
                </span>
                <span class="ae-convenio-meta">
                  Duração média: ${avgLocal} • Duração média sem este convênio: ${avgExcl}
                </span>
              </div>
            `
          }).join('')
        : `
          <p class="ae-feedback-comment">
            Nenhum procedimento foi registrado no período selecionado, portanto não há distribuição por convênio a exibir.
          </p>
        `

    const doctorTitle =
      reportData.doctorName
        ? `${reportData.doctorGender === 'F' ? 'Dra.' : 'Dr.'} ${reportData.doctorName}`
        : ''

    return `
      <div class="ae-report">
        <header class="ae-header">
          <div class="ae-header-left">
            <div class="ae-logo-circle">
              <span class="ae-logo-text">AE</span>
            </div>
            <div>
              <h1 class="ae-title">AnestEasy</h1>
              <p class="ae-subtitle">Relatório de Procedimentos e Desempenho</p>
            </div>
          </div>
          <div class="ae-header-right">
            ${doctorTitle ? `<p><strong>Médico(a):</strong> ${doctorTitle}</p>` : ''}
            <p><strong>Período:</strong> ${formatDate(period.start)} a ${formatDate(period.end)}</p>
            <p><strong>Gerado em:</strong> ${formatDateTime(new Date())}</p>
          </div>
        </header>

        <section class="ae-summary">
          <h2 class="ae-section-title">1. Desempenho Financeiro</h2>
          <div class="ae-summary-grid">
            <div class="ae-summary-card">
              <span class="ae-summary-label">Procedimentos</span>
              <span class="ae-summary-value">${filteredStats.total}</span>
              <span class="ae-summary-hint">Total no período</span>
            </div>
            <div class="ae-summary-card">
              <span class="ae-summary-label">Concluídos</span>
              <span class="ae-summary-value ae-text-success">${filteredStats.completed}</span>
              <span class="ae-summary-hint">Pagos</span>
            </div>
            <div class="ae-summary-card">
              <span class="ae-summary-label">Pendentes</span>
              <span class="ae-summary-value ae-text-warning">${filteredStats.pending}</span>
              <span class="ae-summary-hint">A receber</span>
            </div>
            <div class="ae-summary-card">
              <span class="ae-summary-label">Receita Total</span>
              <span class="ae-summary-value">${formatCurrency(filteredStats.totalValue)}</span>
              <span class="ae-summary-hint">Com base nos procedimentos cadastrados</span>
            </div>
            <div class="ae-summary-card">
              <span class="ae-summary-label">Taxa de Recebimento</span>
              <span class="ae-summary-value ae-text-success">${receiptRate}%</span>
              <span class="ae-summary-hint">Receita já recebida sobre o total</span>
            </div>
            <div class="ae-summary-card">
              <span class="ae-summary-label">Pendência Financeira</span>
              <span class="ae-summary-value ae-text-warning">${pendingRate}%</span>
              <span class="ae-summary-hint">Valor ainda não recebido</span>
            </div>
            <div class="ae-summary-card">
              <span class="ae-summary-label">Ticket Médio</span>
              <span class="ae-summary-value">${formatCurrency(ticketMedio)}</span>
              <span class="ae-summary-hint">Valor médio por procedimento</span>
            </div>
            <div class="ae-summary-card">
              <span class="ae-summary-label">
                Tempo médio — todos os procedimentos
              </span>
              <span class="ae-summary-value">${avgGeralText}</span>
            </div>
            <div class="ae-summary-card">
              <span class="ae-summary-label">
                Tempo médio — partos vaginais
              </span>
              <span class="ae-summary-value">${avgVaginalText}</span>
            </div>
          </div>
        </section>

        <section class="ae-summary">
          <h2 class="ae-section-title">2. Feedback e Qualidade Profissional</h2>
          <div class="ae-feedback-grid">
            <div class="ae-feedback-card">
              <span class="ae-feedback-label">Feedbacks Enviados</span>
              <span class="ae-feedback-value">${feedbackStats.totalLinks}</span>
              <span class="ae-feedback-hint">Convites de feedback enviados aos cirurgiões</span>
            </div>
            <div class="ae-feedback-card">
              <span class="ae-feedback-label">Taxa de Resposta</span>
              <span class="ae-feedback-value">${feedbackStats.responseRate}%</span>
              <span class="ae-feedback-hint">Feedbacks respondidos no período</span>
            </div>
            <div class="ae-feedback-card">
              <span class="ae-feedback-label">Náusea/Vômito</span>
              <span class="ae-feedback-value">${feedbackStats.nauseaRate}%</span>
              <span class="ae-feedback-hint">Procedimentos com náusea/vômito reportados</span>
            </div>
            <div class="ae-feedback-card">
              <span class="ae-feedback-label">Cefaleia</span>
              <span class="ae-feedback-value">${feedbackStats.cefaleiaRate}%</span>
              <span class="ae-feedback-hint">Procedimentos com cefaleia reportada</span>
            </div>
            <div class="ae-feedback-card">
              <span class="ae-feedback-label">Dor Lombar</span>
              <span class="ae-feedback-value">${feedbackStats.dorLombarRate}%</span>
              <span class="ae-feedback-hint">Procedimentos com dor lombar reportada</span>
            </div>
            <div class="ae-feedback-card">
              <span class="ae-feedback-label">Anemia/Transfusão</span>
              <span class="ae-feedback-value">${feedbackStats.anemiaTransfusaoRate}%</span>
              <span class="ae-feedback-hint">Casos com necessidade de transfusão</span>
            </div>
          </div>
          <p class="ae-feedback-comment">
            Este bloco resume, a partir dos feedbacks dos cirurgiões, como foi a qualidade assistencial no período. 
            Taxas mais baixas de intercorrências e uma boa taxa de resposta indicam um padrão consistente de segurança 
            e comunicação, reforçando a percepção de qualidade do trabalho anestésico.
          </p>
        </section>

        <section class="ae-summary">
          <h2 class="ae-section-title">3. Distribuição por Convênio</h2>
          <div class="ae-convenio-grid">
            ${convenioSection}
          </div>
        </section>

        <section class="ae-table-section">
          <h2 class="ae-section-title">Procedimentos Detalhados</h2>
          <table class="ae-table">
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
                  <td>
                    ${
                      procedure.payment_status === 'paid'
                        ? '<span class="ae-status ae-status-paid">Concluído</span>'
                        : procedure.payment_status === 'pending'
                        ? '<span class="ae-status ae-status-pending">Pendente</span>'
                        : procedure.payment_status === 'cancelled'
                        ? '<span class="ae-status ae-status-cancelled">Cancelado</span>'
                        : '<span class="ae-status">—</span>'
                    }
                  </td>
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="5" class="ae-empty">
                    Nenhum procedimento encontrado no período selecionado.
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </section>

        <footer class="ae-footer">
          <p>Relatório gerado pelo <strong>AnestEasy</strong> — Sistema de Gestão para Anestesiologistas.</p>
          <p class="ae-footer-muted">Uso exclusivo profissional. As informações contidas neste documento são confidenciais.</p>
        </footer>
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
