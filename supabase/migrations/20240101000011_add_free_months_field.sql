-- Adicionar campo free_months na tabela users para conceder meses grátis adicionais
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS free_months INTEGER DEFAULT 0;

-- Criar índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_users_free_months ON users(free_months);

-- Comentário explicativo
COMMENT ON COLUMN users.free_months IS 'Número de meses grátis adicionais concedidos ao usuário. Cada mês = 30 dias. Este valor é somado ao período de teste inicial de 7 dias.';

