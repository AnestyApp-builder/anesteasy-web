# 🔐 Variáveis de Ambiente para Vercel - AnestEasy

## 📋 Lista Completa de Variáveis Necessárias

### ✅ OBRIGATÓRIAS (Core)

#### Supabase
```
NEXT_PUBLIC_SUPABASE_URL=https://zmtwwajyhusyrugobxur.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-aqui
```

**Como obter:**
1. Acesse: https://app.supabase.com/project/zmtwwajyhusyrugobxur/settings/api
2. Copie:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **service_role key** (secret) → `SUPABASE_SERVICE_ROLE_KEY`

---

#### Stripe (Pagamentos)
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... ou pk_test_...
STRIPE_SECRET_KEY=sk_live_... ou sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_MONTHLY=price_...
STRIPE_PRICE_ID_QUARTERLY=price_...
STRIPE_PRICE_ID_ANNUAL=price_...
```

**Como obter:**
1. Acesse: https://dashboard.stripe.com
2. Developers → API Keys → Copie Publishable e Secret
3. Products → Copie os Price IDs dos planos
4. Webhooks → Copie o Webhook Secret

---

#### URLs da Aplicação
```
NEXT_PUBLIC_BASE_URL=https://anesteasy.com.br
```
(ou sua URL de produção)

---

### ⚙️ OPCIONAIS (Funcionalidades Específicas)

#### OpenAI (IA para extração de dados)
```
OPENAI_API_KEY=sk-...
```
**Onde obter:** https://platform.openai.com/api-keys

---

#### Google Vision API (OCR)
```
GOOGLE_VISION_API_KEY=AIza...
```
**Onde obter:** https://console.cloud.google.com/apis/credentials

---

#### SMTP/Email (Resend ou SMTP direto)
```
RESEND_API_KEY=re_...
```
OU
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=sua-senha-app
SMTP_FROM=noreply@anesteasy.com.br
```

---

## 🚀 Como Configurar na Vercel

### Método 1: Via Dashboard (Recomendado)

1. Acesse: https://vercel.com/seu-projeto/settings/environment-variables
2. Para cada variável:
   - Clique em **"Add Another"**
   - Cole o **Key** (nome da variável)
   - Cole o **Value** (valor)
   - Selecione os ambientes: **Production, Preview, Development**
   - Clique em **"Save"**

### Método 2: Via CLI (Rápido)

```bash
# Instalar Vercel CLI (se não tiver)
npm i -g vercel

# Fazer login
vercel login

# Adicionar variáveis (substitua os valores)
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
vercel env add STRIPE_SECRET_KEY production
vercel env add STRIPE_WEBHOOK_SECRET production
vercel env add STRIPE_PRICE_ID_MONTHLY production
vercel env add STRIPE_PRICE_ID_QUARTERLY production
vercel env add STRIPE_PRICE_ID_ANNUAL production
vercel env add NEXT_PUBLIC_BASE_URL production
```

---

## ⚠️ IMPORTANTE

1. **Service Role Key**: Esta é a chave mais importante! Sem ela, o upload de arquivos não funcionará.
2. **Stripe Keys**: Use chaves de **PRODUÇÃO** (`pk_live_...`, `sk_live_...`) na Vercel
3. **Price IDs**: Os IDs são diferentes entre teste e produção
4. **Webhook Secret**: Configure um webhook na Stripe apontando para sua URL de produção

---

## ✅ Checklist de Configuração

- [ ] `NEXT_PUBLIC_SUPABASE_URL` configurada
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurada ⚠️ **CRÍTICA**
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` configurada
- [ ] `STRIPE_SECRET_KEY` configurada
- [ ] `STRIPE_WEBHOOK_SECRET` configurada
- [ ] `STRIPE_PRICE_ID_MONTHLY` configurado
- [ ] `STRIPE_PRICE_ID_QUARTERLY` configurado
- [ ] `STRIPE_PRICE_ID_ANNUAL` configurado
- [ ] `NEXT_PUBLIC_BASE_URL` configurada
- [ ] Todas marcadas para **Production, Preview, Development**

---

## 🔍 Verificar se Está Funcionando

Após configurar, faça um redeploy:
```bash
vercel --prod
```

Ou via Dashboard: Settings → Deployments → Redeploy

---

## 🆘 Problemas Comuns

### "Upload não funciona"
→ Verifique se `SUPABASE_SERVICE_ROLE_KEY` está configurada

### "Erro de autenticação"
→ Verifique se `NEXT_PUBLIC_SUPABASE_URL` está correta

### "Stripe não funciona"
→ Verifique se todas as chaves do Stripe estão configuradas

---

**Precisa dos valores?** Entre em contato ou verifique:
- Supabase: https://app.supabase.com/project/zmtwwajyhusyrugobxur/settings/api
- Stripe: https://dashboard.stripe.com/apikeys

