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
    const { anestesistaId, notificationId } = await request.json()

    if (!anestesistaId || !notificationId) {
      return NextResponse.json(
        { success: false, error: 'anestesistaId e notificationId são obrigatórios' },
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

    // Verificar se já existe vinculação
    const { data: existingLink } = await supabaseAdmin
      .from('anestesista_secretaria')
      .select('id')
      .eq('anestesista_id', anestesistaId)
      .eq('secretaria_id', secretaria.id)
      .maybeSingle()

    if (existingLink) {
      // Já está vinculado, apenas marcar notificação como lida
      await supabaseAdmin
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

      return NextResponse.json({
        success: true,
        message: 'Você já está vinculada a este anestesista',
        alreadyLinked: true
      })
    }

    // Criar vinculação
    const { error: linkError } = await supabaseAdmin
      .from('anestesista_secretaria')
      .insert({
        anestesista_id: anestesistaId,
        secretaria_id: secretaria.id
      })

    if (linkError) {
      console.error('Erro ao criar vinculação:', linkError)
      return NextResponse.json(
        { success: false, error: 'Erro ao aceitar vinculação' },
        { status: 500 }
      )
    }

    // Atualizar status da solicitação
    await supabaseAdmin
      .from('secretaria_link_requests')
      .update({ status: 'accepted' })
      .eq('notification_id', notificationId)
      .eq('status', 'pending')

    // Marcar notificação como lida
    await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)

    return NextResponse.json({
      success: true,
      message: 'Vinculação aceita com sucesso!'
    })

  } catch (error) {
    console.error('Erro ao aceitar vinculação:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno' },
      { status: 500 }
    )
  }
}

