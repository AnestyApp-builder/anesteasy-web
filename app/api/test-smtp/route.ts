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
  try {
    const { email, nome, senhaTemporaria } = await request.json()

    if (!email || !nome || !senhaTemporaria) {
      return NextResponse.json(
        { error: 'Email, nome e senha temporária são obrigatórios' },
        { status: 400 }
      )
    }

    if (!supabaseServer) {
      return NextResponse.json({
        success: false,
        error: 'Cliente Supabase não configurado',
        message: 'SUPABASE_SERVICE_ROLE_KEY não está configurada'
      }, { status: 500 })
    }

    // Testar invocação da Edge Function
    try {
      const { data: edgeFunctionData, error: edgeFunctionError } = await supabaseServer.functions.invoke('send-secretaria-welcome', {
        body: {
          to: email,
          nome: nome,
          senhaTemporaria: senhaTemporaria,
          subject: 'Teste SMTP - AnestEasy'
        },
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (edgeFunctionError) {
        return NextResponse.json({
          success: false,
          error: 'Erro ao invocar Edge Function',
          details: edgeFunctionError.message || JSON.stringify(edgeFunctionError),
          check: 'Verifique se a Edge Function está deployada e ativa'
        }, { status: 500 })
      }

      if (edgeFunctionData) {
        if (edgeFunctionData.success) {
          return NextResponse.json({
            success: true,
            message: '✅ SMTP configurado corretamente! Email enviado com sucesso.',
            data: edgeFunctionData
          })
        } else {
          return NextResponse.json({
            success: false,
            error: edgeFunctionData.error || 'Erro ao enviar email',
            message: edgeFunctionData.message || 'Verifique as credenciais SMTP',
            details: edgeFunctionData.details || edgeFunctionData,
            check: 'Configure SMTP_USER e SMTP_PASS na Edge Function'
          }, { status: 500 })
        }
      }

      return NextResponse.json({
        success: false,
        error: 'Resposta vazia da Edge Function',
        check: 'Verifique os logs da Edge Function no Supabase Dashboard'
      }, { status: 500 })

    } catch (invokeError) {
      return NextResponse.json({
        success: false,
        error: 'Erro ao invocar Edge Function',
        details: invokeError instanceof Error ? invokeError.message : 'Erro desconhecido',
        check: 'Verifique se SUPABASE_SERVICE_ROLE_KEY está configurada corretamente'
      }, { status: 500 })
    }

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Erro ao processar teste',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

