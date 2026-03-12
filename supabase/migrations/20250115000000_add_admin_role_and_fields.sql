-- Migration para adicionar role e campos admin na tabela users
-- Esta migração adiciona suporte para contas administrativas

-- Adicionar coluna role na tabela users (se não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'role'
  ) THEN
    ALTER TABLE users 
    ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('user', 'secretaria', 'anestesista', 'admin'));
    
    -- Criar índice para role
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    
    -- Comentário
    COMMENT ON COLUMN users.role IS 'Role do usuário: user, secretaria, anestesista ou admin';
  END IF;
END $$;

-- Adicionar coluna is_system_admin (se não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'is_system_admin'
  ) THEN
    ALTER TABLE users 
    ADD COLUMN is_system_admin BOOLEAN DEFAULT FALSE;
    
    -- Criar índice para is_system_admin
    CREATE INDEX IF NOT EXISTS idx_users_is_system_admin ON users(is_system_admin);
    
    -- Comentário
    COMMENT ON COLUMN users.is_system_admin IS 'Indica se o usuário é administrador do sistema';
  END IF;
END $$;

-- Adicionar coluna created_by_admin (se não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'created_by_admin'
  ) THEN
    ALTER TABLE users 
    ADD COLUMN created_by_admin BOOLEAN DEFAULT FALSE;
    
    -- Comentário
    COMMENT ON COLUMN users.created_by_admin IS 'Indica se a conta foi criada por um administrador';
  END IF;
END $$;

-- Atualizar role padrão para usuários existentes (após criar a coluna)
-- Isso será feito após a criação da coluna role
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'role'
  ) THEN
    UPDATE users 
    SET role = 'anestesista' 
    WHERE role IS NULL OR role = 'user';
  END IF;
END $$;

-- Criar tabela para logs de tentativas de login admin (proteção contra brute force)
CREATE TABLE IF NOT EXISTS admin_login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN DEFAULT FALSE,
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índice para email e created_at (para rate limiting)
CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_email_created 
ON admin_login_attempts(email, created_at DESC);

-- Criar índice para IP (para rate limiting por IP)
CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_ip_created 
ON admin_login_attempts(ip_address, created_at DESC);

-- Função para limpar tentativas antigas (mais de 24 horas)
CREATE OR REPLACE FUNCTION cleanup_old_admin_login_attempts()
RETURNS void AS $$
BEGIN
  DELETE FROM admin_login_attempts 
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Comentários
COMMENT ON TABLE admin_login_attempts IS 'Logs de tentativas de login no painel administrativo para proteção contra brute force';
COMMENT ON COLUMN admin_login_attempts.email IS 'Email usado na tentativa de login';
COMMENT ON COLUMN admin_login_attempts.ip_address IS 'Endereço IP de origem da tentativa';
COMMENT ON COLUMN admin_login_attempts.success IS 'Indica se o login foi bem-sucedido';
COMMENT ON COLUMN admin_login_attempts.failure_reason IS 'Motivo da falha (se houver)';

-- RLS: Apenas admins podem ver os logs
ALTER TABLE admin_login_attempts ENABLE ROW LEVEL SECURITY;

-- Política RLS: Apenas usuários com role 'admin' podem ver os logs
CREATE POLICY "Admins can view login attempts" ON admin_login_attempts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin' 
      AND users.is_system_admin = TRUE
    )
  );

