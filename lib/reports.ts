import { procedureService, Procedure } from './procedures'
import { shiftService, Shift } from './shifts'
import { formatCurrency, formatDate, formatDateTime } from './utils'
import { normalizeProcedureName, normalizeHospitalName, normalizeSurgeonName } from './normalization'
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

interface HospitalStat {
  hospital: string
  count: number
  totalValue: number
}

interface ProcedureTypeStat {
  type: string
  count: number
  totalValue: number
}

interface SurgeonStat {
  surgeon: string
  count: number
  totalValue: number
}

interface MonthlyStat {
  month: string // format 'YYYY-MM'
  count: number
  totalValue: number
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
  hospitalStats: HospitalStat[]
  procedureTypeStats: ProcedureTypeStat[]
  monthlyStats: MonthlyStat[]
  isFinancialHidden?: boolean
  groupName?: string
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

function computeAdvancedStats(procedures: Procedure[]): {
  hospitalStats: HospitalStat[]
  procedureTypeStats: ProcedureTypeStat[]
  surgeonStats: SurgeonStat[]
  monthlyStats: MonthlyStat[]
} {
  const hospitalMap = new Map<string, { count: number; totalValue: number }>()
  const typeMap = new Map<string, { count: number; totalValue: number }>()
  const surgeonMap = new Map<string, { count: number; totalValue: number }>()
  const monthMap = new Map<string, { count: number; totalValue: number }>()

  for (const p of procedures) {
    // Hospital
    const hospital = normalizeHospitalName(p.hospital_clinic || '')
    const hStat = hospitalMap.get(hospital) || { count: 0, totalValue: 0 }
    hStat.count += 1
    hStat.totalValue += p.procedure_value || 0
    hospitalMap.set(hospital, hStat)

    // Tipo de Procedimento
    const type = normalizeProcedureName(p.procedure_type || '')
    const tStat = typeMap.get(type) || { count: 0, totalValue: 0 }
    tStat.count += 1
    tStat.totalValue += p.procedure_value || 0
    typeMap.set(type, tStat)

    // Cirurgião
    const surgeon = normalizeSurgeonName(p.surgeon_name || p.nome_cirurgiao || '')
    const sStat = surgeonMap.get(surgeon) || { count: 0, totalValue: 0 }
    sStat.count += 1
    sStat.totalValue += p.procedure_value || 0
    surgeonMap.set(surgeon, sStat)

    // Mensal
    if (p.procedure_date) {
      const date = new Date(p.procedure_date)
      if (!isNaN(date.getTime())) {
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        const mStat = monthMap.get(monthKey) || { count: 0, totalValue: 0 }
        mStat.count += 1
        mStat.totalValue += p.procedure_value || 0
        monthMap.set(monthKey, mStat)
      }
    }
  }

  const hospitalStats: HospitalStat[] = Array.from(hospitalMap.entries())
    .map(([hospital, agg]) => ({ hospital, ...agg }))
    .sort((a, b) => b.count - a.count)

  const procedureTypeStats: ProcedureTypeStat[] = Array.from(typeMap.entries())
    .map(([type, agg]) => ({ type, ...agg }))
    .sort((a, b) => b.count - a.count)

  const surgeonStats: SurgeonStat[] = Array.from(surgeonMap.entries())
    .map(([surgeon, agg]) => ({ surgeon, ...agg }))
    .sort((a, b) => b.count - a.count)

  const monthlyStats: MonthlyStat[] = Array.from(monthMap.entries())
    .map(([month, agg]) => ({ month, ...agg }))
    .sort((a, b) => a.month.localeCompare(b.month))

  return { hospitalStats, procedureTypeStats, surgeonStats, monthlyStats }
}

export const reportService = {
  // Gerar dados do relatório
  async generateReportData(userId: string, startDate?: string, endDate?: string, groupId?: string): Promise<ReportData> {
    try {
      // 1. Verificar se é um relatório de grupo e as permissões financeiras
      let isFinancialHidden = false
      let groupName = undefined

      if (groupId) {
        const { data: groupData } = await supabase
          .from('groups')
          .select('name, share_financials, created_by')
          .eq('id', groupId)
          .single()
        
        if (groupData) {
          groupName = groupData.name
          
          // Se não compartilha financeiros, verificar se o usuário é o criador ou admin
          if (!groupData.share_financials) {
            const { data: membership } = await supabase
              .from('group_members')
              .select('role')
              .eq('group_id', groupId)
              .eq('user_id', userId)
              .single()
            
            const isAdmin = membership?.role === 'admin' || groupData.created_by === userId
            if (!isAdmin) {
              isFinancialHidden = true
            }
          }
        }
      }

      const [procedures, procedureStats, shifts, shiftStats, userResult] = await Promise.all([
        startDate && endDate 
          ? procedureService.getProceduresByDateRange(userId, startDate, endDate, groupId)
          : procedureService.getProcedures(userId),
        procedureService.getProcedureStats(userId, groupId),
        startDate && endDate && !groupId // Plantões ainda não estão vinculados a grupos
          ? shiftService.getShiftsWithValuesByPeriod(userId, startDate, endDate)
          : Promise.resolve([]),
        !groupId 
          ? shiftService.getShiftStats(userId)
          : Promise.resolve({ total: 0, completed: 0, pending: 0, cancelled: 0, sent: 0, totalValue: 0, completedValue: 0, pendingValue: 0 }),
        supabase
          .from('users')
          .select('name, gender')
          .eq('id', userId)
          .maybeSingle()
      ])

      // Se financeiro estiver escondido, zerar os valores para os cálculos de stats
      const processedProcedures = isFinancialHidden 
        ? procedures.map(p => ({ ...p, procedure_value: 0 }))
        : procedures

      const processedProcedureStats = isFinancialHidden
        ? { ...procedureStats, totalValue: 0, completedValue: 0, pendingValue: 0 }
        : procedureStats

      // Combinar estatísticas de procedimentos e plantões
      const combinedStats = {
        total: processedProcedureStats.total + shiftStats.total,
        completed: processedProcedureStats.completed + shiftStats.completed,
        pending: processedProcedureStats.pending + shiftStats.pending,
        cancelled: processedProcedureStats.cancelled + shiftStats.cancelled,
        totalValue: processedProcedureStats.totalValue + shiftStats.totalValue,
        completedValue: processedProcedureStats.completedValue + shiftStats.completedValue,
        pendingValue: processedProcedureStats.pendingValue + shiftStats.pendingValue
      }

      const feedbackStats = await computeFeedbackStats(processedProcedures)
      const { obstetricStats, convenioStats } = computeObstetricAndConvenioStats(processedProcedures)
      const { hospitalStats, procedureTypeStats, surgeonStats, monthlyStats } = computeAdvancedStats(processedProcedures)

      return {
        procedures: processedProcedures,
        shifts,
        stats: combinedStats,
        feedbackStats,
        obstetricStats,
        convenioStats,
        hospitalStats,
        procedureTypeStats,
        surgeonStats,
        monthlyStats,
        isFinancialHidden,
        groupName,
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
            body { font-family: Arial, sans-serif; margin: 0; padding: 24px; color: #0f172a; position: relative; }
            .ae-watermark {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-45deg);
              font-size: 80px;
              font-weight: 900;
              color: rgba(20, 184, 166, 0.05);
              z-index: -10;
              white-space: nowrap;
              pointer-events: none;
            }
            .ae-report { max-width: 1000px; margin: 0 auto; position: relative; z-index: 1; }
            .ae-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #14b8a6; padding-bottom: 12px; margin-bottom: 24px; }
            .ae-header-left { display: flex; align-items: center; gap: 12px; }
            .ae-logo-circle { width: 40px; height: 40px; border-radius: 999px; background: linear-gradient(135deg, #0f766e, #14b8a6); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 18px; }
            .ae-title { margin: 0; font-size: 20px; font-weight: 700; color: #0f172a; }
            .ae-subtitle { margin: 2px 0 0; font-size: 12px; color: #64748b; }
            .ae-header-right { text-align: right; font-size: 11px; color: #475569; }
            .ae-section-title { font-size: 13px; font-weight: 700; color: #0f172a; margin: 20px 0 10px; text-transform: uppercase; border-left: 3px solid #14b8a6; padding-left: 8px; }
            .ae-summary { margin-bottom: 15px; }
            .ae-summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
            .ae-summary-card { border-radius: 8px; border: 1px solid #e2e8f0; padding: 10px; background: #f8fafc; }
            .ae-summary-label { font-size: 10px; text-transform: uppercase; font-weight: 600; color: #64748b; }
            .ae-summary-value { display: block; margin-top: 4px; font-size: 16px; font-weight: 700; }
            .ae-summary-hint { display: block; margin-top: 2px; font-size: 9px; color: #94a3b8; }
            .ae-stat-container { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
            .ae-stat-row { display: flex; align-items: center; margin-bottom: 8px; font-size: 11px; }
            .ae-stat-label { flex: 1; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .ae-stat-bar-container { flex: 2; height: 8px; background: #f1f5f9; border-radius: 4px; margin: 0 10px; overflow: hidden; }
            .ae-stat-bar { height: 100%; background: #14b8a6; border-radius: 4px; }
            .ae-stat-bar.bg-teal-secondary { background: #0d9488; }
            .ae-stat-value { width: 100px; text-align: right; font-weight: 600; font-size: 10px; }
            .ae-table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 10px; }
            .ae-table th, .ae-table td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
            .ae-table th { background-color: #f1f5f9; font-weight: 600; color: #475569; }
            .ae-status { padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 700; text-transform: uppercase; }
            .ae-status-paid { background: #dcfce7; color: #166534; }
            .ae-status-pending { background: #fef9c3; color: #854d0e; }
            .ae-text-success { color: #059669; }
            .ae-footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #94a3b8; text-align: center; }
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
    const { procedures, period, feedbackStats, obstetricStats, convenioStats, hospitalStats, procedureTypeStats, surgeonStats, monthlyStats, isFinancialHidden, groupName } = reportData
    
    // Estatísticas calculadas apenas com os procedimentos do período
    const filteredStats = {
      total: procedures.length,
      completed: procedures.filter(p => p.payment_status === 'paid').length,
      pending: procedures.filter(p => p.payment_status === 'pending').length,
      cancelled: procedures.filter(p => p.payment_status === 'cancelled').length,
      totalValue: isFinancialHidden ? 0 : procedures.reduce((sum, p) => sum + (p.procedure_value || 0), 0),
      completedValue: isFinancialHidden ? 0 : procedures
        .filter(p => p.payment_status === 'paid')
        .reduce((sum, p) => sum + (p.procedure_value || 0), 0),
      pendingValue: isFinancialHidden ? 0 : procedures
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

    const hospitalSection = hospitalStats.map(h => `
      <div class="ae-stat-row">
        <div class="ae-stat-label">${h.hospital}</div>
        <div class="ae-stat-bar-container">
          <div class="ae-stat-bar" style="width: ${(h.count / filteredStats.total * 100) || 0}%"></div>
        </div>
        <div class="ae-stat-value">${h.count} ${isFinancialHidden ? '' : `(${formatCurrency(h.totalValue)})`}</div>
      </div>
    `).join('')

    const procedureTypeSection = procedureTypeStats.map(t => `
      <div class="ae-stat-row">
        <div class="ae-stat-label">${t.type}</div>
        <div class="ae-stat-bar-container">
          <div class="ae-stat-bar bg-teal-secondary" style="width: ${(t.count / filteredStats.total * 100) || 0}%"></div>
        </div>
        <div class="ae-stat-value">${t.count} ${isFinancialHidden ? '' : `(${formatCurrency(t.totalValue)})`}</div>
      </div>
    `).join('')

    const surgeonSection = surgeonStats.map(s => `
      <div class="ae-stat-row">
        <div class="ae-stat-label">${s.surgeon}</div>
        <div class="ae-stat-bar-container">
          <div class="ae-stat-bar" style="background: #0f766e; width: ${(s.count / filteredStats.total * 100) || 0}%"></div>
        </div>
        <div class="ae-stat-value">${s.count} ${isFinancialHidden ? '' : `(${formatCurrency(s.totalValue)})`}</div>
      </div>
    `).join('')

    const monthlyEvolutionSection = monthlyStats.map(m => `
      <tr>
        <td>${m.month}</td>
        <td>${m.count}</td>
        <td>${isFinancialHidden ? '---' : formatCurrency(m.totalValue)}</td>
        <td>${isFinancialHidden ? '---' : formatCurrency(m.count > 0 ? m.totalValue / m.count : 0)}</td>
      </tr>
    `).join('')

    const doctorTitle =
      reportData.doctorName
        ? `${reportData.doctorGender === 'F' ? 'Dra.' : 'Dr.'} ${reportData.doctorName}`
        : ''

    return `
      <div class="ae-watermark">ANESTEASY</div>
      <div class="ae-report">
        <header class="ae-header">
          <div class="ae-header-left">
            <div class="ae-logo-circle">
              <span class="ae-logo-text">AE</span>
            </div>
            <div>
              <h1 class="ae-title">AnestEasy</h1>
              <p class="ae-subtitle">Relatório Consolidado ${groupName ? `de ${groupName}` : 'de Desempenho Anestésico'}</p>
            </div>
          </div>
          <div class="ae-header-right">
            ${isFinancialHidden ? '<p style="color: #b45309; font-weight: bold; font-size: 10px;">[Privacidade Financeira Ativada]</p>' : ''}
            ${doctorTitle ? `<p><strong>Médico(a):</strong> ${doctorTitle}</p>` : ''}
            <p><strong>Período:</strong> ${formatDate(period.start)} a ${formatDate(period.end)}</p>
            <p><strong>Gerado em:</strong> ${formatDateTime(new Date())}</p>
          </div>
        </header>

        <section class="ae-summary">
          <h2 class="ae-section-title">1. Visão Geral Financeira</h2>
          <div class="ae-summary-grid">
            <div class="ae-summary-card">
              <span class="ae-summary-label">Procedimentos</span>
              <span class="ae-summary-value">${filteredStats.total}</span>
              <span class="ae-summary-hint">Volume total</span>
            </div>
            <div class="ae-summary-card">
              <span class="ae-summary-label">Receita Estimada</span>
              <span class="ae-summary-value">${isFinancialHidden ? '---' : formatCurrency(filteredStats.totalValue)}</span>
              <span class="ae-summary-hint">Base de cadastro</span>
            </div>
            <div class="ae-summary-card">
              <span class="ae-summary-label">Ticket Médio</span>
              <span class="ae-summary-value">${isFinancialHidden ? '---' : formatCurrency(ticketMedio)}</span>
              <span class="ae-summary-hint">Valor por caso</span>
            </div>
            <div class="ae-summary-card">
              <span class="ae-summary-label">Recebidos</span>
              <span class="ae-summary-value ae-text-success">${isFinancialHidden ? '---' : `${receiptRate}%`}</span>
              <span class="ae-summary-hint">${isFinancialHidden ? '---' : formatCurrency(filteredStats.completedValue)}</span>
            </div>
          </div>
        </section>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <section class="ae-summary">
            <h2 class="ae-section-title">2. Distribuição por Hospital</h2>
            <div class="ae-stat-container">
              ${hospitalSection || '<p class="ae-empty">Nenhum dado disponível</p>'}
            </div>
          </section>

          <section class="ae-summary">
            <h2 class="ae-section-title">3. Mix de Procedimentos</h2>
            <div class="ae-stat-container">
              ${procedureTypeSection || '<p class="ae-empty">Nenhum dado disponível</p>'}
            </div>
          </section>
        </div>

        <section class="ae-summary">
          <h2 class="ae-section-title">4. Distribuição por Cirurgião</h2>
          <div class="ae-stat-container">
            ${surgeonSection || '<p class="ae-empty">Nenhum dado disponível</p>'}
          </div>
        </section>

        <section class="ae-summary">
          <h2 class="ae-section-title">5. Evolução Mensal no Período</h2>
          <table class="ae-table">
            <thead>
              <tr>
                <th>Mês/Ano</th>
                <th>Volume</th>
                <th>Receita Total</th>
                <th>Ticket Médio</th>
              </tr>
            </thead>
            <tbody>
              ${monthlyEvolutionSection || '<tr><td colspan="4" class="ae-empty">Nenhum dado disponível</td></tr>'}
            </tbody>
          </table>
        </section>

        <section class="ae-summary">
          <h2 class="ae-section-title">6. Qualidade e Feedback</h2>
          <div class="ae-feedback-grid">
            <div class="ae-feedback-card">
              <span class="ae-feedback-label">Taxa de Resposta</span>
              <span class="ae-feedback-value">${feedbackStats.responseRate}%</span>
            </div>
            <div class="ae-feedback-card">
              <span class="ae-feedback-label">Complicações</span>
              <span class="ae-feedback-value">${feedbackStats.nauseaRate + feedbackStats.cefaleiaRate}%</span>
              <span class="ae-feedback-hint">Índice Geral</span>
            </div>
            <div class="ae-feedback-card">
              <span class="ae-feedback-label">Tempo Médio</span>
              <span class="ae-feedback-value">${avgGeralText}</span>
            </div>
          </div>
        </section>

        <section class="ae-table-section">
          <h2 class="ae-section-title">7. Detalhamento de Procedimentos</h2>
          <table class="ae-table">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Tipo</th>
                <th>Hospital</th>
                <th>Data</th>
                <th>Valor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${procedures.length > 0 ? procedures.map(procedure => `
                <tr>
                  <td>${procedure.patient_name || 'N/A'}</td>
                  <td>${procedure.procedure_type || 'N/A'}</td>
                  <td>${procedure.hospital_clinic || 'N/A'}</td>
                  <td>${formatDate(procedure.procedure_date)}</td>
                  <td>${isFinancialHidden ? '---' : formatCurrency(procedure.procedure_value || 0)}</td>
                  <td>
                    <span class="ae-status ae-status-${procedure.payment_status || 'pending'}">
                      ${procedure.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                    </span>
                  </td>
                </tr>
              `).join('') : '<tr><td colspan="6" class="ae-empty">Nenhum registro encontrado</td></tr>'}
            </tbody>
          </table>
        </section>

        <footer class="ae-footer">
          <p>Relatório gerado pelo <strong>AnestEasy</strong> — Inteligência em Gestão Anestésica.</p>
          <p class="ae-footer-muted">Documento para fins de gestão profissional. Confidencialidade garantida.</p>
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
