import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { decrypt } from '@/lib/security'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient()
    const cookieStore = await cookies()
    const secretaryId = cookieStore.get('secretary_session_id')?.value
    
    const { searchParams } = new URL(req.url)
    const groupId = searchParams.get('groupId')
    const offset = parseInt(searchParams.get('offset') || '0')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'
    const member = searchParams.get('member') || 'all'
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    if (!secretaryId) {
      return NextResponse.json({ error: 'Sessão inválida ou expirada' }, { status: 401 })
    }

    if (!groupId) {
      return NextResponse.json({ error: 'groupId é obrigatório' }, { status: 400 })
    }

    // 1. Validar secretária e permissões
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

    // Verificar permissão
    const { data: perm, error: permError } = await supabaseAdmin
      .from('group_secretary_permissions')
      .select('id')
      .eq('secretary_id', secretaryId)
      .in('module', ['procedures', 'patients'])
      .maybeSingle()

    if (permError || !perm) {
      return NextResponse.json({ error: 'Sem permissão para acessar os procedimentos' }, { status: 403 })
    }

    // 2. Query básica do banco
    let query = supabaseAdmin
      .from('procedures')
      .select('*')
      .eq('group_id', groupId)
      .order('procedure_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (status !== 'all') {
      query = query.eq('payment_status', status)
    }

    if (member !== 'all') {
      query = query.or(`anesthesiologist_user_id.eq.${member},user_id.eq.${member}`)
    }

    if (start) {
      query = query.gte('procedure_date', start)
    }

    if (end) {
      query = query.lte('procedure_date', end)
    }

    const { data: rawProcedures, error: procError } = await query

    if (procError) throw procError

    // 3. Descriptografar e filtrar em memória
    let filtered = (rawProcedures || []).map((proc: any) => ({
      ...proc,
      patient_name: decrypt(proc.patient_name || ''),
      patient_phone: decrypt(proc.patient_phone || ''),
      patient_email: decrypt(proc.patient_email || ''),
      patient_notes: decrypt(proc.patient_notes || ''),
      patient_companion: decrypt(proc.patient_companion || ''),
      patient_companion_phone: decrypt(proc.patient_companion_phone || '')
    }))

    if (search.trim() !== '') {
      const searchVal = search.trim().toLowerCase()
      filtered = filtered.filter((proc: any) => 
        (proc.patient_name && proc.patient_name.toLowerCase().includes(searchVal)) ||
        (proc.procedure_name && proc.procedure_name.toLowerCase().includes(searchVal)) ||
        (proc.procedure_type && proc.procedure_type.toLowerCase().includes(searchVal)) ||
        (proc.hospital_clinic && proc.hospital_clinic.toLowerCase().includes(searchVal))
      )
    }

    const totalCount = filtered.length
    const paginated = filtered.slice(offset, offset + limit)

    return NextResponse.json({ success: true, procedures: paginated, count: totalCount })
  } catch (error: any) {
    console.error('[SECRETARY-GROUP-PROCEDURES] Erro:', error)
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}
