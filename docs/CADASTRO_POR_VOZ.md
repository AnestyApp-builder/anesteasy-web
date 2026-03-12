# 🎤 Cadastro de Procedimentos por Comando de Voz

## 📋 Visão Geral

A funcionalidade de **Cadastro por Comando de Voz** permite que os usuários registrem procedimentos médicos falando naturalmente, sem precisar preencher formulários manualmente. O sistema utiliza:

1. **Google Speech-to-Text** - Para transcrever o áudio em texto
2. **OpenAI GPT-4** - Para extrair e estruturar as informações nos campos corretos

## 🚀 Como Usar

### Passo 1: Acessar o Formulário
1. Acesse a página de **Novo Procedimento** (`/procedimentos/novo`)
2. Você verá um card azul com o título "Cadastro por Voz" no topo da página

### Passo 2: Gravar o Comando
1. Clique no botão **"Iniciar Gravação"**
2. Permita o acesso ao microfone quando solicitado
3. Fale naturalmente os dados do procedimento
4. Clique em **"Parar Gravação"** quando terminar

### Passo 3: Processamento Automático
O sistema irá:
1. Transcrever sua fala em texto (Google Speech-to-Text)
2. Analisar o texto e extrair os campos (OpenAI GPT-4)
3. Preencher automaticamente o formulário
4. Você pode revisar e ajustar os campos antes de salvar

## 💬 Exemplo de Comando

```
"Procedimento de apendicectomia no paciente João Silva, 45 anos, 
data 25 de novembro de 2025, no hospital São Lucas, 
valor 5000 reais, anestesia geral, cirurgião Dr. Maria Santos, 
especialidade cirurgia geral"
```

## 📝 Campos Reconhecidos

O sistema pode extrair automaticamente:

### Informações Básicas
- Nome do procedimento (ex: "apendicectomia", "cesariana")
- Data do procedimento
- Tipo de procedimento (inferido automaticamente)
- Nome do paciente
- Idade do paciente
- Data de nascimento

### Informações da Equipe
- Nome do anestesiologista
- Nome do cirurgião
- Especialidade do cirurgião
- Nome da equipe
- Hospital/clínica

### Informações de Anestesia
- Técnica anestésica (geral, raquidiana, peridural, etc.)
- Código TSSU
- Horário e duração

### Informações Financeiras
- Valor do procedimento
- Forma de pagamento
- Status do pagamento
- Número de parcelas

### Informações Clínicas
- Convênio e carteirinha
- Complicações (sangramento, náusea, dor)
- Dados obstétricos (para cesarianas/partos)

## ⚙️ Configuração Técnica

### Variáveis de Ambiente Necessárias

#### 1. Google Speech-to-Text

Adicione no arquivo `.env.local`:

```env
GOOGLE_APPLICATION_CREDENTIALS=./keys/google-vision.json
```

**Configuração do Google Cloud:**

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Crie ou selecione um projeto
3. Ative a API **Cloud Speech-to-Text**:
   - Acesse "APIs e Serviços" → "Biblioteca"
   - Procure por "Cloud Speech-to-Text API"
   - Clique em "Ativar"
4. Crie credenciais:
   - Acesse "APIs e Serviços" → "Credenciais"
   - Clique em "Criar credenciais" → "Conta de serviço"
   - Preencha os dados e clique em "Criar"
   - Na tela de permissões, adicione o papel "Usuário da API Speech-to-Text"
   - Clique em "Concluir"
5. Baixe a chave JSON:
   - Na lista de contas de serviço, clique nos três pontos da conta criada
   - Selecione "Gerenciar chaves"
   - Clique em "Adicionar chave" → "Criar nova chave"
   - Selecione "JSON" e clique em "Criar"
   - Salve o arquivo como `keys/google-vision.json` no projeto

#### 2. OpenAI API

Adicione no arquivo `.env.local`:

```env
OPENAI_API_KEY=sk-...
```

**Como obter:**

