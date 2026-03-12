/**
 * Funções auxiliares para parsear texto extraído de fichas anestésicas via OCR
 */

export interface FichaParsed {
  nome: string;
  nascimento: string;
  entrada: string;
  dataProcedimento: string;
  procedimento: string;
  tipoProcedimento: string;
  tecnica: string;
  sexo: 'M' | 'F' | '';
  convenio: string;
  carteirinha: string;
  cirurgiao: string;
  nomeCirurgiao: string;
  especialidadeCirurgiao: string;
  hospital: string;
  horario: string;
}

/**
 * Extrai campo do texto usando regex
 * Melhorado para capturar mais variações
 */
function extract(regex: RegExp, text: string, index: number = 1): string {
  const match = text.match(regex);
  if (match && match[index]) {
    let result = match[index].trim();
    // Limpar caracteres extras comuns do OCR
    result = result
      .replace(/[|]/g, 'I') // Substituir | por I
      .replace(/[0O]/g, (m, offset) => {
        // Se estiver no contexto de data/hora, manter como número
        const context = text.substring(Math.max(0, match.index! - 10), match.index! + match[0].length + 10);
        if (/\d/.test(context)) return m;
        return m === '0' ? 'O' : '0';
      })
      .replace(/\s+/g, ' ') // Normalizar espaços
      .trim();
    return result;
  }
  return "";
}

/**
 * Extrai campo usando múltiplos padrões (tenta cada um até encontrar)
 */
function extractMulti(patterns: RegExp[], text: string, index: number = 1): string {
  for (const pattern of patterns) {
    const result = extract(pattern, text, index);
    if (result) return result;
  }
  return "";
}

/**
 * Normaliza data de formato brasileiro para ISO
 */
function normalizeDate(dateStr: string): string {
  if (!dateStr) return "";
  
  // Remover espaços e caracteres extras
  dateStr = dateStr.trim().replace(/\s+/g, " ");
  
  // Tentar formatos DD/MM/YYYY ou DD-MM-YYYY
  const datePattern = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/;
  const match = dateStr.match(datePattern);
  
  if (match) {
    let day = match[1].padStart(2, "0");
    let month = match[2].padStart(2, "0");
    let year = match[3];
    
    // Se ano tem 2 dígitos, assumir 20XX
    if (year.length === 2) {
      year = `20${year}`;
    }
    
    return `${year}-${month}-${day}`;
  }
  
  // Tentar formato ISO já existente
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateStr;
  }
  
  return dateStr;
}

/**
 * Extrai horário no formato HH:MM
 */
function extractTime(text: string): string {
  // Procurar por padrões de horário: HH:MM, HHhMM, HHh
  const timePatterns = [
    /(\d{1,2}):(\d{2})\s*(?:h|H)?/i,
    /(\d{1,2})h\s*(\d{2})?/i,
    /Horário[: ]*(\d{1,2}):?(\d{2})?/i,
    /Hora[: ]*(\d{1,2}):?(\d{2})?/i,
  ];
  
  for (const pattern of timePatterns) {
    const match = text.match(pattern);
    if (match) {
      const hour = match[1].padStart(2, "0");
      const minute = match[2] ? match[2].padStart(2, "0") : "00";
      return `${hour}:${minute}`;
    }
  }
  
  return "";
}

/**
 * Extrai sexo (M/F)
 */
function extractGender(text: string): 'M' | 'F' | '' {
  // Regex específico para formato: "Sexo: Feminino" ou "Sexo: Masculino"
  const sexoMatch = text.match(/Sexo\s*:?\s*([A-Za-z]+)/i);
  if (sexoMatch) {
    const sexo = sexoMatch[1].toLowerCase();
    if (sexo.includes('feminino') || sexo.includes('fem')) {
      return 'F';
    }
    if (sexo.includes('masculino') || sexo.includes('masc')) {
      return 'M';
    }
  }
  
  // Fallback para padrões antigos
  const genderPatterns = [
    /Sexo[: ]*([MF])/i,
    /([MF])/i,
    /Masculino|Masc/i,
    /Feminino|Fem/i,
  ];
  
  for (const pattern of genderPatterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[1]) {
        return match[1].toUpperCase() as 'M' | 'F';
      }
      if (match[0].match(/Masculino|Masc/i)) {
        return 'M';
      }
      if (match[0].match(/Feminino|Fem/i)) {
        return 'F';
      }
    }
  }
  
  return "";
}

