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

/**
 * GET /api/stripe/debug-subscription
 * Endpoint de debug para verificar assinaturas do usuário
 */
export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Configuração do servidor incompleta' },
        { status: 500 }
      )
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const accessToken = authHeader.replace('Bearer ', '').trim()
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Buscar TODAS as assinaturas do usuário (não apenas active)
    const { data: allSubscriptions, error: allSubsError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Buscar assinatura ativa
    const { data: activeSubscription, error: activeError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Buscar dados do usuário
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('subscription_plan, subscription_status')
      .eq('id', user.id)
      .single()

    return NextResponse.json({
      user_id: user.id,
      user_email: user.email,
      user_subscription_plan: userData?.subscription_plan || null,
      user_subscription_status: userData?.subscription_status || null,
      all_subscriptions: allSubscriptions || [],
      active_subscription: activeSubscription || null,
      errors: {
        all_subscriptions: allSubsError?.message || null,
        active_subscription: activeError?.message || null,
        user_data: userError?.message || null
      }
    })

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar assinaturas' },
      { status: 500 }
    )
  }
}

