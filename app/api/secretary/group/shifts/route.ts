import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient()
    const cookieStore = await cookies()
    const secretaryId = cookieStore.get('secretary_session_id')?.value
    const { searchParams } = new URL(req.url)
    const groupId = searchParams.get('groupId')

    if (!secretaryId) {
      return NextResponse.json({ error: 'Sessão inválida ou expirada' }, { status: 401 })
    }

    if (!groupId) {
      return NextResponse.json({ error: 'groupId é obrigatório' }, { status: 400 })
    }

    // 1. Validar secretária e grupo
    const { data: secretary, error: secError } = await supabaseAdmin
      .from('secretarias')
      .select('id, status, group_id')
      .eq('id', secretaryId)
      .eq('type', 'grupo')
      .single()

    if (secError || !secretary) {
      return NextResponse.json({ error: 'Secretária não encontrada' }, { status: 404 })
    }

    if (secretary.status !== 'ativo') {
      return NextResponse.json({ error: 'Conta inativa' }, { status: 403 })
    }

    if (secretary.group_id !== groupId) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Verificar permissão de agenda
    const { data: perm, error: permError } = await supabaseAdmin
      .from('group_secretary_permissions')
      .select('id')
      .eq('secretary_id', secretaryId)
      .eq('module', 'agenda')
      .maybeSingle()

    if (permError || !perm) {
      return NextResponse.json({ error: 'Sem permissão para acessar escalas' }, { status: 403 })
    }

    // 2. Buscar escalas (shifts)
    const { data: shifts, error: shiftsError } = await supabaseAdmin
      .from('shifts')
      .select(`
        *,
        assigned:assigned_user_id (name, email),
        backup:backup_user_id (name, email)
      `)
      .eq('group_id', groupId)
      .order('start_date', { ascending: true })

    if (shiftsError) throw shiftsError

    return NextResponse.json({ success: true, shifts })
  } catch (error: any) {
    console.error('[SECRETARY-GROUP-SHIFTS] Erro:', error)
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}
