# 🔐 Variáveis de Ambiente para Vercel

## 📋 Lista Completa de Variáveis

Configure estas variáveis no dashboard da Vercel em **Settings → Environment Variables**

---

## 🔵 Supabase

```env
NEXT_PUBLIC_SUPABASE_URL=https://zmtwwajyhusyrugobxur.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptdHd3YWp5aHVzeXJ1Z29ieHVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMzYzNzAsImV4cCI6MjA3MjkxMjM3MH0.NC6t2w_jFWTMJjVv5FmPLouVyOVgCTBReCr0zOA2dx8
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (sua service role key)
```

**Onde obter:**
- `NEXT_PUBLIC_SUPABASE_URL`: Dashboard Supabase → Settings → API → Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Dashboard Supabase → Settings → API → anon public key
- `SUPABASE_SERVICE_ROLE_KEY`: Dashboard Supabase → Settings → API → service_role key (secret)

---

## 💳 Stripe

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... (ou pk_test_... para teste)
STRIPE_SECRET_KEY=sk_live_... (ou sk_test_... para teste)
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_MONTHLY=price_...
STRIPE_PRICE_ID_QUARTERLY=price_...
STRIPE_PRICE_ID_ANNUAL=price_...
```

**Onde obter:**
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Dashboard Stripe → Developers → API Keys → Publishable key
- `STRIPE_SECRET_KEY`: Dashboard Stripe → Developers → API Keys → Secret key (reveal)
- `STRIPE_WEBHOOK_SECRET`: Dashboard Stripe → Developers → Webhooks → Seu endpoint → Signing secret
- `STRIPE_PRICE_ID_*`: Dashboard Stripe → Products → Seu produto → Price IDs

---

## 🌍 Base URL

```env
NEXT_PUBLIC_BASE_URL=https://anesteasy.com.br
```

**Importante:**
- Use a URL de produção após configurar domínio customizado
- Para preview: use a URL da Vercel (ex: `https://anest-easy-xxx.vercel.app`)

---

## ⏰ Cron (Opcional)

```env
CRON_SECRET=seu-secret-aleatorio-aqui
```

**Gerar secret:**
```bash
# No terminal
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## ✅ Checklist de Configuração

Antes de fazer deploy, certifique-se de que:

- [ ] Todas as variáveis estão configuradas
- [ ] Variáveis estão marcadas para **Production**, **Preview** e **Development**
- [ ] `STRIPE_WEBHOOK_SECRET` está correto
- [ ] `NEXT_PUBLIC_BASE_URL` aponta para a URL correta
- [ ] `SUPABASE_SERVICE_ROLE_KEY` está configurada (não pode estar vazia)

---

## 🔒 Segurança

**NUNCA:**
- ❌ Commite variáveis no Git
- ❌ Compartilhe secrets publicamente
- ❌ Use a mesma secret em múltiplos ambientes sem necessidade

**SEMPRE:**
- ✅ Use Environment Variables da Vercel
- ✅ Use secrets diferentes para produção e desenvolvimento
- ✅ Revise permissões regularmente

---

## 📝 Como Adicionar na Vercel

1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** → **Environment Variables**
4. Clique em **Add New**
5. Preencha:
   - **Key**: Nome da variável (ex: `STRIPE_SECRET_KEY`)
   - **Value**: Valor da variável
   - **Environments**: Selecione Production, Preview, Development
6. Clique em **Save**
7. Repita para todas as variáveis

---

## 🔄 Após Adicionar Variáveis

**Importante:** Após adicionar/atualizar variáveis:
1. Faça um novo deploy (ou aguarde o próximo deploy automático)
2. As variáveis só estarão disponíveis após o deploy

---

## 🧪 Testar Variáveis

Após o deploy, teste se as variáveis estão corretas:

1. Acesse: `https://seu-dominio.com/api/debug/subscription?email=seu@email.com`
2. Verifique se não há erros relacionados a variáveis de ambiente
3. Teste um checkout para verificar se Stripe está funcionando

