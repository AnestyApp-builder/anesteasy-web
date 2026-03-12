-- =====================================================
-- CORREÇÃO DE PROBLEMAS DE SEGURANÇA RLS
-- =====================================================
-- 
-- Este script corrige os problemas de segurança identificados
-- pelo Supabase Advisor, habilitando RLS e criando políticas
-- apropriadas para todas as tabelas públicas que estavam sem proteção.
--
-- Tabelas corrigidas:
-- - goals
-- - procedure_logs
-- - anestesista_secretaria
-- - secretarias
-- - parcelas
--
-- =====================================================

-- =====================================================
-- 1. TABELA: goals
-- =====================================================

-- Habilitar RLS
ALTER TABLE IF EXISTS goals ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem (caso RLS esteja habilitado mas sem políticas)
DROP POLICY IF EXISTS "Users can view their own goals" ON goals;
DROP POLICY IF EXISTS "Users can insert their own goals" ON goals;
DROP POLICY IF EXISTS "Users can update their own goals" ON goals;
DROP POLICY IF EXISTS "Users can delete their own goals" ON goals;
DROP POLICY IF EXISTS "Service role can manage all goals" ON goals;

-- Política: Usuários podem ver suas próprias metas
CREATE POLICY "Users can view their own goals"
  ON goals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Política: Usuários podem criar suas próprias metas
CREATE POLICY "Users can insert their own goals"
  ON goals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Política: Usuários podem atualizar suas próprias metas
CREATE POLICY "Users can update their own goals"
  ON goals
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política: Usuários podem excluir suas próprias metas
CREATE POLICY "Users can delete their own goals"
  ON goals
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Política: Service role pode gerenciar todas as metas (para APIs administrativas)
CREATE POLICY "Service role can manage all goals"
  ON goals
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 2. TABELA: procedure_logs
-- =====================================================

-- Habilitar RLS
ALTER TABLE IF EXISTS procedure_logs ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Users can view their own procedure logs" ON procedure_logs;
DROP POLICY IF EXISTS "Users can insert their own procedure logs" ON procedure_logs;
DROP POLICY IF EXISTS "Users can update their own procedure logs" ON procedure_logs;
DROP POLICY IF EXISTS "Users can delete their own procedure logs" ON procedure_logs;
DROP POLICY IF EXISTS "Service role can manage all procedure logs" ON procedure_logs;

-- Política: Usuários podem ver logs de procedimentos relacionados aos seus procedimentos
-- Assumindo que procedure_logs tem uma coluna procedure_id que referencia procedures
CREATE POLICY "Users can view their own procedure logs"
  ON procedure_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM procedures
      WHERE procedures.id = procedure_logs.procedure_id
      AND procedures.user_id = auth.uid()
    )
  );

-- Política: Usuários podem criar logs para seus próprios procedimentos
CREATE POLICY "Users can insert their own procedure logs"
  ON procedure_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM procedures
      WHERE procedures.id = procedure_logs.procedure_id
      AND procedures.user_id = auth.uid()
    )
  );

-- Política: Usuários podem atualizar logs de seus próprios procedimentos
CREATE POLICY "Users can update their own procedure logs"
  ON procedure_logs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM procedures
      WHERE procedures.id = procedure_logs.procedure_id
      AND procedures.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM procedures
      WHERE procedures.id = procedure_logs.procedure_id
      AND procedures.user_id = auth.uid()
    )
  );

-- Política: Usuários podem excluir logs de seus próprios procedimentos
CREATE POLICY "Users can delete their own procedure logs"
  ON procedure_logs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM procedures
      WHERE procedures.id = procedure_logs.procedure_id
      AND procedures.user_id = auth.uid()
    )
  );

-- Política: Service role pode gerenciar todos os logs
CREATE POLICY "Service role can manage all procedure logs"
  ON procedure_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 3. TABELA: anestesista_secretaria
-- =====================================================

-- Habilitar RLS
ALTER TABLE IF EXISTS anestesista_secretaria ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Anestesistas can view their secretaria links" ON anestesista_secretaria;
DROP POLICY IF EXISTS "Anestesistas can create secretaria links" ON anestesista_secretaria;
DROP POLICY IF EXISTS "Anestesistas can delete their secretaria links" ON anestesista_secretaria;
DROP POLICY IF EXISTS "Secretarias can view their anestesista links" ON anestesista_secretaria;
DROP POLICY IF EXISTS "Service role can manage all links" ON anestesista_secretaria;

-- Política: Anestesistas podem ver seus próprios vínculos com secretárias
CREATE POLICY "Anestesistas can view their secretaria links"
  ON anestesista_secretaria
  FOR SELECT
  TO authenticated
  USING (auth.uid() = anestesista_id);

-- Política: Anestesistas podem criar vínculos com secretárias
CREATE POLICY "Anestesistas can create secretaria links"
  ON anestesista_secretaria
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = anestesista_id);

-- Política: Anestesistas podem excluir seus próprios vínculos
CREATE POLICY "Anestesistas can delete their secretaria links"
  ON anestesista_secretaria
  FOR DELETE
  TO authenticated
  USING (auth.uid() = anestesista_id);

-- Política: Secretárias podem ver vínculos onde elas estão vinculadas
-- Assumindo que secretarias tem uma coluna email ou user_id
CREATE POLICY "Secretarias can view their anestesista links"
  ON anestesista_secretaria
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM secretarias
      WHERE secretarias.id = anestesista_secretaria.secretaria_id
      AND (
        secretarias.email = (auth.jwt() ->> 'email')
        OR secretarias.user_id = auth.uid()
      )
    )
  );

