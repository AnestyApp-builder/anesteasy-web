-- Funções de segurança para blindagem total de dados

-- Função para verificar se o usuário pode acessar um recurso
CREATE OR REPLACE FUNCTION check_user_access(resource_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Verificar se o usuário está autenticado
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar se o usuário está tentando acessar seus próprios dados
  IF auth.uid()::text = resource_user_id::text THEN
    RETURN TRUE;
  END IF;
  
  -- Negar acesso se não for o próprio usuário
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para validar inserção de dados
CREATE OR REPLACE FUNCTION validate_user_data_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar se o usuário está autenticado
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Verificar se o user_id corresponde ao usuário autenticado
  IF NEW.user_id::text != auth.uid()::text THEN
    RAISE EXCEPTION 'Tentativa de inserir dados de outro usuário';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para validar atualização de dados
CREATE OR REPLACE FUNCTION validate_user_data_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar se o usuário está autenticado
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Verificar se o user_id corresponde ao usuário autenticado
  IF OLD.user_id::text != auth.uid()::text THEN
    RAISE EXCEPTION 'Tentativa de atualizar dados de outro usuário';
  END IF;
  
  -- Verificar se o user_id não foi alterado
  IF NEW.user_id::text != OLD.user_id::text THEN
    RAISE EXCEPTION 'Não é permitido alterar o user_id';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para validar exclusão de dados
CREATE OR REPLACE FUNCTION validate_user_data_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar se o usuário está autenticado
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Verificar se o user_id corresponde ao usuário autenticado
  IF OLD.user_id::text != auth.uid()::text THEN
    RAISE EXCEPTION 'Tentativa de excluir dados de outro usuário';
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar triggers para validação automática
CREATE TRIGGER validate_procedures_insert
  BEFORE INSERT ON procedures
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_data_insert();

CREATE TRIGGER validate_procedures_update
  BEFORE UPDATE ON procedures
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_data_update();

CREATE TRIGGER validate_procedures_delete
  BEFORE DELETE ON procedures
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_data_delete();

CREATE TRIGGER validate_payments_insert
  BEFORE INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_data_insert();

CREATE TRIGGER validate_payments_update
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_data_update();

CREATE TRIGGER validate_payments_delete
  BEFORE DELETE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_data_delete();

CREATE TRIGGER validate_reports_insert
  BEFORE INSERT ON reports
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_data_insert();

CREATE TRIGGER validate_reports_update
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_data_update();

CREATE TRIGGER validate_reports_delete
  BEFORE DELETE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_data_delete();

CREATE TRIGGER validate_user_settings_insert
  BEFORE INSERT ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_data_insert();

CREATE TRIGGER validate_user_settings_update
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_data_update();

-- Função para auditoria de acesso
CREATE OR REPLACE FUNCTION log_data_access(
  table_name TEXT,
  operation TEXT,
  record_id UUID,
  user_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- Log de auditoria (pode ser expandido para uma tabela de logs)
  RAISE NOTICE 'Acesso: % em % para registro % pelo usuário %', 
    operation, table_name, record_id, user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar integridade dos dados
CREATE OR REPLACE FUNCTION verify_data_integrity()
RETURNS BOOLEAN AS $$
DECLARE
  invalid_count INTEGER;
BEGIN
  -- Verificar se há procedimentos órfãos (sem usuário válido)
  SELECT COUNT(*) INTO invalid_count
  FROM procedures p
  LEFT JOIN users u ON p.user_id = u.id
  WHERE u.id IS NULL;
  
  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Encontrados % procedimentos órfãos', invalid_count;
  END IF;
  
  -- Verificar se há pagamentos órfãos
  SELECT COUNT(*) INTO invalid_count
  FROM payments p
  LEFT JOIN users u ON p.user_id = u.id
  WHERE u.id IS NULL;
  
  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Encontrados % pagamentos órfãos', invalid_count;
  END IF;
  
  -- Verificar se há relatórios órfãos
  SELECT COUNT(*) INTO invalid_count
  FROM reports r
  LEFT JOIN users u ON r.user_id = u.id
  WHERE u.id IS NULL;
  
  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Encontrados % relatórios órfãos', invalid_count;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
