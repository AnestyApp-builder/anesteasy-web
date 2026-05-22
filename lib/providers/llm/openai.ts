import OpenAI from 'openai';
import { logger } from '@/lib/logger';
import { OpenAIError } from '@/utils/errors';
import { DocumentType } from '@/types/ocr';

let _openai: OpenAI | null = null;

function getOpenAIClient() {
  if (_openai) return _openai;
  
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logger.warn('OPENAI_API_KEY missing. Client will fail if called.');
  }

  _openai = new OpenAI({
    apiKey: apiKey || 'dummy-key-for-build',
    timeout: 60000, // Aumentado para 60 segundos
    maxRetries: 3,  // Tentar de novo se a conexão cair
  });
  return _openai;
}

/**
 * Detecta o tipo de documento baseado no texto extraído
 */
export async function detectDocumentType(text: string): Promise<DocumentType> {
  if (!text || text.length < 10) return 'unknown';

  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Você é um especialista em classificação de documentos médicos e financeiros. Classifique o texto fornecido em uma das seguintes categorias: receipt, medical_guide, invoice, medical_order, bank_statement, simple_text. Responda APENAS com a categoria.'
        },
        {
          role: 'user',
          content: text.substring(0, 2000) // Limitar para economizar tokens
        }
      ],
      temperature: 0,
      max_tokens: 10,
    });

    const result = response.choices[0].message.content?.trim().toLowerCase() as DocumentType;
    const validTypes: DocumentType[] = ['receipt', 'medical_guide', 'invoice', 'medical_order', 'bank_statement', 'simple_text'];
    
    return validTypes.includes(result) ? result : 'unknown';
  } catch (error) {
    logger.error('Error detecting document type with OpenAI', error);
    return 'unknown'; // Fallback seguro
  }
}

/**
 * Estrutura o texto OCR em um JSON baseado no tipo de documento
 */
export async function structureOCRData(text: string, type: DocumentType): Promise<any> {
  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Extraia informações estruturadas do texto OCR de um(a) ${type}. Retorne um JSON limpo.`
        },
        {
          role: 'user',
          content: text
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  } catch (error) {
    logger.error('Error structuring data with OpenAI', error);
    throw new OpenAIError('Failed to structure data');
  }
}

/**
 * Processa uma imagem diretamente com OpenAI Vision (OCR + Estruturação)
 */
export async function processImageWithOpenAI(buffer: Buffer): Promise<{ rawText: string, structuredData: any, docType: string }> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const base64Image = buffer.toString('base64');
    
    logger.info(`Sending image to OpenAI via Fetch. Size: ${(buffer.length / 1024).toFixed(1)} KB`);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Você é um perito em faturamento médico e OCR de fichas anestésicas. 
Sua tarefa é extrair dados de etiquetas hospitalares e fichas de anestesia com precisão de 100%.

REGRAS DE VALIDAÇÃO:
1. PACIENTE: Procure por "Nome:", "Paciente:" ou campos próximos a códigos de barras.
2. PROCEDIMENTO: Valide se o texto é uma cirurgia (ex: Colecistectomia).
3. TÉCNICA ANESTÉSICA: Procure explicitamente pelos rótulos "Anestesia:" ou "Técnica Anestésica:". Extraia o tipo principal (Ex: Geral, Raquidiana, Peridural, Sedação). Ignore o campo "Técnica:" se ele estiver separado de "Anestesia:".
4. DATA: Converta para DD/MM/YYYY a partir do campo "Data:".
5. CIRURGIÃO/MÉDICO: Procure por "Medico:", "Cirurgião:" ou "Dr.".
6. HOSPITAL: Identifique o nome da instituição pelo cabeçalho.

RETORNE APENAS UM JSON COM ESTAS CHAVES:
{
  "nome_do_paciente": "string",
  "procedimento": "string",
  "tecnica_anestesica": "string",
  "data_da_cirurgia": "DD/MM/YYYY",
  "hospital": "string",
  "cirurgiao": "string",
  "convenio": "string",
  "carteirinha": "string",
  "observacoes": "string",
  "confidence_score": 0.0 a 1.0
}
 
REGRAS ADICIONAIS:
- Se não tiver certeza absoluta de um campo, deixe vazio.
- O campo confidence_score deve refletir a qualidade da imagem e clareza dos dados.`
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Analise esta imagem médica com rigor. Se um campo não for encontrado, deixe-o vazio. Verifique se os dados fazem sentido semanticamente.' },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error?.message || response.statusText;
      logger.error(`OpenAI Fetch Error: ${response.status}`, errorData);
      throw new Error(`OpenAI API returned ${response.status}: ${errorMsg}`);
    }

    const data = await response.json();
    const structuredData = JSON.parse(data.choices[0].message.content || '{}');
    const rawText = data.choices[0].message.content || '';
    
    let docType = 'medical_order';
    if (rawText.toLowerCase().includes('recibo')) docType = 'receipt';

    return { rawText, structuredData, docType };
  } catch (error: any) {
    logger.error('Error processing image with OpenAI Fetch', error);
    throw new OpenAIError(`OpenAI Vision Fetch Error: ${error.message}`);
  }
}

/**
 * Extrai campos de um procedimento médico a partir de um texto (transcrição de voz)
 */
export async function extractProcedureFromText(transcription: string): Promise<any> {
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
3. Para datas, converta descrições naturais para formato YYYY-MM-DD (ex: "hoje" → data atual)
4. Para valores monetários, extraia apenas o número
5. Normalize nomes próprios (capitalize adequadamente)
6. Seja conservador: só inclua informações que estão claramente no texto

RETORNE APENAS UM OBJETO JSON válido com os campos extraídos, sem texto adicional.`;

  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Extraia os campos: ${transcription}` },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error('OpenAI não retornou resposta');
    
    return JSON.parse(content);
  } catch (error) {
    logger.error('Error extracting fields with OpenAI', error);
    throw new OpenAIError('Failed to extract fields');
  }
}

/**
 * Calcula custo aproximado da OpenAI (GPT-4o-mini)
 */
export function calculateOpenAICost(inputTokens: number, outputTokens: number): number {
  // Preços aproximados GPT-4o-mini: $0.15 / 1M input, $0.60 / 1M output
  return (inputTokens * 0.00000015) + (outputTokens * 0.00000060);
}

