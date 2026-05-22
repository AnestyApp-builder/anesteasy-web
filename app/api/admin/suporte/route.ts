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

    // Verificar autenticação admin
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

    // Verificar se é admin
    const { data: adminData } = await supabaseAdmin
      .from('users')
      .select('role, is_system_admin')
      .eq('id', user.id)
      .maybeSingle()

    if (!adminData || adminData.role !== 'admin' || !adminData.is_system_admin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Buscar mensagens inbound recentes de todos os usuários
    // Vamos agrupar as mensagens por usuário para mostrar um "Inbox"
    const { data: messages, error } = await supabaseAdmin
      .from('whatsapp_messages')
      .select(`
        *,
        users:user_id (id, name, email)
      `)
      .eq('direction', 'inbound')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('❌ [ADMIN SUPORTE] Erro ao buscar mensagens:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: messages })

  } catch (error: any) {
    console.error('❌ [ADMIN SUPORTE] Erro:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
