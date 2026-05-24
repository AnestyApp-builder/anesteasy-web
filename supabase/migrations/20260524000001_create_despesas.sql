-- Tabela de Despesas vinculadas a procedimentos
CREATE TABLE IF NOT EXISTS despesas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  procedure_id uuid REFERENCES procedures(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  categoria text NOT NULL DEFAULT 'outros',
  valor numeric(10,2) NOT NULL DEFAULT 0,
  data_despesa date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS despesas_procedure_id_idx ON despesas(procedure_id);
CREATE INDEX IF NOT EXISTS despesas_group_id_idx ON despesas(group_id);
CREATE INDEX IF NOT EXISTS despesas_user_id_idx ON despesas(user_id);
CREATE INDEX IF NOT EXISTS despesas_data_despesa_idx ON despesas(data_despesa);

-- RLS
ALTER TABLE despesas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "despesas_select" ON despesas
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "despesas_insert" ON despesas
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "despesas_update" ON despesas
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "despesas_delete" ON despesas
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_despesas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER despesas_updated_at
  BEFORE UPDATE ON despesas
  FOR EACH ROW EXECUTE FUNCTION update_despesas_updated_at();
