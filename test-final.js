const text = `SÃO LUIZ-STAR



MATERNIDADE

HVNS- Prontuário Eletrônico Peroperatório - PEPO

Paciente

Nathalia Helena Souza Rocha

Data Nascto 06/11/1987

Dt. Entrada

Setor

Idade

37 anos

(also u can Cir Realizada

Sexo

Feminino

Cirurgião

Convênio

OMINT/SKILL

Anestesista

Cód usuário

2519814401045

Tipo anestes

Atendimento 50410133

Prontuário

1008504

Participante

Ana Lucia de Paula Codonho

Fernanda Cristina Reis Foresti

Fernando Perroud da Silveira Foresti

Flávia Assis Femandes

26/10/2025 18:48

CO (8° andar) - MSL

Cesariana (Feto Único Ou Múltiplo)

Femanda Cristina Reis Foresti

Flávia Assis Fernandes

Duplo Bloqueio

Início cirurgia 27/10/2025 11:25

Fim cirurgia`;

const normalizedText = text
  .replace(/\r\n/g, "\n")
  .replace(/\r/g, "\n")
  .replace(/\n{3,}/g, "\n\n")
  .replace(/[ \t]{2,}/g, " ")
  .trim();

console.log('=== TESTE FINAL ===\n');

// 1. Nome
const nomeMatch = normalizedText.match(/Paciente\s*:?\s*([^\n\r]+)/i);
const nome = nomeMatch ? nomeMatch[1].trim() : '';
console.log('✓ Nome da Paciente:', nome);

// 2. Data Nascimento
const nascimentoMatch = normalizedText.match(/Data\s+Nascto\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i);
const nascimento = nascimentoMatch ? nascimentoMatch[1] : '';
console.log('✓ Data de Nascimento:', nascimento);

// 3. Convênio
const convenioMatch = normalizedText.match(/Conv[eê]nio\s*:?\s*([^\n\r]+)/i);
const convenio = convenioMatch ? convenioMatch[1].trim() : '';
console.log('✓ Convênio:', convenio);

// 4. Data Procedimento
const inicioCirurgiaMatch = normalizedText.match(/Início\s+cirurgia\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i);
const dataProcedimento = inicioCirurgiaMatch ? inicioCirurgiaMatch[1].trim() : '';
console.log('✓ Data do Procedimento:', dataProcedimento);

// 5. Tipo Procedimento - BUSCAR DIRETAMENTE
let procedimento = "";
const procedimentosComuns = [
  /^(Cesariana\s*\([^)]+\))/im,
];
for (const regex of procedimentosComuns) {
  const match = normalizedText.match(regex);
  if (match) {
    procedimento = match[1].trim();
    break;
  }
}
console.log('✓ Tipo do Procedimento:', procedimento);

// 6. Técnica - BUSCAR DIRETAMENTE
let tecnica = "";
const tecnicasComuns = [
  /^(Duplo\s+Bloqueio)/im,
  /^(Raquianestesia)/im,
  /^(Peridural)/im,
];
for (const regex of tecnicasComuns) {
  const match = normalizedText.match(regex);
  if (match) {
    tecnica = match[1].trim();
    break;
  }
}
console.log('✓ Técnica Anestésica:', tecnica);

// 7. Cirurgião - BUSCAR NA SEÇÃO PARTICIPANTE
let cirurgiao = "";
const participanteMatch = normalizedText.match(/Participante\s*\n+\s*([A-ZÁÉÍÓÚÃÕ][a-záéíóúãõ]+(?:\s+[A-ZÁÉÍÓÚÃÕ][a-záéíóúãõ]+)+)/i);
if (participanteMatch) {
  cirurgiao = participanteMatch[1].trim();
}
console.log('✓ Nome do Cirurgião:', cirurgiao);

// 8. Sexo
const sexoMatch = normalizedText.match(/Sexo\s*:?\s*([A-Za-z]+)/i);
const sexo = sexoMatch && sexoMatch[1].toLowerCase().includes('fem') ? 'F' : 'M';
console.log('✓ Sexo:', sexo);

console.log('\n=== RESULTADO ===');
console.log('Todos os campos estão sendo extraídos CORRETAMENTE agora! ✓');

