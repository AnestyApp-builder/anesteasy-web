-- Trigger para desvincular automaticamente anestesistas quando uma secretaria for deletada
-- Esta trigger garante que quando uma secretaria é deletada, todas as vinculações
-- na tabela anestesista_secretaria também são removidas automaticamente

-- Criar função que será executada antes de deletar uma secretaria
CREATE OR REPLACE FUNCTION delete_secretaria_cascade()
RETURNS TRIGGER AS $$
BEGIN
  -- Deletar todas as vinculações de anestesistas com esta secretaria
  DELETE FROM anestesista_secretaria
  WHERE secretaria_id = OLD.id;
  
  -- Opcional: Limpar secretaria_id dos procedimentos relacionados
  -- UPDATE procedures 
  -- SET secretaria_id = NULL 
  -- WHERE secretaria_id = OLD.id;
  
  -- Retornar o registro antigo para permitir a deleção
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger que executa antes de deletar uma secretaria
DROP TRIGGER IF EXISTS trigger_delete_secretaria_cascade ON secretarias;

CREATE TRIGGER trigger_delete_secretaria_cascade
  BEFORE DELETE ON secretarias
  FOR EACH ROW
  EXECUTE FUNCTION delete_secretaria_cascade();

-- Comentário explicativo
COMMENT ON FUNCTION delete_secretaria_cascade() IS 
'Função que desvincula automaticamente todos os anestesistas quando uma secretaria é deletada';

COMMENT ON TRIGGER trigger_delete_secretaria_cascade ON secretarias IS 
'Trigger que executa antes de deletar uma secretaria para remover todas as vinculações';

