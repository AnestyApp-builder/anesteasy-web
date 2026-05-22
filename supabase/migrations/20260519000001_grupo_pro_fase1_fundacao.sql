-- Fase 1: Fundação sem breaking changes

-- 1. Tabela groups
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'sem_cotas'
  CHECK (type IN ('com_cotas', 'sem_cotas'));
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS cnpj VARCHAR(18);

-- 2. Tabela group_members
ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS quota_percent NUMERIC(5,2);
ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS quota_since DATE;
ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ DEFAULT now();

-- 3. Nova tabela group_quota_history
CREATE TABLE IF NOT EXISTS public.group_quota_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  quota_percent NUMERIC(5,2) NOT NULL,
  valid_from DATE NOT NULL,
  valid_until DATE,
  changed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.group_quota_history ENABLE ROW LEVEL SECURITY;

-- 4. Tabela users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS cnpj VARCHAR(18);
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_subscription_plan_check;
ALTER TABLE public.users ADD CONSTRAINT users_subscription_plan_check
  CHECK (subscription_plan::text = ANY (ARRAY['standard'::text, 'premium'::text, 'enterprise'::text, 'grupo_pro'::text]));

-- 5. Tabela procedures
ALTER TABLE public.procedures ADD COLUMN IF NOT EXISTS anesthesiologist_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.procedures ADD COLUMN IF NOT EXISTS billing_entity_type TEXT
  CHECK (billing_entity_type IN ('cnpj_anestesista', 'cnpj_grupo'));
ALTER TABLE public.procedures ADD COLUMN IF NOT EXISTS transferred_from_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.procedures ADD COLUMN IF NOT EXISTS transferred_at TIMESTAMPTZ;
