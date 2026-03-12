# 🔔 Como o Stripe Notifica o Sistema de Pagamento Bem-Sucedido

## 📋 Visão Geral

O Stripe usa **Webhooks** para notificar seu sistema quando eventos importantes acontecem, como pagamentos bem-sucedidos, assinaturas criadas, etc.

---

## 🔄 Fluxo Completo do Pagamento

### 1️⃣ **Usuário Inicia Checkout**
```
Usuário clica em "Assinar Agora" 
  ↓
Frontend chama: POST /api/stripe/checkout
  ↓
Sistema cria Checkout Session na Stripe
  ↓
Retorna URL do checkout: https://checkout.stripe.com/...
  ↓
Usuário é redirecionado para página da Stripe
```

### 2️⃣ **Usuário Completa Pagamento na Stripe**
```
Usuário preenche dados do cartão na Stripe
  ↓
Stripe processa o pagamento
  ↓
Pagamento aprovado ✅
  ↓
Stripe cria Subscription e Customer
```

### 3️⃣ **Stripe Envia Webhook (Notificação)**
```
Stripe detecta que o pagamento foi bem-sucedido
  ↓
Stripe envia HTTP POST para: https://seu-dominio.com/api/stripe/webhook
  ↓
Com os seguintes eventos:
  - checkout.session.completed
  - customer.subscription.created
  - invoice.paid
```

### 4️⃣ **Sistema Processa Webhook**
```
Endpoint: /api/stripe/webhook recebe o POST
  ↓
Valida assinatura do webhook (segurança)
  ↓
Processa evento específico:
  - checkout.session.completed → Cria/atualiza assinatura no banco
  - customer.subscription.created → Atualiza dados da assinatura
  - invoice.paid → Cria registro de transação
  ↓
Atualiza tabela `subscriptions` no Supabase
  ↓
Atualiza tabela `users` (subscription_status = 'active')
```

### 5️⃣ **Usuário Retorna ao Sistema**
```
Stripe redireciona para: /checkout/success?session_id=...
  ↓
Usuário vê página de sucesso
  ↓
Sistema já tem assinatura ativa (processada pelo webhook)
```

---

## 🔐 Segurança do Webhook

### Validação de Assinatura

O Stripe envia uma **assinatura criptográfica** em cada webhook para garantir que a requisição realmente veio do Stripe:

```typescript
// app/api/stripe/webhook/route.ts
const signature = request.headers.get('stripe-signature')
const event = constructWebhookEvent(body, signature, webhookSecret)
```

**Como funciona:**
1. Stripe assina o payload com uma chave secreta (`STRIPE_WEBHOOK_SECRET`)
2. Sistema valida a assinatura usando a mesma chave
3. Se a assinatura não corresponder, a requisição é rejeitada

---

## 📡 Eventos do Webhook que Processamos

### ✅ `checkout.session.completed`
**Quando:** Checkout concluído com sucesso
**O que faz:**
- Cria/atualiza assinatura no banco
- Define status como `active`
- Atualiza `subscription_status` do usuário

### ✅ `customer.subscription.created`
**Quando:** Nova assinatura criada na Stripe
**O que faz:**
- Garante que a assinatura existe no banco
- Atualiza dados da assinatura

### ✅ `customer.subscription.updated`
**Quando:** Assinatura atualizada (mudança de plano, etc.)
**O que faz:**
- Atualiza `plan_type` e `current_period_end`
- Sincroniza status

### ✅ `invoice.paid`
**Quando:** Fatura paga (renovação mensal)
**O que faz:**
- Cria registro em `payment_transactions`
- Garante que status está `active`

### ❌ `invoice.payment_failed`
**Quando:** Falha no pagamento
**O que faz:**
- Registra falha na transação
- Pode suspender assinatura se necessário

---

## 🛠️ Configuração do Webhook

### 1. **No Dashboard da Stripe**

1. Acesse: https://dashboard.stripe.com
2. Vá em **Developers** → **Webhooks**
3. Clique em **+ Add endpoint**
4. Configure:
   - **Endpoint URL**: `https://anesteasy.com.br/api/stripe/webhook`
   - **Description**: `AnestEasy Webhook`
5. Selecione eventos:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.paid`
   - ✅ `invoice.payment_failed`
6. Clique em **Add endpoint**
7. Copie o **Signing secret** (começa com `whsec_...`)

### 2. **No Arquivo .env.local**

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3. **Testar Localmente (Desenvolvimento)**

Para testar webhooks localmente, use o Stripe CLI:

```bash
# Instalar Stripe CLI
# Windows: https://github.com/stripe/stripe-cli/releases
# Mac: brew install stripe/stripe-cli/stripe
# Linux: https://stripe.com/docs/stripe-cli

# Login
stripe login

# Escutar webhooks e encaminhar para localhost
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

