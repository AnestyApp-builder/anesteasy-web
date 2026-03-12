-- ============================================
-- MIGRAÇÃO: Otimização de Performance - Índices
-- Data: 2025-01-XX
-- Versão: 20250101000012
-- Descrição: Adiciona índices para melhorar performance das queries mais comuns
-- IMPORTANTE: Esta migração é SEGURA - apenas adiciona índices, não modifica dados
-- ============================================

-- Verificar se a tabela procedures existe antes de criar índices
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'procedures') THEN
    RAISE EXCEPTION 'Tabela procedures não encontrada. Abortando migração.';
  END IF;
END $$;

-- ============================================
-- TABELA: procedures
-- ============================================

-- Índice composto para queries por user_id ordenadas por data
-- Usado em: getProcedures(), queries de dashboard
CREATE INDEX IF NOT EXISTS idx_procedures_user_date 
ON procedures(user_id, procedure_date DESC);

-- Índice para filtros de data (range queries)
-- Usado em: getProceduresByDateRange(), relatórios
CREATE INDEX IF NOT EXISTS idx_procedures_procedure_date 
ON procedures(procedure_date);

-- Índice composto para secretárias filtrar procedimentos por data
-- Usado em: queries de secretárias
CREATE INDEX IF NOT EXISTS idx_procedures_secretaria_date 
ON procedures(secretaria_id, procedure_date DESC) 
WHERE secretaria_id IS NOT NULL;

-- Índice para filtros de status de pagamento
-- Usado em: getProceduresByStatus(), filtros de pagamento
CREATE INDEX IF NOT EXISTS idx_procedures_payment_status 
ON procedures(payment_status) 
WHERE payment_status IS NOT NULL;

-- Índice composto para queries de status + data
-- Usado em: filtros combinados de status e data
CREATE INDEX IF NOT EXISTS idx_procedures_status_date 
ON procedures(payment_status, procedure_date DESC) 
WHERE payment_status IS NOT NULL;

-- Índice para created_at (usado em ORDER BY)
-- Usado em: getProcedures() com ordenação por criação
CREATE INDEX IF NOT EXISTS idx_procedures_created_at 
ON procedures(created_at DESC);

-- ============================================
-- TABELA: anestesista_secretaria
-- ============================================

-- Verificar se a tabela existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'anestesista_secretaria') THEN
    -- Índice composto para queries de vinculação
    CREATE INDEX IF NOT EXISTS idx_anestesista_secretaria_composite 
    ON anestesista_secretaria(anestesista_id, secretaria_id);
  END IF;
END $$;

-- ============================================
-- TABELA: procedure_logs
-- ============================================

-- Verificar se a tabela existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'procedure_logs') THEN
    -- Índice composto para histórico de mudanças
    CREATE INDEX IF NOT EXISTS idx_procedure_logs_procedure_created 
    ON procedure_logs(procedure_id, created_at DESC);

    -- Índice para buscar por usuário que fez mudança
    CREATE INDEX IF NOT EXISTS idx_procedure_logs_changed_by 
    ON procedure_logs(changed_by_id, created_at DESC);
  END IF;
END $$;

-- ============================================
-- TABELA: notifications
-- ============================================

-- Verificar se a tabela existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    -- Índice composto para notificações não lidas por usuário
    CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created 
    ON notifications(user_id, is_read, created_at DESC);
  END IF;
END $$;

-- ============================================
-- TABELA: payments
-- ============================================

-- Verificar se a tabela existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
    -- Índice composto para pagamentos pendentes por data
    CREATE INDEX IF NOT EXISTS idx_payments_user_status_due 
    ON payments(user_id, payment_status, due_date) 
    WHERE payment_status = 'pending';

    -- Índice para filtros por procedure_id
    CREATE INDEX IF NOT EXISTS idx_payments_procedure_id 
    ON payments(procedure_id) 
    WHERE procedure_id IS NOT NULL;
  END IF;
END $$;

-- ============================================
-- TABELA: procedure_attachments
-- ============================================

-- Verificar se a tabela existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'procedure_attachments') THEN
    -- Índice para anexos por procedimento
    CREATE INDEX IF NOT EXISTS idx_procedure_attachments_procedure 
    ON procedure_attachments(procedure_id, uploaded_at DESC);
  END IF;
END $$;

-- ============================================
-- TABELA: feedback_links
-- ============================================

-- Verificar se a tabela existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feedback_links') THEN
    -- Índice para links de feedback por procedimento
    CREATE INDEX IF NOT EXISTS idx_feedback_links_procedure 
    ON feedback_links(procedure_id, expires_at);

    -- Índice para buscar links expirados
    CREATE INDEX IF NOT EXISTS idx_feedback_links_expires 
    ON feedback_links(expires_at) 
    WHERE responded_at IS NULL;
  END IF;
END $$;

-- ============================================
-- TABELA: reports
-- ============================================

-- Verificar se a tabela existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reports') THEN
    -- Índice para relatórios por usuário e período
    CREATE INDEX IF NOT EXISTS idx_reports_user_period 
    ON reports(user_id, start_date, end_date);
  END IF;
END $$;

-- ============================================
-- ATUALIZAR ESTATÍSTICAS (NÃO BLOQUEIA)
-- ============================================

-- Atualizar estatísticas do PostgreSQL para otimizar queries
-- Isso é seguro e não bloqueia a tabela
ANALYZE procedures;

-- Atualizar outras tabelas se existirem (não crítico se falhar)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'anestesista_secretaria') THEN
    ANALYZE anestesista_secretaria;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'procedure_logs') THEN
    ANALYZE procedure_logs;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    ANALYZE notifications;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
    ANALYZE payments;
  END IF;
END $$;

-- ============================================
-- COMENTÁRIOS EXPLICATIVOS
-- ============================================

COMMENT ON INDEX idx_procedures_user_date IS 
'Índice composto para queries de procedimentos por usuário ordenados por data. Melhora performance de getProcedures()';

COMMENT ON INDEX idx_procedures_secretaria_date IS 
'Índice composto para secretárias buscarem procedimentos por data. Melhora performance de queries de secretárias';

COMMENT ON INDEX idx_procedures_status_date IS 
'Índice composto para filtros de status de pagamento ordenados por data. Melhora performance de filtros combinados';

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================

-- Verificar se os índices principais foram criados
DO $$
DECLARE
  index_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE indexname IN (
    'idx_procedures_user_date',
    'idx_procedures_procedure_date',
    'idx_procedures_payment_status'
  );
  
  IF index_count < 3 THEN
    RAISE WARNING 'Alguns índices principais podem não ter sido criados. Verifique manualmente.';
  ELSE
    RAISE NOTICE 'Migração concluída com sucesso! % índices principais criados.', index_count;
  END IF;
END $$;

