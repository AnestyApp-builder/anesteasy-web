// Teste para debugar o parseFicha com o texto real

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

Fim cirurgia

Diretor Técnico Médico:

Participantes

Função

Enfermeira Obstetra

Cirurgião Principal

Pediatra na Sala de Parto

Anestesista

Джетимо

4088001

C

Juliana Fontan Ottolia

Primeiro Aux

Agentes anestésicos / Terapia Hidroeletrolítica / Medicamentos

Apresentação comercial

Fentanila 2 ml

FENTANILA 100MCG/2ML

Vel/dose Medida

20 Microgramas

Hal insp/ Dose total Bolus

S

Início Final

16:15`;

// Normalizar texto
const normalizedText = text
  .replace(/\r\n/g, "\n")
  .replace(/\r/g, "\n")
  .replace(/\n{3,}/g, "\n\n")
  .replace(/[ \t]{2,}/g, " ")
  .trim();

console.log('=== TEXTO NORMALIZADO ===');
console.log(normalizedText);
console.log('\n\n=== TESTES DE REGEX ===\n');

// Teste 1: Nome do Paciente
const nomeMatch = normalizedText.match(/Paciente\s*:?\s*([^\n\r]+)/i);
console.log('1. Nome Paciente:', nomeMatch ? nomeMatch[1].trim() : 'NÃO ENCONTRADO');

// Teste 2: Data Nascimento
const nascimentoMatch = normalizedText.match(/Data\s+Nascto\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i);
console.log('2. Data Nascimento:', nascimentoMatch ? nascimentoMatch[1] : 'NÃO ENCONTRADO');

// Teste 3: Convênio
const convenioMatch = normalizedText.match(/Conv[eê]nio\s*:?\s*([^\n\r]+)/i);
console.log('3. Convênio:', convenioMatch ? convenioMatch[1].trim() : 'NÃO ENCONTRADO');

// Teste 4: Data Procedimento (Início cirurgia)
const inicioCirurgiaMatch = normalizedText.match(/Início\s+cirurgia\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i);
console.log('4. Início cirurgia:', inicioCirurgiaMatch ? inicioCirurgiaMatch[1].trim() : 'NÃO ENCONTRADO');

// Teste 5: Tipo de Procedimento (com suporte para próxima linha)
let procedimento = "";
const procedimentoMatchInline = normalizedText.match(/Cir(?:urgia)?\s+Realizada?\s*:?\s*([^\n\r]+)/i);
if (procedimentoMatchInline && procedimentoMatchInline[1].trim() && !procedimentoMatchInline[1].match(/^\s*$/)) {
  procedimento = procedimentoMatchInline[1].trim();
} else {
  const procedimentoMatchNextLine = normalizedText.match(/Cir(?:urgia)?\s+Realizada?\s*:?\s*\n\s*([^\n\r]+)/i);
  if (procedimentoMatchNextLine) {
    procedimento = procedimentoMatchNextLine[1].trim();
  }
}
console.log('5. Tipo Procedimento:', procedimento || 'NÃO ENCONTRADO');

// Teste 6: Técnica Anestésica (com suporte para próxima linha)
let tecnica = "";
const tecnicaMatchInline = normalizedText.match(/Tipo\s+anestes[ia]*\s*:?\s*([^\n\r]+)/i);
if (tecnicaMatchInline && tecnicaMatchInline[1].trim() && !tecnicaMatchInline[1].match(/^\s*$/)) {
  tecnica = tecnicaMatchInline[1].trim();
} else {
  const tecnicaMatchNextLine = normalizedText.match(/Tipo\s+anestes[ia]*\s*:?\s*\n\s*([^\n\r]+)/i);
  if (tecnicaMatchNextLine) {
    tecnica = tecnicaMatchNextLine[1].trim();
  }
}
console.log('6. Técnica Anestésica:', tecnica || 'NÃO ENCONTRADO');

// Teste 7: Cirurgião (com suporte para próxima linha)
let cirurgiao = "";
const cirurgiaoMatchInline = normalizedText.match(/Cirurgião\s*:?\s*([^\n\r]+)/i);
if (cirurgiaoMatchInline && cirurgiaoMatchInline[1].trim() && !cirurgiaoMatchInline[1].match(/^\s*$/)) {
  cirurgiao = cirurgiaoMatchInline[1].trim().split(',')[0].trim();
} else {
  const cirurgiaoMatchNextLine = normalizedText.match(/Cirurgião\s*:?\s*\n\s*([^\n\r]+)/i);
  if (cirurgiaoMatchNextLine) {
    cirurgiao = cirurgiaoMatchNextLine[1].trim().split(',')[0].trim();
  }
}
console.log('7. Cirurgião:', cirurgiao || 'NÃO ENCONTRADO');

// Teste 8: Sexo
const sexoMatch = normalizedText.match(/Sexo\s*:?\s*([A-Za-z]+)/i);
console.log('8. Sexo:', sexoMatch ? sexoMatch[1] : 'NÃO ENCONTRADO');

