import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { encrypt } from '@/lib/security'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient()
    const cookieStore = await cookies()
    const secretaryId = cookieStore.get('secretary_session_id')?.value

    if (!secretaryId) {
      return NextResponse.json({ error: 'Sessão inválida ou expirada' }, { status: 401 })
    }

    const { id, updates } = await req.json()

    if (!id || !updates) {
      return NextResponse.json({ error: 'id e updates são obrigatórios' }, { status: 400 })
    }

    // 1. Validar secretária e grupo do procedimento
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

    // Verificar permissão
    const { data: perm, error: permError } = await supabaseAdmin
      .from('group_secretary_permissions')
      .select('id')
      .eq('secretary_id', secretaryId)
      .eq('module', 'procedures')
      .maybeSingle()

    if (permError || !perm) {
      return NextResponse.json({ error: 'Sem permissão para alterar procedimentos' }, { status: 403 })
    }

    // 2. Verificar se o procedimento pertence ao mesmo grupo da secretária
    const { data: procedure, error: procError } = await supabaseAdmin
      .from('procedures')
      .select('group_id, user_id')
      .eq('id', id)
      .single()

    if (procError || !procedure) {
      return NextResponse.json({ error: 'Procedimento não encontrado' }, { status: 404 })
    }

    if (procedure.group_id !== secretary.group_id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // 3. Preparar updates e tratar campos vazios e criptografia
    const dbUpdates = { ...updates }
    for (const key of Object.keys(dbUpdates)) {
      if (dbUpdates[key] === '') {
        dbUpdates[key] = null
      }
    }

    if (dbUpdates.patient_name) {
      dbUpdates.patient_name = encrypt(dbUpdates.patient_name)
    }

    dbUpdates.updated_at = new Date().toISOString()
    dbUpdates.updated_by = 'secretary'

    // 4. Executar update
    const { data, error: updateError } = await supabaseAdmin
      .from('procedures')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    // 5. Criar notificação para o anestesista criador
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: procedure.user_id,
        title: `Procedimento Atualizado por Secretária`,
        message: `Um procedimento do grupo foi atualizado pela secretária.`,
        type: 'info',
        is_read: false
      })

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('[SECRETARY-PROCEDURE-UPDATE] Erro:', error)
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}
