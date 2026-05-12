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

    // Criar cliente Supabase Admin (bypass RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Buscar dados do usuário (bypass RLS)
    const { data: userData, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, email, name, specialty, crm, gender, phone, subscription_plan, subscription_status, trial_ends_at')
      .eq('id', userId)
      .maybeSingle()

    if (fetchError) {
      console.error('❌ [GET USER DATA] Erro ao buscar dados:', fetchError)
      return NextResponse.json(
        { error: 'Erro ao buscar dados do usuário', details: fetchError.message },
        { status: 500 }
      )
    }

    if (!userData) {
      // Usuário não encontrado na tabela
      return NextResponse.json(
        { data: null, exists: false },
        { status: 200 }
      )
    }

    return NextResponse.json({ 
      data: userData, 
      exists: true 
    })

  } catch (error: any) {
    console.error('❌ [GET USER DATA] Erro interno:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

