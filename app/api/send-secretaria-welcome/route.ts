import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Cliente Supabase para servidor (com service role key para invocar Edge Functions)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Criar cliente Supabase para servidor
const supabaseServer = supabaseUrl && supabaseServiceKey ? createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
) : null

export async function POST(request: NextRequest) {
  console.log('📧 [API] Recebida requisição para enviar email de boas-vindas')
  
  try {
    const { email, nome, senhaTemporaria } = await request.json()
    
    console.log('📧 [API] Dados recebidos:', { email, nome, senhaTemporaria: '***' })

    if (!email || !nome || !senhaTemporaria) {
      console.error('❌ [API] Dados incompletos')
      return NextResponse.json(
        { error: 'Email, nome e senha temporária são obrigatórios' },
        { status: 400 }
      )
    }

    // Template do email HTML com senha temporária destacada
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bem-vinda ao AnestEasy</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #14b8a6; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0;">AnestEasy</h1>
        </div>
        
        <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #14b8a6;">Olá, ${nome}!</h2>
          
          <p>Você foi adicionada como secretária no sistema AnestEasy. Suas credenciais de acesso foram criadas:</p>
          
          <div style="background-color: white; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #14b8a6; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p style="margin: 10px 0; font-size: 16px;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 10px 0; font-size: 16px;"><strong>Senha temporária:</strong></p>
            <div style="background-color: #f3f4f6; padding: 12px 16px; border-radius: 6px; margin: 10px 0; border: 2px solid #14b8a6; text-align: center;">
              <code style="font-size: 20px; font-weight: bold; color: #1f2937; letter-spacing: 2px; font-family: 'Courier New', monospace;">${senhaTemporaria}</code>
            </div>
          </div>
          
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #92400e;"><strong>⚠️ Importante:</strong> Por questões de segurança, você será solicitada a trocar sua senha no primeiro login.</p>
          </div>
          
          <p style="font-size: 16px; font-weight: 600; color: #1f2937; margin-top: 25px;">Para acessar o sistema:</p>
          <ol style="font-size: 15px; line-height: 1.8;">
            <li>Acesse: <a href="https://anesteasy.com.br/login" style="color: #14b8a6; text-decoration: none; font-weight: 600;">https://anesteasy.com.br/login</a></li>
            <li>Faça login com seu email: <strong>${email}</strong></li>
            <li>Digite a senha temporária: <strong>${senhaTemporaria}</strong></li>
            <li>Você será redirecionada automaticamente para trocar sua senha</li>
            <li>Após trocar a senha, você poderá acessar o dashboard</li>
          </ol>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://anesteasy.com.br/login" style="background-color: #14b8a6; color: white; padding: 14px 35px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">Acessar Sistema</a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            Se você não solicitou este acesso, por favor ignore este email.
          </p>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
            Atenciosamente,<br>
            <strong>Equipe AnestEasy</strong>
          </p>
        </div>
      </body>
      </html>
    `

    const emailText = `
      Olá, ${nome}!
      
      Você foi adicionada como secretária no sistema AnestEasy. Suas credenciais de acesso foram criadas:
      
      Email: ${email}
      Senha temporária: ${senhaTemporaria}
      
      ⚠️ Importante: Por questões de segurança, você será solicitada a trocar sua senha no primeiro login.
      
      Para acessar o sistema:
      1. Acesse: https://anesteasy.com.br/login
      2. Faça login com seu email: ${email}
      3. Digite a senha temporária: ${senhaTemporaria}
      4. Você será redirecionada automaticamente para trocar sua senha
      5. Após trocar a senha, você poderá acessar o dashboard
      
      Se você não solicitou este acesso, por favor ignore este email.
      
      Atenciosamente,
      Equipe AnestEasy
    `

    // Enviar via Edge Function do Supabase usando cliente servidor
    console.log('🔄 [API] Verificando cliente Supabase servidor...')
    
    if (supabaseServer) {
      console.log('✅ [API] Cliente Supabase servidor configurado')
      console.log('🔄 [API] Invocando Edge Function send-secretaria-welcome...')
      
      try {
        const { data: edgeFunctionData, error: edgeFunctionError } = await supabaseServer.functions.invoke('send-secretaria-welcome', {
          body: {
            to: email,
            nome: nome,
            senhaTemporaria: senhaTemporaria,
            html: emailHtml,
            text: emailText,
            subject: 'Bem-vinda ao AnestEasy - Suas credenciais de acesso'
          },
          headers: {
            'Content-Type': 'application/json'
          }
        })

        if (edgeFunctionError) {
          console.error('❌ [API] Erro ao invocar Edge Function:')
          console.error('Erro:', edgeFunctionError)
          return NextResponse.json({
            success: false,
            error: 'Erro ao invocar Edge Function',
            details: edgeFunctionError.message || JSON.stringify(edgeFunctionError),
            message: 'Verifique se a Edge Function está deployada e ativa'
          }, { status: 500 })
        } else if (edgeFunctionData) {
          console.log('✅ [API] Resposta da Edge Function recebida:')
          console.log('Dados:', edgeFunctionData)
          
          // Verificar se o email foi realmente enviado
          if (edgeFunctionData.success) {
            console.log('✅ [API] Email enviado com sucesso via Edge Function!')
            return NextResponse.json({
              success: true,
              message: 'Email enviado com sucesso! A secretária receberá um email com a senha temporária.',
              data: edgeFunctionData
            })
          } else {
            console.error('❌ [API] Edge Function retornou erro:')
            console.error('Erro:', edgeFunctionData.error)
            console.error('Mensagem:', edgeFunctionData.message)
            console.error('Detalhes:', edgeFunctionData.details)
            
            // SMTP não configurado ou erro no envio
            return NextResponse.json({
              success: false,
              error: edgeFunctionData.error || 'Erro ao enviar email',
              message: edgeFunctionData.message || 'Verifique as credenciais SMTP',
              details: edgeFunctionData.details || edgeFunctionData
            }, { status: 500 })
          }
        } else {
          console.warn('⚠️ [API] Edge Function não retornou dados')
        }
      } catch (invokeError) {
        console.error('❌ [API] Erro ao invocar Edge Function:')
        console.error('Erro:', invokeError)
        return NextResponse.json({
          success: false,
          error: 'Erro ao invocar Edge Function',
          details: invokeError instanceof Error ? invokeError.message : 'Erro desconhecido'
        }, { status: 500 })
      }
    } else {
      console.error('❌ [API] Cliente Supabase servidor não configurado')
      console.error('❌ [API] SUPABASE_SERVICE_ROLE_KEY não está configurada no .env.local')
      return NextResponse.json({
        success: false,
        error: 'Cliente Supabase não configurado',
        message: 'Configure SUPABASE_SERVICE_ROLE_KEY no arquivo .env.local'
      }, { status: 500 })
    }

    // Se chegou aqui, algo deu errado
    console.error('❌ [API] Fluxo inesperado - nenhuma resposta foi retornada')
    return NextResponse.json({
      success: false,
      error: 'Erro inesperado',
      message: 'Não foi possível processar o envio de email. Verifique os logs do servidor.',
      emailInfo: {
        to: email,
        nome: nome,
        senhaTemporaria: senhaTemporaria,
        subject: 'Bem-vinda ao AnestEasy - Suas credenciais de acesso'
      }
    }, { status: 500 })
  } catch (error) {
    console.error('Erro ao processar envio de email:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Erro ao processar envio de email',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

