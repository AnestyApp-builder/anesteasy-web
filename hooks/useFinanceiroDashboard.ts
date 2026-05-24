'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { despesaService } from '@/lib/despesas'
import type { DadosFinanceirosGrupo } from '@/lib/exportarRelatorioContador'

const MESES_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function getMesNome(mesNum: number): string {
  return MESES_PT[mesNum] || 'N/A'
}

interface UseFinanceiroDashboardProps {
  groupId: string
  groupName: string
  groupMembers: Array<{
    users?: { id: string; name: string; crm?: string }
    quota_percent?: number
  }>
  currentUserId?: string
}

export function useFinanceiroDashboard({ groupId, groupName, groupMembers, currentUserId }: UseFinanceiroDashboardProps) {
  const [dados, setDados] = useState<DadosFinanceirosGrupo | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true)
      setErro(null)

      const anoAtual = new Date().getFullYear()
      const mesAtual = new Date().getMonth() // 0-based
      const mesAnterior = mesAtual === 0 ? 11 : mesAtual - 1
      const anoMesAnterior = mesAtual === 0 ? anoAtual - 1 : anoAtual

      // Buscar todos os procedimentos do grupo no ano
      const { data: procs, error } = await supabase
        .from('procedures')
        .select('*')
        .eq('group_id', groupId)
        .gte('procedure_date', `${anoAtual}-01-01`)
        .lte('procedure_date', `${anoAtual}-12-31`)
        .order('procedure_date', { ascending: true })

      if (error) throw error

      const procedures = procs || []

      // =============== CÁLCULOS ANUAIS ===============
      const faturamentoBruto = procedures.reduce((s, p) => s + (p.procedure_value || 0), 0)
      const aReceberAnual = procedures
        .filter(p => p.payment_status !== 'paid')
        .reduce((s, p) => s + (p.procedure_value || 0), 0)
      const procedimentosTotal = procedures.length
      const ticketMedio = procedimentosTotal > 0 ? Math.round(faturamentoBruto / procedimentosTotal) : 0

      // Faturamento mensal
      const faturamentoMensal = MESES_PT.map((mes, idx) => {
        const procsDoMes = procedures.filter(p => {
          const d = new Date(p.procedure_date + 'T00:00:00')
          return d.getMonth() === idx
        })
        return { mes, valor: procsDoMes.reduce((s, p) => s + (p.procedure_value || 0), 0) }
      })

      // Distribuição CNPJ vs CPF
      let totalCnpj = 0
      let totalCpf = 0
      for (const p of procedures) {
        if (p.billing_entity_type === 'cnpj_grupo') {
          totalCnpj += p.procedure_value || 0
        } else {
          totalCpf += p.procedure_value || 0
        }
      }

      // Buscar despesas do grupo no ano
      const despesas = await despesaService.getTotalByGroup(groupId, anoAtual)

      // Cotistas
      const totalCotistas = groupMembers.length
      const liquidoDistribuivel = faturamentoBruto - despesas
      const cotaIndividual = totalCotistas > 0 ? Math.round(liquidoDistribuivel / totalCotistas) : 0

      let minhaCotaPercentual = 0
      let minhaCotaAnual = 0

      const cotistas = groupMembers.map(m => {
        const userId = m.users?.id || ''
        const procsDoMembro = procedures.filter(p =>
          p.anesthesiologist_user_id === userId || p.user_id === userId
        )
        const recebidoCnpj = procsDoMembro
          .filter(p => p.billing_entity_type === 'cnpj_grupo')
          .reduce((s, p) => s + (p.procedure_value || 0), 0)
        const recebidoCpf = procsDoMembro
          .filter(p => p.billing_entity_type !== 'cnpj_grupo')
          .reduce((s, p) => s + (p.procedure_value || 0), 0)

        const userQuota = m.quota_percent || Math.round(100 / totalCotistas)
        
        if (currentUserId && userId === currentUserId) {
          minhaCotaPercentual = userQuota
          minhaCotaAnual = (liquidoDistribuivel * userQuota) / 100
        }

        return {
          nome: m.users?.name || 'Membro',
          crm: m.users?.crm || '',
          cota: userQuota,
          valorCota: (liquidoDistribuivel * userQuota) / 100,
          recebidoCnpj,
          recebidoCpf
        }
      })

      // =============== CÁLCULOS MENSAIS ===============
      const procsDoMesAtual = procedures.filter(p => {
        const d = new Date(p.procedure_date + 'T00:00:00')
        return d.getMonth() === mesAtual
      })

      const faturamentoMes = procsDoMesAtual.reduce((s, p) => s + (p.procedure_value || 0), 0)
      const aReceberMes = procsDoMesAtual
        .filter(p => p.payment_status !== 'paid')
        .reduce((s, p) => s + (p.procedure_value || 0), 0)

      // Mês anterior (pode ser do ano anterior, mas buscamos só do ano atual acima, então pode ser 0)
      let faturamentoMesAnterior = 0
      if (mesAnterior >= 0) {
        const procsMesAnterior = procedures.filter(p => {
          const d = new Date(p.procedure_date + 'T00:00:00')
          return d.getMonth() === mesAnterior && d.getFullYear() === anoMesAnterior
        })
        faturamentoMesAnterior = procsMesAnterior.reduce((s, p) => s + (p.procedure_value || 0), 0)
      }

      const variacaoPct = faturamentoMesAnterior > 0
        ? ((faturamentoMes - faturamentoMesAnterior) / faturamentoMesAnterior) * 100
        : 0

      const cotaDoMes = totalCotistas > 0 ? Math.round(faturamentoMes / totalCotistas) : 0
      const minhaCotaMensal = (faturamentoMes * minhaCotaPercentual) / 100

      // Últimos 6 meses
      const ultimos6Meses: { mes: string; valor: number }[] = []
      for (let i = 5; i >= 0; i--) {
        let m = mesAtual - i
        let y = anoAtual
        if (m < 0) { m += 12; y -= 1 }
        const procsM = procedures.filter(p => {
          const d = new Date(p.procedure_date + 'T00:00:00')
          return d.getMonth() === m && d.getFullYear() === y
        })
        ultimos6Meses.push({
          mes: getMesNome(m),
          valor: procsM.reduce((s, p) => s + (p.procedure_value || 0), 0)
        })
      }

      // Recebimentos por meio de pagamento
      const meioMap = new Map<string, number>()
      for (const p of procsDoMesAtual) {
        const meio = p.payment_method || p.forma_pagamento || 'Não informado'
        meioMap.set(meio, (meioMap.get(meio) || 0) + (p.procedure_value || 0))
      }
      const recebimentosPorMeio = Array.from(meioMap.entries())
        .map(([meio, valor]) => ({ meio, valor }))
        .sort((a, b) => b.valor - a.valor)

      const mesRef = `${MESES_PT[mesAtual]} ${anoAtual}`

      const result: DadosFinanceirosGrupo = {
        grupo: {
          id: groupId,
          nome: groupName,
          totalCotistas
        },
        anual: {
          ano: anoAtual,
          faturamentoBruto,
          despesas,
          liquidoDistribuivel,
          cotaIndividual,
          minhaCotaPercentual,
          minhaCotaAnual,
          procedimentos: procedimentosTotal,
          ticketMedio,
          glosado: 0,
          glosaRecuperada: 0,
          glosaEmAberto: 0,
          parcelamentosAVencer: 0,
          aReceber: aReceberAnual,
          faturamentoMensal,
          distribuicao: { cnpj: totalCnpj, cpf: totalCpf },
          cpfPorFonte: { fontePJ: totalCpf, fontePF: 0, irrfRetido: 0, inssRetido: 0 },
          cotistas
        },
        mensal: {
          mesReferencia: mesRef,
          faturamento: faturamentoMes,
          faturamentoMesAnterior,
          variacaoPct,
          cotaDoMes,
          minhaCotaMensal,
          procedimentos: procsDoMesAtual.length,
          ultimos6Meses,
          recebimentosPorMeio,
          glosado: 0,
          glosaEmAberto: 0,
          aReceber: aReceberMes
        }
      }

      setDados(result)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido'
      setErro(msg)
    } finally {
      setLoading(false)
    }
  }, [groupId, groupName, groupMembers])

  useEffect(() => {
    if (groupId) {
      carregarDados()
    }
  }, [groupId, carregarDados])

  return { dados, loading, erro, recarregar: carregarDados }
}
