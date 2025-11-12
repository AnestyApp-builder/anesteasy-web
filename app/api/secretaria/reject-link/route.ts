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

export async function POST(request: NextRequest) {
  try {
    const { notificationId } = await request.json()

    if (!notificationId) {
      return NextResponse.json(
        { success: false, error: 'notificationId é obrigatório' },
        { status: 400 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Configuração do Supabase não encontrada' },
        { status: 500 }
      )
    }

    // Obter secretária autenticada
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const accessToken = authHeader.replace('Bearer ', '')

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken)

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Sessão inválida' },
        { status: 401 }
      )
    }

    // Buscar secretária pelo email do usuário
    const { data: secretaria } = await supabaseAdmin
      .from('secretarias')
      .select('id')
      .eq('email', user.email)
      .single()

    if (!secretaria) {
      return NextResponse.json(
        { success: false, error: 'Secretária não encontrada' },
        { status: 404 }
      )
    }

    // Verificar se a notificação pertence à secretária
    const { data: notification } = await supabaseAdmin
      .from('notifications')
      .select('id, user_id')
      .eq('id', notificationId)
      .single()

    if (!notification || notification.user_id !== secretaria.id) {
      return NextResponse.json(
        { success: false, error: 'Notificação não encontrada' },
        { status: 404 }
      )
    }

    // Atualizar status da solicitação
    await supabaseAdmin
      .from('secretaria_link_requests')
      .update({ status: 'rejected' })
      .eq('notification_id', notificationId)
      .eq('status', 'pending')

    // Marcar notificação como lida (recusada)
    await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)

    return NextResponse.json({
      success: true,
      message: 'Solicitação recusada'
    })

  } catch (error) {
    console.error('Erro ao recusar vinculação:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno' },
      { status: 500 }
    )
  }
}

