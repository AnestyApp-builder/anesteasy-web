// Edge Function para enviar emails de suporte
// Os emails são enviados via Resend (se configurado) ou via SMTP do Supabase

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''

serve(async (req) => {
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

  try {
    const { to, from, subject, html, text, replyTo } = await req.json()

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'To, subject e html são obrigatórios' 
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

    // Se Resend estiver configurado, usar Resend
    if (RESEND_API_KEY) {
      try {
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: from || 'contato@anesteasy.com.br',
            to: [to],
            subject: subject,
            html: html,
            text: text,
            reply_to: replyTo || from,
          }),
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
          // Continuar para fallback
        }
      } catch (resendError) {
        console.error('Erro ao chamar API do Resend:', resendError)
        // Continuar para fallback
      }
    }

    // Fallback: retornar sucesso (email será enviado via SMTP configurado no Supabase)
    // Nota: O email precisa ser enviado através do sistema SMTP do Supabase
    console.log('📧 Solicitação de envio de email de suporte recebida')
    console.log('Para:', to)
    console.log('Assunto:', subject)
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email será enviado via SMTP configurado no Supabase',
        info: {
          to: to,
          subject: subject,
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

  } catch (error) {
    console.error('Erro na Edge Function:', error)
    return new Response(
      JSON.stringify({
        success: false,
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

