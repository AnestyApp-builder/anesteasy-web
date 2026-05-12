/**
 * Lista canônica de convênios e função de normalização.
 * Centraliza os nomes para garantir consistência nos relatórios.
 */

export interface Convenio {
  nome: string
  termos: string[]
}

export const CONVENIOS: Convenio[] = [
  { nome: 'Particular', termos: ['particular', 'self pay', 'selfpay', 'autopagante', 'auto pagante', 'privado'] },
  { nome: 'Unimed', termos: ['unimed'] },
  { nome: 'AMIL', termos: ['amil', 'aml'] },
  { nome: 'SulAmérica', termos: ['sulamérica', 'sul america', 'sulamerica', 'sul-america', 'sulam'] },
  { nome: 'Bradesco Saúde', termos: ['bradesco'] },
  { nome: 'Porto Seguro Saúde', termos: ['porto seguro'] },
  { nome: 'NotreDame Intermédica', termos: ['notredame', 'notre dame', 'intermedica', 'intermédica', 'gndi', 'ndmg'] },
  { nome: 'Hapvida', termos: ['hapvida'] },
  { nome: 'Prevent Senior', termos: ['prevent senior', 'prevent'] },
  { nome: 'OMINT', termos: ['omint'] },
  { nome: 'Cassi', termos: ['cassi'] },
  { nome: 'Geap', termos: ['geap'] },
  { nome: 'Fusex', termos: ['fusex'] },
  { nome: 'Assefaz', termos: ['assefaz'] },
  { nome: 'Sompo Saúde', termos: ['sompo'] },
  { nome: 'Allianz Saúde', termos: ['allianz'] },
  { nome: 'Golden Cross', termos: ['golden cross', 'goldencross'] },
  { nome: 'Mediservice', termos: ['mediservice'] },
  { nome: 'Trasmontano', termos: ['trasmontano'] },
  { nome: 'Cruz Azul', termos: ['cruz azul'] },
  { nome: 'Ipasgo', termos: ['ipasgo'] },
  { nome: 'Ipsemg', termos: ['ipsemg'] },
  { nome: 'Postal Saúde', termos: ['postal saúde', 'postal saude', 'postal'] },
  { nome: 'Economus', termos: ['economus', 'caixa saúde', 'saúde caixa'] },
  { nome: 'Agemed', termos: ['agemed'] },
  { nome: 'Celg-T', termos: ['celg'] },
]

/** Nomes canônicos para usar em dropdowns */
export const NOMES_CONVENIOS = CONVENIOS.map(c => c.nome)

/** Remove acentos e converte para minúsculas para comparação */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

/**
 * Recebe texto bruto (ex: "AMIL-PL-880 AMIL 5750 CP") e retorna o nome
 * canônico (ex: "AMIL"). Se não encontrar match, retorna o texto original.
 */
export function normalizarConvenio(raw: string): string {
  if (!raw || !raw.trim()) return ''
  const rawNorm = normalizar(raw)

  for (const convenio of CONVENIOS) {
    for (const termo of convenio.termos) {
      if (rawNorm.includes(normalizar(termo))) {
        return convenio.nome
      }
    }
  }

  return raw.trim()
}

/**
 * Filtra a lista de convênios pelo texto digitado pelo usuário.
 */
export function filtrarConvenios(busca: string): string[] {
  if (!busca.trim()) return NOMES_CONVENIOS
  const buscaNorm = normalizar(busca)
  return NOMES_CONVENIOS.filter(nome => normalizar(nome).includes(buscaNorm))
}
