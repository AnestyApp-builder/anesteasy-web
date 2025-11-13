-- Tabela para armazenar assinaturas dos anestesistas
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_type VARCHAR(50) NOT NULL CHECK (plan_type IN ('monthly', 'quarterly', 'annual')),
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'cancelled', 'expired', 'suspended')),
  pagarme_subscription_id VARCHAR(255) UNIQUE,
  pagarme_customer_id VARCHAR(255),
  current_period_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índice único parcial para garantir apenas uma assinatura ativa por usuário
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_user_active_unique 
ON subscriptions(user_id) 
WHERE status = 'active';

-- Tabela para armazenar transações de pagamento
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pagarme_transaction_id VARCHAR(255) UNIQUE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'paid', 'refused', 'refunded', 'cancelled')),
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('credit_card', 'boleto', 'pix')),
  card_last_digits VARCHAR(4),
  card_brand VARCHAR(50),
  installments INTEGER DEFAULT 1,
  barcode VARCHAR(255),
  pix_qr_code TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_pagarme_id ON subscriptions(pagarme_subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_subscription_id ON payment_transactions(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_pagarme_id ON payment_transactions(pagarme_transaction_id);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_payment_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER trigger_update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriptions_updated_at();

CREATE TRIGGER trigger_update_payment_transactions_updated_at
  BEFORE UPDATE ON payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_transactions_updated_at();

-- RLS Policies
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver suas próprias assinaturas
CREATE POLICY "Usuários podem ver suas assinaturas"
  ON subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Política: Sistema pode criar/atualizar assinaturas (via service role)
CREATE POLICY "Sistema pode gerenciar assinaturas"
  ON subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Política: Usuários podem ver suas próprias transações
CREATE POLICY "Usuários podem ver suas transações"
  ON payment_transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Política: Sistema pode criar/atualizar transações (via service role)
CREATE POLICY "Sistema pode gerenciar transações"
  ON payment_transactions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Comentários
COMMENT ON TABLE subscriptions IS 'Armazena assinaturas dos anestesistas';
COMMENT ON TABLE payment_transactions IS 'Armazena transações de pagamento das assinaturas';
COMMENT ON COLUMN subscriptions.plan_type IS 'Tipo de plano: monthly (R$ 79), quarterly (R$ 225), annual (R$ 850)';
COMMENT ON COLUMN subscriptions.status IS 'Status da assinatura: pending, active, cancelled, expired, suspended';

