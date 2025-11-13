import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cancelarAssinatura } from '@/lib/pagarme-subscriptions'

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
 * POST /api/pagarme/subscription/cancel
 * Cancela uma assinatura
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const accessToken = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin?.auth.getUser(accessToken) || { data: { user: null }, error: null }

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { subscription_id, cancel_immediately = false } = body

    if (!subscription_id) {
      return NextResponse.json(
        { error: 'ID da assinatura é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se a assinatura pertence ao usuário
    const { data: subscription, error: subError } = await supabaseAdmin
      ?.from('subscriptions')
      .select('*')
      .eq('pagarme_subscription_id', subscription_id)
      .eq('user_id', user.id)
      .maybeSingle() || { data: null, error: null }

    if (subError || !subscription) {
      return NextResponse.json(
        { error: 'Assinatura não encontrada' },
        { status: 404 }
      )
    }

    // Verificar se já está cancelada antes de tentar cancelar
    if (subscription.status === 'cancelled' || subscription.status === 'expired') {
      return NextResponse.json({
        success: true,
        message: 'Esta assinatura já está cancelada',
        already_cancelled: true,
        subscription: subscription
      })
    }

    // Tentar cancelar na Pagar.me
    let result
    let alreadyCancelled = false
    try {
      result = await cancelarAssinatura(subscription_id, cancel_immediately)
    } catch (error: any) {
      // Se o erro for porque já está cancelada (412), tratar como sucesso
      const errorMessage = error.message || ''
      if (errorMessage.toLowerCase().includes('canceled') || errorMessage.toLowerCase().includes('cancelada')) {
        console.log('ℹ️ Assinatura já estava cancelada na Pagar.me')
        alreadyCancelled = true
        result = { success: true, status: 'cancelled' }
      } else {
        // Outro erro, propagar
        throw error
      }
    }

    // Atualizar no Supabase
    if (supabaseAdmin) {
      // Se cancelamento imediato ou já estava cancelada, marcar como cancelado
      // Se cancelamento no fim do período, manter como ativo mas marcar cancelled_at
      await supabaseAdmin
        .from('subscriptions')
        .update({
          status: (cancel_immediately || alreadyCancelled) ? 'cancelled' : subscription.status, // Mantém status atual se não for imediato
          cancelled_at: (cancel_immediately || alreadyCancelled) ? new Date().toISOString() : subscription.current_period_end, // Marca data de cancelamento
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id)
    }

    const periodEndDate = subscription.current_period_end 
      ? new Date(subscription.current_period_end).toLocaleDateString('pt-BR')
      : 'fim do período atual'

    return NextResponse.json({
      success: true,
      message: alreadyCancelled 
        ? 'Esta assinatura já estava cancelada'
        : cancel_immediately 
        ? 'Assinatura cancelada com sucesso. Você perdeu o acesso imediatamente.' 
        : `Assinatura será cancelada em ${periodEndDate}. Você manterá acesso completo até então.`,
      subscription: result,
      access_until: cancel_immediately ? null : subscription.current_period_end
    })

  } catch (error: any) {
    console.error('❌ Erro ao cancelar assinatura:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Erro ao cancelar assinatura',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

