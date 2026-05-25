import { supabase } from './supabase'

export interface QuotaHistoryItem {
  id: string
  quota_percent: number
  valid_from: string
  valid_until: string | null
  created_at: string
}

export interface SecretaryPermission {
  module: 'procedures' | 'agenda' | 'financials' | 'secretaries'
}

export interface GroupSecretary {
  id: string
  nome: string
  email: string
  telefone: string
  status: string
  role: 'coord' | 'ajudante'
  created_at: string
}

// ==========================================
// 1. GESTÃO DE COTAS E HISTÓRICO
// ==========================================

export async function updateMemberQuota(
  groupId: string,
  memberId: string, // group_members.id
  userId: string,   // users.id of the member
  quotaPercent: number,
  quotaSince: string,
  changedByUserId: string,
  color?: string | null
) {
  // 1. Atualizar o registro do membro na tabela group_members
  const updates: any = {
    quota_percent: quotaPercent,
    quota_since: quotaSince
  }
  if (color !== undefined) {
    updates.color = color
  }

  const { error: memberError } = await supabase
    .from('group_members')
    .update(updates)
    .eq('id', memberId)

  if (memberError) throw memberError

  // 2. Finalizar o histórico anterior se existir
  const { data: previousHistory, error: prevError } = await supabase
    .from('group_quota_history')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .is('valid_until', null)
    .limit(1)

  if (prevError) throw prevError

  if (previousHistory && previousHistory.length > 0) {
    const { error: updateHistError } = await supabase
      .from('group_quota_history')
      .update({ valid_until: new Date().toISOString().split('T')[0] })
      .eq('id', previousHistory[0].id)

    if (updateHistError) throw updateHistError
  }

  // 3. Inserir novo registro no histórico
  const { error: histError } = await supabase
    .from('group_quota_history')
    .insert({
      group_id: groupId,
      user_id: userId,
      quota_percent: quotaPercent,
      valid_from: quotaSince,
      changed_by: changedByUserId
    })

  if (histError) throw histError
}

export async function getMemberQuotaHistory(groupId: string, userId: string): Promise<QuotaHistoryItem[]> {
  const { data, error } = await supabase
    .from('group_quota_history')
    .select('id, quota_percent, valid_from, valid_until, created_at')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .order('valid_from', { ascending: false })

  if (error) throw error
  return data || []
}

// ==========================================
// 2. SECRETÁRIAS DE GRUPO E PERMISSÕES
// ==========================================

export async function inviteGroupSecretary(groupId: string, email: string) {
  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7 dias de expiração

  const { error } = await supabase
    .from('secretaria_invites')
    .insert({
      group_id: groupId,
      email: email,
      token: token,
      expires_at: expiresAt.toISOString()
    })

  if (error) throw error

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
  return `${origin}/secretaria/registro/${token}`
}

export async function getGroupSecretaries(groupId: string): Promise<GroupSecretary[]> {
  const { data, error } = await supabase
    .from('secretarias')
    .select('id, nome, email, telefone, status, role, created_at')
    .eq('group_id', groupId)
    .eq('type', 'grupo')

  if (error) throw error
  return data || []
}

export async function getSecretaryPermissions(secretaryId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('group_secretary_permissions')
    .select('module')
    .eq('secretary_id', secretaryId)

  if (error) throw error
  return (data || []).map(p => p.module)
}

export async function updateSecretaryPermissions(
  secretaryId: string,
  modules: string[],
  grantedByUserId: string
) {
  // Deletar permissões atuais
  const { error: deleteError } = await supabase
    .from('group_secretary_permissions')
    .delete()
    .eq('secretary_id', secretaryId)

  if (deleteError) throw deleteError

  if (modules.length === 0) return

  // Inserir novas permissões
  const inserts = modules.map(mod => ({
    secretary_id: secretaryId,
    module: mod,
    granted_by: grantedByUserId
  }))

  const { error: insertError } = await supabase
    .from('group_secretary_permissions')
    .insert(inserts)

  if (insertError) throw insertError
}

export async function removeGroupSecretary(secretaryId: string) {
  const { error } = await supabase
    .from('secretarias')
    .delete()
    .eq('id', secretaryId)

  if (error) throw error
}

// ==========================================
// 3. FECHAMENTO FINANCEIRO DO GRUPO
// ==========================================

export async function getMonthlyClosings(groupId: string) {
  const { data, error } = await supabase
    .from('group_monthly_closings')
    .select(`
      id,
      reference_month,
      status,
      total_revenue,
      created_at,
      validated_by,
      validated_at
    `)
    .eq('group_id', groupId)
    .order('reference_month', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getClosingDetails(closingId: string) {
  const { data: closing, error: closingError } = await supabase
    .from('group_monthly_closings')
    .select('*')
    .eq('id', closingId)
    .single()

  if (closingError) throw closingError

  const { data: distributions, error: distError } = await supabase
    .from('group_distributions')
    .select(`
      id,
      quota_percent,
      gross_amount,
      net_amount,
      billing_entity_type,
      users:user_id (
        id,
        name,
        email,
        crm
      )
    `)
    .eq('closing_id', closingId)

  if (distError) throw distError

  return {
    closing,
    distributions: distributions || []
  }
}
