import * as XLSX from 'xlsx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DadosFinanceirosGrupo {
  grupo: { id: string; nome: string; totalCotistas: number };
  anual: {
    ano: number;
    faturamentoBruto: number;
    despesas: number;
    liquidoDistribuivel: number;
    cotaIndividual: number;
    procedimentos: number;
    ticketMedio: number;
    glosado: number;
    glosaRecuperada: number;
    glosaEmAberto: number;
    parcelamentosAVencer: number;
    aReceber: number;
    minhaCotaPercentual?: number;
    minhaCotaAnual?: number;
    faturamentoMensal: { mes: string; valor: number }[];
    distribuicao: { cnpj: number; cpf: number };
    cpfPorFonte: {
      fontePJ: number;
      fontePF: number;
      irrfRetido: number;
      inssRetido: number;
    };
    cotistas: {
      nome: string;
      crm: string;
      cota: number;
      recebidoCnpj: number;
      recebidoCpf: number;
      valorCota?: number;
    }[];
  };
  mensal: {
    mesReferencia: string;
    faturamento: number;
    faturamentoMesAnterior: number;
    variacaoPct: number;
    cotaDoMes: number;
    minhaCotaMensal?: number;
    procedimentos: number;
    ultimos6Meses: { mes: string; valor: number }[];
    recebimentosPorMeio: { meio: string; valor: number }[];
    glosado: number;
    glosaEmAberto: number;
    aReceber: number;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

// ---------------------------------------------------------------------------
// Sheet builders
// ---------------------------------------------------------------------------

function buildResumo(
  grupo: DadosFinanceirosGrupo['grupo'],
  anual: DadosFinanceirosGrupo['anual'],
): XLSX.WorkSheet {
  const rows: (string | number)[][] = [
    ['Resumo Financeiro Anual', anual.ano],
    ['Grupo', grupo.nome],
    [],
    ['Indicador', 'Valor'],
    ['Faturamento Bruto', anual.faturamentoBruto],
    ['Despesas', anual.despesas],
    ['Líquido Distribuível', anual.liquidoDistribuivel],
    ['Cota Individual', anual.cotaIndividual],
    ['Nº de Cotistas', grupo.totalCotistas],
    ['Procedimentos', anual.procedimentos],
    ['Ticket Médio', anual.ticketMedio],
    ['A Receber (Pendente)', anual.aReceber],
    [],
    [
      'O AnestEasy organiza e consolida os dados. Nao calcula nem recolhe tributos. A apuracao fiscal e a declaracao sao responsabilidade do contador.',
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 22 }, { wch: 20 }];
  return ws;
}

function buildFaturamentoMensal(
  anual: DadosFinanceirosGrupo['anual'],
): XLSX.WorkSheet {
  const rows: (string | number)[][] = [['Mês', 'Valor']];

  let total = 0;
  for (const item of anual.faturamentoMensal) {
    rows.push([item.mes, item.valor]);
    total += item.valor;
  }

  rows.push(['Total', total]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 18 }, { wch: 18 }];
  return ws;
}

function buildDistribuicaoCotas(
  anual: DadosFinanceirosGrupo['anual'],
): XLSX.WorkSheet {
  const rows: (string | number)[][] = [
    ['Nome', 'CRM', 'Cota (%)', 'Recebido CNPJ', 'Recebido CPF'],
  ];

  let totalCota = 0;
  let totalCnpj = 0;
  let totalCpf = 0;

  for (const c of anual.cotistas) {
    rows.push([c.nome, c.crm, c.cota, c.recebidoCnpj, c.recebidoCpf]);
    totalCota += c.cota;
    totalCnpj += c.recebidoCnpj;
    totalCpf += c.recebidoCpf;
  }

  rows.push(['Total', '', totalCota, totalCnpj, totalCpf]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 30 },
    { wch: 12 },
    { wch: 12 },
    { wch: 18 },
    { wch: 18 },
  ];
  return ws;
}

function buildPorTitularidade(
  anual: DadosFinanceirosGrupo['anual'],
): XLSX.WorkSheet {
  const rows: (string | number)[][] = [
    ['Titularidade', 'Valor'],
    [],
    ['Recebido via CNPJ', anual.distribuicao.cnpj],
    ['Recebido via CPF', anual.distribuicao.cpf],
    [],
    ['Detalhamento CPF', ''],
    [
      'Recebido de Fonte PJ',
      anual.cpfPorFonte.fontePJ,
    ],
    ['  IRRF Retido', anual.cpfPorFonte.irrfRetido],
    ['  INSS Retido', anual.cpfPorFonte.inssRetido],
    [
      'Recebido de Fonte PF (sujeito a carnê-leão)',
      anual.cpfPorFonte.fontePF,
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 44 }, { wch: 20 }];
  return ws;
}

function buildGlosas(
  anual: DadosFinanceirosGrupo['anual'],
): XLSX.WorkSheet {
  const rows: (string | number)[][] = [
    ['Glosas', 'Valor'],
    ['Glosado no Ano', anual.glosado],
    ['Glosa Recuperada', anual.glosaRecuperada],
    ['Glosa em Aberto', anual.glosaEmAberto],
    ['Parcelamentos a Vencer', anual.parcelamentosAVencer],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 26 }, { wch: 20 }];
  return ws;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function exportarRelatorioContador(
  grupo: DadosFinanceirosGrupo['grupo'],
  anual: DadosFinanceirosGrupo['anual'],
): Promise<void> {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, buildResumo(grupo, anual), 'Resumo');
  XLSX.utils.book_append_sheet(
    wb,
    buildFaturamentoMensal(anual),
    'Faturamento Mensal',
  );
  XLSX.utils.book_append_sheet(
    wb,
    buildDistribuicaoCotas(anual),
    'Distribuicao Cotas',
  );
  XLSX.utils.book_append_sheet(
    wb,
    buildPorTitularidade(anual),
    'Por Titularidade',
  );
  XLSX.utils.book_append_sheet(wb, buildGlosas(anual), 'Glosas');

  const slug = slugify(grupo.nome);
  const fileName = `relatorio-contador-${slug}-${anual.ano}.xlsx`;

  XLSX.writeFile(wb, fileName);
}
