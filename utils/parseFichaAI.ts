/**
 * Função para parsear texto de ficha anestésica usando OpenAI GPT-4o-mini
 * Retorna dados estruturados com maior precisão que regex
 */

import { FichaParsed } from './parseFicha';

// Lista de tipos de procedimento válidos
const TIPOS_PROCEDIMENTO = [
  'Cesariana',
  'Parto Normal',
  'Cirurgia Geral',
  'Cirurgia Ortopédica',
  'Cirurgia Plástica',
  'Cirurgia Vascular',
  'Cirurgia Neurológica',
  'Cirurgia Cardíaca',
  'Cirurgia Digestiva',
  'Outro'
];

// Lista de técnicas anestésicas válidas
const TECNICAS_ANESTESICAS = [
  'Anestesia geral',
  'Anestesia regional (raquianestesia)',
  'Raquianestesia',
  'Anestesia regional (peridural)',
  'Anestesia regional (bloqueio de plexo braquial)',
  'Anestesia regional (bloqueio do neuroeixo)',
  'Anestesia local',
  'Sedação consciente',
  'Anestesia combinada (geral + regional)',
  'Duplo bloqueio (raqui + peridural)',
  'Bloqueio periférico',
  'Analgesia de parto',
  'Analgesia pós-operatória',
  'Bloqueio simpático',
  'Bloqueio de nervos cranianos',
  'Anestesia tópica',
  'Acompanhamento anestésico',
  'Monitorização anestésica',
  'Anestesia para procedimento ambulatorial',
  'Anestesia para emergência',
  'Raquianestesia contínua'
];

/**
 * Cria prompt estruturado para OpenAI
 */
function createPrompt(textoOCR: string): string {
  return `Você é um assistente especializado em extrair dados de fichas anestésicas brasileiras (PEPO - Prontuário Eletrônico Peroperatório).

Analise o texto extraído por OCR abaixo e extraia os seguintes campos:

CAMPOS OBRIGATÓRIOS:
1. nome: Nome completo do paciente
2. nascimento: Data de nascimento no formato DD/MM/YYYY ou YYYY-MM-DD
3. dataProcedimento: Data do procedimento/cirurgia no formato DD/MM/YYYY ou YYYY-MM-DD (priorizar "Início cirurgia" sobre "Dt. Entrada")
4. tipoProcedimento: Tipo de procedimento (deve ser um dos: ${TIPOS_PROCEDIMENTO.join(', ')})
5. tecnica: Técnica anestésica utilizada (deve ser uma das: ${TECNICAS_ANESTESICAS.join(', ')})
6. sexo: Sexo do paciente ('M' para Masculino, 'F' para Feminino)
7. convenio: Nome do convênio/plano de saúde
8. nomeCirurgiao: Nome completo do cirurgião

CAMPOS OPCIONAIS:
9. entrada: Data de entrada (se diferente de dataProcedimento)
10. procedimento: Descrição completa do procedimento realizado
11. carteirinha: Número da carteirinha do convênio
12. cirurgiao: Nome do cirurgião (alternativo)
13. especialidadeCirurgiao: Especialidade do cirurgião
14. hospital: Nome do hospital/clínica
15. horario: Horário do procedimento no formato HH:MM

INSTRUÇÕES IMPORTANTES:
- Se um campo não for encontrado, retorne string vazia ""
- Para sexo, retorne apenas 'M' ou 'F' ou ''
- Para datas, mantenha o formato encontrado (DD/MM/YYYY ou YYYY-MM-DD)
- Para tipoProcedimento, faça match inteligente (ex: "Parto (Via Vaginal)" → "Parto Normal", "Cesariana" → "Cesariana")
- Para tecnica, faça match inteligente (ex: "Duplo Bloqueio" → "Duplo bloqueio (raqui + peridural)", "Raqui" → "Raquianestesia")
- Se houver ambiguidade, escolha o valor mais provável baseado no contexto
- Ignore valores que claramente não fazem sentido para o campo

TEXTO DO OCR:
${textoOCR}

Retorne APENAS um JSON válido no seguinte formato, sem markdown, sem explicações:
{
  "nome": "string",
  "nascimento": "string",
  "entrada": "string",
  "dataProcedimento": "string",
  "procedimento": "string",
  "tipoProcedimento": "string",
  "tecnica": "string",
  "sexo": "M" | "F" | "",
  "convenio": "string",
  "carteirinha": "string",
  "cirurgiao": "string",
  "nomeCirurgiao": "string",
  "especialidadeCirurgiao": "string",
  "hospital": "string",
  "horario": "string"
}`;
}

/**
 * Parseia texto do OCR usando OpenAI GPT-4o-mini
 */
export async function parseFichaWithAI(textoOCR: string): Promise<FichaParsed | null> {
  // Verificar se API key está configurada
  if (!process.env.OPENAI_API_KEY) {
    console.warn('[AI Parse] OPENAI_API_KEY não configurada, pulando parse com IA');
    return null;
  }

  try {
    const { OpenAI } = await import('openai');
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = createPrompt(textoOCR);

    console.log('[AI Parse] Chamando OpenAI GPT-4o-mini...');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente especializado em extrair dados estruturados de documentos médicos brasileiros. Sempre retorne JSON válido sem markdown.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1, // Baixa temperatura para respostas mais consistentes
      max_tokens: 1000,
    }, {
      timeout: 30000, // 30 segundos timeout
    });

    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      console.warn('[AI Parse] Resposta vazia da OpenAI');
      return null;
    }

    // Parsear JSON da resposta
    let parsed: any;
    try {
      // Remover markdown code blocks se houver
      const jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('[AI Parse] Erro ao parsear JSON da resposta:', parseError);
      return null;
    }

    // Validar e normalizar resposta
    const result: FichaParsed = {
      nome: parsed.nome || '',
      nascimento: parsed.nascimento || '',
      entrada: parsed.entrada || parsed.dataProcedimento || '',
      dataProcedimento: parsed.dataProcedimento || '',
      procedimento: parsed.procedimento || parsed.tipoProcedimento || '',
      tipoProcedimento: parsed.tipoProcedimento || '',
      tecnica: parsed.tecnica || '',
      sexo: (parsed.sexo === 'M' || parsed.sexo === 'F') ? parsed.sexo : '',
      convenio: parsed.convenio || '',
      carteirinha: parsed.carteirinha || '',
      cirurgiao: parsed.cirurgiao || parsed.nomeCirurgiao || '',
      nomeCirurgiao: parsed.nomeCirurgiao || parsed.cirurgiao || '',
      especialidadeCirurgiao: parsed.especialidadeCirurgiao || '',
      hospital: parsed.hospital || '',
      horario: parsed.horario || '',
    };

    // Contar campos preenchidos
    const camposPreenchidos = Object.values(result).filter(v => v && v.trim()).length;
    console.log(`[AI Parse] Parseado com sucesso: ${camposPreenchidos} campos preenchidos`);

    return result;

  } catch (error: any) {
    console.error('[AI Parse] Erro ao processar com OpenAI:', {
      message: error.message,
      code: error.code,
      status: error.status,
    });

    // Se for erro de quota ou rate limit, não tentar novamente
    if (error.status === 429 || error.code === 'rate_limit_exceeded') {
      console.warn('[AI Parse] Rate limit excedido, usando parse tradicional');
    }

    return null;
  }
}

