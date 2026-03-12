# 🚀 Guia de Deploy para Vercel - AnestEasy

## 📋 Pré-requisitos

1. Conta na Vercel (https://vercel.com)
2. Projeto no GitHub/GitLab/Bitbucket
3. Todas as variáveis de ambiente configuradas

---

## 🔧 Passo 1: Preparar o Projeto

### 1.1. Verificar Arquivos Necessários

Certifique-se de que os seguintes arquivos existem:
- ✅ `package.json` - Dependências e scripts
- ✅ `next.config.js` - Configuração do Next.js
- ✅ `vercel.json` - Configuração da Vercel (já existe)
- ✅ `.gitignore` - Ignora arquivos sensíveis

### 1.2. Commitar Alterações

```bash
git add .
git commit -m "Preparar para deploy na Vercel"
git push origin main
```

---

## 🌐 Passo 2: Deploy na Vercel

### 2.1. Importar Projeto

1. Acesse: https://vercel.com/new
2. Faça login com GitHub/GitLab/Bitbucket
3. Clique em **Import Project**
4. Selecione o repositório do AnestEasy
5. Clique em **Import**

### 2.2. Configurar Projeto

A Vercel detectará automaticamente que é um projeto Next.js. Configure:

- **Framework Preset**: Next.js (detectado automaticamente)
- **Root Directory**: `./` (raiz do projeto)
- **Build Command**: `npm run build` (padrão)
- **Output Directory**: `.next` (padrão)
- **Install Command**: `npm install` (padrão)

### 2.3. Configurar Variáveis de Ambiente

**⚠️ IMPORTANTE:** Configure TODAS as variáveis antes de fazer o deploy!

Na tela de configuração do projeto, vá em **Environment Variables** e adicione:

#### 🔐 Supabase
```env
NEXT_PUBLIC_SUPABASE_URL=https://zmtwwajyhusyrugobxur.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 💳 Stripe
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... (ou pk_test_... para teste)
STRIPE_SECRET_KEY=sk_live_... (ou sk_test_... para teste)
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_MONTHLY=price_...
STRIPE_PRICE_ID_QUARTERLY=price_...
STRIPE_PRICE_ID_ANNUAL=price_...
```

#### 🌍 Base URL
```env
NEXT_PUBLIC_BASE_URL=https://anesteasy.com.br
```

#### ⏰ Cron (Opcional)
```env
CRON_SECRET=seu-secret-aleatorio-aqui
```

### 2.4. Configurar Ambiente

Para cada variável, selecione os ambientes:
- ✅ **Production** (produção)
- ✅ **Preview** (branches de preview)
- ✅ **Development** (desenvolvimento local)

### 2.5. Fazer Deploy

1. Clique em **Deploy**
2. Aguarde o build completar (pode levar 2-5 minutos)
3. Acompanhe os logs do build

---

## 🔔 Passo 3: Configurar Webhook da Stripe

Após o deploy, você precisa atualizar a URL do webhook no Stripe:

### 3.1. Obter URL do Deploy

Após o deploy, a Vercel fornecerá uma URL:
- **Produção**: `https://anesteasy.com.br` (se configurou domínio customizado)
- **Preview**: `https://anest-easy-xxx.vercel.app` (URL temporária)

### 3.2. Atualizar Webhook no Stripe

1. Acesse: https://dashboard.stripe.com
2. Vá em **Developers** → **Webhooks**
3. Clique no endpoint existente ou crie um novo
4. Atualize a **Endpoint URL** para:
   ```
   https://anesteasy.com.br/api/stripe/webhook
   ```
   (ou a URL da Vercel se ainda não tiver domínio customizado)
5. Salve as alterações

---

## 🌍 Passo 4: Configurar Domínio Customizado (Opcional)

### 4.1. Adicionar Domínio na Vercel

1. No dashboard do projeto na Vercel, vá em **Settings** → **Domains**
2. Clique em **Add Domain**
3. Digite: `anesteasy.com.br`
4. Siga as instruções para configurar DNS

### 4.2. Configurar DNS

Configure os registros DNS no seu provedor de domínio:

**Opção 1: A Record**
```
Type: A
Name: @
Value: 76.76.21.21
```

**Opção 2: CNAME (Recomendado)**
```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
```

**Para subdomínio www:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### 4.3. Atualizar Variáveis de Ambiente

Após configurar o domínio, atualize:
```env
NEXT_PUBLIC_BASE_URL=https://anesteasy.com.br
```

---

## ✅ Passo 5: Verificar Deploy

### 5.1. Testar Aplicação

1. Acesse a URL do deploy
2. Teste login/cadastro
3. Teste criação de checkout
4. Verifique se webhooks estão funcionando

### 5.2. Verificar Logs

1. No dashboard da Vercel, vá em **Deployments**
2. Clique no deployment mais recente
3. Veja os logs para verificar erros

### 5.3. Testar Webhook

1. Faça um pagamento de teste
2. Verifique os logs da Vercel (Functions → `/api/stripe/webhook`)
3. Verifique se a assinatura foi criada no banco

---

## 🔄 Passo 6: Deploy Automático

A Vercel faz deploy automático quando você faz push para o branch principal:

### 6.1. Deploy Automático

- **Push para `main`/`master`** → Deploy em produção
- **Push para outros branches** → Deploy de preview

### 6.2. Desabilitar Deploy Automático (Opcional)

Se quiser fazer deploy manual:
1. Settings → Git
2. Desmarque **Automatic deployments**

---

## 🐛 Solução de Problemas

### ❌ Build Falha

**Possíveis causas:**
- Variáveis de ambiente faltando
- Erro de sintaxe no código
- Dependências não instaladas

**Solução:**
- Verifique os logs do build na Vercel
- Certifique-se de que todas as variáveis estão configuradas
- Teste o build localmente: `npm run build`

### ❌ Webhook Não Funciona

**Possíveis causas:**
- URL do webhook incorreta
- `STRIPE_WEBHOOK_SECRET` incorreto
- Firewall bloqueando requisições

**Solução:**
- Verifique a URL do webhook no Dashboard da Stripe
- Certifique-se de que `STRIPE_WEBHOOK_SECRET` está correto
- Teste o webhook usando Stripe CLI ou Dashboard

### ❌ Erro 500 em API Routes

**Possíveis causas:**
- Variáveis de ambiente não configuradas
- Erro no código da API
- Timeout da função

**Solução:**
- Verifique logs em **Functions** no dashboard da Vercel
- Certifique-se de que todas as variáveis estão configuradas
- Verifique timeout das funções (padrão: 10s, pode aumentar até 60s)

### ❌ Imagens Não Carregam

**Possíveis causas:**
- Domínio não configurado no `next.config.js`
- URL incorreta

**Solução:**
- Adicione o domínio em `next.config.js`:
  ```js
  images: {
    domains: ['seu-dominio.com', 'zmtwwajyhusyrugobxur.supabase.co'],
  }
  ```

---

## 📊 Monitoramento

### Logs em Tempo Real

1. No dashboard da Vercel, vá em **Functions**
2. Selecione a função (ex: `/api/stripe/webhook`)
3. Veja logs em tempo real

### Analytics

1. Vá em **Analytics** no dashboard
2. Veja métricas de:
   - Requisições
   - Tempo de resposta
   - Erros
   - Uso de bandwidth

---

## 🔐 Segurança

### Variáveis Sensíveis

**NUNCA** commite variáveis sensíveis no Git:
- ✅ Use Environment Variables na Vercel
- ❌ Não coloque no código
- ❌ Não coloque no `.env.local` (já está no `.gitignore`)

### Secrets

Para secrets adicionais:
1. Settings → Environment Variables
2. Adicione como **Secret**
3. Use apenas em Production se necessário

---

## 📝 Checklist de Deploy

Antes de fazer deploy, verifique:

- [ ] Todas as variáveis de ambiente configuradas
- [ ] Webhook da Stripe configurado com URL correta
- [ ] Domínio customizado configurado (se aplicável)
- [ ] Build local funciona: `npm run build`
- [ ] Testes básicos passam
- [ ] Logs não mostram erros críticos
- [ ] Webhook está recebendo eventos
- [ ] Assinaturas estão sendo criadas no banco

---

## 🎯 Próximos Passos Após Deploy

1. ✅ Testar fluxo completo de pagamento
2. ✅ Verificar se webhooks estão funcionando
3. ✅ Configurar monitoramento de erros (opcional)
4. ✅ Configurar backup automático do banco (opcional)
5. ✅ Documentar URL de produção para a equipe

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs na Vercel
2. Verifique os logs no Stripe Dashboard
3. Verifique os logs no Supabase Dashboard
4. Consulte a documentação: https://vercel.com/docs

---

## 🎉 Deploy Concluído!

Após seguir todos os passos, sua aplicação estará no ar! 🚀

