-- Adiciona a coluna anesthesiologist_id na tabela despesas
ALTER TABLE despesas ADD COLUMN IF NOT EXISTS anesthesiologist_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Cria um índice para a nova coluna para melhor performance em buscas
CREATE INDEX IF NOT EXISTS despesas_anesthesiologist_id_idx ON despesas(anesthesiologist_id);
