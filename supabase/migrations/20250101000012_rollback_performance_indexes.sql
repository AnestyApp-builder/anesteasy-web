-- ============================================
-- ROLLBACK: Remover índices de performance
-- ATENÇÃO: Use apenas se necessário reverter a migração
-- Data: 2025-01-XX
-- Versão: 20250101000012_rollback
-- ============================================

-- Remover índices da tabela procedures
DROP INDEX IF EXISTS idx_procedures_user_date;
DROP INDEX IF EXISTS idx_procedures_procedure_date;
DROP INDEX IF EXISTS idx_procedures_secretaria_date;
DROP INDEX IF EXISTS idx_procedures_payment_status;
DROP INDEX IF EXISTS idx_procedures_status_date;
DROP INDEX IF EXISTS idx_procedures_created_at;

-- Remover índices de outras tabelas
DROP INDEX IF EXISTS idx_anestesista_secretaria_composite;
DROP INDEX IF EXISTS idx_procedure_logs_procedure_created;
DROP INDEX IF EXISTS idx_procedure_logs_changed_by;
DROP INDEX IF EXISTS idx_notifications_user_read_created;
DROP INDEX IF EXISTS idx_payments_user_status_due;
DROP INDEX IF EXISTS idx_payments_procedure_id;
DROP INDEX IF EXISTS idx_procedure_attachments_procedure;
DROP INDEX IF EXISTS idx_feedback_links_procedure;
DROP INDEX IF EXISTS idx_feedback_links_expires;
DROP INDEX IF EXISTS idx_reports_user_period;

-- Verificação
DO $$
BEGIN
  RAISE NOTICE 'Rollback concluído. Todos os índices foram removidos.';
END $$;

