import { supabase } from './supabase'
import { Database } from './supabase'

type Group = Database['public']['Tables']['groups']['Row']

export async function createGroup(data: {
  name: string
  description?: string
  color: string
  share_financials?: boolean
  type?: 'com_cotas' | 'sem_cotas'
  billing_type?: 'individual' | 'centralized'
  cnpj?: string | null
}, userId: string) {
  // Verificar se o usuário já é coordenador (admin) de algum grupo
  const { data: existingAdminRole } = await supabase
    .from('group_members')
    .select('id')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .limit(1);

  if (existingAdminRole && existingAdminRole.length > 0) {
    throw new Error('Você já é coordenador de um grupo. Só é permitido criar 1 grupo por conta.');
  }

  // Verificar assinatura paga ativa diretamente na tabela subscriptions
  const { data: userSeats } = await supabase
    .from('users')
    .select('available_standard_seats, available_coord_seats')
    .eq('id', userId)
    .single();

  const { data: activeSub } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (!activeSub) {
    throw new Error('Você precisa de uma assinatura paga ativa para criar um grupo.')
  }

  const standardSeats = userSeats?.available_standard_seats || 0;
  const coordSeats = userSeats?.available_coord_seats || 0;

  // O Supabase tem política RLS para criador
  const { data: groups, error } = await supabase
    .from('groups')
    .insert({
      ...data,
      created_by: userId,
      standard_seats_paid: standardSeats,
      coord_seats_paid: coordSeats
    })
    .select()

  if (error) throw error
  const group = groups ? groups[0] : null

  // Reset user available seats if they were transferred
  if (group && (standardSeats > 0 || coordSeats > 0)) {
    await supabase
      .from('users')
      .update({ available_standard_seats: 0, available_coord_seats: 0 })
      .eq('id', userId);
  }

  // Adicionar o criador como admin automaticamente
  if (group) {
    const { error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: userId,
        role: 'admin',
        status: 'active',
        joined_at: new Date().toISOString()
      })
    
    if (memberError) throw memberError
  }

  return group
}

export async function getUserGroups() {
  const { data, error } = await supabase
    .from('groups')
    .select(`
      *,
      group_members!inner (role, user_id)
    `)
    .is('deleted_at', null)
  
  if (error) throw error
  return data
}

export async function getGroupDetails(groupId: string) {
  const { data, error } = await supabase
    .from('groups')
    .select(`
      *,
      group_members (
        id,
        role,
        joined_at,
        status,
        quota_percent,
        quota_since,
        color,
        users:user_id (
          id,
          name,
          email,
          crm
        )
      )
    `)
    .eq('id', groupId)
    .is('deleted_at', null)
    .single()
  
  if (error) throw error
  return data
}

export async function updateGroup(groupId: string, data: Partial<Group>) {
  const { error } = await supabase
    .from('groups')
    .update(data)
    .eq('id', groupId)

  if (error) throw error
}

export async function addGroupMember(
  groupId: string,
  userEmailOrCrm: string,
  invitedBy: string,
  role: 'admin' | 'member' = 'member',
  quotaPercent?: number | null,
  quotaSince?: string | null
) {
  // Primeiro, achar o usuário
  const { data: users, error: searchError } = await supabase
    .from('users')
    .select('id')
    .or(`email.ilike.${userEmailOrCrm},crm.ilike.${userEmailOrCrm}`)
    .limit(1)

  if (searchError) throw searchError
  if (!users || users.length === 0) {
    throw new Error('Usuário não encontrado.')
  }

  const userId = users[0].id

  // Adicionar ao grupo
  const { error } = await supabase
    .from('group_members')
    .insert({
      group_id: groupId,
      user_id: userId,
      role: role,
      invited_by: invitedBy,
      status: 'pending', // Sempre começa como pendente
      quota_percent: quotaPercent ?? null,
      quota_since: quotaSince ?? null
    })

  if (error) {
    if (error.code === '23505') { // unique violation
      throw new Error('Usuário já é membro deste grupo.')
    }
    throw error
  }

  // Registrar no histórico de cotas do grupo se a cota foi especificada
  if (quotaPercent !== undefined && quotaPercent !== null) {
    const { error: histError } = await supabase
      .from('group_quota_history')
      .insert({
        group_id: groupId,
        user_id: userId,
        quota_percent: quotaPercent,
        valid_from: quotaSince || new Date().toISOString().split('T')[0],
        changed_by: invitedBy
      })
    if (histError) console.error('Erro ao registrar histórico de cota inicial:', histError)
  }
}

export async function removeGroupMember(groupId: string, userId: string) {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId)

  if (error) throw error
}

export async function getPendingInvites(userId: string) {
  const { data, error } = await supabase
    .from('group_members')
    .select(`
      id,
      role,
      status,
      groups (
        id,
        name,
        color
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'pending')
  
  if (error) throw error
  return data
}

export async function acceptInvite(memberId: string) {
  const { error } = await supabase
    .from('group_members')
    .update({ status: 'active', joined_at: new Date().toISOString() })
    .eq('id', memberId)
  
  if (error) throw error
}

export async function deleteGroup(groupId: string) {
  const { error } = await supabase
    .from('groups')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', groupId)
  
  if (error) throw error
}