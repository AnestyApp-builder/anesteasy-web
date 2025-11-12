import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Cliente Supabase para servidor (com service role key)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Criar cliente Supabase Admin
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

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email é obrigatório' },
        { status: 400 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Configuração do Supabase não encontrada',
        message: 'Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY'
      }, { status: 500 })
    }

    // Testar SMTP usando resetPasswordForEmail (usa SMTP configurado no Supabase)
    console.log('📧 Testando SMTP do Supabase Auth...')
    console.log(`📧 Email de destino: ${email}`)

    try {
      // Usar resetPasswordForEmail para testar SMTP
      // Isso vai enviar um email usando o SMTP configurado no Supabase
      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: {
          redirectTo: 'https://anesteasy.com.br/reset-password?test=true'
        }
      })

      if (error) {
        console.error('❌ Erro ao gerar link de recuperação:', error)
        
        // Verificar se é erro de SMTP
        if (error.message?.includes('SMTP') || error.message?.includes('email') || error.message?.includes('send')) {
          return NextResponse.json({
            success: false,
            error: 'Erro de SMTP',
            message: 'Não foi possível enviar email. Verifique a configuração SMTP no Supabase Dashboard.',
            details: error.message,
            check: [
              '1. Acesse Supabase Dashboard → Settings → Authentication → SMTP Settings',
              '2. Verifique se "Enable custom SMTP" está ativado',
              '3. Verifique se SMTP_HOST, SMTP_PORT, SMTP_USER e SMTP_PASS estão configurados',
              '4. Teste as credenciais SMTP'
            ]
          }, { status: 500 })
        }

        return NextResponse.json({
          success: false,
          error: 'Erro ao gerar link de recuperação',
          details: error.message,
          message: 'Verifique se o email existe no sistema'
        }, { status: 500 })
      }

      if (data) {
        console.log('✅ Link gerado com sucesso!')
        console.log('📧 Link gerado:', data.properties?.action_link ? 'Sim' : 'Não')
        
        // IMPORTANTE: generateLink apenas gera o link, não garante que o email foi enviado
        // O Supabase pode retornar sucesso mesmo se o SMTP falhar silenciosamente
        
        return NextResponse.json({
          success: true,
          warning: true,
          message: '⚠️ Link gerado, mas isso NÃO garante que o email foi enviado!',
          details: {
            email: email,
            linkGenerated: !!data.properties?.action_link,
            actionLink: data.properties?.action_link || 'Não disponível',
            note: 'O Supabase pode gerar o link mesmo se o SMTP não estiver funcionando.'
          },
          troubleshooting: [
            '1. Verifique os logs do Supabase Dashboard → Logs → Auth',
            '2. Procure por erros de SMTP nos logs',
            '3. Verifique se o email chegou na caixa de entrada',
            '4. Verifique a pasta de spam/lixo eletrônico',
            '5. Teste as credenciais SMTP manualmente',
            '6. Verifique se "Enable custom SMTP" está realmente ativado',
            '7. Verifique se SMTP_HOST, SMTP_PORT, SMTP_USER e SMTP_PASS estão corretos'
          ],
          nextSteps: [
            'Se o email não chegou, o SMTP provavelmente não está funcionando corretamente.',
            'Verifique as configurações SMTP no Supabase Dashboard.',
            'Teste as credenciais SMTP com um cliente de email (Outlook, Thunderbird, etc).',
            'Considere usar um serviço de email mais confiável como Resend ou SendGrid.'
          ]
        })
      }

      return NextResponse.json({
        success: false,
        error: 'Resposta inesperada',
        message: 'Não foi possível determinar o resultado do teste'
      }, { status: 500 })

    } catch (testError) {
      console.error('❌ Erro ao testar SMTP:', testError)
      return NextResponse.json({
        success: false,
        error: 'Erro ao testar SMTP',
        details: testError instanceof Error ? testError.message : 'Erro desconhecido',
        message: 'Verifique a configuração do Supabase'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ Erro ao processar teste:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro ao processar teste',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

