import { NextRequest, NextResponse } from 'next/server'
import { procedureService } from '@/lib/services/procedure-service'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    const { procedureData, userId } = body

    if (!procedureData || !userId) {
      return NextResponse.json(
        { error: 'Dados incompletos: procedureData e userId são obrigatórios' },
        { status: 400 }
      )
    }

    const data = await procedureService.createProcedure(procedureData, userId)
    const elapsedTime = Date.now() - startTime

    logger.info(`[API-CREATE-PROCEDURE] ✅ Procedimento criado via Service! ID: ${data.id} (${elapsedTime}ms)`)

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        procedure_name: data.procedure_name,
        created_at: data.created_at
      }
    })
  } catch (error: unknown) {
    const elapsedTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao criar procedimento'
    
    logger.error(`[API-CREATE-PROCEDURE] Erro inesperado (${elapsedTime}ms):`, error)
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
