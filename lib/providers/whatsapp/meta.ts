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
  const url = `https://graph.facebook.com/v21.0/${mediaId}`;
  
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
  const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;
  
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

/**
 * Marca uma mensagem como lida (Double Check Azul)
 */
export async function markMessageAsRead(messageId: string) {
  const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;
  
  const body = {
    messaging_product: 'whatsapp',
    status: 'read',
    message_id: messageId
  };

  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
  } catch (error) {
    logger.error('Error marking message as read', error);
  }
}

/**
 * Envia uma mensagem com botões interativos (máximo 3 botões)
 */
export async function sendWhatsAppButtons(to: string, text: string, buttons: { id: string, title: string }[]) {
  const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;
  
  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text },
      action: {
        buttons: buttons.map(b => ({
          type: 'reply',
          reply: { id: b.id, title: b.title }
        }))
      }
    }
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
      logger.error('Meta API error sending buttons', error);
      // Se falhar botões (ex: conta não autorizada), tenta enviar como texto simples como fallback
      return await sendWhatsAppMessage(to, text + "\n\n" + buttons.map((b, i) => `${i+1}️⃣ - ${b.title}`).join("\n"));
    }

    return await response.json();
  } catch (error) {
    logger.error('Error sending WhatsApp buttons', error);
    return await sendWhatsAppMessage(to, text);
  }
}

/**
 * Envia uma mensagem de lista interativa (até 10 opções)
 */
export async function sendWhatsAppList(to: string, text: string, buttonText: string, sections: { title: string, rows: { id: string, title: string, description?: string }[] }[]) {
  const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;
  
  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text },
      action: {
        button: buttonText,
        sections: sections.map(s => ({
          title: s.title,
          rows: s.rows.map(r => ({
            id: r.id,
            title: r.title,
            description: r.description
          }))
        }))
      }
    }
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
      logger.error('Meta API error sending list', error);
      // Fallback para texto
      const optionsText = sections.flatMap(s => s.rows).map((r, i) => `${i+1}️⃣ - ${r.title}`).join("\n");
      return await sendWhatsAppMessage(to, text + "\n\nSelecione:\n" + optionsText);
    }

    return await response.json();
  } catch (error) {
    logger.error('Error sending WhatsApp list', error);
    return await sendWhatsAppMessage(to, text);
  }
}
