import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { reactivateSubscription } from '@/lib/stripe'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Configuração do servidor incompleta' }, { status: 500 })
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const accessToken = authHeader.replace('Bearer ', '').trim()
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken)

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .eq('cancel_at_period_end', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!subscription) {
      return NextResponse.json({ error: 'Nenhuma assinatura com cancelamento agendado encontrada' }, { status: 404 })
    }

    if (subscription.stripe_subscription_id) {
      try {
        await reactivateSubscription(subscription.stripe_subscription_id)
      } catch (stripeError: any) {
        console.error('❌ Erro ao reativar no Stripe:', stripeError.message)
        return NextResponse.json({ error: 'Erro ao reativar assinatura no Stripe' }, { status: 500 })
      }
    }

    await supabaseAdmin
      .from('subscriptions')
      .update({ cancel_at_period_end: false, updated_at: new Date().toISOString() })
      .eq('id', subscription.id)

    return NextResponse.json({ success: true, message: 'Renovação automática reativada com sucesso.' })
  } catch (error: any) {
    console.error('❌ Erro ao reativar assinatura:', error)
    return NextResponse.json({ error: error.message || 'Erro ao reativar assinatura' }, { status: 500 })
  }
}
