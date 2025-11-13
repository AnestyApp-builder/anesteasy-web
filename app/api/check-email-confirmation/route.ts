import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zmtwwajyhusyrugobxur.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { confirmed: false, message: 'Email é obrigatório' },
        { status: 400 }
      )
    }

    // Se não temos service role key, usar fallback (verificar apenas na tabela users)
    if (!supabaseServiceKey) {
      console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY não configurada, usando verificação limitada')
      
      // Criar cliente com anon key para verificar na tabela users
      const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey)
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('subscription_status')
        .eq('email', email)
        .maybeSingle()

      if (userError) {
        console.error('Erro ao buscar usuário:', userError)
        return NextResponse.json(
          { confirmed: false, message: 'Erro ao verificar confirmação' },
          { status: 500 }
        )
      }

      if (!userData) {
        return NextResponse.json({
          confirmed: false,
          message: 'Email pendente de confirmação'
        })
      }

      const isConfirmed = userData.subscription_status === 'active'
      
      return NextResponse.json({
        confirmed: isConfirmed,
        message: isConfirmed ? 'Email confirmado' : 'Email pendente de confirmação'
      })
    }

    // Usar Service Role Key para verificar diretamente no Supabase Auth (método mais confiável)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    try {
      // Primeiro, verificar na tabela users (mais rápido e direto)
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('subscription_status, id')
        .eq('email', email)
        .maybeSingle()

      // Se existe na tabela users e está ativo, está confirmado
      if (userData && userData.subscription_status === 'active') {
        return NextResponse.json({
          confirmed: true,
          message: 'Email confirmado'
        })
      }

      // Se não encontrou na tabela users, verificar no Supabase Auth
      // Buscar usuário pelo ID se temos, ou pelo email usando Admin API
      let authUser = null
      
      if (userData?.id) {
        // Se temos ID, buscar diretamente pelo ID (mais eficiente)
        const { data: userById, error: userByIdError } = await supabaseAdmin.auth.admin.getUserById(userData.id)
        if (!userByIdError && userById?.user) {
          authUser = userById.user
        }
      }
      
      // Se não encontrou pelo ID, buscar pelo email (menos eficiente, mas necessário)
      if (!authUser) {
        const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1000 // Limitar para performance
        })
        
        if (!authError && authUsers?.users) {
          authUser = authUsers.users.find(user => user.email === email)
        }
      }
      
      if (!authUser) {
        // Usuário não existe no Auth, não foi registrado ainda
        return NextResponse.json({
          confirmed: false,
          message: 'Email pendente de confirmação'
        })
      }

      // Verificar se o email foi confirmado no Supabase Auth
      const isEmailConfirmedInAuth = !!authUser.email_confirmed_at
      
      if (isEmailConfirmedInAuth) {
        // Email confirmado no Auth
        // Se não está na tabela users ainda, ainda consideramos como confirmado
        // (pode estar em processo de criação após confirmação)
        return NextResponse.json({
          confirmed: true,
          message: 'Email confirmado'
        })
      }
      
      // Email não foi confirmado no Auth ainda
      return NextResponse.json({
        confirmed: false,
        message: 'Email pendente de confirmação'
      })
      
    } catch (authError) {
      console.error('Erro ao verificar no Supabase Auth:', authError)
      // Fallback: verificar apenas na tabela users
      return await checkInUsersTable(email)
    }

  } catch (error) {
    console.error('Erro interno na verificação de email:', error)
    return NextResponse.json(
      { confirmed: false, message: 'Erro interno' },
      { status: 500 }
    )
  }
}

// Função auxiliar para verificar na tabela users (fallback)
async function checkInUsersTable(email: string) {
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zmtwwajyhusyrugobxur.supabase.co'
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey)
  
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('subscription_status')
    .eq('email', email)
    .maybeSingle()

  if (userError) {
    console.error('Erro ao buscar usuário na tabela:', userError)
    return NextResponse.json(
      { confirmed: false, message: 'Erro ao verificar confirmação' },
      { status: 500 }
    )
  }

  if (!userData) {
    return NextResponse.json({
      confirmed: false,
      message: 'Email pendente de confirmação'
    })
  }

  const isConfirmed = userData.subscription_status === 'active'
  
  return NextResponse.json({
    confirmed: isConfirmed,
    message: isConfirmed ? 'Email confirmado' : 'Email pendente de confirmação'
  })
}
