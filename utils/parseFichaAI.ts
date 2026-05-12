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
  if (!process.env.OPENAI_API_KEY) {
    console.warn('[AI Parse] OPENAI_API_KEY não configurada');
    return null;
  }

  try {
    const { OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const prompt = createPrompt(textoOCR);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Você é um assistente especializado em documentos médicos.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    return {
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
  } catch (error) {
    console.error('[AI Parse] Erro:', error);
    return null;
  }
}

/**
 * Parseia imagem da ficha usando OpenAI GPT-4o-mini Vision
 * Recebe a imagem em Base64 e retorna dados estruturados
 */
export async function parseFichaWithVision(base64Image: string): Promise<FichaParsed | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('[AI Vision] OPENAI_API_KEY não configurada');
    return null;
  }

  try {
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
            content: `Você é um perito em faturamento médico e OCR de fichas anestésicas brasileiras.
Sua tarefa é extrair dados de etiquetas hospitalares e fichas de anestesia com precisão de 100%.

REGRAS DE VALIDAÇÃO:
1. PACIENTE: Procure por "Nome", "Paciente" ou campos próximos a códigos de barras de identificação.
2. PROCEDIMENTO: Valide se o texto é uma cirurgia ou técnica médica. Ignore medicações isoladas. Use um destes se possível: ${TIPOS_PROCEDIMENTO.join(', ')}.
3. DATA: Converta para DD/MM/YYYY. Se não encontrar, use a data atual.
4. CIRURGIÃO: Procure por nomes precedidos de "Dr.", "Dra." ou no campo "Cirurgião".
5. HOSPITAL: Identifique o nome da instituição pelo cabeçalho ou logotipos.
6. CONVÊNIO: Procure por nomes de seguradoras ou planos de saúde.
7. TÉCNICA: Identifique a técnica anestésica. Use uma destas se possível: ${TECNICAS_ANESTESICAS.join(', ')}.

RETORNE APENAS UM JSON COM ESTAS CHAVES:
{
  "nome": "string",
  "nascimento": "string",
  "dataProcedimento": "string",
  "hospital": "string",
  "nomeCirurgiao": "string",
  "convenio": "string",
  "carteirinha": "string",
  "tipoProcedimento": "string",
  "tecnica": "string",
  "sexo": "M" | "F",
  "horario": "string"
}`
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
      const errorData = await response.json();
      throw new Error(`OpenAI API Error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);

    return {
      nome: parsed.nome || '',
      nascimento: parsed.nascimento || '',
      entrada: parsed.dataProcedimento || '',
      dataProcedimento: parsed.dataProcedimento || '',
      procedimento: parsed.tipoProcedimento || '',
      tipoProcedimento: parsed.tipoProcedimento || '',
      tecnica: parsed.tecnica || '',
      sexo: (parsed.sexo === 'M' || parsed.sexo === 'F') ? parsed.sexo : '',
      convenio: parsed.convenio || '',
      carteirinha: parsed.carteirinha || '',
      cirurgiao: parsed.nomeCirurgiao || '',
      nomeCirurgiao: parsed.nomeCirurgiao || '',
      especialidadeCirurgiao: '',
      hospital: parsed.hospital || '',
      horario: parsed.horario || '',
    };

  } catch (error) {
    console.error('[AI Vision] Erro:', error);
    return null;
  }
}
