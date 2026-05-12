import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zmtwwajyhusyrugobxur.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export async function POST(request: NextRequest) {
  try {
    if (!supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Configuração do servidor inválida' },
        { status: 500 }
      )
    }

    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID é obrigatório' },
        { status: 400 }
      )
    }

    // Criar cliente Supabase Admin
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Verificar se o usuário é admin
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, role, is_system_admin')
      .eq('id', userId)
      .maybeSingle()

    console.log('📋 [ADMIN VERIFY] User ID:', userId)
    console.log('📋 [ADMIN VERIFY] User Data:', userData)
    console.log('📋 [ADMIN VERIFY] User Error:', userError)

    if (userError) {
      console.error('❌ [ADMIN VERIFY] Erro ao buscar usuário:', userError)
      return NextResponse.json(
        { isAdmin: false, error: `Erro ao buscar usuário: ${userError.message}` },
        { status: 500 }
      )
    }

    if (!userData) {
      console.error('❌ [ADMIN VERIFY] Usuário não encontrado')
      return NextResponse.json(
        { isAdmin: false, error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Verificar role e is_system_admin
    const isAdmin = userData.role === 'admin' && userData.is_system_admin === true
    
    console.log('📋 [ADMIN VERIFY] Role:', userData.role)
    console.log('📋 [ADMIN VERIFY] is_system_admin:', userData.is_system_admin)
    console.log('📋 [ADMIN VERIFY] isAdmin:', isAdmin)

    return NextResponse.json({
      isAdmin,
      user: isAdmin ? {
        id: userData.id,
        email: userData.email,
        role: userData.role
      } : null,
      debug: {
        role: userData.role,
        is_system_admin: userData.is_system_admin,
        expectedRole: 'admin',
        expectedIsSystemAdmin: true
      }
    })

  } catch (error: any) {
    console.error('❌ [ADMIN VERIFY] Erro interno:', error)
    return NextResponse.json(
      { isAdmin: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

