import { NextRequest, NextResponse } from 'next/server'
import speech from '@google-cloud/speech'
import OpenAI from 'openai'

export const runtime = 'nodejs'
export const maxDuration = 60

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const SYSTEM_PROMPT = `Você é um assistente especializado em extrair informações de procedimentos médicos anestésicos a partir de comandos de voz.

Seu trabalho é analisar o texto transcrito e extrair todos os campos possíveis relacionados ao procedimento médico.

CAMPOS DISPONÍVEIS:

OBRIGATÓRIOS:
- procedure_name: Nome do procedimento (ex: "Apendicectomia", "Cesariana", "Hérnia inguinal")
- procedure_date: Data do procedimento no formato YYYY-MM-DD
- procedure_type: Tipo (ex: "Cirurgia Geral", "Obstetrícia", "Ortopedia", "Urologia", etc.)
- patient_name: Nome completo do paciente

PACIENTE:
- patient_age: Idade do paciente (número)
- patient_gender: Gênero ("Masculino", "Feminino", "Outro")
- data_nascimento: Data de nascimento no formato YYYY-MM-DD
- convenio: Nome do convênio/plano de saúde
- carteirinha: Número da carteirinha

EQUIPE:
- anesthesiologist_name: Nome do anestesiologista
- nome_cirurgiao: Nome do cirurgião
- especialidade_cirurgiao: Especialidade do cirurgião
- nome_equipe: Nome da equipe cirúrgica
- hospital_clinic: Nome do hospital ou clínica

HORÁRIO E DURAÇÃO:
- horario: Horário do procedimento no formato HH:MM
- duracao_minutos: Duração em minutos (número)

ANESTESIA:
- tecnica_anestesica: Tipo de anestesia (ex: "Geral", "Raquidiana", "Peridural", "Bloqueio de plexo", "Sedação")
- codigo_tssu: Código TSSU se mencionado
- grupo_anestesico: Grupo anestésico ("Nenhum" por padrão)

FINANCEIRO:
- procedure_value: Valor do procedimento (número)
- payment_status: Status ("pending", "paid", "cancelled")
- payment_date: Data do pagamento no formato YYYY-MM-DD
- forma_pagamento: Forma de pagamento (ex: "Dinheiro", "PIX", "Cartão", "Parcelado")
- numero_parcelas: Número de parcelas (se parcelado)
- observacoes_financeiras: Observações sobre pagamento

PROCEDIMENTO (NÃO-OBSTÉTRICO):
- sangramento: "Sim" ou "Não"
- nausea_vomito: "Sim" ou "Não"
- dor: "Sim" ou "Não"
- observacoes_procedimento: Observações gerais

PROCEDIMENTO (OBSTÉTRICO):
- acompanhamento_antes: "Sim" ou "Não"
- tipo_parto: "Instrumentalizado", "Vaginal" ou "Cesariana"
- tipo_cesariana: "Nova Ráqui", "Geral", "Complementação pelo Cateter" ou "Raquianestesia"
- indicacao_cesariana: "Sim" ou "Não"
- descricao_indicacao_cesariana: Descrição da indicação
- retencao_placenta: "Sim" ou "Não"
- laceracao_presente: "Sim" ou "Não"
- grau_laceracao: "1", "2", "3" ou "4"
- hemorragia_puerperal: "Sim" ou "Não"
- transfusao_realizada: "Sim" ou "Não"

FEEDBACK:
- feedback_solicitado: true ou false
- email_cirurgiao: Email do cirurgião
- telefone_cirurgiao: Telefone do cirurgião

INSTRUÇÕES ESPECIAIS:
1. NOME DO PROCEDIMENTO = TIPO DO PROCEDIMENTO:
   - Se mencionar apenas "apendicectomia" ou "procedimento de apendicectomia" ou "procedimento realizado apendicectomia":
     → procedure_name: "Apendicectomia"
     → procedure_type: "Cirurgia Geral" (inferir baseado no procedimento)
   - O nome do procedimento PODE ser usado como tipo também
   - Reconheça variações: "procedimento realizado", "fiz uma", "realizei", "foi feito"

2. DATAS:
   - "hoje" ou "data de hoje" → use a data atual no formato YYYY-MM-DD
   - "amanhã" → data de amanhã
   - "ontem" → data de ontem
   - "25 de novembro" → "2025-11-25" (assumir ano atual se não mencionado)
   - Sempre retornar no formato YYYY-MM-DD

3. INFERÊNCIA DE TIPO:
   - Apendicectomia, Hérnia, Colecistectomia → "Cirurgia Geral"
   - Cesariana, Parto → "Obstetrícia"
   - Artroscopia, Prótese → "Ortopedia"
   - Use o contexto para inferir o tipo quando apenas o nome for mencionado

4. VALORES:
   - "5000 reais" → 5000
   - "cinco mil" → 5000
   - "R$ 5.000,00" → 5000

5. NORMALIZAÇÃO:
   - Capitalize nomes próprios corretamente
   - Mantenha consistência nos formatos

6. CONSERVADORISMO:
   - Só inclua informações claramente mencionadas
   - Não invente dados

RETORNE APENAS UM OBJETO JSON válido com os campos extraídos, sem texto adicional.`

