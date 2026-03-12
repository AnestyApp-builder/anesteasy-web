import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

// Timeout padrão de 7 segundos
const REQUEST_TIMEOUT = 7000

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    )
  ])
}

export async function GET(request: NextRequest) {
  try {
    // Verificar token de autenticação
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { ok: false, authenticated: false, message: 'Token não fornecido' },
        { status: 401 }
      )
    }

    const accessToken = authHeader.replace('Bearer ', '').trim()
    if (!accessToken) {
      return NextResponse.json(
        { ok: false, authenticated: false, message: 'Token inválido' },
        { status: 401 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { ok: false, message: 'Configuração do servidor inválida' },
        { status: 500 }
      )
    }

    // Executar todas as verificações em paralelo com timeout
    return await withTimeout(
      checkAuthStatus(accessToken),
      REQUEST_TIMEOUT
    ).catch((error) => {
      return NextResponse.json(
        {
          ok: false,
          authenticated: false,
          message: 'Timeout na verificação. Tente novamente.'
        },
        { status: 408 }
      )
    })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, authenticated: false, message: 'Erro interno' },
      { status: 500 }
    )
  }
}

async function checkAuthStatus(accessToken: string): Promise<NextResponse> {
  // 1. Verificar autenticação e obter usuário
  const { data: { user }, error: authError } = await supabaseAdmin!.auth.getUser(accessToken)

  if (authError || !user) {
    return NextResponse.json({
      ok: false,
      authenticated: false,
      message: 'Usuário não autenticado'
    })
  }

  // 2. Verificar email confirmado
  const emailConfirmed = !!user.email_confirmed_at

  // 3. Verificar tipo de usuário e assinatura em paralelo
  const [secretariaResult, userResult, subscriptionResult] = await Promise.all([
    // Verificar se é secretária
    supabaseAdmin!
      .from('secretarias')
      .select('id')
      .eq('id', user.id)
      .maybeSingle(),
    
    // Verificar se é anestesista
    supabaseAdmin!
      .from('users')
      .select('id, subscription_status, trial_ends_at, created_at, free_months')
      .eq('id', user.id)
      .maybeSingle(),
    
    // Verificar assinatura ativa
    supabaseAdmin!
      .from('subscriptions')
      .select('id, status, current_period_end')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
  ])

  // Determinar role
  let role: 'secretaria' | 'anestesista' | 'admin' = 'anestesista'
  if (secretariaResult.data) {
    role = 'secretaria'
  } else if (userResult.data) {
    role = 'anestesista'
  }

  // Verificar se é admin (verificar se tem permissões especiais)
  // Por enquanto, assumimos que admin é verificado em outro lugar
  // Se necessário, adicionar verificação aqui

  // Verificar assinatura/trial
  let subscriptionStatus: 'active' | 'trial' | 'expired' | 'none' = 'none'
  let hasAccess = false

  if (role === 'secretaria') {
    // Secretárias sempre têm acesso
    subscriptionStatus = 'active'
    hasAccess = true
  } else if (userResult.data) {
    const now = new Date()
    
    // Verificar período de teste primeiro
    let trialEndsAt: Date | null = null
    if (userResult.data.trial_ends_at) {
      trialEndsAt = new Date(userResult.data.trial_ends_at)
    } else if (userResult.data.created_at) {
      trialEndsAt = new Date(new Date(userResult.data.created_at).getTime() + 7 * 24 * 60 * 60 * 1000)
    }

    // Adicionar meses grátis se houver
    const freeMonths = userResult.data.free_months || 0
    if (trialEndsAt && freeMonths > 0) {
      trialEndsAt = new Date(trialEndsAt.getTime() + (freeMonths * 30 * 24 * 60 * 60 * 1000))
    }

    if (trialEndsAt && now <= trialEndsAt) {
      subscriptionStatus = 'trial'
      hasAccess = true
    } else if (subscriptionResult.data) {
      const subscription = subscriptionResult.data
      const periodEnd = subscription.current_period_end 
        ? new Date(subscription.current_period_end)
        : null

      if (subscription.status === 'active' && periodEnd && now <= periodEnd) {
        subscriptionStatus = 'active'
        hasAccess = true
      } else if (subscription.status === 'cancelled' && periodEnd && now <= periodEnd) {
        subscriptionStatus = 'active' // Ainda tem acesso até fim do período
        hasAccess = true
      } else if (subscription.status === 'pending') {
        subscriptionStatus = 'active' // Acesso limitado
        hasAccess = true
      } else {
        subscriptionStatus = 'expired'
        hasAccess = false
      }
    } else {
      // Sem assinatura e trial expirado
      if (trialEndsAt && now > trialEndsAt) {
        subscriptionStatus = 'expired'
        hasAccess = false
      } else {
        subscriptionStatus = 'none'
        hasAccess = false
      }
    }
  }

  return NextResponse.json({
    ok: true,
    authenticated: true,
    email_confirmed: emailConfirmed,
    role,
    subscription_status: subscriptionStatus,
    has_access: hasAccess,
    user_id: user.id,
    email: user.email
  })
}

