import { NextRequest, NextResponse } from 'next/server'
import { imageRecoveryService } from '@/lib/image-recovery'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'list':
        const corruptedFiles = await imageRecoveryService.findCorruptedFiles()
        return NextResponse.json({
          success: true,
          data: corruptedFiles,
          count: corruptedFiles.length
        })

      case 'detect-mime':
        const filePath = searchParams.get('path')
        if (!filePath) {
          return NextResponse.json({
            success: false,
            error: 'Caminho do arquivo é obrigatório'
          }, { status: 400 })
        }

        const mimeType = await imageRecoveryService.detectRealMimeType(filePath)
        return NextResponse.json({
          success: true,
          data: { mimeType, filePath }
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Ação não especificada'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Erro na API de recuperação:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, filePaths } = body

    switch (action) {
      case 'recover':
        if (!filePaths || !Array.isArray(filePaths)) {
          return NextResponse.json({
            success: false,
            error: 'Lista de arquivos é obrigatória'
          }, { status: 400 })
        }

        // Recuperar arquivos
        const recoveryResults = await imageRecoveryService.recoverMultipleFiles(filePaths)
        
        // Atualizar registros no banco de dados
        await imageRecoveryService.updateDatabaseRecords(recoveryResults)

        return NextResponse.json({
          success: true,
          data: recoveryResults,
          summary: {
            total: recoveryResults.length,
            successful: recoveryResults.filter(r => r.success).length,
            failed: recoveryResults.filter(r => !r.success).length
          }
        })

      case 'recover-single':
        const { filePath } = body
        if (!filePath) {
          return NextResponse.json({
            success: false,
            error: 'Caminho do arquivo é obrigatório'
          }, { status: 400 })
        }

        const singleResult = await imageRecoveryService.recoverFile(filePath)
        
        if (singleResult.success) {
          await imageRecoveryService.updateDatabaseRecords([singleResult])
        }

        return NextResponse.json({
          success: true,
          data: singleResult
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Ação não especificada'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Erro na API de recuperação:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}
