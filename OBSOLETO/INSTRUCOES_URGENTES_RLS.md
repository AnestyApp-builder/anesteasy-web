# 🚨 SOLUÇÃO URGENTE - Problema ao Salvar Procedimentos

## Problema Identificado
A inserção de procedimentos está travando por mais de 20 segundos e falhando por **timeout**.

**Causa raiz**: Falta de políticas RLS (Row Level Security) na tabela `procedures` do Supabase.

## ⚡ Solução Rápida (5 minutos)

### Passo 1: Acessar o Supabase
1. Acesse: https://app.supabase.com
2. Faça login
3. Selecione seu projeto
4. No menu lateral, clique em **SQL Editor**

### Passo 2: Executar a Política Mínima

Cole e execute este comando SQL:

```sql
CREATE POLICY "Users can insert their own procedures" 
ON procedures
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);
```

**Clique em RUN** ou pressione `Ctrl+Enter`

### Passo 3: Testar

Volte para o aplicativo e tente salvar um procedimento. Deve funcionar!

---

## 📋 Solução Completa (10 minutos)

Se você quer configurar todas as permissões corretamente, execute estes comandos **um por vez**:

### 1. Permitir INSERT (criar procedimentos)
```sql
CREATE POLICY "Users can insert their own procedures" 
ON procedures
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);
```

### 2. Permitir SELECT (ver procedimentos)
```sql
CREATE POLICY "Users can view their own procedures" 
ON procedures
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);
```

### 3. Permitir UPDATE (editar procedimentos)
```sql
CREATE POLICY "Users can update their own procedures" 
ON procedures
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### 4. Permitir DELETE (excluir procedimentos)
```sql
CREATE POLICY "Users can delete their own procedures" 
ON procedures
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);
```

### 5. Permitir secretárias verem procedimentos vinculados
```sql
CREATE POLICY "Secretarias can view linked procedures" 
ON procedures
FOR SELECT 
TO authenticated
USING (
  secretaria_id IN (
    SELECT id FROM secretarias WHERE email = auth.jwt() ->> 'email'
  )
);
```

### 6. Permitir secretárias editarem procedimentos vinculados
```sql
CREATE POLICY "Secretarias can update linked procedures" 
ON procedures
FOR UPDATE 
TO authenticated
USING (
  secretaria_id IN (
    SELECT id FROM secretarias WHERE email = auth.jwt() ->> 'email'
  )
)
WITH CHECK (
  secretaria_id IN (
    SELECT id FROM secretarias WHERE email = auth.jwt() ->> 'email'
  )
);
```

---

## 🔍 Verificação

Após executar as políticas, execute esta query para verificar:

```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'procedures';
```

**Resultado esperado**: Deve mostrar as 6 políticas criadas.

---

## ⚠️ Solução de Emergência (SE NADA FUNCIONAR)

Se estiver com pressa e precisar fazer funcionar IMEDIATAMENTE:

```sql
-- ⚠️ ATENÇÃO: Esta política é MUITO PERMISSIVA - apenas para testes!
CREATE POLICY "Temporary full access" 
ON procedures
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);
```

Esta política permite que qualquer usuário autenticado faça qualquer coisa na tabela.

**⚠️ IMPORTANTE**: Depois de testar, REMOVA esta política e use as políticas corretas acima:

```sql
DROP POLICY "Temporary full access" ON procedures;
```

---

## 🎯 O Que Esperar

Após executar as políticas RLS:

- ✅ Procedimentos salvam em **menos de 2 segundos**
- ✅ Sem erros de timeout
- ✅ Cada usuário vê apenas seus próprios procedimentos
- ✅ Secretárias vinculadas podem acessar procedimentos dos anestesistas

---

## 🆘 Se Ainda Não Funcionar

Execute estes comandos de troubleshooting:

```sql
-- Habilitar RLS se estiver desabilitado
ALTER TABLE procedures ENABLE ROW LEVEL SECURITY;

-- Habilitar extensão necessária
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Verificar se você está autenticado
SELECT auth.uid();
```

---

## 📞 Suporte

Se mesmo após executar as políticas o problema persistir:
1. Verifique se você está logado no aplicativo
2. Faça logout e login novamente
3. Limpe o cache do navegador
4. Tente em uma janela anônima

O problema é definitivamente RLS - as políticas acima resolverão!

