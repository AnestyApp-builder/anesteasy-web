-- Migration para adicionar Soft Delete e exclusão automática via cron

-- 1. Adicionar coluna deleted_at na tabela groups
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
COMMENT ON COLUMN public.groups.deleted_at IS 'Data de arquivamento (soft delete). Se nulo, o grupo está ativo.';

-- 2. Habilitar a extensão pg_cron caso não esteja habilitada (restringido a superusuários no ambiente)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 3. Criar o agendamento para excluir permanentemente grupos deletados há mais de 30 dias
-- Ele roda todos os dias à meia-noite
SELECT cron.schedule(
  'purge_deleted_groups',
  '0 0 * * *',
  $$
    DELETE FROM public.groups WHERE deleted_at < now() - interval '30 days';
  $$
);
