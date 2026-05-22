import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWhatsAppMessage } from '@/lib/providers/whatsapp/meta'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export async function POST(request: NextRequest) {
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

    const { targetUserId, message } = await request.json()

    if (!targetUserId || !message) {
      return NextResponse.json({ error: 'targetUserId e message são obrigatórios' }, { status: 400 })
    }

    if (message.length > 4096) {
      return NextResponse.json({ error: 'Mensagem muito longa (máx. 4096 caracteres)' }, { status: 400 })
    }

    // Buscar telefone do cliente exclusivamente via whatsapp_accounts (verificado)
    const { data: waAccount } = await supabaseAdmin
      .from('whatsapp_accounts')
      .select('phone_number')
      .eq('user_id', targetUserId)
      .eq('verified', true)
      .maybeSingle()

    const phoneNumber = waAccount?.phone_number

    if (!phoneNumber) {
      // Salvar como falha de auditoria
      await supabaseAdmin.from('admin_messages').insert({
        admin_user_id: user.id,
        target_user_id: targetUserId,
        target_phone: 'N/A',
        message_text: message,
        channel: 'whatsapp',
        status: 'failed',
        error_message: 'O usuário ainda não validou o WhatsApp no aplicativo',
      })

      return NextResponse.json({
        success: false,
        error: 'O usuário ainda não validou o WhatsApp no aplicativo. O envio está bloqueado.',
      }, { status: 400 })
    }

    // Limpar número (manter apenas dígitos)
    const cleanPhone = phoneNumber.replace(/\D/g, '')

    try {
      // Enviar via WhatsApp Cloud API
      const result = await sendWhatsAppMessage(cleanPhone, message)

      // Salvar registro de sucesso
      await supabaseAdmin.from('admin_messages').insert({
        admin_user_id: user.id,
        target_user_id: targetUserId,
        target_phone: cleanPhone,
        message_text: message,
        channel: 'whatsapp',
        status: 'sent',
        whatsapp_message_id: result?.messages?.[0]?.id || null,
      })

      return NextResponse.json({
        success: true,
        message: 'Mensagem enviada com sucesso',
        whatsapp_message_id: result?.messages?.[0]?.id || null,
      })

    } catch (sendError: any) {
      console.error('❌ [SEND WHATSAPP] Erro ao enviar:', sendError)

      // Salvar registro de falha
      await supabaseAdmin.from('admin_messages').insert({
        admin_user_id: user.id,
        target_user_id: targetUserId,
        target_phone: cleanPhone,
        message_text: message,
        channel: 'whatsapp',
        status: 'failed',
        error_message: sendError.message || 'Erro ao enviar mensagem',
      })

      // Verificar se é erro de janela de 24h
      const is24hError = sendError.message?.includes('outside') ||
                         sendError.message?.includes('24') ||
                         sendError.message?.includes('template')

      return NextResponse.json({
        success: false,
        error: is24hError
          ? 'Janela de 24h expirada. O cliente precisa ter enviado mensagem ao bot nas últimas 24 horas para receber mensagens de texto livre.'
          : sendError.message || 'Erro ao enviar mensagem',
      }, { status: 422 })
    }

  } catch (error: any) {
    console.error('❌ [SEND WHATSAPP] Erro:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
