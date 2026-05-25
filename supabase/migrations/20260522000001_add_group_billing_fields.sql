-- Migration para adicionar campos de faturamento flexível e assentos na tabela groups

-- Adicionar tipo de faturamento
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS billing_type TEXT NOT NULL DEFAULT 'individual'
  CHECK (billing_type IN ('centralized', 'individual'));

-- Adicionar contagem de assentos pagos (apenas relevante para billing_type = 'centralized')
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS standard_seats_paid INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS coord_seats_paid INTEGER NOT NULL DEFAULT 0;

-- Comentários para documentação
COMMENT ON COLUMN public.groups.billing_type IS 'Tipo de faturamento do grupo: centralized (Dono paga tudo) ou individual (Cada um paga o seu)';
COMMENT ON COLUMN public.groups.standard_seats_paid IS 'Quantidade de licenças Standard (Anestesistas extras) pagas centralizadamente pelo dono do grupo';
COMMENT ON COLUMN public.groups.coord_seats_paid IS 'Quantidade de licenças Coord (Secretárias extras) pagas centralizadamente pelo dono do grupo';
