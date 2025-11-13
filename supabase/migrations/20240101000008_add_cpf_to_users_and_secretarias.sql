-- Migration para adicionar coluna CPF nas tabelas users e secretarias

-- Adicionar coluna CPF na tabela users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS cpf VARCHAR(14);

-- Adicionar coluna CPF na tabela secretarias
ALTER TABLE secretarias 
ADD COLUMN IF NOT EXISTS cpf VARCHAR(14);

-- Criar índice único para CPF na tabela users (permitindo NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_cpf_unique 
ON users(cpf) 
WHERE cpf IS NOT NULL;

-- Criar índice único para CPF na tabela secretarias (permitindo NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_secretarias_cpf_unique 
ON secretarias(cpf) 
WHERE cpf IS NOT NULL;

-- Comentários
COMMENT ON COLUMN users.cpf IS 'CPF do anestesista (formato: XXX.XXX.XXX-XX)';
COMMENT ON COLUMN secretarias.cpf IS 'CPF da secretária (formato: XXX.XXX.XXX-XX)';

