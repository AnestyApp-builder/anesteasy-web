import crypto from 'crypto';
import { logger } from '@/lib/logger';
import { MetaAPIError } from '@/utils/errors';
import { MetaMediaResponse } from '@/types/meta';

const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_NUMBER_ID;
const APP_SECRET = process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET;

/**
 * Valida a assinatura do webhook da Meta para garantir que a requisição é legítima
 */
export function validateMetaSignature(payload: string, signature: string): boolean {
  if (!APP_SECRET || !signature) return false;
  
  const hash = crypto
    .createHmac('sha256', APP_SECRET)
    .update(payload)
    .digest('hex');
    
  const expectedSignature = `sha256=${hash}`;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

/**
 * Obtém informações e URL temporária de uma mídia
 */
export async function getMediaUrl(mediaId: string): Promise<MetaMediaResponse> {
  const url = `https://graph.facebook.com/v23.0/${mediaId}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new MetaAPIError(`Failed to get media info: ${JSON.stringify(error)}`);
    }

    return await response.json();
  } catch (error) {
    logger.error('Error fetching media info from Meta', error);
    throw error;
  }
}

/**
 * Faz o download binário da mídia
 */
export async function downloadMedia(url: string): Promise<Buffer> {
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`
      }
    });

    if (!response.ok) {
      throw new MetaAPIError(`Failed to download media from Meta: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    logger.error('Error downloading media from Meta', error);
    throw error;
  }
}

/**
 * Envia uma mensagem de texto via WhatsApp
 */
export async function sendWhatsAppMessage(to: string, text: string) {
  const url = `https://graph.facebook.com/v23.0/${PHONE_NUMBER_ID}/messages`;
  
  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { body: text }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.json();
      logger.error('Meta API error sending message', error);
      throw new MetaAPIError(`Failed to send message: ${JSON.stringify(error)}`);
    }

    return await response.json();
  } catch (error) {
    logger.error('Error sending WhatsApp message', error);
    throw error;
  }
}
