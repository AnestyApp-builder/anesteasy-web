-- Torna procedure_id opcional (despesas são registros independentes do grupo)
ALTER TABLE despesas ALTER COLUMN procedure_id DROP NOT NULL;

-- Adiciona índice de data para ordenação
CREATE INDEX IF NOT EXISTS despesas_created_at_idx ON despesas(created_at DESC);

-- Permite SELECT por membros do grupo (não só pelo dono)
DROP POLICY IF EXISTS "despesas_select" ON despesas;
CREATE POLICY "despesas_select" ON despesas
  FOR SELECT USING (
    auth.uid() = user_id
    OR (group_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = despesas.group_id
        AND gm.user_id = auth.uid()
        AND gm.status = 'active'
    ))
  );

-- Permite INSERT por qualquer membro ativo do grupo
DROP POLICY IF EXISTS "despesas_insert" ON despesas;
CREATE POLICY "despesas_insert" ON despesas
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR (group_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = despesas.group_id
        AND gm.user_id = auth.uid()
        AND gm.status = 'active'
    ))
  );

-- Permite DELETE por membro do grupo
DROP POLICY IF EXISTS "despesas_delete" ON despesas;
CREATE POLICY "despesas_delete" ON despesas
  FOR DELETE USING (
    auth.uid() = user_id
    OR (group_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = despesas.group_id
        AND gm.user_id = auth.uid()
        AND gm.status = 'active'
    ))
  );
