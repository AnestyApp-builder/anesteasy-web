-- Criar tabela de grupos
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    color TEXT NOT NULL,
    share_financials BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS na tabela groups
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Criar tabela de membros do grupo
CREATE TABLE IF NOT EXISTS public.group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
    invited_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(group_id, user_id)
);

-- Habilitar RLS na tabela group_members
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Adicionar group_id na tabela procedures
ALTER TABLE public.procedures ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL;


-- ==========================================
-- POLÍTICAS RLS PARA groups
-- ==========================================

-- Ver grupos: o usuário pode ver grupos que ele criou OU grupos dos quais é membro
CREATE POLICY "Users can view their groups"
ON public.groups
FOR SELECT
TO authenticated
USING (
    created_by = auth.uid() OR
    id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
);

-- Criar grupos: qualquer usuário autenticado pode criar um grupo
CREATE POLICY "Users can create groups"
ON public.groups
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- Atualizar grupos: apenas o criador ou admins do grupo podem editar
CREATE POLICY "Admins can update groups"
ON public.groups
FOR UPDATE
TO authenticated
USING (
    created_by = auth.uid() OR
    id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
    created_by = auth.uid() OR
    id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid() AND role = 'admin')
);

-- Deletar grupos: apenas o criador pode deletar o grupo
CREATE POLICY "Creator can delete groups"
ON public.groups
FOR DELETE
TO authenticated
USING (created_by = auth.uid());


-- ==========================================
-- POLÍTICAS RLS PARA group_members
-- ==========================================

-- Ver membros: usuários podem ver os membros dos grupos que eles participam
CREATE POLICY "Users can view members of their groups"
ON public.group_members
FOR SELECT
TO authenticated
USING (
    group_id IN (SELECT id FROM public.groups WHERE created_by = auth.uid()) OR
    group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
);

-- Inserir membros: o criador do grupo ou admins do grupo podem adicionar membros
CREATE POLICY "Admins can insert members"
ON public.group_members
FOR INSERT
TO authenticated
WITH CHECK (
    group_id IN (SELECT id FROM public.groups WHERE created_by = auth.uid()) OR
    group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid() AND role = 'admin')
);

-- Atualizar membros: admins podem atualizar papéis de outros membros
CREATE POLICY "Admins can update members"
ON public.group_members
FOR UPDATE
TO authenticated
USING (
    group_id IN (SELECT id FROM public.groups WHERE created_by = auth.uid()) OR
    group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
    group_id IN (SELECT id FROM public.groups WHERE created_by = auth.uid()) OR
    group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid() AND role = 'admin')
);

-- Deletar membros: admins podem remover membros ou o próprio usuário pode sair
CREATE POLICY "Admins can remove members or users can leave"
ON public.group_members
FOR DELETE
TO authenticated
USING (
    user_id = auth.uid() OR -- próprio usuário saindo
    group_id IN (SELECT id FROM public.groups WHERE created_by = auth.uid()) OR
    group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid() AND role = 'admin')
);


-- ==========================================
-- POLÍTICAS RLS PARA procedures (Grupos)
-- ==========================================

-- Ver procedimentos do grupo: membros podem ver todos os procedimentos do grupo
CREATE POLICY "Members can view group procedures"
ON public.procedures
FOR SELECT
TO authenticated
USING (
    group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
);

-- Atualizar procedimentos do grupo: admins podem editar qualquer procedimento do grupo
CREATE POLICY "Admins can update group procedures"
ON public.procedures
FOR UPDATE
TO authenticated
USING (
    group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
    group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid() AND role = 'admin')
);

-- Deletar procedimentos do grupo: admins podem excluir qualquer procedimento do grupo
CREATE POLICY "Admins can delete group procedures"
ON public.procedures
FOR DELETE
TO authenticated
USING (
    group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid() AND role = 'admin')
);
