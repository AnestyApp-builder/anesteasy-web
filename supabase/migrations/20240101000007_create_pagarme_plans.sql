-- Tabela para armazenar planos da Pagar.me
CREATE TABLE IF NOT EXISTS pagarme_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pagarme_plan_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  interval VARCHAR(50) NOT NULL CHECK (interval IN ('month', 'year')),
  interval_count INTEGER NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  plan_type VARCHAR(50) NOT NULL CHECK (plan_type IN ('monthly', 'quarterly', 'annual')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_pagarme_plans_plan_type ON pagarme_plans(plan_type);
CREATE INDEX IF NOT EXISTS idx_pagarme_plans_pagarme_id ON pagarme_plans(pagarme_plan_id);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_pagarme_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER trigger_update_pagarme_plans_updated_at
  BEFORE UPDATE ON pagarme_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_pagarme_plans_updated_at();

-- RLS Policies
ALTER TABLE pagarme_plans ENABLE ROW LEVEL SECURITY;

-- Política: Qualquer usuário autenticado pode ver os planos
CREATE POLICY "Usuários podem ver planos"
  ON pagarme_plans
  FOR SELECT
  TO authenticated
  USING (true);

-- Política: Sistema pode gerenciar planos (via service role)
CREATE POLICY "Sistema pode gerenciar planos"
  ON pagarme_plans
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Comentários
COMMENT ON TABLE pagarme_plans IS 'Armazena planos de assinatura criados na Pagar.me';
COMMENT ON COLUMN pagarme_plans.plan_type IS 'Tipo de plano: monthly, quarterly, annual';

