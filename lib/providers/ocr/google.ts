import { ImageAnnotatorClient } from '@google-cloud/vision';
import { GoogleAuth } from 'google-auth-library';
import { logger } from '@/lib/logger';
import { OCRProviderError } from '@/utils/errors';
import { OCRResult } from '@/types/ocr';

/**
 * Provedor Google Cloud Vision OCR
 */
export class GoogleVisionProvider {
  private client: ImageAnnotatorClient | null = null;

  private getClient(): ImageAnnotatorClient {
    if (this.client) return this.client;

    try {
      let credsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
      const credsBase64 = process.env.GOOGLE_CREDENTIALS_BASE64;
      let parsed: any = null;

      // Prioridade 1: Base64 (O mais seguro e recomendado)
      if (credsBase64) {
        try {
          const decoded = Buffer.from(credsBase64, 'base64').toString('utf8');
          parsed = JSON.parse(decoded);
          logger.info('Google Vision initialized via Base64 credentials');
        } catch (e: any) {
          logger.error('Failed to parse Google Base64 credentials', e);
        }
      }

      // Prioridade 2: JSON direto (Fallback)
      if (!parsed && credsJson) {
        try {
          parsed = JSON.parse(credsJson);
        } catch (e) {
          let cleaned = credsJson.trim().replace(/^['"]|['"]$/g, '');
          try {
            parsed = JSON.parse(cleaned);
          } catch (e2: any) {
            logger.error(`JSON Parse Error. Length: ${credsJson.length}. Starts with: ${credsJson.substring(0, 10)}`);
          }
        }
      }

      if (parsed) {
        // Limpeza cirúrgica da chave
        const privateKey = parsed.private_key
          .replace(/\\n/g, '\n')
          .replace(/\r/g, ''); // Remove carriage returns de Windows
        
        const auth = new GoogleAuth({
          credentials: {
            client_email: parsed.client_email,
            private_key: privateKey,
            project_id: parsed.project_id
          },
          scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });

        this.client = new ImageAnnotatorClient({
          auth,
          transport: 'rest'
        });
        logger.info('Google Vision Client Created with Direct Auth');
      } else {
        // Fallback para arquivo físico (apenas local)
        const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        if (credsPath) {
          this.client = new ImageAnnotatorClient({ transport: 'rest' });
        } else {
          logger.warn('No Google Vision credentials found (Base64, JSON or Path)');
          throw new Error('Missing Google Vision credentials');
        }
      }
      return this.client;
    } catch (error: any) {
      const credsPrefix = process.env.GOOGLE_CREDENTIALS_BASE64?.substring(0, 20) || 'empty';
      logger.error('Failed to initialize Google Vision client', { error: error.message, prefix: credsPrefix });
      throw new Error(`Init Error: ${error.message} (Base64 Prefix: ${credsPrefix})`);
    }
  }

  /**
   * Extrai texto de um buffer de imagem
   */
  async extractText(buffer: Buffer): Promise<OCRResult> {
    const startTime = Date.now();
    const client = this.getClient();
    
    try {
      const [result] = await client.documentTextDetection({
        image: { content: buffer }
      });

      const fullTextAnnotation = result.fullTextAnnotation;
      const rawText = fullTextAnnotation?.text || '';
      
      const confidence = rawText.length > 0 ? 0.95 : 0;
      const latency = Date.now() - startTime;
      const cost = 0.0015; 

      return {
        rawText,
        confidence,
        provider: 'google',
        latency,
        cost
      };
    } catch (error: any) {
      logger.error('Google Vision OCR error', error);
      
      // Diagnóstico de chaves (Checando Base64 e JSON)
      let keys = 'unknown';
      try {
        const b64 = process.env.GOOGLE_CREDENTIALS_BASE64;
        const json = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
        if (b64) {
           const parsed = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
           keys = `b64: ${Object.keys(parsed).join(', ')}`;
        } else if (json) {
           const cleaned = json.trim().replace(/^['"]|['"]$/g, '');
           const parsed = JSON.parse(cleaned);
           keys = `json: ${Object.keys(parsed).join(', ')}`;
        }
      } catch (e) {}
      
      throw new OCRProviderError(`${error.message} (Found: ${keys})`, 'google');
    }
  }
}

export const googleVision = new GoogleVisionProvider();
