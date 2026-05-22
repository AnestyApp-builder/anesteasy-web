-- Fase 3: Infraestrutura Financeira do Grupo

-- 1. Nova tabela group_monthly_closings
CREATE TABLE IF NOT EXISTS public.group_monthly_closings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  reference_month DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'aberto'
    CHECK (status IN ('aberto', 'em_revisao', 'fechado', 'reaberto')),
  pre_closed_by UUID REFERENCES public.secretarias(id) ON DELETE SET NULL,
  pre_closed_at TIMESTAMPTZ,
  validated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  validated_at TIMESTAMPTZ,
  reopened_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reopened_at TIMESTAMPTZ,
  reopen_reason TEXT,
  total_revenue NUMERIC(12,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (group_id, reference_month)
);
ALTER TABLE public.group_monthly_closings ENABLE ROW LEVEL SECURITY;

-- 2. Nova tabela group_distributions
CREATE TABLE IF NOT EXISTS public.group_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closing_id UUID NOT NULL REFERENCES public.group_monthly_closings(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  quota_percent NUMERIC(5,2) NOT NULL,
  gross_amount NUMERIC(12,2) NOT NULL,
  net_amount NUMERIC(12,2) NOT NULL,
  billing_entity_type TEXT CHECK (billing_entity_type IN ('cnpj_anestesista', 'cnpj_grupo')),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.group_distributions ENABLE ROW LEVEL SECURITY;

-- 3. Atualizar tabela payments
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS billing_entity_type TEXT
  CHECK (billing_entity_type IN ('cnpj_anestesista', 'cnpj_grupo'));
