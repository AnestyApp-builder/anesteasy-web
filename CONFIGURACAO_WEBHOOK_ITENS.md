# ✅ Configuração de Webhook - Itens para Selecionar

## 🎯 **ITENS OBRIGATÓRIOS (Marque estes):**

### ✅ **PEDIDO** (Order)
- Necessário para eventos: `order.paid`, `order.payment_failed`
- Usado para detectar quando um pagamento é aprovado ou recusado

### ✅ **COBRANÇA** (Charge)
- Necessário para eventos: `charge.paid`, `charge.failed`
- Usado como alternativa aos eventos de `order`

### ✅ **ASSINATURA** (Subscription)
- **ESSENCIAL** - Necessário para todos os eventos de assinatura:
  - `subscription.created`
  - `subscription.payment_succeeded`
  - `subscription.canceled`
  - `subscription.expired`

### ✅ **CHECKOUT**
- Importante para eventos relacionados ao checkout hospedado
- Pode incluir eventos de criação/atualização de checkout

### ✅ **LINK DE PAGAMENTO** (Payment Link)
- **IMPORTANTE** - Como estamos usando checkout hospedado, este item é relevante
- Pode incluir eventos quando o link é acessado ou quando o pagamento é processado via link

---

## 📋 **ITENS OPCIONAIS (Não são obrigatórios, mas podem ser úteis):**

### ⚪ **CLIENTE** (Client)
- Útil se quiser receber notificações sobre atualizações de dados do cliente

### ⚪ **CARTÃO** (Card)
- Útil se quiser receber notificações sobre cartões salvos

---

## ❌ **ITENS QUE NÃO PRECISAM SER SELECIONADOS:**

- ❌ ANTECIPAÇÃO
- ❌ CONTA BANCÁRIA
- ❌ ENDEREÇO
- ❌ ITEM DA ASSINATURA
- ❌ ITEM DO PLANO
- ❌ RECEBEDOR
- ❌ USO
- ❌ DESCONTO
- ❌ FATURA
- ❌ ITEM DO PEDIDO
- ❌ PLANO
- ❌ TRANSFERÊNCIA

---

## 🎯 **RESUMO - O QUE MARCAR:**

### ✅ **Marque estes 5 itens:**

1. ✅ **PEDIDO** (Order)
2. ✅ **COBRANÇA** (Charge)
3. ✅ **ASSINATURA** (Subscription) - **MAIS IMPORTANTE**
4. ✅ **CHECKOUT**
5. ✅ **LINK DE PAGAMENTO** (Payment Link)

### 📝 **Como marcar:**

1. Marque o checkbox de cada item acima
2. Se houver "Marcar todos" em algum item, você pode marcar também (mas não é obrigatório)
3. Salve a configuração

---

## 🔍 **Por que esses itens?**

Nosso webhook (`/api/pagarme/webhook`) processa os seguintes eventos:

```typescript
// Eventos de Pedido/Cobrança
- order.paid
- order.payment_failed
- charge.paid
- charge.failed

// Eventos de Assinatura
- subscription.created
- subscription.payment_succeeded
- subscription.canceled
- subscription.expired
```

Para receber esses eventos, precisamos selecionar os recursos correspondentes no dashboard da Pagar.me.

---

## ✅ **Após selecionar:**

1. Configure a URL do webhook: `https://anesteasy.com.br/api/pagarme/webhook`
2. Salve a configuração
3. Teste fazendo um pagamento de teste

---

**Nota**: Se você estiver em desenvolvimento local, use ngrok para expor sua URL local:
```bash
ngrok http 3000
```
E configure o webhook com a URL do ngrok: `https://XXXXX.ngrok.io/api/pagarme/webhook`