1. Acesse [platform.openai.com](https://platform.openai.com/)
2. Faça login ou crie uma conta
3. Acesse "API Keys" no menu
4. Clique em "Create new secret key"
5. Copie a chave e adicione no `.env.local`

### Estrutura de Arquivos

```
projeto/
├── keys/
│   └── google-vision.json          # Credenciais do Google Cloud
├── app/
│   ├── api/
│   │   ├── speech-to-text/
│   │   │   └── route.ts            # API de transcrição
│   │   └── extract-procedure-fields/
│   │       └── route.ts            # API de extração com IA
│   └── procedimentos/
│       └── novo/
│           └── page.tsx            # Formulário com VoiceRecorder
├── components/
│   └── VoiceRecorder.tsx           # Componente de gravação
└── .env.local                       # Variáveis de ambiente
```

## 🔧 Pacotes Instalados

```bash
npm install @google-cloud/speech openai
```

## 🎯 Recursos Técnicos

### VoiceRecorder Component
- Captura de áudio do microfone
- Interface visual com timer
- Feedback de gravação em tempo real
- Tratamento de erros

### API `/api/speech-to-text`
- Recebe arquivo de áudio WebM
- Converte para formato aceito pelo Google
- Transcreve usando português brasileiro
- Retorna texto transcrito

### API `/api/extract-procedure-fields`
- Recebe texto transcrito
- Usa GPT-4 para análise semântica
- Extrai campos estruturados
- Valida campos obrigatórios
- Retorna objeto JSON com dados

## 🐛 Solução de Problemas

### Erro: "Microfone não autorizado"
- **Solução:** Verifique as permissões do navegador
- Chrome: Configurações → Privacidade e segurança → Configurações do site → Microfone

### Erro: "Erro ao transcrever áudio"
- **Solução:** 
  1. Verifique se a API do Google Speech-to-Text está ativa
  2. Confirme que o arquivo `google-vision.json` existe
  3. Verifique se há créditos na conta do Google Cloud

### Erro: "Campos obrigatórios não identificados"
- **Solução:** Tente falar mais claramente:
  - Mencione explicitamente: nome do paciente, data, procedimento, tipo
  - Fale devagar e articule bem
  - Evite ruídos de fundo

### Transcrição incorreta
- **Solução:**
  - Use um microfone de qualidade
  - Fale em ambiente silencioso
  - Articule claramente
  - Evite sotaques muito fortes ou gírias

## 💡 Dicas de Uso

1. **Fale Naturalmente:** Não precisa seguir uma ordem rígida, o GPT-4 entende contexto
2. **Seja Específico:** Quanto mais detalhes, melhor a extração
3. **Revise os Dados:** Sempre confira os campos preenchidos antes de salvar
4. **Teste Primeiro:** Faça alguns testes para entender o padrão de reconhecimento
5. **Ambiente Silencioso:** Para melhor qualidade de transcrição

## 📊 Custos Aproximados

### Google Speech-to-Text
- Primeiros 60 minutos/mês: **Grátis**
- Após isso: ~$0.006 por 15 segundos de áudio

### OpenAI GPT-4o-mini
- ~$0.150 por 1M tokens de entrada
- ~$0.600 por 1M tokens de saída
- Custo médio por comando: ~$0.002

**Custo estimado por comando de voz: < $0.01**

## 🔒 Segurança e Privacidade

- O áudio não é armazenado permanentemente
- A transcrição é processada apenas para extração de dados
- Os dados seguem as mesmas políticas LGPD do sistema
- Credenciais são armazenadas de forma segura no servidor

## 🚀 Melhorias Futuras

- [ ] Suporte a outros idiomas
- [ ] Comandos de voz para edição de procedimentos
- [ ] Reconhecimento de contexto multi-turno
- [ ] Correção automática de dados com IA
- [ ] Histórico de comandos de voz
- [ ] Atalhos de voz personalizados

## 📞 Suporte

Para problemas ou dúvidas:
1. Verifique este documento
2. Consulte os logs do navegador (F12 → Console)
3. Verifique os logs do servidor
4. Entre em contato com o suporte técnico

---

**Versão:** 1.0.0  
**Última atualização:** Novembro 2025

