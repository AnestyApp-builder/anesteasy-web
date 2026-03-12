import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

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
  try {
    const { assunto, mensagem, nomeUsuario, emailUsuario } = await request.json()
    
    if (!assunto || !mensagem || !nomeUsuario || !emailUsuario) {
      return NextResponse.json(
        { success: false, message: 'Todos os campos são obrigatórios' },
        { status: 400 }
      )
    }

    // Função para escapar HTML
    const escapeHtml = (text: string) => {
      const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }
      return text.replace(/[&<>"']/g, m => map[m])
    }

    // Template do email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Solicitação de Suporte - AnestEasy</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #14b8a6; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0;">AnestEasy - Solicitação de Suporte</h1>
        </div>
        
        <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #14b8a6;">Nova solicitação de suporte</h2>
          
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #14b8a6;">
            <p style="margin: 10px 0;"><strong>Nome:</strong> ${escapeHtml(nomeUsuario)}</p>
            <p style="margin: 10px 0;"><strong>Email:</strong> <a href="mailto:${escapeHtml(emailUsuario)}" style="color: #14b8a6;">${escapeHtml(emailUsuario)}</a></p>
            <p style="margin: 10px 0;"><strong>Assunto:</strong> ${escapeHtml(assunto)}</p>
          </div>
          
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #14b8a6; margin-top: 0;">Mensagem:</h3>
            <div style="white-space: pre-wrap; color: #1f2937; line-height: 1.8;">${escapeHtml(mensagem)}</div>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            Esta mensagem foi enviada através do formulário de suporte do AnestEasy.
          </p>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
            Data/Hora: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
          </p>
        </div>
      </body>
      </html>
    `

    const emailText = `
Nova solicitação de suporte - AnestEasy

Nome: ${nomeUsuario}
Email: ${emailUsuario}
Assunto: ${assunto}

Mensagem:
${mensagem}

---
Data/Hora: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
Esta mensagem foi enviada através do formulário de suporte do AnestEasy.
    `

    // Enviar via Edge Function do Supabase
    if (supabaseServer) {
      try {
        const { data: edgeFunctionData, error: edgeFunctionError } = await supabaseServer.functions.invoke('send-support-email', {
          body: {
            to: 'contato@anesteasy.com.br',
            from: 'contato@anesteasy.com.br',
            subject: `[Suporte AnestEasy] ${assunto}`,
            html: emailHtml,
            text: emailText,
            replyTo: emailUsuario
          },
          headers: {
            'Content-Type': 'application/json'
          }
        })

        if (edgeFunctionError) {
          console.error('Erro ao enviar email de suporte:', edgeFunctionError)
          return NextResponse.json({
            success: false,
            message: 'Erro ao enviar mensagem. Tente novamente mais tarde.',
            error: edgeFunctionError.message
          }, { status: 500 })
        }

        if (edgeFunctionData?.success) {
          return NextResponse.json({
            success: true,
            message: 'Mensagem enviada com sucesso! Entraremos em contato em breve.'
          })
        }

        return NextResponse.json({
          success: false,
          message: 'Erro ao enviar mensagem. Tente novamente mais tarde.'
        }, { status: 500 })

      } catch (error) {
        console.error('Erro ao invocar Edge Function:', error)
        return NextResponse.json({
          success: false,
          message: 'Erro ao enviar mensagem. Tente novamente mais tarde.',
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        }, { status: 500 })
      }
    } else {
      return NextResponse.json({
        success: false,
        message: 'Serviço de email não configurado.'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Erro ao processar solicitação de suporte:', error)
    return NextResponse.json({
      success: false,
      message: 'Erro ao processar solicitação. Tente novamente.',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

