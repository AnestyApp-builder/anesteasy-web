/**
 * Normaliza e padroniza textos (como nomes de cirurgiões, hospitais e procedimentos)
 * Removendo acentos, espaços extras e convertendo para Title Case.
 */
export function normalizeBasic(text: string): string {
  if (!text) return 'Não informado'

  // 1. Converte para minúsculo
  let clean = text.toLowerCase().trim()

  // 2. Remove acentos e diacríticos
  clean = clean.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  // 3. Remove caracteres especiais indesejados mantendo espaços, hífens e letras
  clean = clean.replace(/[^a-z0-9 -]/g, '')

  // 4. Remove espaços múltiplos
  clean = clean.replace(/\s+/g, ' ').trim()

  return clean
}

/**
 * Converte um texto normalizado (minúsculo e sem acentos) para Title Case
 */
function toTitleCase(text: string): string {
  if (!text) return ''
  const pequenas = ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'para', 'com']
  
  return text.split(' ').map((word, index) => {
    if (index > 0 && pequenas.includes(word)) return word
    if (word.length === 0) return ''
    return word.charAt(0).toUpperCase() + word.slice(1)
  }).join(' ')
}

/**
 * Mapa de sinônimos comuns para procedimentos anestésicos/cirúrgicos.
 * As chaves e os valores de busca devem estar sempre "normalizados" (sem acento, tudo minúsculo).
 */
const PROCEDURE_ALIASES: Record<string, string[]> = {
  'Cesariana': ['cesariana', 'cesaria', 'cesarea', 'parto cesariana', 'parto cesarea', 'parto cesaria', 'cesareana', 'cesareo'],
  'Parto Normal': ['parto normal', 'parto vaginal', 'parto', 'pn', 'parto via baixa'],
  'Apendicectomia': ['apendicectomia', 'apendicite', 'cirurgia apendicite', 'apendice'],
  'Colecistectomia': ['colecistectomia', 'colecistectomia videolaparoscopica', 'cole', 'vesicula', 'cirurgia vesicula', 'retirada de vesicula', 'colecisto'],
  'Endoscopia Digestiva': ['endoscopia digestiva', 'endoscopia digestiva alta', 'endoscopia', 'eda', 'endoscopia gastrica'],
  'Colonoscopia': ['colonoscopia', 'colo', 'colon'],
  'Hernioplastia': ['hernioplastia', 'hernia', 'hernia inguinal', 'hernia umbilical', 'cirurgia hernia'],
  'Histerectomia': ['histerectomia', 'retirada de utero', 'histero', 'histerectomia total', 'histerectomia vaginal'],
  'Curetagem': ['curetagem', 'curetagem uterina', 'amiu'],
  'Laqueadura': ['laqueadura', 'laqueadura tubaria', 'lt', 'ligadura de trompas'],
  'Bypass Gástrico': ['bypass', 'bypass gastrico', 'bariatrica bypass'],
  'Sleeve Gástrico': ['sleeve', 'gastrectomia vertical', 'bariatrica sleeve'],
  'Rinoplastia': ['rinoplastia', 'rino', 'cirurgia nariz'],
  'Mamoplastia': ['mamoplastia', 'protese de mama', 'protese mama', 'silicone', 'mamoplastia de aumento', 'mamoplastia redutora'],
  'Lipoaspiração': ['lipoaspiracao', 'lipo', 'lipoescultura', 'hidrolipo'],
  'Catarata': ['catarata', 'facoemulsificacao', 'faco'],
  'Amigdalectomia': ['amigdalectomia', 'amidalectomia', 'adenoamigdalectomia', 'amigdalas', 'cirurgia de amigdala'],
  'Broncoscopia': ['broncoscopia', 'bronco'],
  'Cirurgia Cardíaca': ['cirurgia cardiaca', 'cirurgia cardica', 'cirurgia cardia', 'cardiaca', 'cardica', 'cardia'],
  'Outros': ['anestesia', 'anestesia geral', 'raquianestesia', 'raqui', 'sedacao', 'bloqueio', 'anestesia local']
}

/**
 * Agrupa o nome do procedimento usando o dicionário. Se não achar, usa Title Case.
 */
export function normalizeProcedureName(originalName: string): string {
  if (!originalName) return 'Outros'

  const normalized = normalizeBasic(originalName)

  for (const [canonicalName, aliases] of Object.entries(PROCEDURE_ALIASES)) {
    // Busca exata nas aliases ou verificação se a frase normalizada inclui uma das aliases.
    // Ex: "colecistectomia c/ colangiografia" -> cai em "colecistectomia"
    for (const alias of aliases) {
      // Se a string contiver a palavra exata usando limites de palavra (para não confundir "colon" com "colonoscopia" se houver)
      const regex = new RegExp(`\\b${alias}\\b`)
      if (regex.test(normalized)) {
        return canonicalName
      }
    }
  }

  // Fallback: Devolve a string limpa e em Title Case
  return toTitleCase(normalized) || 'Outros'
}

/**
 * Normaliza Hospitais ou Clínicas (mantendo em Title Case para agrupar variações de caixa e espaços)
 */
export function normalizeHospitalName(originalName: string): string {
  const normalized = normalizeBasic(originalName)
  if (!normalized || normalized === 'nao informado' || normalized === 'nenhum') {
    return 'Não informado'
  }
  return toTitleCase(normalized)
}

/**
 * Normaliza Cirurgiões (removendo "Dr", "Dra" soltos ou deixando uniforme e em Title Case)
 */
export function normalizeSurgeonName(originalName: string): string {
  let normalized = normalizeBasic(originalName)
  if (!normalized || normalized === 'nao informado' || normalized === 'nenhum') {
    return 'Não informado'
  }

  // Remove dr/dra solto no início para unificar "João" com "Dr João"
  normalized = normalized.replace(/^dr\s+/, '').replace(/^dra\s+/, '').replace(/^dr\.\s*/, '').replace(/^dra\.\s*/, '').trim()

  return toTitleCase(normalized)
}
