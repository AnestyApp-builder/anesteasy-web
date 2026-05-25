-- Migration para adicionar a função (role) das secretárias em Grupos
-- Valores possíveis: 'coord' (Coordenadora com plano Standard) e 'ajudante' (Assistente sem plano)

ALTER TABLE public.secretarias ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'ajudante'
  CHECK (role IN ('coord', 'ajudante'));

-- Comentário na coluna para documentação
COMMENT ON COLUMN public.secretarias.role IS 'Função da secretária: coord (Coordenadora) ou ajudante (Assistente)';
