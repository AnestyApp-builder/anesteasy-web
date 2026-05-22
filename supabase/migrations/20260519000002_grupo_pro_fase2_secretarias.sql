-- Fase 2: Extensão do modelo de Secretária para Grupos

-- 1. Alterar tabela secretarias
ALTER TABLE public.secretarias ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'individual'
  CHECK (type IN ('individual', 'grupo'));
ALTER TABLE public.secretarias ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE;
ALTER TABLE public.secretarias ADD COLUMN IF NOT EXISTS password_hash VARCHAR;
ALTER TABLE public.secretarias ADD COLUMN IF NOT EXISTS invite_token VARCHAR;
ALTER TABLE public.secretarias ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ;
ALTER TABLE public.secretarias ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- Constraint de consistência
ALTER TABLE public.secretarias DROP CONSTRAINT IF EXISTS chk_secretary_type_consistency;
ALTER TABLE public.secretarias ADD CONSTRAINT chk_secretary_type_consistency
  CHECK (
    (type = 'grupo' AND group_id IS NOT NULL) OR
    (type = 'individual' AND group_id IS NULL)
  );

-- 2. Nova tabela group_secretary_permissions
CREATE TABLE IF NOT EXISTS public.group_secretary_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  secretary_id UUID NOT NULL REFERENCES public.secretarias(id) ON DELETE CASCADE,
  module TEXT NOT NULL CHECK (module IN (
    'agenda', 'pacientes', 'escalas', 'financeiro', 'fechamento', 'relatorios'
  )),
  granted_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(secretary_id, module)
);
ALTER TABLE public.group_secretary_permissions ENABLE ROW LEVEL SECURITY;

-- 3. Suporte a grupo em secretaria_invites (anestesista_id passa a ser opcional)
ALTER TABLE public.secretaria_invites ALTER COLUMN anestesista_id DROP NOT NULL;
ALTER TABLE public.secretaria_invites ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE;

-- Constraint de destino do convite
ALTER TABLE public.secretaria_invites DROP CONSTRAINT IF EXISTS chk_invite_destination;
ALTER TABLE public.secretaria_invites ADD CONSTRAINT chk_invite_destination
  CHECK (
    (anestesista_id IS NOT NULL AND group_id IS NULL) OR
    (group_id IS NOT NULL AND anestesista_id IS NULL)
  );
