# 🔐 Variáveis de Ambiente - AnestEasy

Este documento lista todas as variáveis de ambiente necessárias para o AnestEasy funcionar corretamente com Stripe.

---

## 📋 Variáveis Necessárias

### Supabase (Obrigatório)

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-aqui
```

**Como obter:**
1. Acesse https://app.supabase.com
2. Selecione seu projeto
3. Vá para Settings → API
4. Copie a URL e a Service Role Key

---

### Stripe (Obrigatório)

#### Chaves da API

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Como obter:**
1. Acesse https://dashboard.stripe.com
2. Vá para Developers → API Keys
3. Copie Publishable key e Secret key
4. Para Webhook Secret, veja seção de Webhook abaixo

#### Price IDs

```env
STRIPE_PRICE_ID_MONTHLY=price_...
STRIPE_PRICE_ID_QUARTERLY=price_...
STRIPE_PRICE_ID_ANNUAL=price_...
```

**Como obter:**
1. Acesse https://dashboard.stripe.com
2. Vá para Products
3. Crie o produto "AnestEasy" com os 3 preços
4. Copie o Price ID de cada preço

Veja instruções detalhadas em `STRIPE_CONFIGURACAO.md`

---

### URLs da Aplicação

```env
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

**Desenvolvimento:** `http://localhost:3000`  
**Produção:** `https://anesteasy.com.br` (ou sua URL)

---

## 🚀 Configuração

### Desenvolvimento Local

1. Crie o arquivo `.env.local` na raiz do projeto
2. Adicione todas as variáveis listadas acima
3. Use chaves de **teste** da Stripe (`pk_test_...`, `sk_test_...`)

**Exemplo `.env.local`:**

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe (Teste)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51ABC123...
STRIPE_SECRET_KEY=sk_test_51ABC123...
STRIPE_WEBHOOK_SECRET=whsec_abc123...
STRIPE_PRICE_ID_MONTHLY=price_123abc...
STRIPE_PRICE_ID_QUARTERLY=price_456def...
STRIPE_PRICE_ID_ANNUAL=price_789ghi...

# URLs
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Produção (Vercel)

1. Acesse o Dashboard da Vercel
2. Selecione seu projeto
3. Vá para Settings → Environment Variables
4. Adicione cada variável individualmente
5. Use chaves de **produção** da Stripe (`pk_live_...`, `sk_live_...`)

**IMPORTANTE:** 
- Crie novos produtos/preços na Stripe em modo de **produção**
- Os Price IDs são diferentes entre teste e produção
- Configure um novo webhook para produção

---

## 🔍 Validação

### Verificar se está configurado

Execute no terminal:

```bash
node -e "console.log('Stripe Key:', process.env.STRIPE_SECRET_KEY ? '✅ Configurada' : '❌ Não configurada')"
```

### Testar localmente

```bash
npm run dev
```

Acesse http://localhost:3000/planos e tente criar uma assinatura.

---

## ⚠️ Segurança

### ❌ NUNCA faça isso:
- Comitar arquivo `.env.local` no git
- Compartilhar chaves secretas publicamente
- Usar chaves de produção em desenvolvimento
- Expor `STRIPE_SECRET_KEY` no frontend

### ✅ Sempre faça isso:
- Mantenha `.env.local` no `.gitignore`
- Use chaves de teste em desenvolvimento
- Rotacione chaves se suspeitar de vazamento
- Use variáveis de ambiente específicas por ambiente na Vercel

---

## 📚 Referências

- **Stripe Keys**: https://dashboard.stripe.com/apikeys
- **Stripe Webhooks**: https://dashboard.stripe.com/webhooks
- **Supabase API**: https://app.supabase.com/project/_/settings/api
- **Vercel Env Variables**: https://vercel.com/docs/concepts/projects/environment-variables

---

## 🆘 Troubleshooting

### Erro: "STRIPE_SECRET_KEY não configurada"
- Verifique se o arquivo `.env.local` existe
- Confirme que a variável está no formato correto
- Reinicie o servidor de desenvolvimento

### Erro: "No such price: price_..."
- Verifique se os Price IDs estão corretos
- Confirme que está usando IDs de teste em desenvolvimento
- Verifique se os produtos existem na Stripe Dashboard

### Erro: "Invalid webhook signature"
- Verifique se `STRIPE_WEBHOOK_SECRET` está correto
- Em desenvolvimento, use o Stripe CLI para forward
- Confirme que o webhook está configurado corretamente

---

**Precisa de ajuda?** Consulte `STRIPE_CONFIGURACAO.md` para instruções detalhadas.

