import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email é obrigatório' },
        { status: 400 }
      )
    }

    

    // Reenviar email de confirmação
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: 'http://localhost:3000/auth/confirm?next=/login&type=signup'
      }
    })

    if (error) {
      
      
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { success: false, message: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' },
          { status: 429 }
        )
      }
      
      return NextResponse.json(
        { success: false, message: 'Erro ao reenviar email. Tente novamente.' },
        { status: 500 }
      )
    }

    
    
    return NextResponse.json({
      success: true,
      message: 'Email de confirmação reenviado com sucesso!'
    })

  } catch (error) {
    
    return NextResponse.json(
      { success: false, message: 'Erro interno. Tente novamente.' },
      { status: 500 }
    )
  }
}
