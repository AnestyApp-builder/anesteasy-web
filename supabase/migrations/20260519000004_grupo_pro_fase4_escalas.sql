-- Fase 4: Escalas de Grupo

-- 1. Atualizar tabela shifts
ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE;
ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS backup_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS assigned_by UUID; -- pode ser user ou secretaria
ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS assigned_by_type TEXT
  CHECK (assigned_by_type IN ('coordinator', 'secretary'));
