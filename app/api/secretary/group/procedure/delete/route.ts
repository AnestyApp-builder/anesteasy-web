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

    const { id } = await req.json()

    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 })
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

    // Verificar permissão
    const { data: perm, error: permError } = await supabaseAdmin
      .from('group_secretary_permissions')
      .select('id')
      .eq('secretary_id', secretaryId)
      .eq('module', 'procedures')
      .maybeSingle()

    if (permError || !perm) {
      return NextResponse.json({ error: 'Sem permissão para remover procedimentos' }, { status: 403 })
    }

    // 2. Verificar grupo do procedimento
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

    // 3. Deletar procedimento
    const { error: deleteError } = await supabaseAdmin
      .from('procedures')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    // 4. Criar notificação para o anestesista
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: procedure.user_id,
        title: `Procedimento Removido por Secretária`,
        message: `Um procedimento do grupo foi excluído pela secretária.`,
        type: 'warning',
        is_read: false
      })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[SECRETARY-PROCEDURE-DELETE] Erro:', error)
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}
