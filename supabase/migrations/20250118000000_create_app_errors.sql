-- Migration para criar tabela app_errors
-- Esta tabela armazena logs de erros dos usuários do aplicativo mobile e web

-- Criar tabela app_errors
CREATE TABLE IF NOT EXISTS app_errors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  screen TEXT NOT NULL,
  action TEXT NOT NULL,
  error_message TEXT NOT NULL,
  device TEXT DEFAULT 'mobile',
  app_version TEXT DEFAULT '1.0.0',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_app_errors_user_id ON app_errors(user_id);
CREATE INDEX IF NOT EXISTS idx_app_errors_created_at ON app_errors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_errors_screen ON app_errors(screen);
CREATE INDEX IF NOT EXISTS idx_app_errors_device ON app_errors(device);
CREATE INDEX IF NOT EXISTS idx_app_errors_app_version ON app_errors(app_version);

-- Comentários nas colunas
COMMENT ON TABLE app_errors IS 'Tabela para armazenar logs de erros do aplicativo';
COMMENT ON COLUMN app_errors.id IS 'ID único do erro';
COMMENT ON COLUMN app_errors.user_id IS 'ID do usuário que encontrou o erro (pode ser NULL)';
COMMENT ON COLUMN app_errors.screen IS 'Tela onde o erro ocorreu';
COMMENT ON COLUMN app_errors.action IS 'Ação que estava sendo executada quando o erro ocorreu';
COMMENT ON COLUMN app_errors.error_message IS 'Mensagem de erro completa';
COMMENT ON COLUMN app_errors.device IS 'Dispositivo onde o erro ocorreu (mobile, web, etc)';
COMMENT ON COLUMN app_errors.app_version IS 'Versão do aplicativo quando o erro ocorreu';
COMMENT ON COLUMN app_errors.created_at IS 'Data e hora em que o erro foi registrado';

-- Habilitar RLS (Row Level Security)
ALTER TABLE app_errors ENABLE ROW LEVEL SECURITY;

-- Política RLS: Apenas administradores podem ler todos os erros
-- Usuários podem inserir seus próprios erros (mas não ler)
CREATE POLICY "Admins can view all errors"
  ON app_errors
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_system_admin = TRUE
    )
  );

-- Política RLS: Qualquer usuário autenticado pode inserir erros
CREATE POLICY "Authenticated users can insert errors"
  ON app_errors
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Política RLS: Usuários podem ver apenas seus próprios erros (opcional, para debug)
CREATE POLICY "Users can view their own errors"
  ON app_errors
  FOR SELECT
  USING (user_id = auth.uid());

