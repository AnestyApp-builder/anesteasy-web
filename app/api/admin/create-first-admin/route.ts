import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zmtwwajyhusyrugobxur.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export async function POST(request: NextRequest) {
  try {
    if (!supabaseServiceKey) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY não configurada' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Credenciais do admin
    const adminEmail = 'admin@anesteasy.com'
    const adminPassword = '123456789'
    const adminName = 'Administrador do Sistema'

    console.log('🔐 Criando conta de administrador...')
    console.log(`📧 Email: ${adminEmail}`)

    // Verificar se já existe
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, email, role, is_system_admin')
      .eq('email', adminEmail)
      .maybeSingle()

    if (existingUser && existingUser.role === 'admin' && existingUser.is_system_admin) {
      return NextResponse.json({
        success: true,
        message: 'Conta admin já existe',
        email: adminEmail
      })
    }

    // Criar usuário no Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        name: adminName,
        role: 'admin',
        is_system_admin: true
      }
    })

    if (authError) {
      console.error('❌ Erro ao criar usuário no Auth:', authError)
      return NextResponse.json(
        { error: 'Erro ao criar usuário: ' + authError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Usuário não foi criado' },
        { status: 400 }
      )
    }

    console.log('✅ Usuário criado no Supabase Auth:', authData.user.id)

    // Criar/atualizar registro na tabela users
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: authData.user.id,
        email: adminEmail,
        name: adminName,
        role: 'admin',
        is_system_admin: true,
        created_by_admin: false,
        specialty: 'Administração',
        crm: '000000',
        password_hash: '',
        subscription_plan: 'admin',
        subscription_status: 'active'
      }, {
        onConflict: 'id'
      })
      .select()
      .single()

    if (userError) {
      console.error('❌ Erro ao criar registro na tabela users:', userError)
      return NextResponse.json(
        { 
          error: 'Usuário criado no Auth, mas erro na tabela users',
          details: userError.message 
        },
        { status: 500 }
      )
    }

    console.log('✅ Registro criado na tabela users')

    return NextResponse.json({
      success: true,
      message: 'Conta de administrador criada com sucesso!',
      email: adminEmail,
      userId: authData.user.id,
      nextSteps: [
        'Acesse: /super-admin-login-x872k20',
        `Faça login com: ${adminEmail}`,
        'ALTERE A SENHA IMEDIATAMENTE após o primeiro login!'
      ]
    })

  } catch (error: any) {
    console.error('❌ Erro ao criar conta admin:', error)
    return NextResponse.json(
      { error: 'Erro interno: ' + error.message },
      { status: 500 }
    )
  }
}

