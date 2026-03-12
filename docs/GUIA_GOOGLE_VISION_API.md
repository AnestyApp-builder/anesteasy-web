# 🚀 Guia Completo: Configuração da Google Vision API

Este guia passo a passo irá te ajudar a configurar a Google Cloud Vision API para o sistema de OCR de fichas anestésicas do AnestEasy.

---

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Passo 1: Criar Conta e Projeto no Google Cloud](#passo-1-criar-conta-e-projeto-no-google-cloud)
3. [Passo 2: Habilitar Faturamento (Billing)](#passo-2-habilitar-faturamento-billing)
4. [Passo 3: Habilitar a Cloud Vision API](#passo-3-habilitar-a-cloud-vision-api)
5. [Passo 4: Criar Service Account](#passo-4-criar-service-account)
6. [Passo 5: Baixar Credenciais JSON](#passo-5-baixar-credenciais-json)
7. [Passo 6: Configurar no Projeto AnestEasy](#passo-6-configurar-no-projeto-anesteasy)
8. [Passo 7: Testar a Configuração](#passo-7-testar-a-configuração)
8. [Troubleshooting](#troubleshooting)
9. [Custos e Limites](#custos-e-limites)

---

## Pré-requisitos

- ✅ Conta Google (Gmail)
- ✅ Cartão de crédito (para verificação, mas há tier gratuito)
- ✅ Acesso ao projeto AnestEasy

---

## Passo 1: Criar Conta e Projeto no Google Cloud

### 1.1. Acessar o Google Cloud Console

1. Acesse: [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. Faça login com sua conta Google
3. Se for a primeira vez, aceite os termos de serviço

### 1.2. Criar um Novo Projeto

1. No topo da página, clique no **seletor de projetos** (ao lado do logo do Google Cloud)
2. Clique em **"Novo Projeto"** (ou "New Project")
3. Preencha:
   - **Nome do projeto**: `AnestEasy OCR` (ou outro nome de sua preferência)
   - **Organização**: Deixe como está (ou selecione se tiver)
4. Clique em **"Criar"** (ou "Create")
5. ⏳ Aguarde alguns segundos enquanto o projeto é criado

### 1.3. Anotar o Project ID

1. Após criar o projeto, você verá uma notificação de sucesso
2. **IMPORTANTE**: Anote o **Project ID** (não o nome do projeto)
   - Exemplo: Se o nome é "AnestEasy OCR", o Project ID pode ser algo como `anesteasy-ocr-123456`
   - Você pode ver o Project ID no seletor de projetos ou na página inicial do projeto
3. **Guarde este ID** - você precisará dele mais tarde!

---

## Passo 2: Habilitar Faturamento (Billing)

⚠️ **IMPORTANTE**: Mesmo que a Cloud Vision API tenha um tier gratuito, o Google Cloud **exige** que você tenha uma conta de faturamento configurada. Você **não será cobrado** dentro do tier gratuito (1.000 requisições/mês), mas precisa ter o billing habilitado.

### 2.1. Acessar Configurações de Faturamento

1. No menu lateral, vá em **"Faturamento"** (ou "Billing")
2. Se você já tem uma conta de faturamento, pule para o Passo 2.3
3. Se não tem, clique em **"Criar conta de faturamento"** (ou "Create billing account")

### 2.2. Criar Conta de Faturamento (se necessário)

1. Preencha as informações:
   - **Nome da conta**: Pode ser qualquer nome (ex: "AnestEasy Billing")
   - **País/Região**: Selecione seu país
   - **Moeda**: Selecione a moeda (geralmente USD ou BRL)
2. Clique em **"Criar conta de faturamento"** (ou "Create billing account")
3. Você será solicitado a adicionar um **cartão de crédito** para verificação
   - ⚠️ **Não se preocupe**: Você só será cobrado se exceder o tier gratuito
   - O Google usa o cartão apenas para verificação de identidade
4. Complete o processo de verificação

### 2.3. Vincular Conta de Faturamento ao Projeto

1. Após criar ou selecionar a conta de faturamento
2. Certifique-se de que seu projeto está vinculado:
   - Vá em **"Faturamento"** > **"Meus projetos"** (ou "My projects")
   - Se seu projeto não estiver vinculado, clique em **"Vincular projeto"** (ou "Link project")
   - Selecione seu projeto e confirme

### 2.4. Verificar Status

1. No menu lateral, vá em **"Faturamento"** > **"Visão geral"** (ou "Overview")
2. Verifique se seu projeto aparece na lista
3. O status deve mostrar como **"Ativo"** ou **"Active"**

---

## Passo 3: Habilitar a Cloud Vision API

### 2.1. Navegar até a Biblioteca de APIs

1. No menu lateral esquerdo, clique em **"APIs e Serviços"** (ou "APIs & Services")
2. Clique em **"Biblioteca"** (ou "Library")

### 2.2. Procurar e Habilitar a Cloud Vision API

1. Na barra de pesquisa, digite: **"Cloud Vision API"**
2. Clique no resultado **"Cloud Vision API"** (deve ter o ícone de olho)
3. Na página da API, clique no botão **"Habilitar"** (ou "Enable")
4. ⏳ Aguarde alguns segundos enquanto a API é habilitada
5. Você verá uma mensagem de confirmação quando estiver habilitada

---

## Passo 4: Criar Service Account

### 4.1. Acessar Service Accounts

1. No menu lateral, vá em **"IAM e administração"** (ou "IAM & Admin")
2. Clique em **"Contas de serviço"** (ou "Service Accounts")

### 4.2. Criar Nova Service Account

1. Clique no botão **"+ Criar conta de serviço"** (ou "+ Create Service Account")
2. Preencha o **Passo 1**:
   - **Nome**: `anesteasy-ocr-service` (ou outro nome)
   - **ID da conta de serviço**: Será gerado automaticamente (pode deixar como está)
   - **Descrição**: `Service account para OCR do AnestEasy` (opcional)
3. Clique em **"Criar e continuar"** (ou "Create and Continue")

### 4.3. Conceder Permissões

⚠️ **IMPORTANTE**: Você precisa ter habilitado a Cloud Vision API no **Passo 3** antes de ver as roles específicas aqui. Se não habilitou, volte e faça isso primeiro!

1. No **Passo 2**, você verá "Conceder acesso a este projeto"
2. Clique em **"Adicionar função"** (ou "Add Role")
3. Na busca, digite: **"Vision"** ou **"Cloud Vision"**

4. **Se você vê as roles corretas:**
   - ✅ **"Cloud Vision API User"** ← **RECOMENDADO** (use esta)
   - ✅ **"Cloud Vision API Client"** (alternativa)
   - Selecione uma delas e vá para o passo 5

5. **Se você NÃO vê essas roles (só aparecem outras):**
   - ⚠️ Isso significa que a Cloud Vision API ainda não foi habilitada
   - **Solução**: Volte ao **Passo 2** e habilite a API primeiro
   - Depois, volte aqui e tente novamente
   - **OU** você pode pular esta etapa agora e adicionar a role depois (veja alternativa abaixo)

6. ⚠️ **NÃO selecione estas roles (elas não são suficientes):**
   - ❌ "Administrador de provisionamento do hub da API do Cloud"
   - ❌ "Cloud Vision API Admin" (muito permissiva)
   - ❌ Qualquer outra que não seja especificamente "Cloud Vision API User" ou "Client"

7. Clique em **"Continuar"** (ou "Continue")

**Alternativa - Adicionar role depois:**
Se você não vê a role agora, pode:
1. Pular esta etapa (clique em "Concluído" sem adicionar role)
2. Depois de habilitar a API, volte na Service Account criada
3. Clique na aba **"Permissões"** (ou "Permissions")
4. Clique em **"Adicionar função"** e procure por "Cloud Vision API User"

### 4.4. Finalizar Criação

1. No **Passo 3**, você pode adicionar usuários (opcional - pode pular)
2. Clique em **"Concluído"** (ou "Done")
3. ✅ Sua Service Account foi criada!

### 4.5. Adicionar Role Depois (Se não adicionou no passo 4.3)

Se você não conseguiu adicionar a role "Cloud Vision API User" durante a criação (porque a API ainda não estava habilitada), siga estes passos:

1. Certifique-se de que a **Cloud Vision API está habilitada** (Passo 3)
2. Volte para a lista de Service Accounts: **IAM e administração** > **Contas de serviço**
3. Clique na Service Account que você criou (`anesteasy-ocr-service`)
4. Clique na aba **"Permissões"** (ou "Permissions") no topo da página
5. Clique no botão **"Adicionar função"** (ou "Grant Access")
6. Na busca, digite: **"Vision"** ou **"Cloud Vision"**
7. Selecione **"Cloud Vision API User"**
8. Clique em **"Salvar"** (ou "Save")
9. ✅ A role foi adicionada!

---

## Passo 5: Baixar Credenciais JSON

### 5.1. Acessar a Service Account Criada

1. Na lista de Service Accounts, clique na que você acabou de criar (`anesteasy-ocr-service`)
2. Você será redirecionado para a página de detalhes

### 5.2. Criar e Baixar Chave JSON

1. Clique na aba **"Chaves"** (ou "Keys")
2. Clique em **"Adicionar chave"** (ou "Add Key")
3. Selecione **"Criar nova chave"** (ou "Create new key")
4. Selecione o formato **JSON**
5. Clique em **"Criar"** (ou "Create")
6. ⬇️ O arquivo JSON será **baixado automaticamente** para seu computador
   - Normalmente vai para a pasta "Downloads"

### 5.3. Localizar o Arquivo Baixado

1. Abra sua pasta de Downloads
2. Procure por um arquivo com nome similar a: `anesteasy-ocr-123456-abc123def456.json`
   - O nome pode variar dependendo do nome da sua service account

---

## Passo 6: Configurar no Projeto AnestEasy

### 6.1. Criar Pasta `keys` no Projeto

1. Abra o projeto AnestEasy no seu editor (VS Code, etc.)
2. Na **raiz do projeto**, crie uma nova pasta chamada `keys`
   - Caminho: `D:\PROJETOS\AnestEasy WEB\keys\`

### 6.2. Mover e Renomear o Arquivo JSON

1. **Mova** o arquivo JSON baixado para a pasta `keys/` que você acabou de criar
2. **Renomeie** o arquivo para: `google-vision.json`
   - Nome final: `keys/google-vision.json`

### 6.3. Configurar Variáveis de Ambiente

1. Na raiz do projeto, verifique se existe o arquivo `.env.local`
   - Se não existir, **crie um novo arquivo** chamado `.env.local`
2. Abra o arquivo `.env.local` no editor
3. Adicione as seguintes linhas:

```env
# Google Cloud Vision API
GOOGLE_APPLICATION_CREDENTIALS=keys/google-vision.json
PROJECT_ID=seu-project-id-aqui
```

4. **Substitua** `seu-project-id-aqui` pelo **Project ID** que você anotou no Passo 1.3
   - Exemplo: `PROJECT_ID=anesteasy-ocr-123456`

### 6.4. Verificar Estrutura de Arquivos

Sua estrutura de arquivos deve ficar assim:

```
AnestEasy WEB/
├── keys/
│   └── google-vision.json  ← Arquivo de credenciais
├── .env.local              ← Variáveis de ambiente
├── package.json
└── ...
```

### 6.5. Verificar que `keys/` está no .gitignore

O arquivo `.gitignore` já deve conter a pasta `keys/` para evitar que as credenciais sejam commitadas. Verifique se contém:

```
keys/
*.json
!package.json
!package-lock.json
!tsconfig.json
```

---

## Passo 7: Testar a Configuração

### 7.1. Reiniciar o Servidor de Desenvolvimento

1. Pare o servidor se estiver rodando (Ctrl+C no terminal)
2. Inicie novamente:
   ```bash
   npm run dev
   ```

### 7.2. Testar o OCR

1. Acesse: `http://localhost:3000/procedimentos/novo`
2. Na seção de **"Preenchimento Automático via OCR"**
3. Faça upload de uma imagem de ficha anestésica
4. Se tudo estiver configurado corretamente:
   - ✅ A imagem será processada
   - ✅ Os campos serão preenchidos automaticamente
   - ✅ Você verá uma mensagem de sucesso

### 7.3. Verificar Logs

1. Abra o console do terminal onde o servidor está rodando
2. Se houver erros, você verá mensagens como:
   - ❌ "GOOGLE_APPLICATION_CREDENTIALS não configurado"
   - ❌ "Erro de autenticação com Google Vision"

---

## Troubleshooting

### ❌ Erro: "GOOGLE_APPLICATION_CREDENTIALS não configurado"

**Causa**: O arquivo de credenciais não foi encontrado ou o caminho está incorreto.

**Solução**:
1. Verifique se o arquivo `keys/google-vision.json` existe
2. Verifique se o caminho no `.env.local` está correto: `GOOGLE_APPLICATION_CREDENTIALS=keys/google-vision.json`
3. Certifique-se de que o caminho é relativo à raiz do projeto
4. Reinicie o servidor após alterar o `.env.local`

### ❌ Erro: "Erro de autenticação com Google Vision"

**Causa**: As credenciais estão incorretas ou a Service Account não tem permissões.

**Solução**:
1. Verifique se o arquivo JSON está completo e não foi corrompido
2. Verifique se a Service Account tem a role **"Cloud Vision AI Service Agent"**
3. Verifique se a **Cloud Vision API está habilitada** no projeto
4. Tente baixar um novo arquivo JSON e substituir o antigo

### ❌ Erro: "This API method requires billing to be enabled"

**Causa**: O projeto do Google Cloud não tem uma conta de faturamento vinculada.

**Solução**:
1. Acesse: [Google Cloud Billing](https://console.cloud.google.com/billing)
2. Crie uma conta de faturamento (se não tiver) ou vincule uma existente ao projeto
3. Adicione um cartão de crédito para verificação (você não será cobrado dentro do tier gratuito)
4. Aguarde alguns minutos para a configuração propagar
5. Tente novamente o OCR

**Importante**: 
- Você **não será cobrado** pelas primeiras 1.000 requisições/mês (tier gratuito)
- O cartão é usado apenas para verificação de identidade
- Configure alertas de orçamento para evitar surpresas

### ❌ Erro: "PROJECT_ID não encontrado"

**Causa**: A variável `PROJECT_ID` não está configurada no `.env.local`.

**Solução**:
1. Abra o arquivo `.env.local`
2. Adicione: `PROJECT_ID=seu-project-id-aqui`
3. Substitua pelo Project ID real do seu projeto GCP
4. Reinicie o servidor

### ❌ Erro: "Module not found: @google-cloud/vision"

**Causa**: O pacote não está instalado.

**Solução**:
```bash
npm install @google-cloud/vision sharp
```

### ❌ Não encontro a role "Cloud Vision API User" ao criar Service Account

**Causa**: A Cloud Vision API ainda não foi habilitada no projeto, então as roles específicas não aparecem.

**Solução**:
1. **Primeiro**, certifique-se de que completou o **Passo 2** (Habilitar Cloud Vision API)
2. Se ainda não habilitou:
   - Vá em **APIs e Serviços** > **Biblioteca**
   - Procure por "Cloud Vision API"
   - Clique em **"Habilitar"**
   - Aguarde alguns segundos
3. **Depois**, você tem duas opções:
   
   **Opção A - Adicionar role durante a criação:**
   - Volte para criar a Service Account
   - No passo de permissões, procure novamente por "Vision"
   - Agora a role "Cloud Vision API User" deve aparecer
   
   **Opção B - Adicionar role depois (mais fácil):**
   - Crie a Service Account sem adicionar role (pule a etapa)
   - Depois, clique na Service Account criada
   - Vá na aba **"Permissões"**
   - Clique em **"Adicionar função"**
   - Procure por "Cloud Vision API User"
   - Adicione a role

### ❌ OCR não extrai dados corretamente

**Causa**: A imagem pode estar de baixa qualidade ou o OCR não está reconhecendo o texto.

**Solução**:
1. Certifique-se de que a imagem está clara e legível
2. Melhore a iluminação ao tirar a foto
3. Evite imagens muito escuras ou com reflexos
4. Certifique-se de que a ficha está completamente visível na imagem
5. Tente com uma imagem de melhor qualidade

---

## Custos e Limites

### 🆓 Tier Gratuito

- **1.000 requisições/mês** são gratuitas
- Perfeito para testes e uso inicial

### 💰 Após o Tier Gratuito

- **$1,50 por 1.000 requisições** (aproximadamente)
- Consulte preços atualizados em: [Google Cloud Vision Pricing](https://cloud.google.com/vision/pricing)

### 📊 Monitoramento de Uso

1. Acesse: [Google Cloud Console - Billing](https://console.cloud.google.com/billing)
2. Selecione seu projeto
3. Veja o uso da Cloud Vision API em tempo real

### ⚠️ Importante

- O Google Cloud pode solicitar um cartão de crédito para verificação
- Você só será cobrado após exceder o tier gratuito
- Configure alertas de orçamento para evitar surpresas

---

## ✅ Checklist Final

Antes de considerar a configuração completa, verifique:

- [ ] Projeto criado no Google Cloud Platform
- [ ] Project ID anotado
- [ ] Cloud Vision API habilitada
- [ ] Service Account criada com role "Cloud Vision API User"
- [ ] Arquivo JSON de credenciais baixado
- [ ] Arquivo `keys/google-vision.json` criado no projeto
- [ ] Variável `GOOGLE_APPLICATION_CREDENTIALS` no `.env.local`
- [ ] Variável `PROJECT_ID` no `.env.local`
- [ ] Pasta `keys/` adicionada ao `.gitignore`
- [ ] Servidor reiniciado após configurações
- [ ] Teste de OCR funcionando

---

## 📚 Recursos Adicionais

- [Documentação Oficial Google Cloud Vision](https://cloud.google.com/vision/docs)
- [Google Cloud Vision Node.js Client](https://github.com/googleapis/nodejs-vision)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Preços Google Cloud Vision](https://cloud.google.com/vision/pricing)

---

## 🆘 Precisa de Ajuda?

Se ainda tiver problemas após seguir este guia:

1. Verifique os logs do servidor para mensagens de erro específicas
2. Confirme que todas as etapas foram seguidas corretamente
3. Verifique se os pacotes estão instalados: `npm list @google-cloud/vision sharp`
4. Tente criar uma nova Service Account e baixar novas credenciais

---

**Última atualização**: Janeiro 2025

