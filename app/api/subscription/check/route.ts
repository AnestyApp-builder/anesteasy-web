import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const TRIAL_DAYS = 7

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ hasAccess: false, error: 'Não autorizado' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '').trim()

    // Verificar token via Supabase Auth
    const anonClient = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error: userError } = await anonClient.auth.getUser(token)

    if (userError || !user) {
      return NextResponse.json({ hasAccess: false, error: 'Não autorizado' }, { status: 401 })
    }

    // Admin client para bypass de RLS
    const adminClient = supabaseUrl && supabaseServiceKey
      ? createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } })
      : null

    if (!adminClient) {
      return NextResponse.json({ hasAccess: false, error: 'Configuração incompleta' }, { status: 500 })
    }

    // 1. Verificar assinatura paga ativa
    const { data: sub } = await adminClient
      .from('subscriptions')
      .select('status, current_period_end, plan_type')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const now = new Date()

    if (sub && sub.status === 'active' && new Date(sub.current_period_end) > now) {
      return NextResponse.json({
        hasAccess: true,
        has_access: true,
        status: 'active',
        trial_days_left: 0,
        plan_type: sub.plan_type,
        trialInfo: null
      })
    }

    // 2. Verificar trial — tentar buscar trial_ends_at do usuário
    let trialEndDate: Date | null = null
    let freeMonths = 0

    // Tentar buscar com todas as colunas; se falhar, tentar só as básicas
    const { data: userData, error: userDataError } = await adminClient
      .from('users')
      .select('created_at, trial_ends_at, free_months')
      .eq('id', user.id)
      .maybeSingle()

    if (!userDataError && userData) {
      // Coluna trial_ends_at existe e tem valor
      if ((userData as any).trial_ends_at) {
        trialEndDate = new Date((userData as any).trial_ends_at)
      } else if (userData.created_at) {
        trialEndDate = new Date(new Date(userData.created_at).getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
      }
      freeMonths = (userData as any).free_months || 0
    } else {
      // Colunas novas podem não existir — tentar só created_at
      const { data: basicUser } = await adminClient
        .from('users')
        .select('created_at')
        .eq('id', user.id)
        .maybeSingle()

      if (basicUser?.created_at) {
        trialEndDate = new Date(new Date(basicUser.created_at).getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
      } else {
        // Usuário não está na tabela users — usar email_confirmed_at do Auth como fallback
        if (user.email_confirmed_at) {
          trialEndDate = new Date(new Date(user.email_confirmed_at).getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
        } else if (user.created_at) {
          trialEndDate = new Date(new Date(user.created_at).getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
        }
      }
    }

    // Adicionar meses grátis
    if (trialEndDate && freeMonths > 0) {
      trialEndDate = new Date(trialEndDate.getTime() + freeMonths * 30 * 24 * 60 * 60 * 1000)
    }

    const diffTime = trialEndDate ? trialEndDate.getTime() - now.getTime() : -1
    const trialDaysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
    const isInTrial = trialDaysLeft > 0

    if (isInTrial) {
      return NextResponse.json({
        hasAccess: true,
        has_access: true,
        status: 'trial',
        trial_days_left: trialDaysLeft,
        plan_type: null,
        trialInfo: {
          trial_ends_at: trialEndDate?.toISOString() || null,
          free_months: freeMonths,
          isInTrial: true,
          daysRemaining: trialDaysLeft
        }
      })
    }

    // Sem acesso
    return NextResponse.json({
      hasAccess: false,
      has_access: false,
      status: 'inactive',
      trial_days_left: 0,
      plan_type: null,
      trialInfo: null
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor'
    console.error('[API-SUBSCRIPTION-CHECK] Erro:', error)
    return NextResponse.json({ hasAccess: false, error: errorMessage }, { status: 500 })
  }
}
