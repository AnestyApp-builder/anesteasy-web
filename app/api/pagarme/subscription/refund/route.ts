import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRefundEligibility, updateDaysUsed } from '@/lib/subscription-access'
import { pagarmeRequest } from '@/lib/pagarme'

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
 * POST /api/pagarme/subscription/refund
 * Processa reembolso se elegível (< 8 dias de uso)
 * Regra: Apenas usuários com menos de 8 dias de uso podem solicitar reembolso
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
    const { subscription_id } = body

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

    // Verificar se já foi processado reembolso
    if (subscription.refund_processed_at) {
      return NextResponse.json(
        { error: 'Reembolso já foi processado para esta assinatura' },
        { status: 400 }
      )
    }

    // Atualizar dias de uso
    await updateDaysUsed(subscription.id)

    // Verificar elegibilidade para reembolso
    const eligibility = await checkRefundEligibility(subscription.id)

    if (!eligibility.eligible) {
      // Atualizar campo refund_eligible no banco
      await supabaseAdmin
        ?.from('subscriptions')
        .update({
          refund_eligible: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id)

      return NextResponse.json(
        { 
          error: eligibility.reason || 'Não elegível para reembolso',
          days_used: eligibility.daysUsed,
          eligible: false
        },
        { status: 400 }
      )
    }

    // Buscar última transação paga para reembolso
    const { data: lastTransaction } = await supabaseAdmin
      ?.from('payment_transactions')
      .select('*')
      .eq('subscription_id', subscription.id)
      .eq('status', 'paid')
      .order('paid_at', { ascending: false })
      .limit(1)
      .maybeSingle() || { data: null }

    if (!lastTransaction || !lastTransaction.pagarme_transaction_id) {
      return NextResponse.json(
        { error: 'Transação de pagamento não encontrada para reembolso' },
        { status: 404 }
      )
    }

    // Processar reembolso na Pagar.me
    let refundResult
    try {
      // A Pagar.me processa reembolso via API de transações
      refundResult = await pagarmeRequest(`/transactions/${lastTransaction.pagarme_transaction_id}/refund`, {
        method: 'POST',
        body: JSON.stringify({
          amount: lastTransaction.amount * 100, // Converter para centavos
          metadata: {
            subscription_id: subscription.id,
            user_id: user.id,
            reason: 'Solicitação de reembolso - menos de 8 dias de uso'
          }
        })
      })

      console.log('✅ Reembolso processado na Pagar.me:', refundResult)
    } catch (error: any) {
      console.error('❌ Erro ao processar reembolso na Pagar.me:', error)
      return NextResponse.json(
        { 
          error: error.message || 'Erro ao processar reembolso na Pagar.me',
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        { status: 500 }
      )
    }

    // Atualizar assinatura e transação
    await supabaseAdmin
      ?.from('subscriptions')
      .update({
        refund_eligible: true,
        refund_requested: true,
        refund_processed_at: new Date().toISOString(),
        status: 'cancelled', // Cancelar após reembolso
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id)

    // Atualizar transação
    if (lastTransaction.id) {
      await supabaseAdmin
        ?.from('payment_transactions')
        .update({
          status: 'refunded',
          updated_at: new Date().toISOString()
        })
        .eq('id', lastTransaction.id)
    }

    return NextResponse.json({
      success: true,
      message: `Reembolso processado com sucesso. Valor de R$ ${(lastTransaction.amount).toFixed(2)} será reembolsado em até 5 dias úteis.`,
      refund_amount: lastTransaction.amount,
      days_used: eligibility.daysUsed,
      transaction_id: lastTransaction.pagarme_transaction_id
    })

  } catch (error: any) {
    console.error('❌ Erro ao processar reembolso:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Erro ao processar reembolso',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

