import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { decrypt } from '@/lib/security'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export async function GET(req: NextRequest) {
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const cookieStore = await cookies()
    const secretaryId = cookieStore.get('secretary_session_id')?.value

    if (!secretaryId) {
      return NextResponse.json({ error: 'Sessão inválida ou expirada' }, { status: 401 })
    }

    // 1. Buscar dados da secretária e do grupo
    const { data: secretary, error: secError } = await supabaseAdmin
      .from('secretarias')
      .select('id, nome, email, status, group_id, groups(id, name, cnpj, type)')
      .eq('id', secretaryId)
      .eq('type', 'grupo')
      .single()

    if (secError || !secretary) {
      return NextResponse.json({ error: 'Secretária não encontrada' }, { status: 404 })
    }

    if (secretary.status !== 'ativo') {
      return NextResponse.json({ error: 'Acesso bloqueado. Conta inativa.' }, { status: 403 })
    }

    const groupId = secretary.group_id
    if (!groupId) {
      return NextResponse.json({ error: 'Secretária não vinculada a nenhum grupo' }, { status: 400 })
    }

    // 2. Buscar permissões da secretária
    const { data: perms, error: permError } = await supabaseAdmin
      .from('group_secretary_permissions')
      .select('module')
      .eq('secretary_id', secretaryId)

    if (permError) throw permError
    const permissions = (perms || []).map(p => p.module)

    // 3. Buscar membros ativos do grupo
    const { data: membersData, error: membersError } = await supabaseAdmin
      .from('group_members')
      .select('user_id, status, quota_percent, users:user_id(id, name, email, crm, cpf, cnpj)')
      .eq('group_id', groupId)

    if (membersError) throw membersError
    const members = (membersData || [])
      .filter(m => m.status === 'active' && m.users)
      .map(m => ({
        id: (m.users as any).id,
        name: (m.users as any).name || 'Sem Nome',
        email: (m.users as any).email,
        crm: (m.users as any).crm,
        cpf: (m.users as any).cpf,
        cnpj: (m.users as any).cnpj,
        quota_percent: m.quota_percent
      }))

    // 4. Buscar procedimentos do grupo se tiver permissão
    let procedures: any[] = []
    if (permissions.includes('procedures') || permissions.includes('agenda') || permissions.includes('financials')) {
      const { data: procData, error: procError } = await supabaseAdmin
        .from('procedures')
        .select('*')
        .eq('group_id', groupId)
        .order('procedure_date', { ascending: false })

      if (procError) throw procError
      
      procedures = (procData || []).map(proc => ({
        ...proc,
        patient_name: decrypt(proc.patient_name || '')
      }))
    }

    // 5. Buscar fechamentos mensais se tiver permissão de faturamento/financeiro
    let closings: any[] = []
    if (permissions.includes('financials')) {
      const { data: closingData, error: closingError } = await supabaseAdmin
        .from('group_monthly_closings')
        .select('*')
        .eq('group_id', groupId)
        .order('year', { ascending: false })
        .order('month', { ascending: false })

      if (closingError) throw closingError
      closings = closingData || []
    }

    return NextResponse.json({
      success: true,
      secretary: {
        id: secretary.id,
        nome: secretary.nome,
        email: secretary.email,
        permissions
      },
      group: secretary.groups,
      members,
      procedures,
      closings
    })

  } catch (error: any) {
    console.error('[SECRETARY-DASHBOARD-DATA] Erro:', error)
    return NextResponse.json({ error: error.message || 'Erro interno no servidor' }, { status: 500 })
  }
}
