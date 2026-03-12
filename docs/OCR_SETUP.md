# Configuração do OCR de Fichas Anestésicas (Google Cloud Vision)

Este documento explica como configurar o sistema de OCR para extrair automaticamente dados de fichas anestésicas usando Google Cloud Vision API.

## 📋 Pré-requisitos

1. Conta no Google Cloud Platform (GCP)
2. Projeto criado no GCP
3. Google Cloud Vision API habilitada

## 🔧 Passo a Passo de Configuração

### 1. Criar Projeto no Google Cloud Platform

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um projeto existente
3. Anote o **Project ID** (você precisará dele depois)

### 2. Habilitar Cloud Vision API

1. No menu do GCP, vá em **APIs & Services** > **Library**
2. Procure por **"Cloud Vision API"**
3. Clique em **Enable** para habilitar a API

### 3. Criar Service Account e Baixar Credenciais

1. Vá em **IAM & Admin** > **Service Accounts**
2. Clique em **Create Service Account**
3. Preencha:
   - **Service account name**: `anesteasy-ocr` (ou outro nome)
   - **Service account ID**: será gerado automaticamente
   - Clique em **Create and Continue**
4. Na seção **Grant this service account access to project**, adicione a role:
   - **Cloud Vision API User** ou **Cloud Vision API Client**
5. Clique em **Done**
6. Na lista de Service Accounts, clique no que você acabou de criar
7. Vá na aba **Keys**
8. Clique em **Add Key** > **Create new key**
9. Selecione **JSON** como formato
10. Clique em **Create** - o arquivo JSON será baixado automaticamente

### 4. Configurar Credenciais no Projeto

1. Renomeie o arquivo JSON baixado para `google-vision.json`
2. Crie a pasta `keys` na raiz do projeto (se não existir)
3. Coloque o arquivo `google-vision.json` dentro da pasta `keys/`
4. **⚠️ IMPORTANTE**: Adicione `keys/` ao `.gitignore` para não commitar credenciais

```bash
# Adicionar ao .gitignore
keys/
*.json
!package.json
!package-lock.json
```

### 5. Configurar Variáveis de Ambiente

Adicione as seguintes variáveis no arquivo `.env.local`:

```env
# Google Cloud Vision
GOOGLE_APPLICATION_CREDENTIALS=keys/google-vision.json
PROJECT_ID=seu-project-id-aqui

# OpenAI (Opcional - para melhor precisão no preenchimento)
OPENAI_API_KEY=sk-...
```

**Google Cloud Vision:**
- Substitua `seu-project-id-aqui` pelo **Project ID** do seu projeto no GCP.

