# Migração para Assinaturas Recorrentes - Pagar.me

## ✅ Tarefas Concluídas

### 1. Biblioteca de Assinaturas (`lib/pagarme-subscriptions.ts`)
- ✅ `criarPlano()` - Cria planos de assinatura
- ✅ `listarPlanos()` - Lista todos os planos
- ✅ `criarAssinatura()` - Cria assinatura recorrente com cartão
- ✅ `criarAssinaturaLink()` - Cria link de checkout para assinatura
- ✅ `obterAssinatura()` - Obtém assinatura por ID
- ✅ `cancelarAssinatura()` - Cancela assinatura

### 2. Endpoint de Planos (`/api/pagarme/plans`)
- ✅ GET: Lista/cria planos automaticamente
- ✅ POST: Cria plano manualmente
- ✅ Salva planos no Supabase (`pagarme_plans`)

### 3. Endpoint de Assinatura (`/api/pagarme/subscription`)
- ✅ POST: Cria assinatura recorrente
  - Suporta checkout link (sem cartão no frontend)
  - Suporta criação direta com cartão
- ✅ GET: Obtém assinatura do usuário

### 4. Webhook Atualizado (`/api/pagarme/webhook`)
- ✅ `subscription.created` - Assinatura criada
- ✅ `subscription.activated` - Assinatura ativada
- ✅ `subscription.payment_succeeded` - Pagamento bem-sucedido
- ✅ `subscription.payment_failed` - Pagamento falhou
- ✅ `subscription.canceled` - Assinatura cancelada
- ✅ `subscription.expired` - Assinatura expirada

### 5. Frontend Atualizado (`app/planos/page.tsx`)
- ✅ Usa novo endpoint `/api/pagarme/subscription`
- ✅ Suporta checkout link hospedado
- ✅ Redireciona para sucesso após criação

### 6. Migration Criada
- ✅ `20240101000007_create_pagarme_plans.sql`
- ✅ Tabela `pagarme_plans` para armazenar planos

## 📋 Próximos Passos

### 1. Executar Migration no Supabase
```sql
-- Executar o arquivo: supabase/migrations/20240101000007_create_pagarme_plans.sql
```

### 2. Criar Planos Inicialmente
```bash
# Chamar GET /api/pagarme/plans para criar os 3 planos automaticamente
curl -X GET http://localhost:3000/api/pagarme/plans \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Configurar Webhook na Pagar.me
- URL: `https://seu-dominio.com/api/pagarme/webhook`
- Eventos:
  - `subscription.created`
  - `subscription.activated`
  - `subscription.payment_succeeded`
  - `subscription.payment_failed`
  - `subscription.canceled`
  - `subscription.expired`

### 4. Testar Fluxo Completo
1. Acessar `/planos`
2. Clicar em "Assinar Agora"
3. Ser redirecionado para checkout da Pagar.me
4. Completar pagamento
5. Verificar webhook recebido
6. Verificar assinatura ativa no Supabase

## 🔧 Variáveis de Ambiente Necessárias

```env
PAGARME_API_KEY=ak_live_xxxxxxxxxxxxxxxxxx
PAGARME_API_URL=https://api.pagar.me/core/v5
PAGARME_WEBHOOK_SECRET=sk_xxxxxxxxxxxxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

## 📊 Estrutura de Dados

### Tabela `pagarme_plans`
- `pagarme_plan_id` - ID do plano na Pagar.me
- `name` - Nome do plano
- `interval` - month/year
- `interval_count` - Quantidade de intervalos
- `amount` - Valor em reais
- `plan_type` - monthly/quarterly/annual

### Tabela `subscriptions` (já existe)
- `pagarme_subscription_id` - ID da assinatura na Pagar.me
- `status` - pending/active/cancelled/expired/suspended
- `plan_type` - monthly/quarterly/annual
- `current_period_start` - Início do período atual
- `current_period_end` - Fim do período atual

## 🚀 Fluxo de Assinatura

1. **Usuário seleciona plano** → `/planos`
2. **Frontend chama** → `POST /api/pagarme/subscription` com `useCheckoutLink: true`
3. **Backend cria** → Link de checkout na Pagar.me
4. **Usuário é redirecionado** → Checkout hospedado da Pagar.me
5. **Usuário completa pagamento** → Pagar.me processa
6. **Pagar.me envia webhook** → `subscription.activated`
7. **Backend atualiza** → Status da assinatura no Supabase
8. **Usuário é redirecionado** → `/checkout/success`

## ⚠️ Notas Importantes

- A tabela `subscriptions` já existe e não precisa ser recriada
- Os planos são criados automaticamente na primeira chamada a `/api/pagarme/plans`
- O checkout link é a forma recomendada (não precisa lidar com cartão no frontend)
- Todos os eventos de webhook são logados no console para debug

