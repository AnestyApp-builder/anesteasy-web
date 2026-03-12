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

console.log('=== TESTE CIRURGIÃO V2 ===\n');

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
      frequencia[n] = (frequencia[n] || 0) + 1;
    });
    
    console.log('\nFrequência:');
    Object.entries(frequencia).forEach(([nome, count]) => 
      console.log(`  ${nome}: ${count}x`)
    );
    
    const nomeMaisFrequente = Object.entries(frequencia)
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])[0];
    
    let cirurgiao = "";
    if (nomeMaisFrequente) {
      cirurgiao = nomeMaisFrequente[0];
      console.log('\n✓ Cirurgião (mais frequente):', cirurgiao);
    } else if (nomesCompletos.length > 1) {
      cirurgiao = nomesCompletos[1];
      console.log('\n✓ Cirurgião (segundo nome):', cirurgiao);
    } else {
      cirurgiao = nomesCompletos[0];
      console.log('\n✓ Cirurgião (único nome):', cirurgiao);
    }
  }
}

