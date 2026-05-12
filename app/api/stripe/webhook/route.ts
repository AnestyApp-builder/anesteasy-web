import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { constructWebhookEvent } from '@/lib/stripe'
import Stripe from 'stripe'
import { billingService } from '@/lib/services/billing-service'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const maxDuration = 30

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature || !webhookSecret) {
      return NextResponse.json({ error: 'Configuração inválida' }, { status: 400 })
    }

    let event: Stripe.Event
    try {
      event = constructWebhookEvent(body, signature, webhookSecret)
    } catch (error: any) {
      return NextResponse.json({ error: `Assinatura inválida: ${error.message}` }, { status: 400 })
    }

    logger.info('📦 [STRIPE-WEBHOOK] Processando:', event.type)
    
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await billingService.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
          break

        case 'customer.subscription.deleted':
          await billingService.handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
          break

        case 'payment_intent.succeeded':
          await billingService.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent)
          break

        case 'invoice.paid':
          await billingService.handleInvoicePaid(event.data.object as Stripe.Invoice)
          break

        case 'invoice.payment_failed':
          await billingService.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
          break

        default:
          logger.info('ℹ️ Evento ignorado:', event.type)
      }
    } catch (handlerError: any) {
      logger.error('❌ Erro no handler do webhook:', handlerError)
      throw handlerError
    }
    
    return NextResponse.json({ 
      received: true, 
      event_type: event.type, 
      processing_time_ms: Date.now() - startTime 
    })

  } catch (error: any) {
    logger.error('❌ Erro fatal no webhook:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'Webhook Stripe endpoint ativo' })
}
