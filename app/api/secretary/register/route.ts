import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { hashPassword } from '@/lib/security'
import crypto from 'crypto'

export async function GET(request: Request) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Token é obrigatório' }, { status: 400 })
  }

  try {
    // Buscar o convite
    const { data: invite, error: inviteError } = await supabase
      .from('secretaria_invites')
      .select('id, email, expires_at, used_at, group_id, groups(name)')
      .eq('token', token)
      .single()

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Convite inválido' }, { status: 404 })
    }

    if (invite.used_at) {
      return NextResponse.json({ error: 'Este convite já foi utilizado' }, { status: 400 })
    }

    const isExpired = new Date(invite.expires_at) < new Date()
    if (isExpired) {
      return NextResponse.json({ error: 'Este convite expirou' }, { status: 400 })
    }

    return NextResponse.json({
      email: invite.email,
      groupName: (invite.groups as any)?.name || 'Grupo'
    })
  } catch (error: any) {
    console.error('Erro ao verificar convite de secretária:', error)
    return NextResponse.json({ error: error.message || 'Erro interno no servidor' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const supabase = createAdminClient()

  try {
    const { token, name, phone, password } = await request.json()

    if (!token || !name || !phone || !password) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 })
    }

    // 1. Buscar e validar convite
    const { data: invite, error: inviteError } = await supabase
      .from('secretaria_invites')
      .select('*')
      .eq('token', token)
      .single()

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Convite inválido' }, { status: 404 })
    }

    if (invite.used_at) {
      return NextResponse.json({ error: 'Este convite já foi utilizado' }, { status: 400 })
    }

    const isExpired = new Date(invite.expires_at) < new Date()
    if (isExpired) {
      return NextResponse.json({ error: 'Este convite expirou' }, { status: 400 })
    }

    // 2. Hash da senha
    const passwordHash = await hashPassword(password)

    // 3. Criar a secretária
    const { data: secretary, error: secError } = await supabase
      .from('secretarias')
      .insert({
        nome: name,
        email: invite.email,
        telefone: phone,
        password_hash: passwordHash,
        type: 'grupo',
        group_id: invite.group_id,
        role: invite.role,
        status: 'ativo'
      })
      .select()
      .single()

    if (secError) {
      console.error('Erro ao criar secretária:', secError)
      return NextResponse.json({ error: 'Erro ao cadastrar secretária' }, { status: 500 })
    }

    // 4. Marcar convite como utilizado
    await supabase
      .from('secretaria_invites')
      .update({ used_at: new Date().toISOString() })
      .eq('id', invite.id)

    // 5. Inserir permissões iniciais básicas (agenda e pacientes por padrão)
    await supabase
      .from('group_secretary_permissions')
      .insert([
        { secretary_id: secretary.id, module: 'agenda' },
        { secretary_id: secretary.id, module: 'pacientes' }
      ])

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erro no registro de secretária:', error)
    return NextResponse.json({ error: error.message || 'Erro interno no servidor' }, { status: 500 })
  }
}
