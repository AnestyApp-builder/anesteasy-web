import { supabase } from './supabase'
import { despesaService } from './despesas'

export interface FechamentoMembro {
  user_id: string
  nome: string
  cota: number
  producaoBruta: number
  valorCotaGeral: number
  despesasVinculadas: number
  despesasGrupoProporcional: number
  liquidoReceber: number
}

export interface GroupFechamento {
  id?: string
  group_id: string
  competencia: string
  data_fechamento?: string
  total_faturamento: number
  total_despesas_grupo: number
  extrato_membros: FechamentoMembro[]
  status?: string
  created_at?: string
}

export const fechamentoService = {
  // Buscar o histórico de fechamentos de um grupo
  async getFechamentosByGroup(groupId: string): Promise<GroupFechamento[]> {
    const { data, error } = await supabase
      .from('group_fechamentos')
      .select('*')
      .eq('group_id', groupId)
      .order('data_fechamento', { ascending: false })
    
    if (error) {
      console.error('Erro ao buscar fechamentos:', error)
      return []
    }
    return data || []
  },

  // Gerar prévia do próximo fechamento (Procedimentos e Despesas sem fechamento_id)
  // Considerando apenas procedimentos marcados como 'paid' ou 'sent'? 
  // Na regra médica, normalmente fecha-se o que já foi "pago" (paid). Mas deixaremos configurável futuramente.
  // Por ora, vamos faturar procedimentos pendentes de fechamento que possuem valor.
  async previewFechamento(groupId: string, endDate: string, groupMembers: any[]): Promise<{
    faturamentoBruto: number,
    despesasGrupoTotal: number,
    liquidoDistribuivel: number,
    extratoMembros: FechamentoMembro[],
    proceduresIds: string[],
    despesasIds: string[]
  }> {
    // 1. Buscar Procedimentos sem fechamento_id até a data final
    const { data: procs, error: errProcs } = await supabase
      .from('procedures')
      .select('id, procedure_value, user_id, anesthesiologist_user_id')
      .eq('group_id', groupId)
      .is('fechamento_id', null)
      .lte('procedure_date', endDate)

    if (errProcs) throw errProcs
    const procedures = procs || []

    // 2. Buscar Despesas sem fechamento_id até a data final
    const { data: desps, error: errDesps } = await supabase
      .from('despesas')
      .select('id, valor, anesthesiologist_id')
      .eq('group_id', groupId)
      .is('fechamento_id', null)
      .lte('data_despesa', endDate)

    if (errDesps) throw errDesps
    const despesas = desps || []

    // Cálculos Gerais
    const faturamentoBruto = procedures.reduce((s, p) => s + (p.procedure_value || 0), 0)
    
    // Despesas dividem-se em "Comuns do Grupo" e "Individuais"
    const despesasGrupo = despesas.filter(d => !d.anesthesiologist_id)
    const despesasIndividuais = despesas.filter(d => !!d.anesthesiologist_id)
    
    const despesasGrupoTotal = despesasGrupo.reduce((s, d) => s + (d.valor || 0), 0)
    const liquidoDistribuivel = Math.max(0, faturamentoBruto - despesasGrupoTotal)

    // Extrato de Membros
    const totalCotistas = groupMembers.length
    const extratoMembros: FechamentoMembro[] = groupMembers.map(m => {
      const userId = m.user_id || m.users?.id || ''
      const userQuota = m.quota_percent || (totalCotistas > 0 ? (100 / totalCotistas) : 0)
      
      // Despesas vinculadas apenas a este membro
      const minhasDespesas = despesasIndividuais
        .filter(d => d.anesthesiologist_id === userId)
        .reduce((s, d) => s + (d.valor || 0), 0)

      // Se for grupo de cotas, o valor da cota é proporcional ao líquido distribuível do grupo
      const valorCotaGeral = (liquidoDistribuivel * userQuota) / 100
      
      // Produção Bruta Individual (se for grupo de Produção)
      const producaoBruta = procedures
        .filter(p => p.anesthesiologist_user_id === userId || p.user_id === userId)
        .reduce((s, p) => s + (p.procedure_value || 0), 0)

      // Líquido a Receber (usando Cota Geral como base, subtraindo apenas as despesas diretas do médico)
      // Nota: o bolo líquido (liquidoDistribuivel) já abateu as despesas do grupo, então o membro já está 
      // indiretamente pagando as despesas do grupo proporcionalmente à sua cota.
      const liquidoReceber = valorCotaGeral - minhasDespesas

      return {
        user_id: userId,
        nome: m.users?.name || 'Membro',
        cota: userQuota,
        producaoBruta,
        valorCotaGeral,
        despesasVinculadas: minhasDespesas,
        despesasGrupoProporcional: (despesasGrupoTotal * userQuota) / 100, // Apenas para exibição
        liquidoReceber
      }
    })

    return {
      faturamentoBruto,
      despesasGrupoTotal,
      liquidoDistribuivel,
      extratoMembros,
      proceduresIds: procedures.map(p => p.id),
      despesasIds: despesas.map(d => d.id)
    }
  },

  // Efetivar Fechamento
  async executeFechamento(
    groupId: string, 
    competencia: string, 
    previewData: Awaited<ReturnType<typeof fechamentoService.previewFechamento>>
  ): Promise<GroupFechamento | null> {
    
    // 1. Inserir Fechamento
    const { data: fechamento, error: errInsert } = await supabase
      .from('group_fechamentos')
      .insert({
        group_id: groupId,
        competencia,
        total_faturamento: previewData.faturamentoBruto,
        total_despesas_grupo: previewData.despesasGrupoTotal,
        extrato_membros: previewData.extratoMembros,
        status: 'closed'
      })
      .select()
      .single()

    if (errInsert || !fechamento) {
      console.error('Erro ao criar fechamento:', errInsert)
      return null
    }

    const fechamentoId = fechamento.id

    // 2. Atualizar Procedimentos
    if (previewData.proceduresIds.length > 0) {
      // Supabase não suporta update com IN array grande de forma simples via cliente RPC,
      // mas podemos fazer chunks ou se não for massivo (1000 limit), funciona.
      const chunk = previewData.proceduresIds
      const { error: errUpdateProcs } = await supabase
        .from('procedures')
        .update({ fechamento_id: fechamentoId })
        .in('id', chunk)
      
      if (errUpdateProcs) console.error('Erro ao atualizar procedures no fechamento:', errUpdateProcs)
    }

    // 3. Atualizar Despesas
    if (previewData.despesasIds.length > 0) {
      const { error: errUpdateDesps } = await supabase
        .from('despesas')
        .update({ fechamento_id: fechamentoId })
        .in('id', previewData.despesasIds)
        
      if (errUpdateDesps) console.error('Erro ao atualizar despesas no fechamento:', errUpdateDesps)
    }

    return fechamento
  }
}
