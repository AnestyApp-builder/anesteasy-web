import crypto from 'crypto';

/**
 * Utilitário de Segurança para conformidade com LGPD
 * Implementa criptografia AES-256-GCM para dados sensíveis em repouso.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Deve ter 32 caracteres

/**
 * Criptografa um texto usando AES-256-GCM
 * Retorna o formato: iv:authTag:encryptedData
 */
export function encrypt(text: string): string {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
    console.warn('ENCRYPTION_KEY não configurada corretamente. Retornando texto original.');
    return text;
  }

  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    // Prefixo 'enc:' para identificar dados criptografados
    return `enc:${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (error) {
    console.error('Erro na criptografia:', error);
    return text;
  }
}

/**
 * Descriptografa um texto criptografado pelo método acima
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText.startsWith('enc:')) {
    return encryptedText; // Retorna original se não tiver o prefixo
  }

  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
    console.error('Tentativa de descriptografia sem ENCRYPTION_KEY configurada.');
    return '[ERRO: DADO CRIPTOGRAFADO]';
  }

  try {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[1], 'hex');
    const authTag = Buffer.from(parts[2], 'hex');
    const encryptedData = parts[3];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Erro na descriptografia:', error);
    return '[ERRO NA DESCRIPTOGRAFIA]';
  }
}
