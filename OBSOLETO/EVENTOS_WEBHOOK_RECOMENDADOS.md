# Eventos de Webhook Recomendados - Pagar.me

## ✅ Eventos OBRIGATÓRIOS para Assinaturas Recorrentes

### Categoria: ASSINATURA (Subscription)
Marque **"Marcar todos"** na categoria **ASSINATURA** para selecionar todos os eventos relacionados a assinaturas:

1. ✅ **subscription.created** - Quando uma assinatura é criada
2. ✅ **subscription.activated** - Quando uma assinatura é ativada (pagamento aprovado)
3. ✅ **subscription.payment_succeeded** - Quando um pagamento recorrente é bem-sucedido
4. ✅ **subscription.payment_failed** - Quando um pagamento recorrente falha
5. ✅ **subscription.canceled** - Quando uma assinatura é cancelada
6. ✅ **subscription.expired** - Quando uma assinatura expira

## 📋 Eventos OPCIONAIS (mas recomendados)

### Categoria: COBRANÇA (Charge)
Selecione os seguintes eventos para ter mais controle sobre pagamentos:

1. ✅ **charge.paid** - Quando uma cobrança é paga
2. ✅ **charge.refunded** - Quando uma cobrança é reembolsada
3. ✅ **charge.payment_failed** - Quando uma cobrança falha

### Categoria: PEDIDO (Order)
Selecione para rastrear pedidos relacionados:

1. ✅ **order.paid** - Quando um pedido é pago
2. ✅ **order.payment_failed** - Quando um pagamento de pedido falha

## ❌ Eventos NÃO NECESSÁRIOS (para nosso caso)

Você **NÃO precisa** selecionar:
- ANTECIPAÇÃO
- CARTÃO (a menos que queira rastrear cartões)
- CLIENTE
- CONTA BANCÁRIA
- ENDEREÇO
- ITEM DA ASSINATURA
- ITEM DO PLANO
- RECEBEDOR
- USO
- CHECKOUT
- DESCONTO
- FATURA
- ITEM DO PEDIDO
- LINK DE PAGAMENTO (não usamos mais Payment Links)
- PLANO
- TRANSFERÊNCIA

## 🎯 Configuração Mínima Recomendada

**Mínimo necessário:**
- ✅ Categoria **ASSINATURA**: Marcar todos

**Recomendado (para melhor rastreamento):**
- ✅ Categoria **ASSINATURA**: Marcar todos
- ✅ Categoria **COBRANÇA**: charge.paid, charge.payment_failed
- ✅ Categoria **PEDIDO**: order.paid, order.payment_failed

## 📝 Resumo Visual

```
✅ ASSINATURA (Subscription)
   ✅ subscription.created
   ✅ subscription.activated
   ✅ subscription.payment_succeeded
   ✅ subscription.payment_failed
   ✅ subscription.canceled
   ✅ subscription.expired

✅ COBRANÇA (Charge) - Opcional mas recomendado
   ✅ charge.paid
   ✅ charge.payment_failed

✅ PEDIDO (Order) - Opcional mas recomendado
   ✅ order.paid
   ✅ order.payment_failed
```

## 🔧 Como Configurar

1. Na tela de configuração de webhook da Pagar.me:
2. Expanda a categoria **ASSINATURA**
3. Clique em **"Marcar todos"** ✅
4. (Opcional) Expanda **COBRANÇA** e marque: charge.paid, charge.payment_failed
5. (Opcional) Expanda **PEDIDO** e marque: order.paid, order.payment_failed
6. Salve a configuração

## ⚠️ Importante

- O webhook precisa estar acessível publicamente
- Use HTTPS na URL do webhook
- Para desenvolvimento local, use ngrok ou similar
- URL do webhook: `https://seu-dominio.com/api/pagarme/webhook`

