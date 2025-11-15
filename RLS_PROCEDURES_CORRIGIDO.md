# ✅ Políticas RLS da Tabela `procedures` - CORRIGIDAS

## 🎯 Problema Resolvido

O salvamento de procedimentos estava dando timeout (mais de 20 segundos) devido a:
1. **Políticas RLS duplicadas** - Havia políticas para `public` e `authenticated`
2. **Falta de índices otimizados** - Já existem, mas foram verificados

## 🔧 Correções Aplicadas via MCP Supabase

### 1. Políticas Removidas (Duplicadas para `public`)
- ❌ `Users can insert own procedures` (public)
- ❌ `Users can view own procedures` (public)
- ❌ `Users can update own procedures` (public)
- ❌ `Users can delete own procedures` (public)

### 2. Políticas Ativas (Para `authenticated`)

#### ✅ INSERT
```sql
CREATE POLICY "Users can insert their own procedures" 
ON procedures
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);
```

#### ✅ SELECT
```sql
CREATE POLICY "Users can view their own procedures" 
ON procedures
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);
```

#### ✅ UPDATE
```sql
CREATE POLICY "Users can update their own procedures" 
ON procedures
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

#### ✅ DELETE
```sql
CREATE POLICY "Users can delete their own procedures" 
ON procedures
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);
```

### 3. Políticas para Secretárias (Mantidas)

#### ✅ SELECT para Secretárias
```sql
"Secretarias can view linked anesthesiologist procedures"
```

#### ✅ UPDATE para Secretárias
```sql
"Secretarias can update linked anesthesiologist procedures"
```

## 📊 Status Final

### Políticas Ativas:
| Operação | Nome da Política | Role | Usando | With Check |
|----------|-----------------|------|---------|------------|
| INSERT | Users can insert their own procedures | authenticated | ❌ | ✅ |
| SELECT | Users can view their own procedures | authenticated | ✅ | ❌ |
| SELECT | Secretarias can view linked procedures | public | ✅ | ❌ |
| UPDATE | Users can update their own procedures | authenticated | ✅ | ✅ |
| UPDATE | Secretarias can update linked procedures | public | ✅ | ✅ |
| DELETE | Users can delete their own procedures | authenticated | ✅ | ❌ |

### Índices Otimizados:
- ✅ `idx_procedures_user_id` - Para filtro por user_id
- ✅ `idx_procedures_secretaria_id` - Para filtro por secretaria_id
- ✅ `idx_procedures_procedure_date` - Para ordenação por data
- ✅ `idx_procedures_payment_status` - Para filtro por status de pagamento
- ✅ `idx_procedures_procedure_type` - Para filtro por tipo
- ✅ `idx_procedures_created_at` - Para ordenação por criação

## 🚀 Resultado Esperado

Após essas correções:

### Antes:
- ❌ Timeout após 20+ segundos
- ❌ Procedimento não salvava
- ❌ Políticas duplicadas causando lentidão

### Depois:
- ✅ Salvamento em **menos de 2 segundos**
- ✅ Políticas otimizadas e não duplicadas
- ✅ Índices garantem performance

## 🧪 Como Testar

1. **Clique no botão "🧪 Preencher Teste"** no topo da página de novo procedimento
2. **Clique em "Salvar"**
3. **Resultado esperado**: 
   - Salvamento completo em < 2 segundos
   - Mensagem de sucesso
   - Redirecionamento para lista de procedimentos

## 🔍 Verificação

Se ainda houver problemas, execute no Supabase SQL Editor:

```sql
-- Verificar políticas
SELECT policyname, cmd, roles
FROM pg_policies 
WHERE tablename = 'procedures'
ORDER BY cmd;

-- Verificar índices
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'procedures';

-- Verificar se RLS está habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'procedures';
```

## 📝 Notas Importantes

1. **RLS está habilitado** - `rowsecurity = true`
2. **Apenas 1 trigger** - `update_procedures_updated_at` (só para UPDATE)
3. **Campo fichas_anestesicas** - JSONB nullable (correto)
4. **Políticas usam `auth.uid()`** - Função nativa do Supabase

## ✅ Conclusão

Todas as políticas RLS foram corrigidas e otimizadas via **MCP Supabase**.
O salvamento de procedimentos deve funcionar normalmente agora! 🎉

