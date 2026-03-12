# 🔧 Solução: Webhook Não Está Processando Assinatura

## ❌ Problema

Após fazer o pagamento no checkout da Stripe, a assinatura não aparece na página `/assinatura`. Isso significa que o webhook não está sendo processado corretamente.

---

## 🔍 Como Verificar

### 1. Verificar se o Webhook Está Sendo Recebido

**No terminal onde o servidor está rodando**, procure por estas mensagens após fazer um pagamento:

```
📥 Webhook recebido - Headers: ...
🔔 Webhook Stripe recebido: checkout.session.completed ID: evt_...
✅ Checkout concluído: cs_test_...
✅ Nova assinatura criada: ...
✅ Usuário atualizado com sucesso
```

**Se NÃO aparecer nenhuma dessas mensagens**, o webhook não está sendo recebido.

---

## 🛠️ Soluções

### Solução 1: Processar Manualmente (Imediato)

Após fazer o pagamento, na página de sucesso (`/checkout/success`):

1. Clique no botão **"Processar Assinatura Manualmente"**
2. Isso vai buscar a sessão do Stripe e criar a assinatura no banco
3. Você será redirecionado para `/assinatura`

**Ou use a rota de debug:**

```bash
# No terminal ou Postman
curl -X POST http://localhost:3000/api/stripe/test-webhook \
  -H "Content-Type: application/json" \
  -d '{"session_id": "cs_test_..."}'
```

Substitua `cs_test_...` pelo session_id que aparece na URL após o checkout.

---

### Solução 2: Configurar Webhook para Desenvolvimento Local

Para desenvolvimento local, você precisa usar o **Stripe CLI**:

#### 2.1. Instalar Stripe CLI

**Windows:**
1. Baixe: https://github.com/stripe/stripe-cli/releases
2. Extraia e adicione ao PATH

**Mac:**
```bash
brew install stripe/stripe-cli/stripe
```

**Linux:**
```bash
# Ver instruções em: https://stripe.com/docs/stripe-cli
```

#### 2.2. Login no Stripe CLI

```bash
stripe login
```

Siga as instruções para autenticar.

#### 2.3. Escutar Webhooks Localmente

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

O CLI mostrará um **webhook signing secret** temporário, algo como:
```
> Ready! Your webhook signing secret is whsec_... (^C to quit)
```

#### 2.4. Configurar no .env.local

Copie o secret mostrado pelo CLI e adicione no `.env.local`:

```env
STRIPE_WEBHOOK_SECRET=whsec_... (o secret do CLI)
```

#### 2.5. Reiniciar o Servidor

```bash
npm run dev
```

Agora os webhooks serão encaminhados automaticamente para seu servidor local!

---

### Solução 3: Verificar Webhook em Produção

Se estiver em produção (Vercel):

1. **Acesse Dashboard Stripe**: https://dashboard.stripe.com
2. Vá em **Developers** → **Webhooks**
3. Verifique se há um endpoint configurado
4. Clique no endpoint para ver:
   - **URL**: Deve ser `https://anesteasy.com.br/api/stripe/webhook` (ou sua URL da Vercel)
   - **Eventos**: Deve ter `checkout.session.completed` marcado
   - **Últimos eventos**: Veja se há eventos sendo enviados

5. **Se não houver endpoint**, crie um:
   - Clique em **+ Add endpoint**
   - URL: `https://anesteasy.com.br/api/stripe/webhook`
   - Eventos: Marque `checkout.session.completed`, `customer.subscription.created`, etc.
   - Copie o **Signing secret** e adicione na Vercel como variável de ambiente

---

## 🧪 Testar Webhook Manualmente

### Opção 1: Usar a Rota de Teste

Após fazer um pagamento, use:

```bash
POST /api/stripe/test-webhook
Body: {
  "session_id": "cs_test_..." // O session_id da URL após checkout
}
```

Ou use o botão na página de sucesso.

### Opção 2: Usar Stripe CLI para Enviar Evento de Teste

```bash
# Enviar evento checkout.session.completed de teste
stripe trigger checkout.session.completed
```

---

## 📊 Verificar se Assinatura Foi Criada

### 1. Usar Rota de Debug

```
GET /api/debug/subscription?email=seu@email.com
```

Isso mostra:
- Dados do usuário
- Assinaturas no banco
- Transações de pagamento

### 2. Verificar no Supabase

1. Acesse: https://app.supabase.com
2. Vá em **Table Editor** → **subscriptions**
3. Procure por seu `user_id`
4. Verifique se há uma assinatura com `status = 'active'`

---

## 🔄 Fluxo Correto

1. ✅ Usuário paga no checkout da Stripe
2. ✅ Stripe envia webhook para `/api/stripe/webhook`
3. ✅ Webhook processa e cria assinatura no banco
4. ✅ Atualiza `subscription_status` do usuário
5. ✅ Página `/assinatura` mostra assinatura ativa

**Se o passo 2 não acontecer**, o webhook não está configurado.

**Se o passo 3 falhar**, verifique os logs do servidor.

---

## ⚠️ Problemas Comuns

### ❌ "Webhook não recebido"

**Causa:** Webhook não configurado ou URL incorreta

**Solução:**
- Em desenvolvimento: Use Stripe CLI
- Em produção: Configure no Dashboard da Stripe

### ❌ "Assinatura inválida"

**Causa:** `STRIPE_WEBHOOK_SECRET` incorreto

**Solução:**
- Verifique se o secret está correto no `.env.local`
- Em desenvolvimento: Use o secret do Stripe CLI
- Em produção: Use o secret do Dashboard da Stripe

### ❌ "user_id não encontrado no metadata"

**Causa:** Metadata não foi passada ao criar o checkout

**Solução:**
- Verifique `app/api/stripe/checkout/route.ts`
- Certifique-se de que `metadata` está sendo passado

---

## ✅ Checklist

- [ ] Stripe CLI instalado e rodando (desenvolvimento)
- [ ] `STRIPE_WEBHOOK_SECRET` configurado no `.env.local`
- [ ] Webhook configurado no Dashboard da Stripe (produção)
- [ ] URL do webhook correta
- [ ] Eventos corretos selecionados (`checkout.session.completed`)
- [ ] Logs do servidor mostram webhook sendo recebido
- [ ] Assinatura aparece no banco após pagamento

---

## 🚀 Solução Rápida (Agora)

Se você acabou de fazer um pagamento e a assinatura não aparece:

1. **Na página de sucesso do checkout**, clique em **"Processar Assinatura Manualmente"**
2. Ou acesse: `/api/debug/subscription?email=seu@email.com` para ver o status
3. Ou use: `POST /api/stripe/test-webhook` com o `session_id`

Isso vai criar a assinatura imediatamente!

