import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export async function GET(request: NextRequest) {
  try {
    if (!supabaseServiceKey) {
      return NextResponse.json({ error: 'Configuração inválida' }, { status: 500 })
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '').trim()
    const supabaseAuth = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token)

    if (userError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    const { data: adminData } = await supabaseAdmin
      .from('users')
      .select('role, is_system_admin')
      .eq('id', user.id)
      .maybeSingle()

    if (!adminData || adminData.role !== 'admin' || !adminData.is_system_admin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const statusFilter = searchParams.get('status') || ''
    const offset = (page - 1) * limit

    let query = supabaseAdmin
      .from('admin_messages')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    query = query.range(offset, offset + limit - 1)

    const { data: messages, error, count } = await query

    if (error) {
      console.error('❌ [ADMIN MENSAGENS] Erro:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Enriquecer com dados do cliente
    const targetIds = [...new Set((messages || []).map(m => m.target_user_id))]
    let userMap: Record<string, { name: string; email: string }> = {}

    if (targetIds.length > 0) {
      const { data: usersData } = await supabaseAdmin
        .from('users')
        .select('id, name, email')
        .in('id', targetIds)

      if (usersData) {
        usersData.forEach(u => {
          userMap[u.id] = { name: u.name, email: u.email }
        })
      }
    }

    const enrichedMessages = (messages || []).map(msg => ({
      ...msg,
      target_user_name: userMap[msg.target_user_id]?.name || 'Desconhecido',
      target_user_email: userMap[msg.target_user_id]?.email || '',
    }))

    return NextResponse.json({
      data: enrichedMessages,
      total: count || 0,
      page,
      limit,
    })

  } catch (error: any) {
    console.error('❌ [ADMIN MENSAGENS] Erro:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
