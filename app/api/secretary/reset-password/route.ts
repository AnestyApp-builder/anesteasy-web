import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { hashPassword } from '@/lib/security'

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'A senha deve ter no mínimo 8 caracteres' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: secretary } = await supabase
      .from('secretarias')
      .select('id, password_reset_expires_at')
      .eq('password_reset_token', token)
      .maybeSingle()

    if (!secretary) {
      return NextResponse.json({ error: 'Link inválido ou já utilizado' }, { status: 400 })
    }

    if (!secretary.password_reset_expires_at || new Date(secretary.password_reset_expires_at) < new Date()) {
      return NextResponse.json({ error: 'Este link expirou. Solicite um novo.' }, { status: 400 })
    }

    const passwordHash = await hashPassword(password)

    await supabase
      .from('secretarias')
      .update({
        password_hash: passwordHash,
        password_reset_token: null,
        password_reset_expires_at: null,
      })
      .eq('id', secretary.id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erro ao redefinir senha de secretária:', error)
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
  }
}
