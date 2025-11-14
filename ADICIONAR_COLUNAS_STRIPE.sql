-- ============================================
-- SCRIPT PARA ADICIONAR COLUNAS DO STRIPE
-- ============================================
-- Execute este script no Supabase SQL Editor
-- Dashboard > SQL Editor > New Query > Cole este script > Run
-- ============================================

-- Adicionar colunas do Stripe na tabela subscriptions
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);

ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);

-- Adicionar coluna stripe_transaction_id na tabela payment_transactions
ALTER TABLE payment_transactions
ADD COLUMN IF NOT EXISTS stripe_transaction_id VARCHAR(255);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id 
ON subscriptions(stripe_customer_id) 
WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id 
ON subscriptions(stripe_subscription_id) 
WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_stripe_id 
ON payment_transactions(stripe_transaction_id) 
WHERE stripe_transaction_id IS NOT NULL;

-- Comentários para documentação
COMMENT ON COLUMN subscriptions.stripe_customer_id IS 'ID do customer na Stripe (ex: cus_...)';
COMMENT ON COLUMN subscriptions.stripe_subscription_id IS 'ID da subscription na Stripe (ex: sub_...)';
COMMENT ON COLUMN payment_transactions.stripe_transaction_id IS 'ID da transação na Stripe (ex: pi_... ou ch_...)';

-- Verificar se as colunas foram criadas
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'subscriptions' 
  AND column_name LIKE 'stripe%'
ORDER BY column_name;

SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'payment_transactions' 
  AND column_name LIKE 'stripe%'
ORDER BY column_name;

