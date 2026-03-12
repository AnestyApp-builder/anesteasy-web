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

const lines = text.split('\n').map((line, idx) => `${idx}: ${line}`);
console.log('LINHAS DO TEXTO:\n');
console.log(lines.join('\n'));

console.log('\n\n=== PROCURANDO OS VALORES CORRETOS ===\n');

// Procurar "Cesariana" no texto
const cesariana = text.match(/Cesariana[^\n]*/i);
console.log('Encontrei Cesariana:', cesariana ? cesariana[0] : 'NÃO');

// Procurar "Duplo Bloqueio"
const duploBloqueio = text.match(/Duplo Bloqueio/i);
console.log('Encontrei Duplo Bloqueio:', duploBloqueio ? duploBloqueio[0] : 'NÃO');

// Procurar Fernanda (cirurgião)
const fernanda = text.match(/Fernanda Cristina Reis Foresti/i);
console.log('Encontrei Fernanda:', fernanda ? fernanda[0] : 'NÃO');

console.log('\n=== ANÁLISE ===');
console.log('O texto está com os valores FORA DE ORDEM!');
console.log('Os rótulos estão no começo, mas os valores estão espalhados no meio do texto.');

