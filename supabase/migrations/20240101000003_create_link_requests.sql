-- Tabela para armazenar solicitações de vinculação de secretárias
CREATE TABLE IF NOT EXISTS secretaria_link_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anestesista_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  secretaria_id UUID NOT NULL REFERENCES secretarias(id) ON DELETE CASCADE,
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(anestesista_id, secretaria_id, status)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_link_requests_anestesista ON secretaria_link_requests(anestesista_id);
CREATE INDEX IF NOT EXISTS idx_link_requests_secretaria ON secretaria_link_requests(secretaria_id);
CREATE INDEX IF NOT EXISTS idx_link_requests_status ON secretaria_link_requests(status);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_link_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER trigger_update_link_requests_updated_at
  BEFORE UPDATE ON secretaria_link_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_link_requests_updated_at();

-- RLS Policies
ALTER TABLE secretaria_link_requests ENABLE ROW LEVEL SECURITY;

-- Política: Anestesistas podem ver suas solicitações
CREATE POLICY "Anestesistas podem ver suas solicitações"
  ON secretaria_link_requests
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = anestesista_id
  );

-- Política: Secretárias podem ver solicitações para elas
CREATE POLICY "Secretárias podem ver solicitações"
  ON secretaria_link_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM secretarias
      WHERE secretarias.id = secretaria_link_requests.secretaria_id
      AND secretarias.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Política: Sistema pode criar solicitações
CREATE POLICY "Sistema pode criar solicitações"
  ON secretaria_link_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política: Secretárias podem atualizar status
CREATE POLICY "Secretárias podem atualizar status"
  ON secretaria_link_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM secretarias
      WHERE secretarias.id = secretaria_link_requests.secretaria_id
      AND secretarias.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

COMMENT ON TABLE secretaria_link_requests IS 'Armazena solicitações de vinculação entre anestesistas e secretárias';
COMMENT ON COLUMN secretaria_link_requests.status IS 'Status da solicitação: pending, accepted, rejected';

