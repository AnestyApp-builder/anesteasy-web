# 🔐 Chaves Pagar.me Configuradas

## Ambiente de Teste

### Chaves Privadas (Server-side)
- **API Key (Secret Key)**: `sk_028d061594634fb3af97504787f6bcb3`
- **Webhook Secret**: `sk_bacf426dd3a8463f8eba1498d37afb3a`
- **Account ID**: `acc_LBQW9n8FOSjonMlm`

### Chaves Públicas (Client-side)
- **Public Key**: `pk_EXANarahdFqDWKMQ`

---

## 📝 Onde Cada Chave é Usada

### 1. API Key (Secret Key)
**Arquivo**: `app/api/checkout/create/route.ts`
**Uso**: Autenticação Basic Auth para criar pedidos
```typescript
const apiKey = process.env.PAGARME_API_KEY!
const basicAuth = Buffer.from(`${apiKey}:`).toString('base64')
```

### 2. Webhook Secret
**Arquivo**: `app/api/webhooks/pagarme/route.ts`
**Uso**: Validar assinatura dos webhooks do Pagar.me
```typescript
const hash = crypto
  .createHmac('sha256', process.env.PAGARME_WEBHOOK_SECRET)
  .update(body)
  .digest('hex')
```

### 3. Public Key
**Uso Futuro**: Para tokenização de cartão no frontend (mais seguro)
- Evita enviar dados do cartão diretamente para seu servidor
- Pagar.me retorna um token que você usa na API

### 4. Account ID
**Uso**: Identificação da conta nas APIs do Pagar.me

---

## 🔒 Segurança

### ✅ O que fazer:
- ✅ Mantenha as chaves no `.env.local` (nunca commite!)
- ✅ Use apenas `Secret Key` no backend
- ✅ Use apenas `Public Key` no frontend
- ✅ Valide sempre a assinatura dos webhooks

### ❌ O que NÃO fazer:
- ❌ Nunca exponha a Secret Key no frontend
- ❌ Nunca commite o `.env.local` no git
- ❌ Nunca compartilhe suas chaves publicamente

---

## 🧪 Testando as Chaves

### Teste de Autenticação
```bash
# Basic Auth = base64(sk_028d061594634fb3af97504787f6bcb3:)
curl -X GET https://api.pagar.me/core/v5/orders \
  -H "Authorization: Basic c2tfMDI4ZDA2MTU5NDYzNGZiM2FmOTc1MDQ3ODdmNmJjYjM6"
```

### Cartões de Teste
- **Aprovado**: `4111 1111 1111 1111`
- **Recusado**: `4000 0000 0000 0010`
- Validade: qualquer data futura
- CVV: qualquer 3 dígitos

---

## 📡 Configuração de Webhooks

**URL do Webhook**: `https://anesteasy.com.br/api/webhooks/pagarme`

**Eventos para assinar** (no dashboard Pagar.me):
- `order.paid` - Pedido pago
- `order.payment_failed` - Pagamento falhou
- `charge.paid` - Cobrança paga
- `charge.refunded` - Cobrança reembolsada

---

## 🚀 Próximos Passos

1. ✅ Chaves configuradas no `.env.local`
2. ✅ API configurada com Basic Auth
3. ✅ Estrutura de pedidos correta (API v5)
4. ⏳ Testar checkout completo no browser
5. ⏳ Configurar webhooks no dashboard Pagar.me
6. ⏳ Testar fluxo de assinatura completo

---

**Última atualização**: $(Get-Date -Format "dd/MM/yyyy HH:mm")

