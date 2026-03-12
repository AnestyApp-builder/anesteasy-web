import { NextRequest, NextResponse } from 'next/server'
import speech from '@google-cloud/speech'
import { Readable } from 'stream'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    console.log('📝 [SPEECH-TO-TEXT] Iniciando transcrição...')

    const formData = await request.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Nenhum arquivo de áudio fornecido' },
        { status: 400 }
      )
    }

    console.log('🎤 [SPEECH-TO-TEXT] Arquivo recebido:', {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size,
    })

    // Converter File para Buffer
    const arrayBuffer = await audioFile.arrayBuffer()
    const audioBuffer = Buffer.from(arrayBuffer)

    console.log('🔄 [SPEECH-TO-TEXT] Convertendo para formato aceito pelo Google...')

    // Criar cliente do Google Speech-to-Text
    const client = new speech.SpeechClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || './keys/google-vision.json'
    })

    // Configuração para o reconhecimento
    const audio = {
      content: audioBuffer.toString('base64'),
    }

    const config = {
      encoding: 'WEBM_OPUS' as const,
      sampleRateHertz: 16000,
      languageCode: 'pt-BR',
      enableAutomaticPunctuation: true,
      model: 'default',
      useEnhanced: true,
    }

    const requestConfig = {
      audio: audio,
      config: config,
    }

    console.log('☁️ [SPEECH-TO-TEXT] Enviando para Google Speech-to-Text...')

    // Fazer o reconhecimento
    const [response] = await client.recognize(requestConfig)
    
    const transcription = response.results
      ?.map((result) => result.alternatives?.[0]?.transcript)
      .join('\n')

    console.log('✅ [SPEECH-TO-TEXT] Transcrição concluída:', transcription)

    if (!transcription || transcription.trim() === '') {
      return NextResponse.json(
        { error: 'Não foi possível transcrever o áudio. Tente falar mais alto ou mais claro.' },
        { status: 400 }
      )
    }

    return NextResponse.json({ transcription })

  } catch (error) {
    console.error('❌ [SPEECH-TO-TEXT] Erro:', error)
    
    return NextResponse.json(
      { 
        error: 'Erro ao processar áudio',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

