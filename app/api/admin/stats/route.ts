import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zmtwwajyhusyrugobxur.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export async function GET(request: NextRequest) {
  try {
    if (!supabaseServiceKey) {
      return NextResponse.json({ error: 'Configuração do servidor inválida' }, { status: 500 })
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '').trim()
    const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role, is_system_admin')
      .eq('id', user.id)
      .maybeSingle()

    if (!userData || userData.role !== 'admin' || !userData.is_system_admin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      usersResult,
      proceduresResult,
      recentLoginsResult,
      anestesistasResult
    ] = await Promise.all([
      supabaseAdmin
        .from('users')
        .select('id, last_login_at, created_at', { count: 'exact' })
        .eq('role', 'anestesista'),
      
      supabaseAdmin
        .from('procedures')
        .select('id, procedure_date, created_at', { count: 'exact' }),
      
      supabaseAdmin
        .from('users')
        .select('id, email, last_login_at, created_at, name, role')
        .neq('role', 'admin')
        .limit(100),
      
      supabaseAdmin
        .from('users')
        .select('id, email, subscription_plan, subscription_status, trial_ends_at')
        .eq('role', 'anestesista')
    ])

    const activeUsers = usersResult.data?.filter(
      user => user.last_login_at && new Date(user.last_login_at) >= thirtyDaysAgo
    ).length || 0

    const proceduresThisMonth = proceduresResult.data?.filter(
      proc => {
        const procDate = new Date(proc.procedure_date || proc.created_at)
        return procDate >= thisMonthStart
      }
    ).length || 0

    const sortedLogins = (recentLoginsResult.data || [])
      .sort((a, b) => {
        const dateA = a.last_login_at ? new Date(a.last_login_at).getTime() : (a.created_at ? new Date(a.created_at).getTime() : 0)
        const dateB = b.last_login_at ? new Date(b.last_login_at).getTime() : (b.created_at ? new Date(b.created_at).getTime() : 0)
        return dateB - dateA
      })
      .slice(0, 10)

    let freeTrialUsers = 0
    let paidUsers = 0
    let unpaidUsers = 0

    anestesistasResult.data?.forEach((user) => {
      const trialEndsAt = user.trial_ends_at ? new Date(user.trial_ends_at) : null
      const subscriptionStatus = user.subscription_status || 'inactive'

      if (trialEndsAt && trialEndsAt > now) {
        freeTrialUsers++
      } else if (subscriptionStatus === 'active') {
        paidUsers++
      } else {
        unpaidUsers++
      }
    })

    return NextResponse.json({
      totalUsers: usersResult.count || 0,
      activeUsers,
      totalAnestesistas: usersResult.count || 0,
      totalProcedures: proceduresResult.count || 0,
      proceduresThisMonth,
      recentLogins: sortedLogins,
      registerClicks: 0,
      freeTrialUsers,
      paidUsers,
      unpaidUsers
    })

  } catch (error: any) {
    console.error('❌ [ADMIN STATS] Erro:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
