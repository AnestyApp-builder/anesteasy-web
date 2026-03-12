# 🗑️ Deletar Secretarias e Trigger de Desvinculação

Este documento explica como deletar todas as secretarias e configurar a trigger para desvincular anestesistas automaticamente.

## 📋 O que foi implementado

### 1. Script SQL para Deletar Todas as Secretarias

**Arquivo:** `supabase/migrations/20240101000000_delete_all_secretarias.sql`

Este script:
- Deleta todas as vinculações de anestesistas com secretarias (`anestesista_secretaria`)
- Deleta todas as secretarias (`secretarias`)
- **ATENÇÃO:** Os usuários do Supabase Auth ainda existirão após executar este script

### 2. Trigger para Desvinculação Automática

**Arquivo:** `supabase/migrations/20240101000001_trigger_delete_secretaria_cascade.sql`

Esta trigger:
- Executa automaticamente quando uma secretaria é deletada
- Remove todas as vinculações na tabela `anestesista_secretaria`
- Garante que anestesistas sejam desvinculados automaticamente

### 3. Script TypeScript para Deletar Secretarias

**Arquivo:** `scripts/delete-all-secretarias.ts`

Script Node.js que:
- Lista todas as secretarias antes de deletar
- Deleta vinculações primeiro
- Deleta secretarias depois
- Mostra mensagens de confirmação

## 🚀 Como Usar

### Opção 1: Usar Migrations SQL (Recomendado)

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Execute primeiro a migration de trigger:
   ```sql
   -- Copie e cole o conteúdo de:
   -- supabase/migrations/20240101000001_trigger_delete_secretaria_cascade.sql
   ```
4. Execute a migration de deleção:
   ```sql
   -- Copie e cole o conteúdo de:
   -- supabase/migrations/20240101000000_delete_all_secretarias.sql
   ```

### Opção 2: Usar Script TypeScript

1. Configure as variáveis de ambiente:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=seu_url
   SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
   ```

2. Execute o script:
   ```bash
   npx tsx scripts/delete-all-secretarias.ts
   ```

### Opção 3: Usar Supabase CLI

Se você tem o Supabase CLI configurado:

```bash
# Aplicar migrations
supabase db push

# Ou executar SQL diretamente
supabase db execute -f supabase/migrations/20240101000000_delete_all_secretarias.sql
supabase db execute -f supabase/migrations/20240101000001_trigger_delete_secretaria_cascade.sql
```

## ⚠️ Importante

1. **Backup:** Faça backup do banco antes de deletar secretarias
2. **Usuários Auth:** Os usuários do Supabase Auth não são deletados automaticamente. Para deletá-los:
   - Use o Supabase Dashboard → Authentication → Users
   - Ou use a Admin API do Supabase
3. **Procedimentos:** Os procedimentos com `secretaria_id` não são afetados (mantém histórico)

## 🔧 Verificação

Após executar os scripts, verifique:

```sql
-- Verificar se não há mais secretarias
SELECT COUNT(*) FROM secretarias;

-- Verificar se não há mais vinculações
SELECT COUNT(*) FROM anestesista_secretaria;

-- Verificar se a trigger foi criada
SELECT * FROM pg_trigger WHERE tgname = 'trigger_delete_secretaria_cascade';
```

## 📝 Notas

- A trigger será aplicada automaticamente em todas as deleções futuras de secretarias
- Não é necessário executar a trigger manualmente - ela funciona automaticamente
- A trigger garante integridade referencial entre `secretarias` e `anestesista_secretaria`

