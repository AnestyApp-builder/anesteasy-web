import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zmtwwajyhusyrugobxur.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Rate limiting: máximo 5 tentativas por email por 15 minutos
const MAX_ATTEMPTS = 5
const RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15 minutos

// Cache simples em memória para rate limiting (em produção, usar Redis)
const rateLimitCache = new Map<string, { attempts: number; resetAt: number }>()

// Limpar cache antigo periodicamente
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitCache.entries()) {
    if (value.resetAt < now) {
      rateLimitCache.delete(key)
    }
  }
}, 60000) // Limpar a cada minuto

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  return forwarded?.split(',')[0] || realIP || 'unknown'
}

async function checkRateLimit(email: string, ip: string): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now()
  const emailKey = `email:${email}`
  const ipKey = `ip:${ip}`

  // Verificar limite por email
  const emailLimit = rateLimitCache.get(emailKey)
  if (emailLimit && emailLimit.resetAt > now) {
    if (emailLimit.attempts >= MAX_ATTEMPTS) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: emailLimit.resetAt
      }
    }
  }

  // Verificar limite por IP (mais restritivo: 10 tentativas)
  const ipLimit = rateLimitCache.get(ipKey)
  if (ipLimit && ipLimit.resetAt > now) {
    if (ipLimit.attempts >= 10) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: ipLimit.resetAt
      }
    }
  }

  return { allowed: true, remaining: MAX_ATTEMPTS, resetAt: now + RATE_LIMIT_WINDOW }
}

function recordAttempt(email: string, ip: string) {
  const now = Date.now()
  const emailKey = `email:${email}`
  const ipKey = `ip:${ip}`

  // Incrementar tentativas por email
  const emailLimit = rateLimitCache.get(emailKey)
  if (emailLimit && emailLimit.resetAt > now) {
    emailLimit.attempts++
  } else {
    rateLimitCache.set(emailKey, { attempts: 1, resetAt: now + RATE_LIMIT_WINDOW })
  }

  // Incrementar tentativas por IP
  const ipLimit = rateLimitCache.get(ipKey)
  if (ipLimit && ipLimit.resetAt > now) {
    ipLimit.attempts++
  } else {
    rateLimitCache.set(ipKey, { attempts: 1, resetAt: now + RATE_LIMIT_WINDOW })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseServiceKey) {
      console.error('❌ [ADMIN LOGIN] SUPABASE_SERVICE_ROLE_KEY não configurada')
      return NextResponse.json(
        { error: 'Configuração do servidor inválida' },
        { status: 500 }
      )
    }

    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    // Sanitizar inputs (proteção contra SQL Injection)
    const sanitizedEmail = email.trim().toLowerCase()
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const ip = getClientIP(request)

    // Verificar rate limiting
    const rateLimit = await checkRateLimit(sanitizedEmail, ip)
    if (!rateLimit.allowed) {
      const resetMinutes = Math.ceil((rateLimit.resetAt - Date.now()) / 60000)
      
      // Registrar tentativa bloqueada
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
      await supabaseAdmin.from('admin_login_attempts').insert({
        email: sanitizedEmail,
        ip_address: ip,
        user_agent: userAgent,
        success: false,
        failure_reason: 'Rate limit excedido'
      })

      return NextResponse.json(
        { 
          error: `Muitas tentativas. Aguarde ${resetMinutes} minuto(s) antes de tentar novamente.` 
        },
        { status: 429 }
      )
    }

    // Criar cliente Supabase Admin
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Tentar fazer login
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email: sanitizedEmail,
      password
    })

    if (authError || !authData?.user) {
      // Registrar tentativa falha
      recordAttempt(sanitizedEmail, ip)
      await supabaseAdmin.from('admin_login_attempts').insert({
        email: sanitizedEmail,
        ip_address: ip,
        user_agent: userAgent,
        success: false,
        failure_reason: authError?.message || 'Credenciais inválidas'
      })

      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 401 }
      )
    }

    // Verificar se o usuário é admin
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, role, is_system_admin')
      .eq('id', authData.user.id)
      .maybeSingle()

    if (userError || !userData) {
      recordAttempt(sanitizedEmail, ip)
      await supabaseAdmin.from('admin_login_attempts').insert({
        email: sanitizedEmail,
        ip_address: ip,
        user_agent: userAgent,
        success: false,
        failure_reason: 'Usuário não encontrado'
      })

      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 401 }
      )
    }

    // Verificar role e is_system_admin
    if (userData.role !== 'admin' || !userData.is_system_admin) {
      recordAttempt(sanitizedEmail, ip)
      await supabaseAdmin.from('admin_login_attempts').insert({
        email: sanitizedEmail,
        ip_address: ip,
        user_agent: userAgent,
        success: false,
        failure_reason: 'Usuário não é administrador'
      })

      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Login bem-sucedido - registrar sucesso
    await supabaseAdmin.from('admin_login_attempts').insert({
      email: sanitizedEmail,
      ip_address: ip,
      user_agent: userAgent,
      success: true
    })

    // Limpar rate limit para este email/IP em caso de sucesso
    rateLimitCache.delete(`email:${sanitizedEmail}`)
    rateLimitCache.delete(`ip:${ip}`)

    // Retornar token de sessão (o cliente Supabase já gerencia a sessão)
    return NextResponse.json({
      success: true,
      user: {
        id: userData.id,
        email: userData.email,
        role: userData.role
      },
      session: authData.session
    })

  } catch (error: any) {
    console.error('❌ [ADMIN LOGIN] Erro interno:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

