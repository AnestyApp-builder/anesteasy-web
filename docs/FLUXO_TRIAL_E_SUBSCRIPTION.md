# 📋 Fluxo de Trial e Subscription

## 🔄 Como Funciona Quando `trial_ends_at` é NULL

### Cenário 1: Usuário Novo (Cadastro Normal)
1. **Usuário se cadastra** → Confirma email
2. **Sistema configura automaticamente**:
   - `trial_ends_at` = `created_at + 7 dias`
   - `free_months` = `0` (padrão)
   - `subscription_status` = `'active'` (mas é trial, não pagamento)

### Cenário 2: Usuário Antigo ou Criado Manualmente
1. **Usuário existe mas `trial_ends_at` é NULL**
2. **Sistema calcula dinamicamente**:
   - Base do trial = `created_at + 7 dias`
   - Se tem `free_months` → adiciona `free_months * 30 dias`
   - Trial final = `(created_at + 7 dias) + (free_months * 30 dias)`

### Cenário 3: Usuário com `free_months` Concedido
1. **Admin concede `free_months`** (via SQL, Dashboard, ou API)
2. **Sistema recalcula o trial**:
   - Se `trial_ends_at` existe → usa como base + `free_months`
   - Se `trial_ends_at` é NULL → calcula `created_at + 7 dias` + `free_months`

## 💳 Assinatura via Stripe

### Quando o Usuário Assina:
1. **Cria registro na tabela `subscriptions`**:
   - `status` = `'active'`
   - `current_period_start` e `current_period_end` configurados
   - `stripe_subscription_id` vinculado

2. **Atualiza `users`**:
   - `subscription_status` = `'active'`
   - `subscription_plan` = plano escolhido

3. **Trial não é mais verificado**:
   - Se há subscription ativa → acesso garantido
   - O trial (mesmo que ainda válido) é ignorado

## 🔍 Ordem de Verificação de Acesso

O sistema verifica nesta ordem:

```
1. É Secretária?
   └─ SIM → Acesso liberado (não precisa pagar)

2. Tem Subscription Ativa?
   └─ SIM → Acesso liberado
   └─ NÃO → Verifica Trial

3. Está no Período de Trial?
   ├─ trial_ends_at existe?
   │  └─ SIM → Usa trial_ends_at como base
   │  └─ NÃO → Calcula created_at + 7 dias
   │
   └─ Adiciona free_months * 30 dias
   
   └─ Data final > Agora?
      └─ SIM → Acesso liberado
      └─ NÃO → Redireciona para /planos
```

## 📊 Exemplos Práticos

### Exemplo 1: Usuário Novo Normal
```
created_at: 2025-11-17
trial_ends_at: 2025-11-24 (7 dias)
free_months: 0
Trial válido até: 2025-11-24
```

### Exemplo 2: Usuário com Free Months
```
created_at: 2025-10-02
trial_ends_at: NULL
free_months: 2
Trial calculado: (2025-10-02 + 7 dias) + (2 * 30 dias) = 2025-12-08
Trial válido até: 2025-12-08
```

### Exemplo 3: Usuário que Assinou via Stripe
```
created_at: 2025-10-01
trial_ends_at: 2025-10-08 (já expirado)
free_months: 0
subscription_status: 'active'
subscriptions: { status: 'active', current_period_end: '2025-12-01' }
Acesso: LIBERADO (via subscription, não via trial)
```

## ⚙️ Lógica de Cálculo (Código)

### Quando `trial_ends_at` é NULL:

```typescript
// 1. Calcular base do trial
let trialEndsAt: Date | null = null

if (userData.trial_ends_at) {
  // Usa trial_ends_at como base
  trialEndsAt = new Date(userData.trial_ends_at)
} else if (userData.created_at) {
  // Calcula created_at + 7 dias
  trialEndsAt = new Date(
    new Date(userData.created_at).getTime() + 7 * 24 * 60 * 60 * 1000
  )
}

// 2. Adicionar free_months
const freeMonths = userData.free_months || 0
if (trialEndsAt && freeMonths > 0) {
  trialEndsAt = new Date(
    trialEndsAt.getTime() + (freeMonths * 30 * 24 * 60 * 60 * 1000)
  )
}

// 3. Verificar se está válido
if (trialEndsAt && now <= trialEndsAt) {
  return true // Acesso liberado
}
```

## 🎯 Resumo

**Quando `trial_ends_at` é NULL:**
- ✅ Sistema calcula `created_at + 7 dias` como base
- ✅ Adiciona `free_months * 30 dias` se houver
- ✅ OU usuário pode assinar via Stripe (cria subscription)

**Não são mutuamente exclusivos:**
- Um usuário pode ter `free_months` E assinar via Stripe
- Mas quando assina, a subscription tem prioridade sobre o trial

**Flaviaasfr@gmail.com:**
- `created_at`: 2025-10-02
- `trial_ends_at`: NULL
- `free_months`: 2
- **Trial calculado**: 2025-12-08 (21 dias restantes)
- **Status**: ✅ Trial ativo


