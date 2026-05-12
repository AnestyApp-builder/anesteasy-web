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

console.log('=== TESTE CIRURGIÃO V3 (COM NORMALIZAÇÃO) ===\n');

const participanteIndex = normalizedText.search(/Participante/i);
if (participanteIndex >= 0) {
  const textoAposParticipante = normalizedText.substring(participanteIndex);
  const linhas = textoAposParticipante.split('\n');
  const nomesCompletos = [];
  
  for (const linha of linhas) {
    const linhaTrimmed = linha.trim();
    if (linhaTrimmed.match(/^[A-ZÁÉÍÓÚÃÕ][a-záéíóúãõ]+\s+[A-ZÁÉÍÓÚÃÕ][a-záéíóúãõ]+\s+[A-ZÁÉÍÓÚÃÕ][a-záéíóúãõ]+/)) {
      nomesCompletos.push(linhaTrimmed);
    }
  }
  
  console.log('Nomes completos encontrados:');
  nomesCompletos.forEach((n, i) => console.log(`  ${i}: ${n}`));
  
  if (nomesCompletos.length > 0) {
    const frequencia = {};
    nomesCompletos.forEach(n => {
      const normalizado = n.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      
      if (!frequencia[normalizado]) {
        frequencia[normalizado] = { count: 0, original: n };
      }
      frequencia[normalizado].count++;
    });
    
    console.log('\nFrequência (normalizada):');
    Object.entries(frequencia).forEach(([norm, { count, original }]) => 
      console.log(`  ${original}: ${count}x`)
    );
    
    const nomeMaisFrequente = Object.values(frequencia)
      .filter(({ count }) => count >= 2)
      .sort((a, b) => b.count - a.count)[0];
    
    let cirurgiao = "";
    if (nomeMaisFrequente) {
      cirurgiao = nomeMaisFrequente.original;
      console.log('\n✓ Cirurgião (mais frequente):', cirurgiao);
    } else if (nomesCompletos.length > 1) {
      cirurgiao = nomesCompletos[1];
      console.log('\n✓ Cirurgião (segundo nome):', cirurgiao);
    }
  }
}

