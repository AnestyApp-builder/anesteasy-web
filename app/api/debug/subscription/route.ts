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

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Configuração do servidor incompleta' },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { error: 'Email é obrigatório. Use ?email=seu@email.com' },
        { status: 400 }
      )
    }

    // Buscar usuário por email
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, name, subscription_status, subscription_plan, trial_ends_at, created_at, free_months')
      .eq('email', email)
      .maybeSingle()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado', details: userError },
        { status: 404 }
      )
    }

    // Buscar assinaturas do usuário
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Buscar transações de pagamento
    const { data: transactions, error: transError } = await supabaseAdmin
      .from('payment_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        subscription_status: user.subscription_status,
        subscription_plan: user.subscription_plan,
        trial_ends_at: user.trial_ends_at,
        created_at: user.created_at,
        free_months: user.free_months
      },
      subscriptions: subscriptions || [],
      transactions: transactions || [],
      errors: {
        subscriptions: subError,
        transactions: transError
      }
    })

  } catch (error: any) {
    console.error('❌ Erro no debug:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar informações' },
      { status: 500 }
    )
  }
}

