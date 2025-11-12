import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabaseAdmin = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token é obrigatório' },
        { status: 400 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Configuração do Supabase não encontrada' },
        { status: 500 }
      )
    }

    // Marcar convite como usado
    const { error: updateError } = await supabaseAdmin
      .from('secretaria_invites')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token)
      .is('used_at', null) // Apenas se ainda não foi usado

    if (updateError) {
      console.error('Erro ao marcar convite como usado:', updateError)
      return NextResponse.json(
        { success: false, error: 'Erro ao processar convite' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Convite marcado como usado'
    })

  } catch (error) {
    console.error('Erro ao usar convite:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno' },
      { status: 500 }
    )
  }
}

