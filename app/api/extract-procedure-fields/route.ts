import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { extractProcedureFromText } from '@/lib/providers/llm/openai'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    console.log('🤖 [EXTRACT-FIELDS] Iniciando extração via Service...')

    const { transcription } = await request.json()

    if (!transcription) {
      return NextResponse.json(
        { error: 'Nenhuma transcrição fornecida' },
        { status: 400 }
      )
    }

    const extractedData = await extractProcedureFromText(transcription)

    console.log('✅ [EXTRACT-FIELDS] Campos extraídos com sucesso!')

    // Validar campos obrigatórios
    const requiredFields = ['procedure_name', 'procedure_date', 'procedure_type', 'patient_name']
    const missingFields = requiredFields.filter(field => !extractedData[field])

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: 'Campos obrigatórios não foram identificados no comando de voz',
          missingFields,
          extractedData,
          suggestion: `Certifique-se de mencionar: ${missingFields.join(', ')}`,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(extractedData)

  } catch (error) {
    console.error('❌ [EXTRACT-FIELDS] Erro:', error)
    
    return NextResponse.json(
      { 
        error: 'Erro ao extrair campos do procedimento',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
