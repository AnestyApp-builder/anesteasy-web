import { NextRequest, NextResponse } from 'next/server'
import { adminNotifier } from '@/lib/notifications/admin-service'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    const { suggestion, userName, email } = await req.json()

    if (!suggestion) {
      return NextResponse.json(
        { success: false, message: 'A sugestão não pode estar vazia.' },
        { status: 400 }
      )
    }

    // Enviar notificação para o WhatsApp do Administrador
    await adminNotifier.notifySuggestion(
      userName || 'Médico Anônimo',
      email || 'Não informado',
      suggestion
    )

    return NextResponse.json({
      success: true,
      message: 'Sugestão enviada com sucesso! Obrigado pelo seu feedback.'
    })
  } catch (error: any) {
    logger.error('Erro ao processar sugestão:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno ao processar sugestão.' },
      { status: 500 }
    )
  }
}
