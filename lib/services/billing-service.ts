import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

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

    await supabaseAdmin
      .from('users')
      .update({ subscription_plan: planType, subscription_status: 'active' })
      .eq('id', userId);
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
