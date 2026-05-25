import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'

const PLAN_LABELS: Record<string, string> = {
  monthly: 'Mensal',
  quarterly: 'Trimestral',
  annual: 'Anual',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendConfirmationEmail(
  db: any,
  userId: string,
  planType: string,
  amount: number,
  periodEndTimestamp: number
) {
  try {
    const { data: user } = await db.from('users').select('email, name').eq('id', userId).single()
    if (!user?.email) return

    const planLabel = PLAN_LABELS[planType] || planType
    const formattedAmount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)
    const formattedDate = new Date(periodEndTimestamp * 1000).toLocaleDateString('pt-BR')
    const firstName = (user.name || 'Doutor(a)').split(' ')[0]

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:#14b8a6;color:white;padding:24px;text-align:center;border-radius:10px 10px 0 0;">
    <h1 style="margin:0;font-size:28px;">AnestEasy</h1>
    <p style="margin:8px 0 0;opacity:.85;">Confirmação de Pagamento</p>
  </div>
  <div style="background:#f9fafb;padding:32px;border-radius:0 0 10px 10px;">
    <h2 style="color:#14b8a6;margin-top:0;">Olá, ${firstName}!</h2>
    <p>Seu pagamento foi confirmado com sucesso. Seu plano já está ativo.</p>
    <div style="background:#fff;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #14b8a6;">
      <p style="margin:4px 0;"><strong>Plano:</strong> ${planLabel}</p>
      <p style="margin:4px 0;"><strong>Valor pago:</strong> ${formattedAmount}</p>
      <p style="margin:4px 0;"><strong>Próxima renovação:</strong> ${formattedDate}</p>
    </div>
    <div style="text-align:center;margin:28px 0;">
      <a href="https://app.anesteasy.com.br" style="background:#14b8a6;color:white;padding:12px 32px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">Acessar o AnestEasy</a>
    </div>
    <p style="color:#6b7280;font-size:13px;margin-top:24px;">
      Se você não realizou esta assinatura, entre em contato com nosso suporte.<br>
      <strong>Equipe AnestEasy</strong>
    </p>
  </div>
</body></html>`

    await db.functions.invoke('send-support-email', {
      body: { to: user.email, subject: `✅ Assinatura ${planLabel} confirmada — AnestEasy`, html },
    })
  } catch (e) {
    console.warn('Erro ao enviar email de confirmação:', e)
  }
}

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
 * Rota de teste para simular o processamento de um webhook
 * Útil para testar se o webhook está funcionando corretamente
 */
export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Configuração do servidor incompleta' },
        { status: 500 }
      )
    }

    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe não inicializado' },
        { status: 500 }
      )
    }

    const { email, session_id } = await request.json()

    if (!email && !session_id) {
      return NextResponse.json(
        { error: 'Email ou session_id é obrigatório' },
        { status: 400 }
      )
    }

    let session: any = null

    // Se tiver session_id, buscar a sessão do Stripe
    if (session_id) {
      try {
        session = await stripe.checkout.sessions.retrieve(session_id, {
          expand: ['subscription', 'customer']
        })
        console.log('✅ Sessão encontrada no Stripe:', session.id)
      } catch (error: any) {
        return NextResponse.json(
          { error: `Erro ao buscar sessão: ${error.message}` },
          { status: 400 }
        )
      }
    } else if (email) {
      // Buscar última sessão do customer por email
      const customers = await stripe.customers.list({
        email: email,
        limit: 1
      })

      if (customers.data.length === 0) {
        return NextResponse.json(
          { error: 'Customer não encontrado na Stripe' },
          { status: 404 }
        )
      }

      const customer = customers.data[0]
      const sessions = await stripe.checkout.sessions.list({
        customer: customer.id,
        limit: 1
      })

      if (sessions.data.length === 0) {
        return NextResponse.json(
          { error: 'Nenhuma sessão de checkout encontrada' },
          { status: 404 }
        )
      }

      session = await stripe.checkout.sessions.retrieve(sessions.data[0].id, {
        expand: ['subscription', 'customer']
      })
    }

    if (!session) {
      return NextResponse.json(
        { error: 'Sessão não encontrada' },
        { status: 404 }
      )
    }

    // Processar como se fosse um webhook
    const userId = session.metadata?.user_id
    const planType = session.metadata?.plan_type
    const subscriptionId = session.subscription as string

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id não encontrado no metadata da sessão', metadata: session.metadata },
        { status: 400 }
      )
    }

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'subscription_id não encontrado na sessão' },
        { status: 400 }
      )
    }

    // ⚠️ VALIDAÇÃO DE SEGURANÇA: Verificar se o pagamento foi realmente pago
    if (session.payment_status !== 'paid') {
      console.error('❌ SEGURANÇA: Tentativa de criar assinatura sem pagamento confirmado')
      console.error('📋 Payment Status:', session.payment_status)
      return NextResponse.json(
        { 
          error: 'Pagamento não confirmado. A assinatura só pode ser criada após confirmação do pagamento.',
          payment_status: session.payment_status
        },
        { status: 400 }
      )
    }

    // Buscar subscription do Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId)
    
    // ⚠️ VALIDAÇÃO DE SEGURANÇA: Verificar se a subscription está ativa
    if (stripeSubscription.status !== 'active' && stripeSubscription.status !== 'trialing') {
      console.error('❌ SEGURANÇA: Tentativa de criar assinatura com subscription inativa')
      console.error('📋 Subscription Status:', stripeSubscription.status)
      return NextResponse.json(
        { 
          error: 'Subscription não está ativa. A assinatura só pode ser criada para subscriptions ativas.',
          subscription_status: stripeSubscription.status
        },
        { status: 400 }
      )
    }

    const amount = session.amount_total ? session.amount_total / 100 : 0
    const standardSeats = parseInt(session.metadata?.standard_seats || '0', 10)

    // Verificar se já existe
    const { data: existingSubscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('stripe_subscription_id', subscriptionId)
      .maybeSingle()

    if (existingSubscription) {
      // Atualizar
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'active',
          plan_type: planType || existingSubscription.plan_type,
          amount: amount,
          stripe_customer_id: session.customer as string,
          current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSubscription.id)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json(
          { error: 'Erro ao atualizar assinatura', details: updateError },
          { status: 500 }
        )
      }

      const resolvedPlan = planType || existingSubscription.plan_type

      // Atualizar usuário
      await supabaseAdmin
        .from('users')
        .update({
          subscription_plan: resolvedPlan,
          subscription_status: 'active',
          available_standard_seats: standardSeats
        })
        .eq('id', userId)

      await sendConfirmationEmail(supabaseAdmin, userId, resolvedPlan, amount, stripeSubscription.current_period_end)

      return NextResponse.json({
        success: true,
        message: 'Assinatura atualizada com sucesso',
        subscription: updated
      })
    } else {
      // Criar nova
      const resolvedPlan = planType || 'monthly'
      const { data: newSubscription, error: insertError } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_type: resolvedPlan,
          amount: amount,
          status: 'active',
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: session.customer as string,
          current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString()
        })
        .select()
        .single()

      if (insertError) {
        return NextResponse.json(
          { error: 'Erro ao criar assinatura', details: insertError },
          { status: 500 }
        )
      }

      // Atualizar usuário
      await supabaseAdmin
        .from('users')
        .update({
          subscription_plan: resolvedPlan,
          subscription_status: 'active',
          available_standard_seats: standardSeats
        })
        .eq('id', userId)

      await sendConfirmationEmail(supabaseAdmin, userId, resolvedPlan, amount, stripeSubscription.current_period_end)

      return NextResponse.json({
        success: true,
        message: 'Assinatura criada com sucesso',
        subscription: newSubscription
      })
    }

  } catch (error: any) {
    console.error('❌ Erro no test-webhook:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao processar webhook de teste' },
      { status: 500 }
    )
  }
}