-- Política: Service role pode gerenciar todos os vínculos
CREATE POLICY "Service role can manage all links"
  ON anestesista_secretaria
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 4. TABELA: secretarias
-- =====================================================

-- Habilitar RLS
ALTER TABLE IF EXISTS secretarias ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Anestesistas can view their secretarias" ON secretarias;
DROP POLICY IF EXISTS "Anestesistas can create secretarias" ON secretarias;
DROP POLICY IF EXISTS "Anestesistas can update their secretarias" ON secretarias;
DROP POLICY IF EXISTS "Anestesistas can delete their secretarias" ON secretarias;
DROP POLICY IF EXISTS "Secretarias can view themselves" ON secretarias;
DROP POLICY IF EXISTS "Service role can manage all secretarias" ON secretarias;

-- Política: Anestesistas podem ver secretárias vinculadas a eles
CREATE POLICY "Anestesistas can view their secretarias"
  ON secretarias
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM anestesista_secretaria
      WHERE anestesista_secretaria.secretaria_id = secretarias.id
      AND anestesista_secretaria.anestesista_id = auth.uid()
    )
  );

-- Política: Anestesistas podem criar secretárias
-- Assumindo que há uma coluna anestesista_id ou similar
CREATE POLICY "Anestesistas can create secretarias"
  ON secretarias
  FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Permitir criação, mas vincular depois via anestesista_secretaria

-- Política: Anestesistas podem atualizar secretárias vinculadas a eles
CREATE POLICY "Anestesistas can update their secretarias"
  ON secretarias
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM anestesista_secretaria
      WHERE anestesista_secretaria.secretaria_id = secretarias.id
      AND anestesista_secretaria.anestesista_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM anestesista_secretaria
      WHERE anestesista_secretaria.secretaria_id = secretarias.id
      AND anestesista_secretaria.anestesista_id = auth.uid()
    )
  );

-- Política: Anestesistas podem excluir secretárias vinculadas a eles
CREATE POLICY "Anestesistas can delete their secretarias"
  ON secretarias
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM anestesista_secretaria
      WHERE anestesista_secretaria.secretaria_id = secretarias.id
      AND anestesista_secretaria.anestesista_id = auth.uid()
    )
  );

-- Política: Secretárias podem ver seus próprios dados
CREATE POLICY "Secretarias can view themselves"
  ON secretarias
  FOR SELECT
  TO authenticated
  USING (
    secretarias.email = (auth.jwt() ->> 'email')
    OR secretarias.user_id = auth.uid()
  );

-- Política: Service role pode gerenciar todas as secretárias
CREATE POLICY "Service role can manage all secretarias"
  ON secretarias
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 5. TABELA: parcelas
-- =====================================================

-- Habilitar RLS
ALTER TABLE IF EXISTS parcelas ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Users can view their own parcelas" ON parcelas;
DROP POLICY IF EXISTS "Users can insert their own parcelas" ON parcelas;
DROP POLICY IF EXISTS "Users can update their own parcelas" ON parcelas;
DROP POLICY IF EXISTS "Users can delete their own parcelas" ON parcelas;
DROP POLICY IF EXISTS "Service role can manage all parcelas" ON parcelas;

-- Política: Usuários podem ver parcelas de seus próprios procedimentos
CREATE POLICY "Users can view their own parcelas"
  ON parcelas
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM procedures
      WHERE procedures.id = parcelas.procedure_id
      AND procedures.user_id = auth.uid()
    )
  );

-- Política: Usuários podem criar parcelas para seus próprios procedimentos
CREATE POLICY "Users can insert their own parcelas"
  ON parcelas
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM procedures
      WHERE procedures.id = parcelas.procedure_id
      AND procedures.user_id = auth.uid()
    )
  );

-- Política: Usuários podem atualizar parcelas de seus próprios procedimentos
CREATE POLICY "Users can update their own parcelas"
  ON parcelas
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM procedures
      WHERE procedures.id = parcelas.procedure_id
      AND procedures.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM procedures
      WHERE procedures.id = parcelas.procedure_id
      AND procedures.user_id = auth.uid()
    )
  );

-- Política: Usuários podem excluir parcelas de seus próprios procedimentos
CREATE POLICY "Users can delete their own parcelas"
  ON parcelas
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM procedures
      WHERE procedures.id = parcelas.procedure_id
      AND procedures.user_id = auth.uid()
    )
  );

-- Política: Service role pode gerenciar todas as parcelas
CREATE POLICY "Service role can manage all parcelas"
  ON parcelas
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar se RLS está habilitado em todas as tabelas
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('goals', 'procedure_logs', 'anestesista_secretaria', 'secretarias', 'parcelas')
ORDER BY tablename;

-- Verificar políticas criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('goals', 'procedure_logs', 'anestesista_secretaria', 'secretarias', 'parcelas')
ORDER BY tablename, cmd;

-- =====================================================
-- COMENTÁRIOS
-- =====================================================

COMMENT ON TABLE goals IS 'Metas dos anestesistas - RLS habilitado e políticas configuradas';
COMMENT ON TABLE procedure_logs IS 'Logs de procedimentos - RLS habilitado e políticas configuradas';
COMMENT ON TABLE anestesista_secretaria IS 'Vínculos entre anestesistas e secretárias - RLS habilitado e políticas configuradas';
COMMENT ON TABLE secretarias IS 'Secretárias cadastradas - RLS habilitado e políticas configuradas';
COMMENT ON TABLE parcelas IS 'Parcelas de pagamento dos procedimentos - RLS habilitado e políticas configuradas';

