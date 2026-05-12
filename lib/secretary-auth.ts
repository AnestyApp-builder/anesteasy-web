import { createHash, randomBytes } from 'crypto'
import { createAdminClient } from '@/utils/supabase/admin'

/**
 * Gera um token aleatório forte de 32 bytes
 */
export function generateToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Gera o hash SHA-256 de um token
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Valida um token de secretária e retorna o escopo de acesso
 */
export async function validateSecretaryToken(token: string, ip?: string) {
  if (!token) return null

  const tokenHash = hashToken(token)
  const supabase = createAdminClient()

  try {
    // Buscar o link no banco
    const { data: link, error } = await supabase
      .from('shared_links')
      .select('id, user_id, permissions, expires_at, revoked')
      .eq('token_hash', tokenHash)
      .single()

    if (error || !link) {
      console.error('Token não encontrado ou erro na busca:', error)
      return null
    }

    // Verificar se está expirado ou revogado
    const isExpired = new Date(link.expires_at) < new Date()
    if (isExpired || link.revoked) {
      return null
    }

    // Atualizar rastro de uso (last_used_at, last_used_ip)
    // Usamos supabase diretamente pois a API route terá as credenciais necessárias
    await supabase
      .from('shared_links')
      .update({
        last_used_at: new Date().toISOString(),
        last_used_ip: ip || 'unknown'
      })
      .eq('id', link.id)

    return {
      userId: link.user_id,
      permissions: link.permissions || { can_update_status: true, view_values: true }
    }
  } catch (error) {
    console.error('Erro interno na validação do token:', error)
    return null
  }
}

/**
 * Simples controle de tentativa de acesso (Rate Limit básico)
 * Em produção, usar Redis ou Upstash para isso
 */
const rateLimitMap = new Map<string, { count: number; lastReset: number }>()

export function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minuto
  const maxRequests = 20

  const client = rateLimitMap.get(ip) || { count: 0, lastReset: now }

  if (now - client.lastReset > windowMs) {
    client.count = 1
    client.lastReset = now
  } else {
    client.count++
  }

  rateLimitMap.set(ip, client)

  return client.count <= maxRequests
}
