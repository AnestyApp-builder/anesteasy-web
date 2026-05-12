-- =====================================================
-- SOLUÇÃO: PROBLEMA DE RLS NA TABELA PROCEDURES
-- =====================================================
-- 
-- PROBLEMA: Inserção de procedimentos travando por mais de 20 segundos
-- CAUSA: Falta de política RLS que permita INSERT na tabela procedures
--
-- INSTRUÇÕES:
-- 1. Acesse: https://app.supabase.com
-- 2. Vá para: SQL Editor (menu lateral)
-- 3. Copie e execute os comandos abaixo UM POR VEZ
--
-- =====================================================

-- Passo 1: Verificar se RLS está habilitado na tabela procedures
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'procedures';

-- Resultado esperado: rowsecurity = true (se for false, RLS não está habilitado)

-- =====================================================
-- Passo 2: Verificar políticas existentes
-- =====================================================

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'procedures';

-- Se não retornar nenhuma política de INSERT, esse é o problema!

-- =====================================================
-- Passo 3: CRIAR POLÍTICAS RLS NECESSÁRIAS
-- =====================================================

-- Política 1: Permitir INSERT para usuários autenticados
-- Esta política permite que um usuário insira procedimentos onde ele é o owner (user_id)
CREATE POLICY "Users can insert their own procedures" 
ON procedures
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Política 2: Permitir SELECT para usuários verem seus próprios procedimentos
CREATE POLICY "Users can view their own procedures" 
ON procedures
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Política 3: Permitir UPDATE para usuários atualizarem seus próprios procedimentos
CREATE POLICY "Users can update their own procedures" 
ON procedures
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Política 4: Permitir DELETE para usuários excluírem seus próprios procedimentos
CREATE POLICY "Users can delete their own procedures" 
ON procedures
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- =====================================================
-- Passo 4: POLÍTICA ADICIONAL PARA SECRETÁRIAS
-- =====================================================
-- Se secretárias precisam acessar procedimentos dos anestesistas vinculados

-- Permitir que secretárias vejam procedimentos dos anestesistas vinculados
CREATE POLICY "Secretarias can view linked procedures" 
ON procedures
FOR SELECT 
TO authenticated
USING (
  secretaria_id IN (
    SELECT id FROM secretarias WHERE email = auth.jwt() ->> 'email'
  )
);

-- Permitir que secretárias atualizem procedimentos dos anestesistas vinculados
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

-- =====================================================
-- Passo 5: VERIFICAR SE AS POLÍTICAS FORAM CRIADAS
-- =====================================================

SELECT 
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename = 'procedures'
ORDER BY cmd;

-- Resultado esperado: Deve mostrar as 6 políticas criadas acima

-- =====================================================
-- ALTERNATIVA: SE ESTIVER COM PRESSA
-- =====================================================
-- Se você precisa fazer funcionar AGORA e ajustar as políticas depois:

-- ATENÇÃO: Esta política é MUITO PERMISSIVA - use apenas para testes!
-- Ela permite que qualquer usuário autenticado faça qualquer coisa na tabela
-- DROP POLICY IF EXISTS "Temporary full access" ON procedures;
-- CREATE POLICY "Temporary full access" 
-- ON procedures
-- FOR ALL 
-- TO authenticated
-- USING (true)
-- WITH CHECK (true);

-- ⚠️ IMPORTANTE: Remova esta política após testar e use as políticas corretas acima!

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar se o user atual tem permissão
SELECT 
    auth.uid() as current_user_id,
    EXISTS (
        SELECT 1 FROM procedures 
        WHERE user_id = auth.uid()
    ) as has_procedures;

-- =====================================================
-- TROUBLESHOOTING
-- =====================================================

-- Se ainda não funcionar após criar as políticas:

-- 1. Verificar se a extensão pgcrypto está habilitada (necessária para auth.uid())
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Verificar se RLS está realmente habilitado
ALTER TABLE procedures ENABLE ROW LEVEL SECURITY;

-- 3. Se nada funcionar, desabilitar RLS temporariamente (NÃO RECOMENDADO EM PRODUÇÃO!)
-- ALTER TABLE procedures DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- APÓS EXECUTAR AS POLÍTICAS
-- =====================================================
-- Volte para o aplicativo e tente salvar um procedimento novamente.
-- O salvamento deve funcionar em menos de 2 segundos.
-- =====================================================

