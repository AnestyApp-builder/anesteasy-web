import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const cookieStore = await cookies()
    const secretaryId = cookieStore.get('secretary_session_id')?.value

    if (!secretaryId) {
      return NextResponse.json({ error: 'Sessão inválida ou expirada' }, { status: 401 })
    }

    const body = await req.json()
    const { procedureId, updates } = body

    if (!procedureId || !updates) {
      return NextResponse.json({ error: 'procedureId e updates são obrigatórios' }, { status: 400 })
    }

    // 1. Buscar dados da secretária para verificar se está ativa e obter group_id
    const { data: secretary, error: secError } = await supabaseAdmin
      .from('secretarias')
      .select('id, status, group_id')
      .eq('id', secretaryId)
      .eq('type', 'grupo')
      .single()

    if (secError || !secretary) {
      return NextResponse.json({ error: 'Secretária não encontrada' }, { status: 404 })
    }

    if (secretary.status !== 'active') {
      return NextResponse.json({ error: 'Conta inativa' }, { status: 403 })
    }

    const groupId = secretary.group_id
    if (!groupId) {
      return NextResponse.json({ error: 'Secretária não vinculada a um grupo' }, { status: 400 })
    }

    // 2. Verificar permissões da secretária
    const { data: perms, error: permError } = await supabaseAdmin
      .from('group_secretary_permissions')
      .select('module')
      .eq('secretary_id', secretaryId)
      .eq('module', 'procedures')
      .single()

    if (permError || !perms) {
      return NextResponse.json({ error: 'Sem permissão para alterar procedimentos' }, { status: 403 })
    }

    // 3. Verificar se o procedimento pertence ao mesmo grupo
    const { data: procedure, error: procError } = await supabaseAdmin
      .from('procedures')
      .select('id, group_id, patient_name, user_id')
      .eq('id', procedureId)
      .single()

    if (procError || !procedure) {
      return NextResponse.json({ error: 'Procedimento não encontrado' }, { status: 404 })
    }

    if (procedure.group_id !== groupId) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // 4. Filtrar campos que a secretária pode alterar
    const dbUpdates: any = {}
    if (updates.payment_status !== undefined) dbUpdates.payment_status = updates.payment_status
    if (updates.payment_date !== undefined) dbUpdates.payment_date = updates.payment_date === '' ? null : updates.payment_date
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes
    if (updates.procedure_value !== undefined) dbUpdates.procedure_value = parseFloat(updates.procedure_value) || 0
    if (updates.anesthesiologist_user_id !== undefined) dbUpdates.anesthesiologist_user_id = updates.anesthesiologist_user_id || null
    if (updates.billing_entity_type !== undefined) dbUpdates.billing_entity_type = updates.billing_entity_type || null

    dbUpdates.updated_at = new Date().toISOString()
    dbUpdates.updated_by = 'secretary'

    // 5. Atualizar no banco
    const { data: updatedProc, error: updateError } = await supabaseAdmin
      .from('procedures')
      .update(dbUpdates)
      .eq('id', procedureId)
      .select()
      .single()

    if (updateError) throw updateError

    // 6. Criar notificação para o anestesista
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: procedure.user_id,
        title: `Procedimento Atualizado por Secretária`,
        message: `Um procedimento do grupo foi atualizado pela secretária.`,
        type: 'info',
        is_read: false
      })

    return NextResponse.json({ success: true, data: updatedProc })

  } catch (error: any) {
    console.error('[SECRETARY-PROCEDURE-UPDATE] Erro:', error)
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}
