/**
 * API Route para criar attachment de procedimento
 * Solução server-side para contornar problemas de sessão/RLS no mobile
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export async function POST(request: NextRequest) {
  try {
    // Verificar se as variáveis de ambiente estão configuradas
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[API/CREATE-ATTACHMENT] Configuração do servidor incompleta')
      return NextResponse.json(
        { error: 'Configuração do servidor incompleta' },
        { status: 500 }
      )
    }

    // Obter dados do body
    const body = await request.json()
    const { procedure_id, file_name, file_size, file_type, file_url } = body


    // Validar campos obrigatórios
    if (!procedure_id || !file_name || !file_url) {
      console.error('[API/CREATE-ATTACHMENT] Dados incompletos:', { procedure_id, file_name, file_url: !!file_url })
      return NextResponse.json(
        { error: 'Dados incompletos: procedure_id, file_name e file_url são obrigatórios' },
        { status: 400 }
      )
    }

    // Criar cliente Supabase com service role (bypass RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Inserir attachment
    const { data, error } = await supabaseAdmin
      .from('procedure_attachments')
      .insert({
        procedure_id,
        file_name,
        file_size: file_size || 0,
        file_type: file_type || 'application/octet-stream',
        file_url
      })
      .select()
      .single()

    if (error) {
      console.error('[API/CREATE-ATTACHMENT] Erro ao inserir:', error)
      return NextResponse.json(
        { error: error.message || 'Erro ao criar attachment' },
        { status: 500 }
      )
    }


    return NextResponse.json({
      success: true,
      data: data
    })
  } catch (error: any) {
    console.error('[API/CREATE-ATTACHMENT] Erro inesperado:', error)
    return NextResponse.json(
      { error: error.message || 'Erro desconhecido ao criar attachment' },
      { status: 500 }
    )
  }
}

