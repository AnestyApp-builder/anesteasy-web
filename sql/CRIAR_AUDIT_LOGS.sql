-- 1. Criar Tabela de Logs de Auditoria
create table if not exists public.audit_logs (
    id uuid default uuid_generate_v4() primary key,
    group_id uuid references public.groups(id) on delete cascade,
    user_id uuid references auth.users(id) on delete set null,
    action text not null, -- 'UPDATE', 'DELETE'
    entity_type text not null, -- Ex: 'procedure'
    entity_id uuid not null, -- ID do procedimento
    old_data jsonb,
    new_data jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Habilitar Segurança por Linha (RLS)
alter table public.audit_logs enable row level security;

-- Política: Apenas criadores e administradores do grupo podem ler os logs desse grupo
create policy "Admins e Criadores podem visualizar logs de seus grupos"
    on public.audit_logs for select
    using (
        group_id in (
            select group_id from public.group_members 
            where user_id = auth.uid() and role in ('admin', 'creator')
        )
    );

-- 3. Criar a Função de Trigger para Registrar Logs
CREATE OR REPLACE FUNCTION public.log_procedure_changes()
RETURNS trigger AS $$
BEGIN
  -- Se for um UPDATE em um procedimento que pertence a um grupo
  IF TG_OP = 'UPDATE' THEN
    IF OLD.group_id IS NOT NULL THEN
      INSERT INTO public.audit_logs (group_id, user_id, action, entity_type, entity_id, old_data, new_data)
      VALUES (
        OLD.group_id, 
        auth.uid(), -- ID do usuário autenticado logado no Supabase
        'UPDATE', 
        'procedure', 
        OLD.id, 
        row_to_json(OLD)::jsonb, 
        row_to_json(NEW)::jsonb
      );
    END IF;
    RETURN NEW;
    
  -- Se for um DELETE em um procedimento que pertence a um grupo
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.group_id IS NOT NULL THEN
      INSERT INTO public.audit_logs (group_id, user_id, action, entity_type, entity_id, old_data, new_data)
      VALUES (
        OLD.group_id, 
        auth.uid(), 
        'DELETE', 
        'procedure', 
        OLD.id, 
        row_to_json(OLD)::jsonb, 
        null
      );
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Anexar o Trigger à tabela Procedures
DROP TRIGGER IF EXISTS audit_procedures_changes ON public.procedures;
CREATE TRIGGER audit_procedures_changes
  AFTER UPDATE OR DELETE ON public.procedures
  FOR EACH ROW
  EXECUTE FUNCTION public.log_procedure_changes();
