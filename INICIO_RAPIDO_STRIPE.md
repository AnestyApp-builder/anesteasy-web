# 🚀 Início Rápido - Stripe

Guia rápido para começar a usar a nova integração com Stripe.

---

## ⚡ Setup em 5 Minutos

### 1️⃣ Criar Conta Stripe (2 min)

1. Acesse https://stripe.com
2. Clique em "Sign Up"
3. Crie sua conta

### 2️⃣ Obter Chaves da API (1 min)

1. Acesse https://dashboard.stripe.com/test/apikeys
2. Copie:
   - **Publishable key** (pk_test_...)
   - **Secret key** (clique em "Reveal" e copie - sk_test_...)

### 3️⃣ Criar Produtos (1 min)

1. Acesse https://dashboard.stripe.com/test/products
2. Clique em "Add product"
3. Crie o produto **AnestEasy** com 3 preços:

| Plano | Valor | Período |
|-------|-------|---------|
| Mensal | R$ 79,00 | Monthly |
| Trimestral | R$ 225,00 | Every 3 months |
| Anual | R$ 850,00 | Yearly |

4. Copie os 3 **Price IDs** (começam com `price_...`)

### 4️⃣ Configurar .env.local (30 seg)

Crie/edite `.env.local` na raiz do projeto:

```env
# Suas variáveis do Supabase (já existentes)
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...

# Adicione estas novas variáveis:
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_temporario
STRIPE_PRICE_ID_MONTHLY=price_...
STRIPE_PRICE_ID_QUARTERLY=price_...
STRIPE_PRICE_ID_ANNUAL=price_...
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 5️⃣ Atualizar Banco de Dados (30 seg)

1. Acesse https://app.supabase.com
2. Selecione seu projeto
3. Vá para SQL Editor
4. Execute:

```sql
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id 
ON subscriptions(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id 
ON subscriptions(stripe_subscription_id);
```

### 6️⃣ Testar! (30 seg)

```bash
npm run dev
```

1. Acesse http://localhost:3000/planos
2. Faça login
3. Selecione um plano
4. Use o cartão de teste: **4242 4242 4242 4242**
5. Data: qualquer data futura
6. CVV: qualquer 3 dígitos
7. CEP: qualquer CEP válido

✅ Pronto! A assinatura deve ser criada com sucesso.

---

## 🎯 Próximos Passos

### Configurar Webhook (para receber notificações)

1. Instale o Stripe CLI: https://stripe.com/docs/stripe-cli
2. Execute no terminal:
   ```bash
   stripe login
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
3. Copie o webhook signing secret exibido
4. Atualize `STRIPE_WEBHOOK_SECRET` no `.env.local`
5. Reinicie o servidor

### Ativar Customer Portal

1. Acesse https://dashboard.stripe.com/test/settings/billing/portal
2. Clique em **Activate test link**
3. Configure:
   - ✅ Customers can update payment methods
   - ✅ Customers can update billing information
   - ✅ Customers can switch plans
   - ✅ Customers can cancel subscriptions
4. Clique em **Save**

Agora os usuários podem gerenciar suas assinaturas em `/assinatura`!

---

## 🧪 Testar Funcionalidades

### Checkout
✅ Criar nova assinatura: `/planos`

### Customer Portal
✅ Gerenciar assinatura: `/assinatura` → "Gerenciar Assinatura"

### Upgrade/Downgrade
✅ Mudar plano: Customer Portal → "Update plan"

### Cancelamento
✅ Cancelar: Customer Portal → "Cancel plan"

---

## 📱 Cartões de Teste

| Cenário | Número |
|---------|--------|
| ✅ Sucesso | 4242 4242 4242 4242 |
| ❌ Falha genérica | 4000 0000 0000 0002 |
| 🔐 Requer autenticação | 4000 0027 6000 3184 |
| 💳 Saldo insuficiente | 4000 0000 0000 9995 |

Mais cartões: https://stripe.com/docs/testing#cards

---

## 🚨 Problemas?

### "No such price"
- Verifique se os Price IDs no `.env.local` estão corretos
- Confirme que os produtos existem na Stripe Dashboard

### "Webhook signature invalid"
- Em desenvolvimento, use o Stripe CLI
- Verifique se `STRIPE_WEBHOOK_SECRET` está correto

### "Assinatura não ativa após pagamento"
- Configure o webhook (ver seção acima)
- Verifique os logs no terminal

---

## 📚 Documentação Completa

- **Setup detalhado**: `STRIPE_CONFIGURACAO.md`
- **Variáveis de ambiente**: `docs/ENV_VARIABLES.md`
- **Resumo da migração**: `RESUMO_MIGRACAO_STRIPE.md`

---

## 🎉 Tudo Funcionando?

Parabéns! Você agora tem:
- ✅ Checkout profissional da Stripe
- ✅ Customer Portal para gestão
- ✅ Proration automática
- ✅ Sistema de pagamentos robusto

Quando estiver pronto para produção, consulte a seção "Passo 7: Migrar para Produção" no `STRIPE_CONFIGURACAO.md`.

---

**Precisa de ajuda?** Consulte a documentação da Stripe: https://stripe.com/docs

