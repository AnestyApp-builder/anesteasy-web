-- Adicionar status 'failed' à tabela subscriptions
ALTER TABLE subscriptions 
DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE subscriptions 
ADD CONSTRAINT subscriptions_status_check 
CHECK (status IN ('pending', 'active', 'cancelled', 'expired', 'suspended', 'failed'));

COMMENT ON COLUMN subscriptions.status IS 'Status da assinatura: pending, active, cancelled, expired, suspended, failed';