export async function POST(request: NextRequest) {
  try {
    console.log('🎤 [VOICE-TO-PROCEDURE] Iniciando processamento completo...')

    // 1. Receber o arquivo de áudio
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Nenhum arquivo de áudio fornecido' },
        { status: 400 }
      )
    }

    console.log('📁 [VOICE-TO-PROCEDURE] Arquivo recebido:', {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size,
    })

    // 2. Converter áudio para texto (Google Speech-to-Text)
    console.log('🔄 [VOICE-TO-PROCEDURE] Passo 1/2: Transcrevendo áudio...')
    
    const arrayBuffer = await audioFile.arrayBuffer()
    const audioBuffer = Buffer.from(arrayBuffer)

    const client = new speech.SpeechClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || './keys/google-vision.json'
    })

    const audio = {
      content: audioBuffer.toString('base64'),
    }

    const config = {
      encoding: 'WEBM_OPUS' as const,
      // Não especificar sampleRateHertz - o Google detecta automaticamente do header do arquivo
      // WebM OPUS geralmente usa 48000 Hz, não 16000
      languageCode: 'pt-BR',
      enableAutomaticPunctuation: true,
      model: 'default',
      useEnhanced: true,
    }

    const [response] = await client.recognize({
      audio: audio,
      config: config,
    })
    
    const transcription = response.results
      ?.map((result) => result.alternatives?.[0]?.transcript)
      .join('\n')

    console.log('✅ [VOICE-TO-PROCEDURE] Transcrição:', transcription)

    if (!transcription || transcription.trim() === '') {
      return NextResponse.json(
        { error: 'Não foi possível transcrever o áudio. Tente falar mais alto ou mais claro.' },
        { status: 400 }
      )
    }

    // 3. Extrair campos com OpenAI
    console.log('🤖 [VOICE-TO-PROCEDURE] Passo 2/2: Extraindo campos com IA...')

    // Obter data atual para usar quando mencionar "hoje"
    const hoje = new Date()
    const dataHoje = hoje.toISOString().split('T')[0] // YYYY-MM-DD
    const amanha = new Date(hoje)
    amanha.setDate(hoje.getDate() + 1)
    const dataAmanha = amanha.toISOString().split('T')[0]
    const ontem = new Date(hoje)
    ontem.setDate(hoje.getDate() - 1)
    const dataOntem = ontem.toISOString().split('T')[0]

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: `Extraia os campos do seguinte comando de voz sobre um procedimento médico:\n\n${transcription}\n\nIMPORTANTE: Se mencionar "hoje" ou "data de hoje", use a data: ${dataHoje}. Se mencionar "amanhã", use: ${dataAmanha}. Se mencionar "ontem", use: ${dataOntem}.`,
        },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0]?.message?.content

    if (!content) {
      throw new Error('OpenAI não retornou resposta')
    }

    console.log('🔍 [VOICE-TO-PROCEDURE] Resposta da OpenAI:', content)

    const extractedData = JSON.parse(content)

    console.log('✅ [VOICE-TO-PROCEDURE] Campos extraídos:', extractedData)

    // 4. Validar campos obrigatórios (mas não bloquear - retornar o que foi extraído)
    const requiredFields = ['procedure_name', 'procedure_date', 'procedure_type', 'patient_name']
    const missingFields = requiredFields.filter(field => !extractedData[field])

    // Se faltarem campos obrigatórios, retornar aviso mas ainda retornar os dados extraídos
    if (missingFields.length > 0) {
      console.warn('⚠️ [VOICE-TO-PROCEDURE] Campos obrigatórios faltando:', missingFields)
      console.log('📋 [VOICE-TO-PROCEDURE] Retornando dados parciais:', extractedData)
      
      // Retornar os dados mesmo com campos faltando, mas com aviso
      return NextResponse.json({
        transcription,
        ...extractedData,
        _warning: `Alguns campos obrigatórios não foram identificados: ${missingFields.join(', ')}. Você pode preenchê-los manualmente.`,
        _missingFields: missingFields,
      })
    }

    // 5. Retornar dados completos
    return NextResponse.json({
      transcription,
      ...extractedData,
    })

  } catch (error) {
    console.error('❌ [VOICE-TO-PROCEDURE] Erro:', error)
    
    return NextResponse.json(
      { 
        error: 'Erro ao processar comando de voz',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

