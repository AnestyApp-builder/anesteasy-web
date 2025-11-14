import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zmtwwajyhusyrugobxur.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Timeout de 5 segundos para requisições no mobile
const REQUEST_TIMEOUT = 5000

// Helper para criar timeout em Promise
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    ),
  ])
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { confirmed: false, message: 'Email é obrigatório' },
        { status: 400 }
      )
    }

    // Executar verificação com timeout para evitar travamentos no mobile
    return await withTimeout(
      checkEmailConfirmation(email),
      REQUEST_TIMEOUT
    ).catch((error) => {
      // Se timeout ou erro, retornar não confirmado mas sem travar
      console.warn('⚠️ Timeout ou erro na verificação de email:', error.message)
      return NextResponse.json({
        confirmed: false,
        message: 'Verificação em andamento. Tente novamente em alguns segundos.'
      })
    })

  } catch (error) {
    console.error('Erro interno na verificação de email:', error)
    return NextResponse.json(
      { confirmed: false, message: 'Erro interno' },
      { status: 500 }
    )
  }
}

async function checkEmailConfirmation(email: string): Promise<NextResponse> {
  // Se não temos service role key, usar fallback rápido (verificar apenas na tabela users)
  if (!supabaseServiceKey) {
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
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
      return NextResponse.json({
        confirmed: false,
        message: 'Email pendente de confirmação'
      })
    }

    // Considerar confirmado se existe na tabela users (independente do status)
    // O status pode ser 'trial' ou 'active', ambos indicam confirmação
    return NextResponse.json({
      confirmed: true,
      message: 'Email confirmado'
    })
  }

  // Usar Service Role Key para verificação rápida
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // PRIMEIRO: Verificar na tabela users (mais rápido - apenas 1 query)
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, subscription_status')
      .eq('email', email)
      .maybeSingle()

    // Se encontrou na tabela users, está confirmado (mesmo que status seja 'trial')
    if (userData) {
      return NextResponse.json({
        confirmed: true,
        message: 'Email confirmado'
      })
    }

    // SEGUNDO: Se não encontrou na tabela, verificar no Auth (mas de forma otimizada)
    // OTIMIZAÇÃO: Não usar listUsers() que é muito pesado no mobile
    // Verificação simplificada: se não está na tabela users, considerar não confirmado
    // A tabela users é criada após confirmação, então é um indicador confiável
    return NextResponse.json({
      confirmed: false,
      message: 'Email pendente de confirmação'
    })
      
  } catch (authError) {
    // Em caso de erro, retornar não confirmado para não travar
    console.warn('⚠️ Erro ao verificar email (não crítico):', authError)
    return NextResponse.json({
      confirmed: false,
      message: 'Verificando confirmação...'
    })
  }
}

