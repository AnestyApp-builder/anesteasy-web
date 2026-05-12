/**
 * WhatsApp Cloud API Client for AnestEasy
 */

const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const API_VERSION = 'v19.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

export interface WhatsAppMessageResponse {
  messaging_product: string;
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

export class WhatsAppClient {
  /**
   * Envia uma mensagem de texto simples
   */
  static async sendTextMessage(to: string, text: string): Promise<WhatsAppMessageResponse> {
    if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
      throw new Error('WhatsApp API credentials not configured');
    }

    const response = await fetch(`${BASE_URL}/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { body: text },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('WhatsApp API Error:', data);
      throw new Error(data.error?.message || 'Failed to send WhatsApp message');
    }

    return data;
  }

  /**
   * Envia uma mensagem de template (necessária para iniciar conversas fora da janela de 24h)
   */
  static async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode: string = 'pt_BR',
    components: any[] = []
  ): Promise<WhatsAppMessageResponse> {
    if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
      throw new Error('WhatsApp API credentials not configured');
    }

    const response = await fetch(`${BASE_URL}/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components,
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('WhatsApp API Error:', data);
      throw new Error(data.error?.message || 'Failed to send WhatsApp template');
    }

    return data;
  }

  /**
   * Busca a URL de download de um arquivo de mídia (imagem/doc)
   */
  static async getMediaUrl(mediaId: string): Promise<string> {
    if (!ACCESS_TOKEN) throw new Error('WhatsApp API credentials not configured');

    const response = await fetch(`${BASE_URL}/${mediaId}`, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to fetch media metadata');
    }

    return data.url;
  }

  /**
   * Faz o download binário da mídia
   */
  static async downloadMedia(mediaUrl: string): Promise<Buffer> {
    if (!ACCESS_TOKEN) throw new Error('WhatsApp API credentials not configured');

    console.log('Starting binary download from Meta...');
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      const response = await fetch(mediaUrl, {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'User-Agent': 'AnestEasy-Bot/1.0',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Download Media Failed. Status:', response.status, 'Error:', errorText);
        throw new Error(`Failed to download media file: ${response.status} ${errorText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      console.log('Download complete, buffer size:', arrayBuffer.byteLength);
      return Buffer.from(arrayBuffer);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.error('Download Media TIMEOUT after 15s');
        throw new Error('Download timeout - Meta server took too long to respond');
      }
      console.error('Download Media EXCEPTION:', err.message);
      throw err;
    }
  }
}
