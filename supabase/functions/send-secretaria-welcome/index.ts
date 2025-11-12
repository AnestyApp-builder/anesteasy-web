// Edge Function para registrar solicitações de email
// Os emails são enviados pelo sistema de Auth do Supabase via SMTP configurado
// Configure SMTP em: Settings → Authentication → SMTP Settings

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  try {
    // CORS headers
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      })
    }

    const { to, nome, senhaTemporaria } = await req.json()

    if (!to || !nome || !senhaTemporaria) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email, nome e senha temporária são obrigatórios' 
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    // Esta Edge Function NÃO envia emails diretamente
    // Os emails são enviados pelo sistema de Auth do Supabase via SMTP configurado
    // Esta função apenas registra a solicitação
    
    console.log('📧 Solicitação de envio de email recebida')
    console.log('Para:', to)
    console.log('Nome:', nome)
    console.log('Senha temporária:', senhaTemporaria.substring(0, 3) + '***')
    
    // Retornar sucesso - o email será enviado pelo Supabase Auth SMTP
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Email será enviado pelo SMTP configurado no Supabase',
        info: {
          to: to,
          nome: nome,
          note: 'Configure SMTP em: Settings → Authentication → SMTP Settings'
        }
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
    
    /* CÓDIGO ANTIGO COM TEMPLATES - Não usado pois emails são enviados pelo Supabase Auth
    // Template HTML do email (se não fornecido)
    const emailHtml = html || `
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
          
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #14b8a6;">
            <p style="margin: 5px 0;"><strong>Email:</strong> ${to}</p>
            <p style="margin: 5px 0;"><strong>Senha temporária:</strong> <code style="background-color: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-size: 16px; font-weight: bold;">${senhaTemporaria}</code></p>
          </div>
          
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #92400e;"><strong>⚠️ Importante:</strong> Por questões de segurança, você será solicitada a trocar sua senha no primeiro login.</p>
          </div>
          
          <p>Para acessar o sistema:</p>
          <ol>
            <li>Acesse: <a href="https://anesteasy.com.br/login" style="color: #14b8a6;">https://anesteasy.com.br/login</a></li>
            <li>Faça login com seu email e a senha temporária acima</li>
            <li>Você será redirecionada automaticamente para trocar sua senha</li>
            <li>Após trocar a senha, você poderá acessar o dashboard</li>
          </ol>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://anesteasy.com.br/login" style="background-color: #14b8a6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Acessar Sistema</a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
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

    const emailText = text || `
      Olá, ${nome}!
      
      Você foi adicionada como secretária no sistema AnestEasy. Suas credenciais de acesso foram criadas:
      
      Email: ${to}
      Senha temporária: ${senhaTemporaria}
      
      ⚠️ Importante: Por questões de segurança, você será solicitada a trocar sua senha no primeiro login.
      
      Para acessar o sistema:
      1. Acesse: https://anesteasy.com.br/login
      2. Faça login com seu email e a senha temporária acima
      3. Você será redirecionada automaticamente para trocar sua senha
      4. Após trocar a senha, você poderá acessar o dashboard
      
      Se você não solicitou este acesso, por favor ignore este email.
      
      Atenciosamente,
      Equipe AnestEasy
    ` 
    */ // FIM DO CÓDIGO ANTIGO
    
    /* CÓDIGO REMOVIDO - Não usamos mais Resend, apenas SMTP do Supabase
    // Usar Resend para enviar email (se configurado)
    if (RESEND_API_KEY) {
      try {
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`
          },
          body: JSON.stringify({
            from: 'AnestEasy <noreply@anesteasy.com.br>',
            to: to,
            subject: subject || 'Bem-vinda ao AnestEasy - Suas credenciais de acesso',
            html: emailHtml,
            text: emailText
          })
        })

        if (resendResponse.ok) {
          const resendData = await resendResponse.json()
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Email enviado com sucesso via Resend',
              data: resendData
            }),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              },
            }
          )
        } else {
          const errorData = await resendResponse.text()
          console.error('Erro ao enviar email via Resend:', errorData)
        }
      } catch (resendError) {
        console.error('Erro ao chamar API do Resend:', resendError)
        // Continuar com fallback
      }
    }

    */ // FIM DO CÓDIGO REMOVIDO
  } catch (error) {
    console.error('Erro na Edge Function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Erro ao processar envio de email',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
})

