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

    // 2. Buscar detalhes do grupo e membros
    const { data: group, error: groupError } = await supabaseAdmin
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

    if (groupError || !group) {
      return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ success: true, group })
  } catch (error: any) {
    console.error('[SECRETARY-GROUP-DETAILS] Erro:', error)
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}
