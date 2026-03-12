# 🎤 Guia Rápido de Teste - Cadastro por Voz

## 🚀 Como Testar Agora

### 1. Inicie o servidor de desenvolvimento
```bash
npm run dev
```

### 2. Acesse o formulário
Abra no navegador: `http://localhost:3000/procedimentos/novo`

### 3. Encontre o componente de voz
No topo da página, você verá um **card azul** com o título "Cadastro por Voz"

### 4. Faça o teste
1. Clique em **"Iniciar Gravação"**
2. Permita o acesso ao microfone (se solicitado)
3. Fale claramente:

### 📝 Scripts de Teste Sugeridos

#### Teste 1 - Procedimento Simples
```
"Procedimento de apendicectomia, paciente Maria Santos, 
35 anos, data de hoje, hospital Santa Casa, 
valor 3 mil reais, anestesia geral"
```

**Campos esperados:**
- ✅ Nome do procedimento: Apendicectomia
- ✅ Nome do paciente: Maria Santos
- ✅ Idade: 35
- ✅ Data: (data atual)
- ✅ Hospital: Santa Casa
- ✅ Valor: 3000
- ✅ Técnica anestésica: Geral
- ✅ Tipo: Cirurgia Geral (inferido)

---

#### Teste 2 - Procedimento Completo
```
"Cirurgia de hérnia inguinal no paciente João Silva, 
52 anos, data 28 de novembro de 2025, 
hospital São Lucas, convênio Unimed, 
anestesia raquidiana, cirurgião Doutor Pedro Oliveira, 
especialidade cirurgia geral, valor 5500 reais, 
forma de pagamento PIX, horário 14 horas, 
duração 90 minutos"
```

**Campos esperados:**
- ✅ Procedimento: Hérnia inguinal
- ✅ Paciente: João Silva
- ✅ Idade: 52
- ✅ Data: 2025-11-28
- ✅ Hospital: São Lucas
- ✅ Convênio: Unimed
- ✅ Técnica: Raquidiana
- ✅ Cirurgião: Pedro Oliveira
- ✅ Especialidade: Cirurgia Geral
- ✅ Valor: 5500
- ✅ Forma de pagamento: PIX
- ✅ Horário: 14:00
- ✅ Duração: 90 minutos
- ✅ Tipo: Cirurgia Geral (inferido)

---

#### Teste 3 - Cesariana (Obstétrico)
```
"Cesariana da paciente Ana Costa, 28 anos, 
data 30 de novembro, hospital Maternity, 
raquianestesia, tipo de cesariana nova ráqui, 
sem complicações, cirurgião Doutora Julia Mendes, 
especialidade obstetrícia, valor 8 mil reais"
```

**Campos esperados:**
- ✅ Procedimento: Cesariana
- ✅ Tipo: Obstetrícia (inferido)
- ✅ Paciente: Ana Costa
- ✅ Idade: 28
- ✅ Data: 2025-11-30
- ✅ Hospital: Maternity
- ✅ Técnica: Raquianestesia
- ✅ Tipo cesariana: Nova Ráqui
- ✅ Cirurgião: Julia Mendes
- ✅ Especialidade: Obstetrícia
- ✅ Valor: 8000

---

#### Teste 4 - Com Parcelas
```
"Cirurgia de colecistectomia, paciente Roberto Lima, 
45 anos, data primeiro de dezembro, 
hospital Albert Einstein, anestesia geral, 
valor 12 mil reais, parcelado em 4 vezes, 
cirurgião doutor Carlos Ferreira"
```

**Campos esperados:**
- ✅ Procedimento: Colecistectomia
- ✅ Paciente: Roberto Lima
- ✅ Idade: 45
- ✅ Data: 2025-12-01
- ✅ Hospital: Albert Einstein
- ✅ Técnica: Geral
- ✅ Valor: 12000
- ✅ Forma de pagamento: Parcelado
- ✅ Número de parcelas: 4
- ✅ Cirurgião: Carlos Ferreira
- ✅ Tipo: Cirurgia Geral (inferido)

---

## ✅ Checklist de Validação

Após cada teste, verifique:

- [ ] O botão mudou de "Iniciar" para "Parar" durante a gravação
- [ ] O timer apareceu e contou os segundos
- [ ] Após parar, apareceu "Processando..."
- [ ] Apareceu mensagem de sucesso (✅)
- [ ] Os campos do formulário foram preenchidos
- [ ] Os valores estão corretos e coerentes
- [ ] É possível editar os campos preenchidos
- [ ] É possível salvar o procedimento normalmente

## 🐛 O que fazer se algo der errado

### Problema: "Microfone não autorizado"
**Solução:** 
- Chrome: ícone do cadeado → Permissões → Microfone → Permitir
- Edge: ícone do cadeado → Permissões para este site → Microfone → Permitir

### Problema: "Não foi possível transcrever"
**Soluções:**
- Fale mais alto e mais devagar
- Reduza ruídos de fundo
- Use um microfone melhor
- Tente novamente com frases mais curtas

### Problema: "Campos obrigatórios não identificados"
**Soluções:**
- Certifique-se de mencionar: nome do paciente, procedimento, data e tipo
- Seja mais explícito: em vez de "amanhã", diga "dia 25 de novembro"
- Repita o comando com mais detalhes

### Problema: Campos preenchidos incorretamente
**Soluções:**
- Edite manualmente os campos incorretos
- Tente novamente com pronúncia mais clara
- Seja mais específico nos nomes (ex: "São Lucas" em vez de "sanlu")

## 📊 Monitoramento

Abra o Console do navegador (F12 → Console) para ver:
- 🎤 Logs de gravação
- 📝 Transcrição recebida
- 🤖 Dados extraídos pela IA
- ✅ Mapeamento para o formulário

Exemplo de log esperado:
```
🎤 [VOICE] Dados recebidos do comando de voz: {...}
✅ [VOICE] FormData atualizado: {...}
```

## 🎯 Dicas para Melhores Resultados

1. **Ambiente Silencioso**: Grave em local com pouco ruído
2. **Fala Clara**: Articule bem as palavras
3. **Ritmo Moderado**: Nem muito rápido, nem muito devagar
4. **Estrutura Lógica**: Siga uma ordem (paciente → procedimento → detalhes → financeiro)
5. **Números por Extenso**: "Cinco mil reais" funciona melhor que "5000"
6. **Datas Explícitas**: "Vinte e cinco de novembro" é melhor que "dia 25"

## 📈 Tempo Esperado

- ⏱️ **Gravação**: 15-30 segundos
- ⚙️ **Processamento**: 10-15 segundos
- ✅ **Total**: 25-45 segundos

## 🎉 Teste de Aceitação Final

Se todos os 4 testes acima funcionarem corretamente, a funcionalidade está **100% OPERACIONAL**! ✅

---

**Dica Final**: Comece com o Teste 1 (mais simples) e vá progredindo para os mais complexos.

