-- Tabela para armazenar convites de cadastro de secretárias
CREATE TABLE IF NOT EXISTS secretaria_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anestesista_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índice para busca rápida por token
CREATE INDEX IF NOT EXISTS idx_secretaria_invites_token ON secretaria_invites(token);
CREATE INDEX IF NOT EXISTS idx_secretaria_invites_email ON secretaria_invites(email);
CREATE INDEX IF NOT EXISTS idx_secretaria_invites_anestesista ON secretaria_invites(anestesista_id);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_secretaria_invites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER trigger_update_secretaria_invites_updated_at
  BEFORE UPDATE ON secretaria_invites
  FOR EACH ROW
  EXECUTE FUNCTION update_secretaria_invites_updated_at();

-- RLS Policies
ALTER TABLE secretaria_invites ENABLE ROW LEVEL SECURITY;

-- Política: Anestesistas podem criar convites
CREATE POLICY "Anestesistas podem criar convites"
  ON secretaria_invites
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = anestesista_id
  );

-- Política: Anestesistas podem ver seus próprios convites
CREATE POLICY "Anestesistas podem ver seus convites"
  ON secretaria_invites
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = anestesista_id
  );

-- Política: Qualquer um pode ver convites por token (para validação no cadastro)
CREATE POLICY "Qualquer um pode ver convites por token"
  ON secretaria_invites
  FOR SELECT
  TO anon
  USING (
    token IS NOT NULL
    AND expires_at > CURRENT_TIMESTAMP
    AND used_at IS NULL
  );

-- Política: Sistema pode atualizar convites (marcar como usado)
CREATE POLICY "Sistema pode atualizar convites"
  ON secretaria_invites
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE secretaria_invites IS 'Armazena convites de cadastro de secretárias enviados por anestesistas';
COMMENT ON COLUMN secretaria_invites.token IS 'Token único para o link de cadastro';
COMMENT ON COLUMN secretaria_invites.expires_at IS 'Data de expiração do convite (padrão: 7 dias)';
COMMENT ON COLUMN secretaria_invites.used_at IS 'Data em que o convite foi usado (NULL = não usado)';

