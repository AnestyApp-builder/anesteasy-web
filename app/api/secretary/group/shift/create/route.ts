import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient()
    const cookieStore = await cookies()
    const secretaryId = cookieStore.get('secretary_session_id')?.value

    if (!secretaryId) {
      return NextResponse.json({ error: 'Sessão inválida ou expirada' }, { status: 401 })
    }

    const { 
      groupId,
      title, 
      start_date, 
      end_date, 
      shift_type, 
      hospital_name, 
      assigned_user_id, 
      backup_user_id, 
      shift_value, 
      professional_role 
    } = await req.json()

    if (!groupId || !title || !start_date || !end_date) {
      return NextResponse.json({ error: 'Dados incompletos: groupId, title, start_date e end_date são obrigatórios' }, { status: 400 })
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
      return NextResponse.json({ error: 'Sem permissão para gerenciar escalas' }, { status: 403 })
    }

    // 2. Criar escala (shift)
    const { data: newShift, error: shiftError } = await supabaseAdmin
      .from('shifts')
      .insert({
        group_id: groupId,
        title,
        start_date,
        end_date,
        shift_type,
        hospital_name: hospital_name || null,
        assigned_user_id: assigned_user_id || null,
        backup_user_id: backup_user_id || null,
        shift_value: shift_value ? parseFloat(shift_value) : null,
        professional_role: professional_role || 'principal'
      })
      .select()
      .single()

    if (shiftError) throw shiftError

    return NextResponse.json({ success: true, data: newShift })
  } catch (error: any) {
    console.error('[SECRETARY-SHIFT-CREATE] Erro:', error)
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}
