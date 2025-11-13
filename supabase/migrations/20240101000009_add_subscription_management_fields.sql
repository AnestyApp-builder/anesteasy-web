-- Adicionar campos para gerenciamento avançado de assinaturas
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS pending_plan_type VARCHAR(50) CHECK (pending_plan_type IN ('monthly', 'quarterly', 'annual')),
ADD COLUMN IF NOT EXISTS pending_plan_change_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS refund_eligible BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS refund_requested BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS refund_processed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS days_used INTEGER DEFAULT 0;

-- Comentários
COMMENT ON COLUMN subscriptions.pending_plan_type IS 'Plano que será ativado no próximo período';
COMMENT ON COLUMN subscriptions.pending_plan_change_at IS 'Data em que a mudança de plano será aplicada';
COMMENT ON COLUMN subscriptions.refund_eligible IS 'Se o usuário é elegível para reembolso (menos de 8 dias de uso)';
COMMENT ON COLUMN subscriptions.refund_requested IS 'Se o usuário solicitou reembolso';
COMMENT ON COLUMN subscriptions.refund_processed_at IS 'Data em que o reembolso foi processado';
COMMENT ON COLUMN subscriptions.days_used IS 'Número de dias que o usuário utilizou a plataforma desde a criação da assinatura';

-- Índice para buscar mudanças de plano pendentes
CREATE INDEX IF NOT EXISTS idx_subscriptions_pending_plan ON subscriptions(pending_plan_type) 
WHERE pending_plan_type IS NOT NULL;