O CLI mostrará um webhook secret temporário. Use esse secret no `.env.local` para desenvolvimento.

---

## 🔍 Como Verificar se o Webhook Está Funcionando

### 1. **Logs do Servidor**

Quando um webhook é recebido, você verá nos logs:

```
🔔 Webhook Stripe recebido: checkout.session.completed ID: evt_...
✅ Checkout concluído: cs_test_...
👤 User ID encontrado: d10501f1-5862-4821-b0a3-9e93afed723e
📝 Subscription ID encontrado: sub_...
✅ Nova assinatura criada: abc123...
✅ Usuário atualizado com sucesso
```

### 2. **Dashboard da Stripe**

1. Acesse **Developers** → **Webhooks**
2. Clique no seu endpoint
3. Veja a aba **Events**
4. Verifique se os eventos estão sendo enviados e recebidos com sucesso (status 200)

### 3. **Banco de Dados**

Verifique se a assinatura foi criada:

```sql
SELECT * FROM subscriptions 
WHERE user_id = 'seu-user-id' 
ORDER BY created_at DESC;
```

### 4. **Rota de Debug**

Acesse: `http://localhost:3000/api/debug/subscription?email=seu@email.com`

Isso mostra:
- Dados do usuário
- Assinaturas no banco
- Transações de pagamento

---

## ⚠️ Problemas Comuns

### ❌ Webhook não está sendo recebido

**Possíveis causas:**
1. URL do webhook incorreta no Dashboard da Stripe
2. Servidor não está acessível publicamente (localhost não funciona em produção)
3. Firewall bloqueando requisições do Stripe

**Solução:**
- Use Stripe CLI para desenvolvimento local
- Em produção, certifique-se de que a URL está correta e acessível

### ❌ Webhook recebido mas falhando

**Possíveis causas:**
1. `STRIPE_WEBHOOK_SECRET` incorreto
2. Erro no código de processamento
3. Banco de dados inacessível

**Solução:**
- Verifique os logs do servidor para ver o erro específico
- Verifique se `STRIPE_WEBHOOK_SECRET` está correto no `.env.local`

### ❌ Assinatura não aparece após pagamento

**Possíveis causas:**
1. Webhook não foi processado ainda (pode levar alguns segundos)
2. Webhook falhou silenciosamente
3. Dados incorretos no metadata

**Solução:**
- Use o botão "Sincronizar Assinatura" na página de planos
- Ou chame manualmente: `POST /api/stripe/sync-subscription`

---

## 📊 Diagrama do Fluxo

```
┌─────────────┐
│   Usuário   │
└──────┬──────┘
       │
       │ 1. Clica "Assinar Agora"
       ↓
┌─────────────────────┐
│  Frontend (Next.js) │
│  POST /api/stripe/  │
│      checkout       │
└──────┬──────────────┘
       │
       │ 2. Cria Checkout Session
       ↓
┌─────────────────────┐
│   Stripe API        │
│  Cria Session       │
└──────┬──────────────┘
       │
       │ 3. Retorna URL
       ↓
┌─────────────────────┐
│   Stripe Checkout   │
│   (Página Externa)  │
└──────┬──────────────┘
       │
       │ 4. Usuário paga
       ↓
┌─────────────────────┐
│   Stripe Processa   │
│   Pagamento         │
└──────┬──────────────┘
       │
       │ 5. Pagamento aprovado
       ↓
┌─────────────────────┐
│   Stripe Envia      │
│   Webhook (POST)    │
└──────┬──────────────┘
       │
       │ 6. HTTP POST para
       │    /api/stripe/webhook
       ↓
┌─────────────────────┐
│  Sistema Processa   │
│  Webhook            │
│  - Valida assinatura│
│  - Cria assinatura  │
│  - Atualiza usuário │
└──────┬──────────────┘
       │
       │ 7. Atualiza banco
       ↓
┌─────────────────────┐
│   Supabase Database │
│   subscriptions     │
│   users             │
└─────────────────────┘
       │
       │ 8. Redireciona
       ↓
┌─────────────────────┐
│  /checkout/success  │
│  (Assinatura ativa) │
└─────────────────────┘
```

---

## 🎯 Resumo

**O Stripe notifica seu sistema através de Webhooks HTTP POST enviados para `/api/stripe/webhook` quando:**
- ✅ Checkout é concluído
- ✅ Assinatura é criada/atualizada
- ✅ Fatura é paga
- ✅ Pagamento falha

**O sistema então:**
1. Valida que a requisição veio do Stripe (assinatura)
2. Processa o evento específico
3. Atualiza o banco de dados
4. Usuário vê assinatura ativa

**Para verificar se está funcionando:**
- ✅ Verifique logs do servidor
- ✅ Veja eventos no Dashboard da Stripe
- ✅ Use rota de debug: `/api/debug/subscription?email=...`
- ✅ Use botão "Sincronizar Assinatura" se necessário

