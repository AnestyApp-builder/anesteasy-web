import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { confirmed: false, message: 'Email é obrigatório' },
        { status: 400 }
      )
    }

    

    // Buscar usuário na tabela users pelo email
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('subscription_status')
      .eq('email', email)
      .maybeSingle()

    if (userError) {
      
      return NextResponse.json(
        { confirmed: false, message: 'Erro ao verificar confirmação' },
        { status: 500 }
      )
    }

    if (!userData) {
      
      return NextResponse.json(
        { confirmed: false, message: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    const isConfirmed = userData.subscription_status === 'active'
    

    return NextResponse.json({
      confirmed: isConfirmed,
      message: isConfirmed ? 'Email confirmado' : 'Email pendente de confirmação'
    })

  } catch (error) {
    
    return NextResponse.json(
      { confirmed: false, message: 'Erro interno' },
      { status: 500 }
    )
  }
}
