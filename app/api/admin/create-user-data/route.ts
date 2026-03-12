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

    const { 
      userId, 
      email, 
      name, 
      specialty, 
      crm, 
      gender, 
      phone, 
      cpf 
    } = await request.json()

    if (!userId || !email || !name) {
      return NextResponse.json(
        { error: 'User ID, email e name são obrigatórios' },
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

    // Verificar se o usuário já existe
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (existingUser) {
      // Usuário já existe, retornar os dados existentes
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('id, email, name, specialty, crm, gender, phone, subscription_plan, subscription_status, trial_ends_at')
        .eq('id', userId)
        .single()

      return NextResponse.json({ 
        data: userData, 
        created: false 
      })
    }

    // Criar dados do usuário com período de trial
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 7)

    const { data: newUserData, error: createError } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        email,
        name,
        specialty: specialty || 'Anestesiologia',
        crm: crm || '000000',
        gender: gender || null,
        phone: phone || null,
        cpf: cpf || null,
        password_hash: '',
        subscription_plan: 'premium',
        subscription_status: 'active', // Status ativo (período de trial é controlado por trial_ends_at)
        trial_ends_at: trialEndsAt.toISOString()
      })
      .select('id, email, name, specialty, crm, gender, phone, subscription_plan, subscription_status, trial_ends_at')
      .single()

    if (createError) {
      console.error('❌ [CREATE USER DATA] Erro ao criar usuário:', createError)
      return NextResponse.json(
        { error: 'Erro ao criar dados do usuário', details: createError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      data: newUserData, 
      created: true 
    })

  } catch (error: any) {
    console.error('❌ [CREATE USER DATA] Erro interno:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

