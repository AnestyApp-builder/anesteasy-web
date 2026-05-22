import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { verifyPassword } from '@/lib/security'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  const supabase = await createClient()

  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'E-mail e senha são obrigatórios' }, { status: 400 })
    }

    // Buscar a secretária pelo e-mail
    const { data: secretary, error: secError } = await supabase
      .from('secretarias')
      .select('id, nome, email, password_hash, type, group_id, status')
      .eq('email', email)
      .eq('type', 'grupo')
      .limit(1)
      .maybeSingle()

    if (secError || !secretary) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    if (secretary.status !== 'active') {
      return NextResponse.json({ error: 'Conta de secretária inativa ou pendente' }, { status: 403 })
    }

    // Verificar senha com scrypt
    const isPasswordCorrect = await verifyPassword(password, secretary.password_hash || '')
    if (!isPasswordCorrect) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    // Buscar permissões da secretária
    const { data: perms, error: permError } = await supabase
      .from('group_secretary_permissions')
      .select('module')
      .eq('secretary_id', secretary.id)

    if (permError) throw permError

    const modules = (perms || []).map(p => p.module)

    // Configurar cookie de sessão seguro HttpOnly
    const cookieStore = await cookies()
    cookieStore.set('secretary_session_id', secretary.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 dias
    })

    return NextResponse.json({
      success: true,
      session: {
        id: secretary.id,
        nome: secretary.nome,
        email: secretary.email,
        groupId: secretary.group_id,
        type: secretary.type,
        permissions: modules
      }
    })
  } catch (error: any) {
    console.error('Erro na autenticação de secretária:', error)
    return NextResponse.json({ error: error.message || 'Erro interno no servidor' }, { status: 500 })
  }
}

