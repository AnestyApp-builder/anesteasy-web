# Guia: Como Conceder Meses Grátis aos Usuários

## 📋 Visão Geral

O sistema agora possui um campo `free_months` na tabela `users` do Supabase que permite conceder meses grátis adicionais aos usuários, além dos 7 dias iniciais de teste.

## 🗄️ Estrutura do Banco de Dados

### Campo `free_months`
- **Tabela**: `users`
- **Tipo**: `INTEGER`
- **Valor padrão**: `0`
- **Descrição**: Número de meses grátis adicionais concedidos ao usuário. Cada mês = 30 dias.

## 📝 Como Usar

### Opção 1: Através do Supabase Dashboard

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Navegue até **Table Editor** → **users**
3. Encontre o usuário que deseja conceder meses grátis
4. Edite o campo `free_months` e insira o número de meses desejado
5. Salve as alterações

**Exemplo**: Para conceder 3 meses grátis, defina `free_months = 3`

### Opção 2: Através de SQL (Supabase SQL Editor)

```sql
-- Conceder 3 meses grátis para um usuário específico (por email)
UPDATE users
SET free_months = 3
WHERE email = 'usuario@exemplo.com';

-- Conceder 6 meses grátis para um usuário específico (por ID)
UPDATE users
SET free_months = 6
WHERE id = 'uuid-do-usuario';

-- Conceder 1 mês grátis para múltiplos usuários
UPDATE users
SET free_months = 1
WHERE email IN ('usuario1@exemplo.com', 'usuario2@exemplo.com');

-- Remover meses grátis (definir como 0)
UPDATE users
SET free_months = 0
WHERE email = 'usuario@exemplo.com';
```

### Opção 3: Através de API (Supabase Client)

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role key para bypass RLS
)

// Conceder 3 meses grátis
await supabase
  .from('users')
  .update({ free_months: 3 })
  .eq('email', 'usuario@exemplo.com')
```

## ⚙️ Como Funciona

### Cálculo do Período Gratuito

O sistema calcula o período gratuito total da seguinte forma:

1. **Período de teste inicial**: 7 dias (definido em `trial_ends_at`)
2. **Meses grátis adicionais**: `free_months * 30 dias`
3. **Período total**: `trial_ends_at + (free_months * 30 dias)`

### Exemplo Prático

- **Usuário criado em**: 01/01/2024
- **Trial inicial termina em**: 08/01/2024 (7 dias)
- **Meses grátis concedidos**: 3 meses (`free_months = 3`)
- **Período gratuito total termina em**: 08/01/2024 + 90 dias = **07/04/2024**

## 🔍 Verificação de Acesso

O sistema verifica automaticamente:

1. Se o usuário está dentro do período de teste inicial (7 dias)
2. Se há meses grátis adicionais (`free_months > 0`)
3. Se o período total (teste + meses grátis) ainda está válido
4. Se não, verifica se há assinatura ativa

### Mensagens Exibidas

- **Sem meses grátis**: "Período de teste gratuito (X dias restantes)"
- **Com meses grátis**: "Período gratuito (X dias restantes - Y meses grátis incluídos)"

## 📊 Exemplos de Uso

### Cenário 1: Conceder 1 mês grátis para um novo usuário
```sql
UPDATE users
SET free_months = 1
WHERE email = 'novo@usuario.com';
```

### Cenário 2: Conceder 6 meses grátis para um usuário VIP
```sql
UPDATE users
SET free_months = 6
WHERE email = 'vip@usuario.com';
```

### Cenário 3: Estender meses grátis para um usuário existente
```sql
-- Adicionar mais 2 meses aos meses grátis existentes
UPDATE users
SET free_months = free_months + 2
WHERE email = 'usuario@exemplo.com';
```

### Cenário 4: Remover todos os meses grátis
```sql
UPDATE users
SET free_months = 0
WHERE email = 'usuario@exemplo.com';
```

## ⚠️ Observações Importantes

1. **Cada mês = 30 dias**: O sistema considera 1 mês = 30 dias (não meses calendário)
2. **Não acumula com assinatura**: Se o usuário já tem uma assinatura ativa, os meses grátis não são aplicados
3. **Valor padrão**: Se `free_months` for `NULL` ou não definido, será tratado como `0`
4. **Apenas para período de teste**: Os meses grátis são adicionados ao período de teste inicial, não substituem uma assinatura

## 🔄 Migração

A migration `20240101000011_add_free_months_field.sql` já foi criada e adiciona o campo `free_months` à tabela `users`. Execute a migration no Supabase para ativar o recurso.

## 📝 Logs

O sistema registra nos logs quando um usuário tem meses grátis:
```
✅ [SUBSCRIPTION] Usuário tem 3 meses grátis adicionais
```

