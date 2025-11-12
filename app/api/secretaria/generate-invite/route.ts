import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Cliente admin para operações privilegiadas
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
    const { email } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Email válido é obrigatório' },
        { status: 400 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Configuração do Supabase não encontrada' },
        { status: 500 }
      )
    }

    // Obter token de autenticação do header
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado. Faça login novamente.' },
        { status: 401 }
      )
    }

    const accessToken = authHeader.replace('Bearer ', '')

    // Verificar usuário autenticado
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken)

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Sessão inválida. Faça login novamente.' },
        { status: 401 }
      )
    }

    // Verificar se é anestesista (não secretária)
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json(
        { success: false, error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se email já é anestesista
    const { data: existingAnestesista } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('email', email)
      .maybeSingle()

    if (existingAnestesista) {
      return NextResponse.json(
        { success: false, error: 'Este email já está cadastrado como anestesista' },
        { status: 400 }
      )
    }

    // Verificar se secretária já existe
    const { data: existingSecretaria } = await supabaseAdmin
      .from('secretarias')
      .select('id, email, nome')
      .eq('email', email)
      .maybeSingle()

    if (existingSecretaria) {
      // Secretária já existe - criar notificação e solicitação de vinculação
      const { data: anestesistaData } = await supabaseAdmin
        .from('users')
        .select('id, name, email')
        .eq('id', user.id)
        .single()

      const anestesistaName = anestesistaData?.name || userData.email
      
      // Criar notificação ANTES da solicitação
      console.log('📧 [API] Criando notificação para secretária...')
      console.log('   Secretária ID:', existingSecretaria.id)
      console.log('   Anestesista:', anestesistaName, userData.email)
      
      let notification = null
      let notificationError = null
      
      // Tentar criar notificação até 3 vezes se necessário
      for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`🔄 [API] Tentativa ${attempt} de criar notificação...`)
        
        const { data: notifData, error: notifErr } = await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: existingSecretaria.id,
            title: 'Solicitação de Vinculação',
            message: `${anestesistaName} (${userData.email}) deseja vincular você como secretária. Acesse seu dashboard para aceitar ou recusar.`,
            type: 'link_request'
          })
          .select()
          .single()

        if (notifErr) {
          console.error(`❌ [API] Erro na tentativa ${attempt}:`, notifErr)
          console.error('   Detalhes:', JSON.stringify(notifErr, null, 2))
          notificationError = notifErr
          
          // Se não for erro de duplicação, tentar novamente
          if (attempt < 3 && !notifErr.message?.includes('duplicate')) {
            await new Promise(resolve => setTimeout(resolve, 500)) // Aguardar 500ms
            continue
          }
        } else {
          notification = notifData
          console.log(`✅ [API] Notificação criada com sucesso na tentativa ${attempt}:`, notification.id)
          break
        }
      }

      if (!notification && notificationError) {
        console.error('❌ [API] FALHA CRÍTICA: Não foi possível criar notificação após 3 tentativas')
        console.error('   Último erro:', JSON.stringify(notificationError, null, 2))
        // Continuar mesmo assim - criar a solicitação de qualquer forma
      }

      // Criar solicitação de vinculação (mesmo se a notificação falhou)
      console.log('📝 [API] Criando solicitação de vinculação...')
      console.log('   Anestesista ID:', user.id)
      console.log('   Secretária ID:', existingSecretaria.id)
      console.log('   Notification ID:', notification?.id || 'N/A')
      
      const { data: requestData, error: requestError } = await supabaseAdmin
        .from('secretaria_link_requests')
        .insert({
          anestesista_id: user.id,
          secretaria_id: existingSecretaria.id,
          notification_id: notification?.id || null,
          status: 'pending'
        })
        .select()
        .single()

      if (requestError) {
        console.error('❌ [API] Erro ao criar solicitação de vinculação:', requestError)
        console.error('   Detalhes do erro:', JSON.stringify(requestError, null, 2))
        return NextResponse.json(
          { 
            success: false, 
            error: 'Erro ao criar solicitação de vinculação. Tente novamente.',
            details: requestError.message
          },
          { status: 500 }
        )
      } else {
        console.log('✅ [API] Solicitação de vinculação criada:', requestData)
      }
      
      // Se a notificação não foi criada, tentar criar novamente
      if (!notification && notificationError) {
        console.log('🔄 [API] Tentando criar notificação novamente...')
        const { data: retryNotification, error: retryError } = await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: existingSecretaria.id,
            title: 'Solicitação de Vinculação',
            message: `${anestesistaName} (${userData.email}) deseja vincular você como secretária. Acesse seu dashboard para aceitar ou recusar.`,
            type: 'link_request'
          })
          .select()
          .single()
        
        if (retryNotification) {
          console.log('✅ [API] Notificação criada na segunda tentativa:', retryNotification.id)
          // Atualizar a solicitação com o ID da notificação
          await supabaseAdmin
            .from('secretaria_link_requests')
            .update({ notification_id: retryNotification.id })
            .eq('id', requestData.id)
        } else if (retryError) {
          console.error('❌ [API] Erro na segunda tentativa de criar notificação:', retryError)
        }
      }

      return NextResponse.json({
        success: true,
        exists: true,
        message: 'Secretária já cadastrada. Uma notificação foi enviada para ela.',
        secretaria: {
          id: existingSecretaria.id,
          email: existingSecretaria.email,
          nome: existingSecretaria.nome
        }
      })
    }

    // Gerar token único
    const token = Buffer.from(`${email}-${Date.now()}-${Math.random()}`).toString('base64')
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 64)

    // Criar convite (expira em 7 dias)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('secretaria_invites')
      .insert({
        anestesista_id: user.id,
        email: email.toLowerCase().trim(),
        token: token,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single()

    if (inviteError) {
      console.error('Erro ao criar convite:', inviteError)
      return NextResponse.json(
        { success: false, error: 'Erro ao gerar link de convite' },
        { status: 500 }
      )
    }

    // Gerar URL do link de cadastro
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('.supabase.co', '') || 'https://anesteasy.com.br'
    const inviteUrl = `${baseUrl}/secretaria/register/${token}`

    return NextResponse.json({
      success: true,
      exists: false,
      invite: {
        id: invite.id,
        token: token,
        email: email,
        expiresAt: expiresAt.toISOString(),
        inviteUrl: inviteUrl
      },
      message: 'Link de cadastro gerado com sucesso!'
    })

  } catch (error) {
    console.error('Erro ao gerar convite:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno ao gerar convite' },
      { status: 500 }
    )
  }
}

