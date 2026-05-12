import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { logger } from '@/lib/logger';
import { validateMetaSignature } from '@/lib/providers/whatsapp/meta';
import { supabaseAdmin } from '@/lib/supabase-server';
import { processWhatsAppMessage } from '@/lib/queue/processor';
import { MetaWebhookBody } from '@/types/meta';

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;

/**
 * GET /api/meta/webhook
 * Verificação do webhook da Meta
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    logger.info('Webhook verified successfully');
    return new NextResponse(challenge, { status: 200 });
  }

  logger.warn('Webhook verification failed: Invalid token');
  return new NextResponse('Forbidden', { status: 403 });
}

/**
 * POST /api/meta/webhook
 * Recebimento de mensagens do WhatsApp
 */
export async function POST(req: NextRequest) {
  const payload = await req.text();
  const signature = req.headers.get('x-hub-signature-256') || '';

  // 1. Validar assinatura
  if (!validateMetaSignature(payload, signature)) {
    logger.error('Invalid signature in webhook request');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const body = JSON.parse(payload) as MetaWebhookBody;

  // Ignorar status updates e eventos sem mensagens
  const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!message) {
    return NextResponse.json({ status: 'ignored' });
  }

  const messageId = message.id;

  try {
    // 2. Idempotência: Verificar se já processamos este evento
    const { data: existing } = await supabaseAdmin
      .from('processed_webhooks')
      .select('id')
      .eq('event_id', messageId)
      .single();

    if (existing) {
      logger.info(`Message ${messageId} already processed. Skipping.`);
      return NextResponse.json({ status: 'already_processed' });
    }

    // 3. Registrar início do processamento (Reserva o evento)
    await supabaseAdmin.from('processed_webhooks').insert({
      event_id: messageId,
      status: 'pending'
    });

    // 4. Disparar processamento assíncrono (Queue/Job)
    // Usamos waitUntil para permitir que o Vercel continue a execução após a resposta
    waitUntil(processWhatsAppMessage(message));

    // 5. Retornar 200 imediatamente para a Meta
    return NextResponse.json({ status: 'accepted' });

  } catch (error: any) {
    logger.error(`Webhook error for message ${messageId}`, error);
    // Mesmo em erro, retornamos 200 se o evento foi "recebido", para evitar retries infinitos se for erro de lógica
    // Meta retries são para erros de rede (5xx)
    return NextResponse.json({ error: error.message }, { status: 200 });
  }
}
