import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    const supabase = await createClient()
    const origin = request.nextUrl.origin

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
        emailRedirectTo: `${origin}/auth/confirm?next=/login&type=signup`
      }
    })

    if (error) {
      
      
      if (error.message.includes('rate limit') || error.message.includes('over_email_send_rate_limit')) {
        return NextResponse.json(
          { success: false, message: 'Limite de emails atingido. Aguarde alguns minutos e tente novamente.' },
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
