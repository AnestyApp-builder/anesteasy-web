import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zmtwwajyhusyrugobxur.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export async function GET(request: NextRequest) {
  try {
    // Obter token de autenticação
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { hasAccess: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '').trim()
    
    // Verificar usuário autenticado
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return NextResponse.json(
        { hasAccess: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Usar Service Role para bypass RLS
    if (!supabaseServiceKey) {
      return NextResponse.json(
        { hasAccess: false, error: 'Configuração do servidor inválida' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // IMPORTANTE: Verificar assinatura ativa PRIMEIRO (prioridade sobre trial)
    // Verificar assinatura ativa
    const { data: subscription, error: subscriptionError } = await supabaseAdmin
      .from('subscriptions')
      .select('id, status, current_period_end')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (!subscriptionError && subscription) {
      const periodEnd = new Date(subscription.current_period_end)
      const now = new Date()
      
      if (periodEnd >= now) {
        const daysRemaining = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        return NextResponse.json({
          hasAccess: true,
          reason: 'Assinatura ativa',
          subscriptionStatus: 'active',
          expiresAt: subscription.current_period_end,
          daysRemaining: daysRemaining > 0 ? daysRemaining : 0
        })
      }
    }

    // Se não tem assinatura ativa, verificar período de teste gratuito
    const { data: userData, error: userDataError } = await supabaseAdmin
      .from('users')
      .select('trial_ends_at, created_at, free_months')
      .eq('id', user.id)
      .maybeSingle()

    if (!userDataError && userData) {
      const now = new Date()
      const freeMonths = userData.free_months || 0
      
      // Calcular data base do término do teste
      // Se trial_ends_at existe, usar ele como base
      // Se não existe, calcular a partir de created_at + 7 dias
      let trialEndsAt: Date | null = null
      
      if (userData.trial_ends_at) {
        // Usar trial_ends_at como base
        trialEndsAt = new Date(userData.trial_ends_at)
      } else if (userData.created_at) {
        // Calcular a partir de created_at + 7 dias
        trialEndsAt = new Date(new Date(userData.created_at).getTime() + 7 * 24 * 60 * 60 * 1000)
      }

      // Adicionar meses grátis se houver (cada mês = 30 dias)
      if (trialEndsAt && freeMonths > 0) {
        trialEndsAt = new Date(trialEndsAt.getTime() + (freeMonths * 30 * 24 * 60 * 60 * 1000))
      }

      if (trialEndsAt && now <= trialEndsAt) {
        const daysRemaining = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        return NextResponse.json({
          hasAccess: true,
          reason: freeMonths > 0 
            ? `Período gratuito (${daysRemaining} dias restantes - ${freeMonths} ${freeMonths === 1 ? 'mês grátis' : 'meses grátis'} incluídos)`
            : `Período de teste gratuito (${daysRemaining} dias restantes)`,
          subscriptionStatus: 'trial',
          expiresAt: trialEndsAt.toISOString(),
          daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
          trialInfo: {
            trial_ends_at: trialEndsAt.toISOString(),
            free_months: freeMonths,
            isInTrial: true,
            daysRemaining: daysRemaining > 0 ? daysRemaining : 0
          }
        })
      }
    }

    // Retornar trialInfo mesmo quando não está ativo
    // userData já foi buscado anteriormente, usar ele
    return NextResponse.json({
      hasAccess: false,
      reason: 'Nenhuma assinatura ativa ou período de teste expirado',
      subscriptionStatus: 'inactive',
      trialInfo: {
        trial_ends_at: userData?.trial_ends_at || null,
        free_months: userData?.free_months || 0,
        isInTrial: false,
        daysRemaining: 0
      }
    })

  } catch (error: any) {
    return NextResponse.json(
      { hasAccess: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

