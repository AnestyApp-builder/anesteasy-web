import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const supabase = createAdminClient()
  const cookieStore = await cookies()
  const id = cookieStore.get('secretary_session_id')?.value

  if (!id) {
    return NextResponse.json({ error: 'Sessão inválida ou expirada' }, { status: 401 })
  }

  try {
    const { data: secretary, error: secError } = await supabase
      .from('secretarias')
      .select('id, nome, email, type, group_id, status, groups(name)')
      .eq('id', id)
      .eq('type', 'grupo')
      .single()

    if (secError || !secretary) {
      return NextResponse.json({ error: 'Sessão inválida ou expirada' }, { status: 401 })
    }

    if (secretary.status !== 'ativo') {
      return NextResponse.json({ error: 'Conta de secretária inativa' }, { status: 403 })
    }

    const { data: perms, error: permError } = await supabase
      .from('group_secretary_permissions')
      .select('module')
      .eq('secretary_id', id)

    if (permError) throw permError

    const modules = (perms || []).map(p => p.module)

    const session = {
      id: secretary.id,
      nome: secretary.nome,
      email: secretary.email,
      groupId: secretary.group_id,
      groupName: (secretary.groups as any)?.name || 'Grupo',
      type: secretary.type,
      permissions: modules
    }

    return NextResponse.json({ session })
  } catch (error: any) {
    console.error('Erro na validação de sessão da secretária:', error)
    return NextResponse.json({ error: error.message || 'Erro interno no servidor' }, { status: 500 })
  }
}
