# Correção: Erro de Recursão Infinita nas Políticas RLS

## 🚨 Problema Identificado

Após a implementação das políticas RLS, foi detectado um erro crítico:

```
infinite recursion detected in policy for relation "secretarias"
```

**Causa**: Dependência circular entre as tabelas `secretarias` e `anestesista_secretaria` nas políticas RLS.

### Como o problema ocorria:

1. **Política em `secretarias`**: "Secretarias can view themselves" verificava `secretarias.email = auth.jwt() ->> 'email'`
2. **Política em `anestesista_secretaria`**: "Secretarias can view their anestesista links" fazia:
   ```sql
   EXISTS (
     SELECT 1 FROM secretarias
     WHERE secretarias.id = anestesista_secretaria.secretaria_id
     AND secretarias.email = (auth.jwt() ->> 'email')
   )
   ```
3. **Loop infinito**: 
   - Para verificar se uma secretária pode ver um link, precisa verificar `secretarias`
   - Para verificar `secretarias`, precisa verificar as políticas RLS
   - As políticas RLS podem depender de `anestesista_secretaria`
   - Volta ao passo 1 → **RECURSÃO INFINITA**

---

## ✅ Solução Implementada

### 1. Função Helper com SECURITY DEFINER

Criamos uma função `get_secretaria_id_by_email` que **bypassa RLS**:

```sql
CREATE OR REPLACE FUNCTION public.get_secretaria_id_by_email(check_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id FROM secretarias WHERE email = check_email LIMIT 1;
$$;
```

**Por que funciona:**
- `SECURITY DEFINER`: Executa com privilégios do criador da função (bypassa RLS)
- `SET search_path = public`: Garante que não há problemas de schema
- `STABLE`: Indica que a função não modifica dados (otimização)

### 2. Política Simplificada

A política agora usa a função helper em vez de fazer JOIN direto:

```sql
CREATE POLICY "Secretarias can view their anestesista links"
  ON anestesista_secretaria
  FOR SELECT
  TO authenticated
  USING (
    anestesista_secretaria.secretaria_id = COALESCE(
      public.get_secretaria_id_by_email(auth.jwt() ->> 'email'),
      '00000000-0000-0000-0000-000000000000'::uuid
    )
  );
```

**Por que funciona:**
- A função `get_secretaria_id_by_email` bypassa RLS, então não causa recursão
- A política apenas compara o `secretaria_id` com o resultado da função
- Não há dependência circular

### 3. Políticas de `secretarias` Mantidas Simples

As políticas de `secretarias` foram mantidas simples e sem dependências circulares:

- **"Secretarias can view themselves"**: Apenas compara email (sem JOINs)
- **"Anestesistas can view their secretarias"**: Usa JOIN direto com `anestesista_secretaria` (que não causa recursão porque `anestesista_secretaria` não depende de `secretarias` para essa verificação)

---

## 📊 Políticas Finais

### Tabela `secretarias`:

1. ✅ **Secretarias can view themselves** - SELECT baseado apenas em email
2. ✅ **Anestesistas can view their secretarias** - SELECT usando JOIN com `anestesista_secretaria`
3. ✅ **Anestesistas can create secretarias** - INSERT permissivo
4. ✅ **Anestesistas can update their secretarias** - UPDATE usando JOIN
5. ✅ **Anestesistas can delete their secretarias** - DELETE usando JOIN
6. ✅ **Service role can manage all secretarias** - ALL para service_role

### Tabela `anestesista_secretaria`:

1. ✅ **Anestesistas can view their secretaria links** - SELECT baseado em `anestesista_id`
2. ✅ **Anestesistas can create secretaria links** - INSERT baseado em `anestesista_id`
3. ✅ **Anestesistas can delete their secretaria links** - DELETE baseado em `anestesista_id`
4. ✅ **Secretarias can view their anestesista links** - SELECT usando função helper (SEM recursão)
5. ✅ **Service role can manage all links** - ALL para service_role

---

## 🔍 Verificação

Para verificar se a correção funcionou:

```sql
-- Verificar se a função existe
SELECT proname, prosecdef 
FROM pg_proc 
WHERE proname = 'get_secretaria_id_by_email';

-- Verificar políticas sem dependências circulares
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('secretarias', 'anestesista_secretaria')
ORDER BY tablename, cmd;
```

---

## ⚠️ Lições Aprendidas

1. **Evitar dependências circulares**: Políticas RLS não devem criar loops entre tabelas
2. **Usar funções SECURITY DEFINER**: Quando necessário verificar outra tabela em uma política RLS, usar funções helper que bypassam RLS
3. **Manter políticas simples**: Quanto mais simples a política, menor a chance de problemas
4. **Testar após mudanças**: Sempre testar políticas RLS após implementação para detectar recursões

---

## 🚀 Status

- ✅ **Erro corrigido**: Recursão infinita eliminada
- ✅ **Função helper criada**: `get_secretaria_id_by_email`
- ✅ **Políticas atualizadas**: Sem dependências circulares
- ✅ **Segurança mantida**: RLS ainda protege os dados adequadamente

---

**Migrações aplicadas:**
- `fix_rls_recursion_secretarias`
- `fix_rls_recursion_secretarias_v2`

**Data da correção**: 2025-01-16

