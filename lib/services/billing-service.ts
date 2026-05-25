import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const PLAN_LABELS: Record<string, string> = {
  monthly: 'Mensal',
  quarterly: 'Trimestral',
  annual: 'Anual',
};

async function sendPaymentConfirmationEmail(
  userId: string,
  planType: string,
  amount: number,
  periodEnd: string
) {
  try {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('email, name')
      .eq('id', userId)
      .single();

    if (!user?.email) return;

    const planLabel = PLAN_LABELS[planType] || planType;
    const formattedAmount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
    const formattedDate = new Date(periodEnd).toLocaleDateString('pt-BR');
    const firstName = (user.name || 'Doutor(a)').split(' ')[0];

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background-color:#14b8a6;color:white;padding:24px;text-align:center;border-radius:10px 10px 0 0;">
    <h1 style="margin:0;font-size:28px;">AnestEasy</h1>
    <p style="margin:8px 0 0;opacity:.85;">Confirmação de Pagamento</p>
  </div>
  <div style="background-color:#f9fafb;padding:32px;border-radius:0 0 10px 10px;">
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
</body>
</html>`;

    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'AnestEasy <noreply@anesteasy.com.br>',
          to: [user.email],
          subject: `✅ Assinatura ${planLabel} confirmada — AnestEasy`,
          html,
        }),
      });
    }
  } catch (e) {
    console.warn('Erro ao enviar email de confirmação de pagamento:', e);
  }
}

/**
 * Utilitário para converter timestamp do Stripe para Date
 */
function stripeTimestampToDate(timestamp: number | null | undefined): Date {
  if (timestamp == null || isNaN(timestamp)) return new Date();
  const timestampMs = timestamp < 1e12 ? timestamp * 1000 : timestamp;
  const date = new Date(timestampMs);
  return isNaN(date.getTime()) ? new Date() : date;
}

/**
 * Valida o tipo de plano para o banco
 */
function validatePlanType(planType: string | undefined | null): 'monthly' | 'quarterly' | 'annual' {
  const validTypes = ['monthly', 'quarterly', 'annual'];
  return (planType && validTypes.includes(planType)) ? (planType as any) : 'monthly';
}

/**
 * Serviço para gerenciar faturamento e integração com Stripe.
 * Centraliza o processamento de webhooks e transações financeiras.
 */
export const billingService = {
  /**
   * Processa a conclusão de um checkout do Stripe.
   * Redireciona para tratamento de pagamento diário ou assinatura normal.
   * 
   * @param session Objeto de sessão do Stripe Checkout
   */
  async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.user_id;
    const planType = validatePlanType(session.metadata?.plan_type);
    const isDaily = session.metadata?.is_daily === 'true';

    if (!userId) throw new Error('user_id não encontrado nos metadata');

    if (session.metadata?.type === 'group_seats') {
      return this.handleGroupSeatsCheckout(session);
    }

    if (isDaily) {
      return this.handleDailyPayment(userId, session.id, session.customer as string, session.amount_total || 0);
    }

    const subscriptionId = session.subscription as string;
    if (!subscriptionId) throw new Error('Subscription ID ausente');

    let periodStart = new Date().toISOString();
    let periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    try {
      if (stripe) {
        const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
        periodStart = stripeTimestampToDate(stripeSub.current_period_start).toISOString();
        periodEnd = stripeTimestampToDate(stripeSub.current_period_end).toISOString();
      }
    } catch (e) {
      console.warn('Erro ao buscar dados do Stripe, usando defaults');
    }

    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingSub) {
      await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'active',
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: session.customer as string,
          plan_type: planType,
          current_period_start: periodStart,
          current_period_end: periodEnd,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSub.id);
    } else {
      await supabaseAdmin
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_type: planType,
          amount: (session.amount_total || 0) / 100,
          status: 'active',
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: session.customer as string,
          current_period_start: periodStart,
          current_period_end: periodEnd
        });
    }

    const standardSeats = parseInt(session.metadata?.standard_seats || '0', 10);
    const coordSeats = parseInt(session.metadata?.coord_seats || '0', 10);

    await supabaseAdmin
      .from('users')
      .update({
        subscription_plan: planType,
        subscription_status: 'active',
        available_standard_seats: standardSeats,
        available_coord_seats: coordSeats
      })
      .eq('id', userId);

    await sendPaymentConfirmationEmail(
      userId,
      planType,
      (session.amount_total || 0) / 100,
      periodEnd
    );
  },

  async handleGroupSeatsCheckout(session: Stripe.Checkout.Session) {
    const groupId = session.metadata?.group_id;
    if (!groupId) throw new Error('group_id não encontrado nos metadata de group_seats');

    const standardSeats = parseInt(session.metadata?.standard_seats || '0', 10);
    const coordSeats = parseInt(session.metadata?.coord_seats || '0', 10);

    if (standardSeats > 0 || coordSeats > 0) {
      const { data: group } = await supabaseAdmin
        .from('groups')
        .select('standard_seats_paid, coord_seats_paid')
        .eq('id', groupId)
        .single();

      if (group) {
        await supabaseAdmin
          .from('groups')
          .update({
            standard_seats_paid: (group.standard_seats_paid || 0) + standardSeats,
            coord_seats_paid: (group.coord_seats_paid || 0) + coordSeats
          })
          .eq('id', groupId);
      }
    }
  },

  /**
   * Lógica específica para acesso de 1 dia.
   * Adiciona 24 horas à assinatura atual ou cria uma nova expiração.
   * 
   * @param userId ID do usuário
   * @param identifier Identificador da transação (session ID ou payment intent ID)
   * @param customerId ID do cliente no Stripe
   * @param amountTotal Valor total em centavos
   */
  async handleDailyPayment(userId: string, identifier: string, customerId: string, amountTotal: number = 0) {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('id, current_period_end')
      .eq('user_id', userId)
      .maybeSingle();

    if (sub) {
      let baseDate = sub.current_period_end ? new Date(sub.current_period_end) : now;
      if (baseDate < now) baseDate = now;
      const newEnd = new Date(baseDate.getTime() + 24 * 60 * 60 * 1000);

      await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'active',
          current_period_end: newEnd.toISOString(),
          updated_at: now.toISOString()
        })
        .eq('id', sub.id);
    } else {
      await supabaseAdmin
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_type: 'monthly',
          status: 'active',
          amount: amountTotal / 100,
          stripe_subscription_id: `daily_${identifier}`,
          stripe_customer_id: customerId,
          current_period_start: now.toISOString(),
          current_period_end: tomorrow.toISOString()
        });
    }

    await supabaseAdmin
      .from('users')
      .update({ subscription_status: 'active' })
      .eq('id', userId);
  },

  /**
   * Processa faturas pagas com sucesso.
   * Registra a transação no banco e garante que a assinatura esteja ativa.
   */
  async handleInvoicePaid(invoice: Stripe.Invoice) {
    const subscriptionId = invoice.subscription as string;
    if (!subscriptionId) return;

    const { data: dbSub } = await supabaseAdmin
      .from('subscriptions')
      .select('id, user_id, status')
      .eq('stripe_subscription_id', subscriptionId)
      .maybeSingle();

    if (!dbSub) return;

    await supabaseAdmin.from('payment_transactions').insert({
      subscription_id: dbSub.id,
      user_id: dbSub.user_id,
      stripe_transaction_id: invoice.id,
      amount: (invoice.amount_paid || 0) / 100,
      status: 'paid',
      payment_method: 'credit_card',
      paid_at: new Date().toISOString()
    });

    if (dbSub.status !== 'active') {
      await supabaseAdmin.from('subscriptions').update({ status: 'active' }).eq('id', dbSub.id);
      await supabaseAdmin.from('users').update({ subscription_status: 'active' }).eq('id', dbSub.user_id);
    }
  },

  /**
   * Processa falhas no pagamento de faturas.
   * Registra o log de erro na tabela de transações para auditoria.
   */
  async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    const subscriptionId = invoice.subscription as string;
    if (!subscriptionId) return;

    const { data: dbSub } = await supabaseAdmin
      .from('subscriptions')
      .select('id, user_id')
      .eq('stripe_subscription_id', subscriptionId)
      .maybeSingle();

    if (!dbSub) return;

    await supabaseAdmin.from('payment_transactions').insert({
      subscription_id: dbSub.id,
      user_id: dbSub.user_id,
      stripe_transaction_id: invoice.id,
      amount: (invoice.amount_due || 0) / 100,
      status: 'failed',
      payment_method: 'credit_card',
      failed_at: new Date().toISOString()
    });
  },

  /**
   * Processa sucesso em intents de pagamento (usado principalmente para acesso daily).
   */
  async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    const userId = paymentIntent.metadata?.user_id;
    if (!userId || paymentIntent.metadata?.is_daily !== 'true') return;

    await this.handleDailyPayment(
      userId, 
      paymentIntent.id, 
      paymentIntent.customer as string, 
      paymentIntent.amount || 0
    );
  },

  /**
   * Processa o cancelamento de uma assinatura no Stripe.
   * Inativa o acesso do usuário no sistema.
   */
  async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const { data: dbSub } = await supabaseAdmin
      .from('subscriptions')
      .select('id, user_id')
      .eq('stripe_subscription_id', subscription.id)
      .maybeSingle();

    if (dbSub) {
      await supabaseAdmin
        .from('subscriptions')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('id', dbSub.id);

      await supabaseAdmin
        .from('users')
        .update({ subscription_status: 'inactive' })
        .eq('id', dbSub.user_id);
    }
  }
};
