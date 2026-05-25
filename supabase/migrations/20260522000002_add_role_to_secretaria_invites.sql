-- Migration para adicionar role em secretaria_invites

ALTER TABLE public.secretaria_invites ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'ajudante'
  CHECK (role IN ('coord', 'ajudante'));

COMMENT ON COLUMN public.secretaria_invites.role IS 'Função da secretária para o convite: coord ou ajudante';
