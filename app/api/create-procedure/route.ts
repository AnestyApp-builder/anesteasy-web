import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    console.log('[API-CREATE-PROCEDURE] Iniciando criação de procedimento via API route...')
    
    // Verificar se as variáveis de ambiente estão configuradas
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[API-CREATE-PROCEDURE] Variáveis de ambiente não configuradas')
      return NextResponse.json(
        { error: 'Configuração do servidor incompleta' },
        { status: 500 }
      )
    }

    // Obter dados do corpo da requisição
    const body = await request.json()
    const { procedureData, userId } = body

    if (!procedureData || !userId) {
      console.error('[API-CREATE-PROCEDURE] Dados incompletos:', { hasProcedureData: !!procedureData, hasUserId: !!userId })
      return NextResponse.json(
        { error: 'Dados incompletos: procedureData e userId são obrigatórios' },
        { status: 400 }
      )
    }

    console.log('[API-CREATE-PROCEDURE] Dados recebidos:', {
      userId,
      procedure_name: procedureData.procedure_name,
      patient_name: procedureData.patient_name,
      fieldsCount: Object.keys(procedureData).length
    })

    // Criar cliente Supabase com service role (bypass RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Garantir que user_id está no payload
    const dataToInsert = {
      ...procedureData,
      user_id: userId
    }

    // Limpar campos undefined/null vazios
    const cleanData = Object.fromEntries(
      Object.entries(dataToInsert).filter(([_, value]) => value !== undefined && value !== null && value !== '')
    )

    console.log('[API-CREATE-PROCEDURE] Inserindo no banco...', {
      fieldsCount: Object.keys(cleanData).length,
      payloadSize: JSON.stringify(cleanData).length
    })

    // Inserir no banco usando service role (bypass RLS)
    const { data, error } = await supabaseAdmin
      .from('procedures')
      .insert(cleanData)
      .select()
      .single()

    const elapsedTime = Date.now() - startTime

    if (error) {
      console.error('[API-CREATE-PROCEDURE] Erro na inserção:', error)
      return NextResponse.json(
        { 
          error: error.message || 'Erro ao criar procedimento',
          code: error.code,
          details: error.details
        },
        { status: 500 }
      )
    }

    if (!data) {
      console.error('[API-CREATE-PROCEDURE] Inserção retornou null sem erro')
      return NextResponse.json(
        { error: 'Erro desconhecido ao criar procedimento' },
        { status: 500 }
      )
    }

    console.log(`[API-CREATE-PROCEDURE] ✅ Procedimento criado com sucesso! ID: ${data.id} (${elapsedTime}ms)`)

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        procedure_name: data.procedure_name,
        patient_name: data.patient_name,
        created_at: data.created_at
      }
    })
  } catch (error: any) {
    const elapsedTime = Date.now() - startTime
    console.error(`[API-CREATE-PROCEDURE] Erro inesperado (${elapsedTime}ms):`, error)
    return NextResponse.json(
      { error: error.message || 'Erro desconhecido ao criar procedimento' },
      { status: 500 }
    )
  }
}

