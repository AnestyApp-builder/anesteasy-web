-- Adicionar campo trial_ends_at na tabela users para período de teste de 7 dias
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;

-- Criar índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_users_trial_ends_at ON users(trial_ends_at);

-- Atualizar usuários existentes sem trial_ends_at para ter 7 dias a partir de created_at
UPDATE users 
SET trial_ends_at = created_at + INTERVAL '7 days'
WHERE trial_ends_at IS NULL;

-- Comentário explicativo
COMMENT ON COLUMN users.trial_ends_at IS 'Data de término do período de teste gratuito de 7 dias. Após esta data, o usuário precisa ter uma assinatura ativa para continuar usando a plataforma.';

