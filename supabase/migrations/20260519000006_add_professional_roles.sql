-- migration: add_professional_roles
ALTER TABLE public.procedures ADD COLUMN IF NOT EXISTS anesthesiologist_role TEXT CHECK (anesthesiologist_role IN ('principal', 'auxiliar'));
ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS professional_role TEXT CHECK (professional_role IN ('principal', 'auxiliar'));

-- Comentários nas colunas para documentação
COMMENT ON COLUMN public.procedures.anesthesiologist_role IS 'Função do anestesista no procedimento (ex: principal ou auxiliar)';
COMMENT ON COLUMN public.shifts.professional_role IS 'Função do plantonista escalado (ex: principal ou auxiliar)';
