import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const groupId = searchParams.get('groupId')
  if (!groupId) {
    return NextResponse.json({ error: 'groupId é obrigatório' }, { status: 400 })
  }

  // Verificar se o usuário pertence ao grupo
  const { data: member, error: memberError } = await supabase
    .from('group_members')
    .select('id, role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single()

  if (memberError || !member) {
    return NextResponse.json({ error: 'Você não tem acesso a este grupo' }, { status: 403 })
  }

  // Buscar todos os fechamentos do grupo
  const { data: closings, error: closingsError } = await supabase
    .from('group_monthly_closings')
    .select(`
      id,
      reference_month,
      status,
      total_revenue,
      created_at,
      validated_by,
      validated_at,
      reopen_reason
    `)
    .eq('group_id', groupId)
    .order('reference_month', { ascending: false })

  if (closingsError) {
    return NextResponse.json({ error: closingsError.message }, { status: 500 })
  }

  return NextResponse.json(closings)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const { groupId, referenceMonth, action, closingId, reason } = await request.json()

    if (action === 'reopen') {
      if (!closingId) {
        return NextResponse.json({ error: 'closingId é obrigatório para reabertura' }, { status: 400 })
      }
      
      // Buscar o fechamento para validar permissões do grupo
      const { data: closing, error: fetchError } = await supabase
        .from('group_monthly_closings')
        .select('group_id')
        .eq('id', closingId)
        .single()

      if (fetchError || !closing) {
        return NextResponse.json({ error: 'Fechamento não encontrado' }, { status: 404 })
      }

      // Validar se o usuário é admin
      const { data: member, error: memError } = await supabase
        .from('group_members')
        .select('role')
        .eq('group_id', closing.group_id)
        .eq('user_id', user.id)
        .single()

      if (memError || !member || member.role !== 'admin') {
        return NextResponse.json({ error: 'Apenas administradores podem reabrir o mês' }, { status: 403 })
      }

      // Reabrir: atualizar status e deletar distribuições
      const { error: reopenError } = await supabase
        .from('group_monthly_closings')
        .update({
          status: 'aberto',
          reopened_by: user.id,
          reopened_at: new Date().toISOString(),
          reopen_reason: reason || ''
        })
        .eq('id', closingId)

      if (reopenError) throw reopenError

      const { error: deleteDistError } = await supabase
        .from('group_distributions')
        .delete()
        .eq('closing_id', closingId)

      if (deleteDistError) throw deleteDistError

      return NextResponse.json({ success: true })
    }

    if (!groupId || !referenceMonth) {
      return NextResponse.json({ error: 'groupId e referenceMonth são obrigatórios' }, { status: 400 })
    }

    // Validar se o usuário pertence ao grupo
    const { data: member, error: memError } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    if (memError || !member) {
      return NextResponse.json({ error: 'Você não tem acesso a este grupo' }, { status: 403 })
    }

    // Buscar configurações do grupo
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('type, cnpj')
      .eq('id', groupId)
      .single()

    if (groupError || !group) {
      return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 })
    }

    // Calcular datas do mês
    // referenceMonth vem no formato YYYY-MM (ex: 2026-05)
    const startDate = `${referenceMonth}-01`
    const d = new Date(startDate)
    const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    const endDate = new Date(nextMonth.getTime() - 86400000).toISOString().split('T')[0]

    // Buscar procedimentos faturados no grupo e período
    const { data: procedures, error: procError } = await supabase
      .from('procedures')
      .select('id, procedure_value, billing_entity_type, anesthesiologist_user_id')
      .eq('group_id', groupId)
      .gte('procedure_date', startDate)
      .lte('procedure_date', endDate)

    if (procError) throw procError

    const totalRevenue = (procedures || []).reduce((acc, p) => acc + (Number(p.procedure_value) || 0), 0)

    // Buscar membros do grupo
    const { data: groupMembers, error: membersError } = await supabase
      .from('group_members')
      .select('user_id, quota_percent, users:user_id (name, email, crm)')
      .eq('group_id', groupId)

    if (membersError) throw membersError

    // Simulação ou fechamento de repasses
    const distributions = []

    if (group.type === 'com_cotas') {
      // Repasse por cotas
      const totalQuotas = (groupMembers || []).reduce((acc, m) => acc + (Number(m.quota_percent) || 0), 0)
      
      for (const m of (groupMembers || [])) {
        const quota = Number(m.quota_percent) || 0
        const share = totalQuotas > 0 ? (quota / 100) : 0
        const grossAmount = totalRevenue * share
        const netAmount = grossAmount // Sem impostos adicionais nesta fase simples
        
        distributions.push({
          user_id: m.user_id,
          quota_percent: quota,
          gross_amount: grossAmount,
          net_amount: netAmount,
          billing_entity_type: 'cnpj_grupo', // padrão para cotas do grupo
          user: m.users
        })
      }
    } else {
      // Repasse individual (sem cotas - cada um ganha o seu)
      for (const m of (groupMembers || [])) {
        const userProcedures = (procedures || []).filter(p => p.anesthesiologist_user_id === m.user_id)
        const grossAmount = userProcedures.reduce((acc, p) => acc + (Number(p.procedure_value) || 0), 0)
        const netAmount = grossAmount

        distributions.push({
          user_id: m.user_id,
          quota_percent: 0,
          gross_amount: grossAmount,
          net_amount: netAmount,
          billing_entity_type: 'cnpj_anestesista',
          user: m.users
        })
      }
    }

    if (action === 'simulate') {
      return NextResponse.json({
        totalRevenue,
        distributions
      })
    }

    if (action === 'close') {
      if (member.role !== 'admin') {
        return NextResponse.json({ error: 'Apenas administradores podem fechar o mês' }, { status: 403 })
      }

      // 1. Criar ou atualizar fechamento mensal
      const { data: closing, error: closeError } = await supabase
        .from('group_monthly_closings')
        .upsert({
          group_id: groupId,
          reference_month: startDate,
          status: 'fechado',
          total_revenue: totalRevenue,
          validated_by: user.id,
          validated_at: new Date().toISOString()
        }, {
          onConflict: 'group_id,reference_month'
        })
        .select()
        .single()

      if (closeError) throw closeError

      // 2. Criar distribuições financeiras
      const distInserts = distributions.map(d => ({
        closing_id: closing.id,
        group_id: groupId,
        user_id: d.user_id,
        quota_percent: d.quota_percent,
        gross_amount: d.gross_amount,
        net_amount: d.net_amount,
        billing_entity_type: d.billing_entity_type
      }))

      const { error: distInsertError } = await supabase
        .from('group_distributions')
        .insert(distInserts)

      if (distInsertError) throw distInsertError

      return NextResponse.json({ success: true, closingId: closing.id })
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })

  } catch (error: any) {
    console.error('Erro na API de Fechamento:', error)
    return NextResponse.json({ error: error.message || 'Erro interno no servidor' }, { status: 500 })
  }
}
