import { NextRequest, NextResponse } from 'next/server'
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

INSTRUÇÕES:
1. Extraia APENAS os campos mencionados no texto
2. Use inferência inteligente quando apropriado (ex: "apendicectomia" → procedure_type: "Cirurgia Geral")
3. Para datas, converta descrições naturais para formato YYYY-MM-DD (ex: "hoje" → data atual, "25 de novembro" → "2025-11-25")
4. Para valores monetários, extraia apenas o número (ex: "5000 reais" → 5000)
5. Normalize nomes próprios (capitalize adequadamente)
6. Para campos não mencionados, NÃO inclua no JSON de resposta
7. Seja conservador: só inclua informações que estão claramente no texto

RETORNE APENAS UM OBJETO JSON válido com os campos extraídos, sem texto adicional.`

export async function POST(request: NextRequest) {
  try {
    console.log('🤖 [EXTRACT-FIELDS] Iniciando extração...')

    const { transcription } = await request.json()

    if (!transcription) {
      return NextResponse.json(
        { error: 'Nenhuma transcrição fornecida' },
        { status: 400 }
      )
    }

    console.log('📝 [EXTRACT-FIELDS] Transcrição recebida:', transcription)

    // Chamar OpenAI para extrair os campos
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: `Extraia os campos do seguinte comando de voz sobre um procedimento médico:\n\n${transcription}`,
        },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0]?.message?.content

    if (!content) {
      throw new Error('OpenAI não retornou resposta')
    }

    console.log('🔍 [EXTRACT-FIELDS] Resposta da OpenAI:', content)

    const extractedData = JSON.parse(content)

    console.log('✅ [EXTRACT-FIELDS] Campos extraídos:', extractedData)

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

