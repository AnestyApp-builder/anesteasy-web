'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, Square, Loader2, FileText, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface VoiceRecorderProps {
  onTranscriptionComplete: (data: any, transcription?: string) => void
  onError?: (error: string) => void
  compact?: boolean
}

export function VoiceRecorder({ onTranscriptionComplete, onError, compact = false }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          // Não especificar sampleRate - deixar o navegador usar o padrão (geralmente 48000 Hz)
        } 
      })
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        stream.getTracks().forEach(track => track.stop())
        
        await processAudio(audioBlob)
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      
      // Iniciar timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

    } catch (error) {
      console.error('Erro ao iniciar gravação:', error)
      onError?.('Erro ao acessar microfone. Verifique as permissões.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true)
    
    try {
      console.log('🎤 [VOICE RECORDER] Iniciando processamento do áudio...', {
        size: audioBlob.size,
        type: audioBlob.type
      })

      // Processar tudo em uma única chamada à API unificada
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')

      console.log('📤 [VOICE RECORDER] Enviando para API...')

      const response = await fetch('/api/voice-to-procedure', {
        method: 'POST',
        body: formData,
      })

      console.log('📥 [VOICE RECORDER] Resposta recebida:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText
      })

      const responseData = await response.json()

      if (!response.ok) {
        console.error('❌ [VOICE RECORDER] Erro na API:', responseData)
        
        // Tratar diferentes tipos de erro
        let errorMessage = responseData.error || 'Erro ao processar comando de voz'
        
        if (responseData.missingFields && responseData.missingFields.length > 0) {
          errorMessage = `Campos obrigatórios não identificados: ${responseData.missingFields.join(', ')}. ${responseData.suggestion || ''}`
        }
        
        if (responseData.details) {
          errorMessage += ` (${responseData.details})`
        }
        
        throw new Error(errorMessage)
      }

      console.log('✅ [VOICE RECORDER] Dados recebidos:', {
        hasTranscription: !!responseData.transcription,
        fieldsCount: Object.keys(responseData).filter(k => k !== 'transcription').length
      })

      // Remover campos internos antes de passar para o handler
      const { transcription, _warning, _missingFields, ...fields } = responseData
      
      console.log('📝 [VOICE RECORDER] Transcrição:', transcription)
      console.log('📋 [VOICE RECORDER] Campos extraídos:', fields)

      // Se houver aviso, mostrar ao usuário mas não bloquear
      if (_warning) {
        console.warn('⚠️ [VOICE RECORDER] Aviso:', _warning)
        // O handler pode mostrar este aviso se necessário
      }

      onTranscriptionComplete(fields, transcription)
      
    } catch (error) {
      console.error('❌ [VOICE RECORDER] Erro completo:', error)
      
      let errorMessage = 'Erro ao processar comando de voz'
      
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      // Mensagens mais amigáveis
      if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
        errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.'
      } else if (errorMessage.includes('timeout')) {
        errorMessage = 'A operação demorou muito. Tente novamente.'
      } else if (errorMessage.includes('transcrever')) {
        errorMessage = 'Não foi possível entender o áudio. Tente falar mais claro e próximo ao microfone.'
      }
      
      onError?.(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (compact) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex-shrink-0">
              <Mic className="h-5 w-5 text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700">
                Cadastro por Voz
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {isProcessing 
                  ? 'Processando áudio...' 
                  : isRecording 
                  ? `Gravando... ${formatTime(recordingTime)}` 
                  : 'Fale os dados do procedimento'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            {isRecording && (
              <div className="text-sm font-mono font-semibold text-primary-600 mr-2">
                {formatTime(recordingTime)}
              </div>
            )}
            {!isRecording && !isProcessing && (
              <Button
                onClick={startRecording}
                size="sm"
                variant="outline"
                className="border-primary-200 text-primary-700 hover:bg-primary-50"
              >
                <Mic className="h-4 w-4 mr-1.5" />
                Gravar
              </Button>
            )}
            {isRecording && (
              <Button
                onClick={stopRecording}
                size="sm"
                variant="destructive"
                className="animate-pulse"
              >
                <Square className="h-4 w-4 mr-1.5" />
                Parar
              </Button>
            )}
            {isProcessing && (
              <Button
                disabled
                size="sm"
                variant="outline"
                className="border-gray-200"
              >
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Processando
              </Button>
            )}
          </div>
        </div>
        
        {/* Campos obrigatórios - colapsável */}
        {!isProcessing && !isRecording && (
          <details className="mt-3 pt-3 border-t border-gray-100 voice-details">
            <summary className="text-xs font-medium text-gray-600 cursor-pointer hover:text-gray-700 list-none flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-gray-500" />
                <span>Campos obrigatórios</span>
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-gray-400 transition-transform duration-200 voice-chevron" />
            </summary>
            <div className="mt-2 space-y-2">
              <div className="flex flex-wrap gap-1.5">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                  Nome do Paciente
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                  Técnica Anestésica
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                  Data do Procedimento
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                  Tipo do Procedimento
                </span>
              </div>
              <p className="text-xs text-gray-500 italic">
                💡 Dica: Fale naturalmente, exemplo: "Apendicectomia no paciente João Silva, data de hoje"
              </p>
            </div>
          </details>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <Mic className="h-5 w-5 text-gray-400" />
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            Cadastro por Voz
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {isProcessing 
              ? 'Processando seu comando...' 
              : isRecording 
              ? `Gravando... ${formatTime(recordingTime)}` 
              : 'Fale os dados do procedimento'}
          </p>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        {!isRecording && !isProcessing && (
          <Button
            onClick={startRecording}
            size="md"
            variant="outline"
            className="border-primary-200 text-primary-700 hover:bg-primary-50"
          >
            <Mic className="mr-2 h-4 w-4" />
            Iniciar Gravação
          </Button>
        )}

        {isRecording && (
          <Button
            onClick={stopRecording}
            size="md"
            variant="destructive"
            className="animate-pulse"
          >
            <Square className="mr-2 h-4 w-4" />
            Parar Gravação
          </Button>
        )}

        {isProcessing && (
          <Button
            disabled
            size="md"
            variant="outline"
            className="border-gray-200"
          >
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processando...
          </Button>
        )}
      </div>

      {!isProcessing && !isRecording && (
        <details className="border-t border-gray-100 pt-4 voice-details">
          <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900 list-none flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-500" />
              <span>Campos obrigatórios e exemplo</span>
            </span>
            <ChevronDown className="h-4 w-4 text-gray-400 transition-transform duration-200 voice-chevron" />
          </summary>
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                Nome do Paciente
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                Técnica Anestésica
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                Data do Procedimento
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                Tipo do Procedimento
              </span>
            </div>
            <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
              <p className="font-semibold text-gray-700 mb-1">💡 Exemplo:</p>
              <p className="italic">
                "Procedimento de apendicectomia, paciente João Silva, 45 anos, 
                data de hoje, hospital São Lucas, 
                valor 5000 reais, anestesia geral"
              </p>
            </div>
          </div>
        </details>
      )}
    </div>
  )
}