**OpenAI (Opcional):**
- O sistema funciona sem a chave OpenAI, usando apenas regex para parse
- Com a chave OpenAI, o sistema usa IA para melhor precisão no mapeamento de campos
- Para obter a chave:
  1. Acesse [OpenAI Platform](https://platform.openai.com/)
  2. Faça login ou crie uma conta
  3. Vá em **API Keys**
  4. Clique em **Create new secret key**
  5. Copie a chave (ela começa com `sk-`)
  6. Cole no `.env.local` como `OPENAI_API_KEY=sk-...`

### 6. Executar Migration do Banco de Dados

Execute a migration para criar a tabela de logs de OCR:

```bash
# Se estiver usando Supabase CLI
supabase migration up

# Ou execute o SQL manualmente no Supabase Dashboard
# Arquivo: supabase/migrations/20250119000000_create_ocr_logs.sql
```

## 📦 Dependências Instaladas

As seguintes dependências já foram instaladas no projeto:

- `@google-cloud/vision` - Cliente oficial do Google Cloud Vision
- `openai` - Cliente oficial da OpenAI para processamento com IA
- `formidable` - Parser de FormData (já incluído no Next.js 13+)
- `sharp` - Processamento e otimização de imagens
- `react-dropzone` - Componente de upload com drag & drop

## 🚀 Como Usar

1. Acesse a página de cadastro de procedimentos: `/procedimentos/novo`
2. Na primeira seção (Identificação do Procedimento), você verá a opção de **Preenchimento Automático via OCR**
3. Clique ou arraste uma imagem da ficha anestésica
4. Ou use o botão **"Tirar Foto"** para capturar diretamente da câmera (mobile)
5. Aguarde o processamento (pode levar alguns segundos)
6. Os campos serão preenchidos automaticamente com os dados extraídos
7. Revise e ajuste os campos se necessário

### Formatos Suportados

- ✅ **Imagens**: JPEG, PNG, WebP
- ✅ Máximo: 10MB por arquivo

## 🔍 Campos Extraídos Automaticamente

O sistema tenta extrair os seguintes campos:

- ✅ Nome do Paciente
- ✅ Data de Nascimento
- ✅ Data do Procedimento/Entrada
- ✅ Tipo de Procedimento
- ✅ Técnica Anestésica (e código TSSU correspondente)
- ✅ Sexo (M/F)
- ✅ Convênio
- ✅ Carteirinha/Prontuário
- ✅ Nome do Cirurgião
- ✅ Especialidade do Cirurgião
- ✅ Hospital/Clínica
- ✅ Horário

### 🤖 Processamento com IA (Opcional)

Quando `OPENAI_API_KEY` está configurada:
- O sistema usa **OpenAI GPT-4o-mini** para processar o texto do OCR
- A IA entende melhor o contexto e mapeia os campos com maior precisão
- Se a IA falhar ou retornar poucos campos, o sistema usa automaticamente o parse tradicional (regex)
- Isso minimiza erros de preenchimento, especialmente quando o OCR extrai corretamente mas o parse coloca valores em campos errados

## 📝 Logs de OCR

Os logs de OCR são salvos automaticamente na tabela `ocr_logs` do Supabase, incluindo:

- Texto bruto extraído
- Dados parseados (JSON)
- Nível de confiança do OCR
- Usuário que processou
- Data/hora do processamento

Isso permite melhorar os regex de extração ao longo do tempo.

## ⚠️ Troubleshooting

### Erro: "GOOGLE_APPLICATION_CREDENTIALS não configurado"

- Verifique se o arquivo `keys/google-vision.json` existe
- Verifique se a variável `GOOGLE_APPLICATION_CREDENTIALS` está no `.env.local`
- Reinicie o servidor de desenvolvimento após adicionar a variável

### Erro: "Erro de autenticação com Google Vision"

- Verifique se o arquivo JSON de credenciais está correto
- Verifique se o Service Account tem a role correta (Cloud Vision API User)
- Verifique se a Cloud Vision API está habilitada no projeto GCP

### OCR não extrai dados corretamente

- Certifique-se de que a imagem está clara e legível
- Tente melhorar a iluminação ao tirar a foto
- Evite imagens muito escuras ou com reflexos
- Verifique se a ficha está completamente visível na imagem

### Imagens muito grandes demoram muito para processar

O sistema automaticamente redimensiona imagens maiores que 3000px para melhorar a performance. Isso não afeta a qualidade do OCR.

## 💰 Custos

### Google Cloud Vision API
- **Tier gratuito**: 1.000 requisições/mês
- **Após o tier**: aproximadamente $1,50 por 1.000 requisições
- Consulte preços atualizados em: [Google Cloud Vision Pricing](https://cloud.google.com/vision/pricing)

### OpenAI GPT-4o-mini (Opcional)
- **Custo por processamento**: ~$0,00016 por ficha
- **Incremento sobre OCR**: ~10% do custo total
- O sistema usa IA apenas quando a chave `OPENAI_API_KEY` está configurada
- Se a IA falhar ou não estiver configurada, usa parse tradicional (regex) automaticamente
- Consulte preços atualizados em: [OpenAI Pricing](https://openai.com/api/pricing/)

**Exemplo de custo total (OCR + IA):**
- 1.000 fichas/mês: ~$1,66 USD (primeiras 1.000 OCR gratuitas + IA)
- 5.000 fichas/mês: ~$8,30 USD (4.000 OCR pagas + IA)

## 🔒 Segurança

- **Nunca** commite o arquivo `google-vision.json` no repositório
- Mantenha o `.gitignore` atualizado para excluir a pasta `keys/`
- Use variáveis de ambiente para configurações sensíveis
- Em produção, considere usar secrets management (ex: Vercel Environment Variables, AWS Secrets Manager)

## 📚 Recursos Adicionais

- [Google Cloud Vision Documentation](https://cloud.google.com/vision/docs)
- [Google Cloud Vision Node.js Client](https://github.com/googleapis/nodejs-vision)
- [Sharp Image Processing](https://sharp.pixelplumbing.com/)