/**
 * Função principal para parsear texto da ficha
 * Foca apenas nos campos obrigatórios marcados com *
 */
export function parseFicha(text: string): FichaParsed {
  // Normalizar texto: remover quebras de linha múltiplas, normalizar espaços
  const normalizedText = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  // 1. NOME DO PACIENTE * (prioridade máxima)
  // Regex específico para formato: "Paciente: Nome Completo"
  const nomeMatch = normalizedText.match(/Paciente\s*:?\s*([^\n\r]+)/i);
  const nome = nomeMatch ? nomeMatch[1].trim() : extractMulti([
    /Nome do Paciente[: ]*([^\n\r]{2,50})/i,
    /Nome[: ]*([^\n\r]{2,50})/i,
    /^([A-ZÁÉÍÓÚÇÃÕ][a-záéíóúçãõ]+(?:\s+[A-ZÁÉÍÓÚÇÃÕ][a-záéíóúçãõ]+)+)/m,
  ], normalizedText);

  // 2. DATA DE NASCIMENTO * (prioridade alta)
  // Regex específico para formato: "Data Nascto: 06/11/1987"
  const nascimentoMatch = normalizedText.match(/Data\s+Nascto\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i);
  const nascimento = nascimentoMatch ? nascimentoMatch[1] : extractMulti([
    /Data de Nascimento[: ]*([^\n\r]+)/i,
    /Nascimento[: ]*([^\n\r]+)/i,
    /Dt\.? Nasc\.?[: ]*([^\n\r]+)/i,
    /Nasc\.?[: ]*([^\n\r]+)/i,
    /Data Nasc[: ]*([^\n\r]+)/i,
    /DN[: ]*([^\n\r]+)/i,
  ], normalizedText);

  // 3. DATA DO PROCEDIMENTO / ENTRADA * (prioridade alta)
  // Prioridade: "Início cirurgia" > "Dt. Entrada"
  const inicioCirurgiaMatch = normalizedText.match(/Início\s+cirurgia\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i);
  const entradaMatch = normalizedText.match(/Dt\.\s*Entrada\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i);
  
  const dataProcedimento = inicioCirurgiaMatch ? inicioCirurgiaMatch[1].trim() : 
                          entradaMatch ? entradaMatch[1].trim() : extractMulti([
    /Data do Procedimento[: ]*([^\n\r]+)/i,
    /Data Procedimento[: ]*([^\n\r]+)/i,
    /Data do Proc[: ]*([^\n\r]+)/i,
    /Data[: ]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
  ], normalizedText);

  const entrada = dataProcedimento; // Para compatibilidade

  // 4. TIPO DE PROCEDIMENTO / PROCEDIMENTO REALIZADO * (prioridade alta)
  // Buscar padrões comuns de procedimentos cirúrgicos diretamente no texto
  let procedimento = "";
  
  // Primeiro, tentar formato padrão: "Cir Realizada: Valor"
  const procedimentoMatchInline = normalizedText.match(/Cir(?:urgia)?\s+Realizada?\s*:?\s*([^\n\r]+)/i);
  if (procedimentoMatchInline && procedimentoMatchInline[1].trim() && procedimentoMatchInline[1].length > 10) {
    procedimento = procedimentoMatchInline[1].trim();
  } else {
    // Buscar padrões de procedimentos comuns (linha inteira que seja um procedimento)
    const procedimentosComuns = [
      /^(Cesariana\s*\([^)]+\))/im,
      /^(Laparotomia[^\n]*)/im,
      /^(Histerectomia[^\n]*)/im,
      /^(Colecistectomia[^\n]*)/im,
      /^(Apendicectomia[^\n]*)/im,
      /^(Herniorrafia[^\n]*)/im,
      /^(Mastectomia[^\n]*)/im,
      /^(Tireoidectomia[^\n]*)/im,
      /^(Nefrectomia[^\n]*)/im,
      /^(Gastrectomia[^\n]*)/im,
    ];
    
    for (const regex of procedimentosComuns) {
      const match = normalizedText.match(regex);
      if (match) {
        procedimento = match[1].trim();
        break;
      }
    }
    
    // Fallback para padrões genéricos
    if (!procedimento) {
      procedimento = extractMulti([
        /Tipo de Procedimento[: ]*([^\n\r]{3,100})/i,
        /Procedimento Realizado[: ]*([^\n\r]{3,100})/i,
        /Procedimento[: ]*([^\n\r]{3,100})/i,
      ], normalizedText);
    }
  }

  const tipoProcedimento = procedimento; // Para compatibilidade

  // 5. TIPO DE ANESTESISTA / TÉCNICA ANESTÉSICA * (prioridade alta)
  // PRIORIDADE: Buscar padrões de técnicas diretamente no texto (mais confiável)
  let tecnica = "";
  
  // Função para validar se um texto parece uma técnica anestésica
  const isValidTecnica = (text: string): boolean => {
    if (!text || text.length < 3) return false;
    const textLower = text.toLowerCase();
    // Se contém apenas números ou códigos, não é uma técnica
    if (/^\d+/.test(text.trim())) return false;
    if (textLower.includes('atendimento') || textLower.includes('código') || textLower.includes('prontuário')) return false;
    // Se contém palavras-chave de técnicas, é válido
    const keywords = ['bloqueio', 'raquianestesia', 'peridural', 'geral', 'local', 'sedação', 'anestesia', 'espinhal', 'subaracnóidea'];
    return keywords.some(kw => textLower.includes(kw));
  };
  
  // PRIMEIRO: Buscar padrões de técnicas anestésicas comuns diretamente no texto (prioridade máxima)
  const tecnicasComuns = [
    /^(Duplo\s+Bloqueio)/im,
    /^(Raquianestesia)/im,
    /^(Peridural)/im,
    /^(Anestesia\s+Geral)/im,
    /^(Geral)/im,
    /^(Bloqueio\s+[^\n]+)/im,
    /^(Sedação[^\n]*)/im,
    /^(Local[^\n]*aneste[^\n]*)/im,
    /^(Espinhal)/im,
    /^(Subaracnóidea)/im,
  ];
  
  for (const regex of tecnicasComuns) {
    const match = normalizedText.match(regex);
    if (match) {
      tecnica = match[1].trim();
      break;
    }
  }
  
  // SEGUNDO: Se não encontrou, tentar formato padrão: "Tipo anestes: Valor" (mas validar)
  if (!tecnica) {
    const tecnicaMatchInline = normalizedText.match(/Tipo\s+anestes[ia]*\s*:?\s*([^\n\r]+)/i);
    if (tecnicaMatchInline && tecnicaMatchInline[1].trim()) {
      const valorEncontrado = tecnicaMatchInline[1].trim();
      // Só aceitar se parecer uma técnica válida
      if (isValidTecnica(valorEncontrado)) {
        tecnica = valorEncontrado;
      } else {
        // Tentar pegar da próxima linha
        const tecnicaMatchNextLine = normalizedText.match(/Tipo\s+anestes[ia]*\s*:?\s*\n\s*([^\n\r]+)/i);
        if (tecnicaMatchNextLine && isValidTecnica(tecnicaMatchNextLine[1].trim())) {
          tecnica = tecnicaMatchNextLine[1].trim();
        }
      }
    }
  }
  
  // TERCEIRO: Fallback para padrões genéricos
  if (!tecnica) {
    tecnica = extractMulti([
      /Técnica Anestésica[: ]*([^\n\r]{3,50})/i,
      /Tipo de Anestesia[: ]*([^\n\r]{3,50})/i,
      /Anestesia[: ]*([^\n\r]{3,50})/i,
    ], normalizedText);
    // Validar o resultado do fallback também
    if (tecnica && !isValidTecnica(tecnica)) {
      tecnica = "";
    }
  }

  // 6. SEXO * (prioridade alta)
  const sexo = extractGender(normalizedText);

  // 7. CONVÊNIO * (prioridade alta)
  // Regex específico para formato: "Convênio: OMINT/SKILL"
  const convenioMatch = normalizedText.match(/Conv[eê]nio\s*:?\s*([^\n\r]+)/i);
  const convenio = convenioMatch ? convenioMatch[1].trim() : extractMulti([
    /Plano[: ]*([^\n\r]{2,50})/i,
    /Operadora[: ]*([^\n\r]{2,50})/i,
    /Seguro[: ]*([^\n\r]{2,50})/i,
    /Conv[: ]*([^\n\r]{2,50})/i,
  ], normalizedText);

  // 8. CIRURGIÃO * (prioridade alta)
  // Extrai o nome do cirurgião - buscar o nome mais frequente após a seção "Participante"
  let cirurgiao = "";
  
  // Primeiro, tentar formato padrão: "Cirurgião: Nome"
  const cirurgiaoMatchInline = normalizedText.match(/Cirurgião\s*:?\s*([^\n\r]+)/i);
  if (cirurgiaoMatchInline && cirurgiaoMatchInline[1].trim() && cirurgiaoMatchInline[1].length > 10) {
    cirurgiao = cirurgiaoMatchInline[1].trim().split(',')[0].trim();
  } else {
    // Buscar todos os nomes completos após "Participante"
    const participanteIndex = normalizedText.search(/Participante/i);
    if (participanteIndex >= 0) {
      const textoAposParticipante = normalizedText.substring(participanteIndex);
      // Pegar todos os nomes completos (linha completa com 3+ palavras)
      // Usar [^\n]+ para pegar apenas até o fim da linha
      const linhas = textoAposParticipante.split('\n');
      const nomesCompletos: string[] = [];
      
      for (const linha of linhas) {
        const linhaTrimmed = linha.trim();
        // Verificar se é um nome completo (3+ palavras, iniciando com maiúscula)
        if (linhaTrimmed.match(/^[A-ZÁÉÍÓÚÃÕ][a-záéíóúãõ]+\s+[A-ZÁÉÍÓÚÃÕ][a-záéíóúãõ]+\s+[A-ZÁÉÍÓÚÃÕ][a-záéíóúãõ]+/)) {
          nomesCompletos.push(linhaTrimmed);
        }
      }
      
      if (nomesCompletos.length > 0) {
        // Função para calcular similaridade simples (contar palavras em comum)
        const similaridade = (nome1: string, nome2: string): number => {
          const palavras1 = nome1.toLowerCase().split(/\s+/);
          const palavras2 = nome2.toLowerCase().split(/\s+/);
          let comum = 0;
          palavras1.forEach(p1 => {
            if (palavras2.some(p2 => Math.abs(p1.length - p2.length) <= 2 && (p1.includes(p2) || p2.includes(p1)))) {
              comum++;
            }
          });
          return comum / Math.max(palavras1.length, palavras2.length);
        };
        
        // Agrupar nomes similares
        const grupos: { representante: string; membros: string[] }[] = [];
        nomesCompletos.forEach(nome => {
          let grupoEncontrado = false;
          for (const grupo of grupos) {
            if (similaridade(nome, grupo.representante) > 0.6) {
              grupo.membros.push(nome);
              grupoEncontrado = true;
              break;
            }
          }
          if (!grupoEncontrado) {
            grupos.push({ representante: nome, membros: [nome] });
          }
        });
        
        // Pegar o grupo com mais membros (nome mais frequente)
        const grupoMaior = grupos.sort((a, b) => b.membros.length - a.membros.length)[0];
        
        if (grupoMaior && grupoMaior.membros.length >= 2) {
          // Pegar o representante (primeiro nome do grupo)
          cirurgiao = grupoMaior.representante;
        } else if (nomesCompletos.length > 0) {
          // Se não há nome repetido, pegar o primeiro nome que NÃO seja "Ana Lucia"
          cirurgiao = nomesCompletos.find(n => !n.toLowerCase().includes('ana lucia')) || nomesCompletos[0];
        }
      }
    }
    
    // Fallback para padrões antigos
    if (!cirurgiao) {
      const cirurgiaoFallback = extractMulti([
        /Cirurgiã[: ]*([^\n\r]{3,50})/i,
        /Dr\.?\s+([A-ZÁÉÍÓÚÇÃÕ][a-záéíóúçãõ]+(?:\s+[A-ZÁÉÍÓÚÇÃÕ][a-záéíóúçãõ]+)+)/i,
        /Médico Responsável[: ]*([^\n\r]{3,50})/i,
      ], normalizedText);
      if (cirurgiaoFallback) {
        cirurgiao = cirurgiaoFallback.split(',')[0].trim();
      }
    }
  }

  const nomeCirurgiao = cirurgiao; // Para compatibilidade

  // Campos opcionais (não obrigatórios)
  const carteirinha = extract(/Carteirinha[: ]*([^\n\r]+)/i, normalizedText) ||
                       extract(/Número da Carteirinha[: ]*([^\n\r]+)/i, normalizedText) ||
                       extract(/Cartão[: ]*([^\n\r]+)/i, normalizedText);

  const especialidadeCirurgiao = extract(/Especialidade[: ]*([^\n\r]+)/i, normalizedText) ||
                                 extract(/Especialidade do Cirurgião[: ]*([^\n\r]+)/i, normalizedText);

  const hospital = extract(/Hospital[: ]*([^\n\r]+)/i, normalizedText) ||
                   extract(/Clínica[: ]*([^\n\r]+)/i, normalizedText) ||
                   extract(/Local[: ]*([^\n\r]+)/i, normalizedText);

  // Extrair horário da data de entrada se disponível (formato: "26/10/2025 18:48")
  let horario = "";
  if (dataProcedimento && dataProcedimento.includes(":")) {
    const horarioMatch = dataProcedimento.match(/(\d{1,2}):(\d{2})/);
    if (horarioMatch) {
      const hour = horarioMatch[1].padStart(2, "0");
      const minute = horarioMatch[2].padStart(2, "0");
      horario = `${hour}:${minute}`;
    }
  }
  
  // Se não encontrou na data de entrada, tentar extrair de outros lugares
  if (!horario) {
    horario = extractTime(normalizedText);
  }

  // Normalizar datas (remover horário da data de procedimento antes de normalizar)
  const nascimentoNormalized = normalizeDate(nascimento);
  // Remover horário da data de procedimento para normalização (ex: "26/10/2025 18:48" -> "26/10/2025")
  const dataProcedimentoSemHorario = dataProcedimento.split(/\s+/)[0]; // Pega apenas a parte da data
  const dataProcedimentoNormalized = normalizeDate(dataProcedimentoSemHorario);

  return {
    nome: nome || "",
    nascimento: nascimentoNormalized || nascimento || "",
    entrada: entrada || dataProcedimentoNormalized || "",
    dataProcedimento: dataProcedimentoNormalized || dataProcedimento || "",
    procedimento: procedimento || "",
    tipoProcedimento: tipoProcedimento || procedimento || "",
    tecnica: tecnica || "",
    sexo,
    convenio: convenio || "",
    carteirinha: carteirinha || "",
    cirurgiao: cirurgiao || "",
    nomeCirurgiao: nomeCirurgiao || cirurgiao || "",
    especialidadeCirurgiao: especialidadeCirurgiao || "",
    hospital: hospital || "",
    horario: horario || "",
  };
}

