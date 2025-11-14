-- Adicionar colunas da Stripe na tabela subscriptions
-- Executar este script no Supabase SQL Editor

-- Adicionar coluna stripe_customer_id
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Adicionar coluna stripe_subscription_id
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Adicionar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id 
ON subscriptions(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id 
ON subscriptions(stripe_subscription_id);

-- Comentários para documentação
COMMENT ON COLUMN subscriptions.stripe_customer_id IS 'ID do customer na Stripe (ex: cus_...)';
COMMENT ON COLUMN subscriptions.stripe_subscription_id IS 'ID da subscription na Stripe (ex: sub_...)';

-- Nota: As colunas antigas do Pagar.me (pagarme_subscription_id, pagarme_payment_link_id) 
-- são mantidas para compatibilidade com assinaturas existentes

