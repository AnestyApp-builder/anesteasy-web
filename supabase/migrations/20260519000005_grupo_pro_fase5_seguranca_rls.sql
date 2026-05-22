-- Fase 5: RLS e Segurança para Grupo PRO

-- Limpeza de políticas existentes para evitar erros de duplicidade
DROP POLICY IF EXISTS "Users can view quota history of their groups" ON public.group_quota_history;
DROP POLICY IF EXISTS "Group admins can manage quota history" ON public.group_quota_history;

DROP POLICY IF EXISTS "Users can view secretary permissions in their groups" ON public.group_secretary_permissions;
DROP POLICY IF EXISTS "Group admins can manage secretary permissions" ON public.group_secretary_permissions;

DROP POLICY IF EXISTS "Users can view group secretarias" ON public.secretarias;
DROP POLICY IF EXISTS "Group admins can update group secretarias" ON public.secretarias;
DROP POLICY IF EXISTS "Group admins can delete group secretarias" ON public.secretarias;

DROP POLICY IF EXISTS "Users can view closings of their groups" ON public.group_monthly_closings;
DROP POLICY IF EXISTS "Group admins can manage closings" ON public.group_monthly_closings;
DROP POLICY IF EXISTS "Group secretaries can manage closings" ON public.group_monthly_closings;

DROP POLICY IF EXISTS "Users can view own or group distributions" ON public.group_distributions;
DROP POLICY IF EXISTS "Group admins can manage distributions" ON public.group_distributions;

DROP POLICY IF EXISTS "Users can view group payments" ON public.payments;
DROP POLICY IF EXISTS "Group secretaries can view group payments" ON public.payments;
DROP POLICY IF EXISTS "Group admins can manage payments" ON public.payments;
DROP POLICY IF EXISTS "Group secretaries can manage payments" ON public.payments;

DROP POLICY IF EXISTS "Users can view group shifts" ON public.shifts;
DROP POLICY IF EXISTS "Group secretaries can view group shifts" ON public.shifts;
DROP POLICY IF EXISTS "Group admins can manage group shifts" ON public.shifts;
DROP POLICY IF EXISTS "Group secretaries can manage group shifts" ON public.shifts;

-- 1. Políticas para group_quota_history
CREATE POLICY "Users can view quota history of their groups"
ON public.group_quota_history FOR SELECT TO authenticated
USING (
  group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
);

CREATE POLICY "Group admins can manage quota history"
ON public.group_quota_history FOR ALL TO authenticated
USING (
  group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid() AND role = 'admin')
);

-- 2. Políticas para group_secretary_permissions
CREATE POLICY "Users can view secretary permissions in their groups"
ON public.group_secretary_permissions FOR SELECT TO authenticated
USING (
  secretary_id IN (
    SELECT id FROM public.secretarias 
    WHERE group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Group admins can manage secretary permissions"
ON public.group_secretary_permissions FOR ALL TO authenticated
USING (
  secretary_id IN (
    SELECT id FROM public.secretarias 
    WHERE group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid() AND role = 'admin')
  )
)
WITH CHECK (
  secretary_id IN (
    SELECT id FROM public.secretarias 
    WHERE group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid() AND role = 'admin')
  )
);

-- 3. Políticas para secretarias (sem conflitos com individuais)
CREATE POLICY "Users can view group secretarias"
ON public.secretarias FOR SELECT TO authenticated
USING (
  type = 'grupo' AND group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
);

CREATE POLICY "Group admins can update group secretarias"
ON public.secretarias FOR UPDATE TO authenticated
USING (
  type = 'grupo' AND group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  type = 'grupo' AND group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Group admins can delete group secretarias"
ON public.secretarias FOR DELETE TO authenticated
USING (
  type = 'grupo' AND group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid() AND role = 'admin')
);

-- 4. Políticas para group_monthly_closings
CREATE POLICY "Users can view closings of their groups"
ON public.group_monthly_closings FOR SELECT TO authenticated
USING (
  group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
  OR
  group_id IN (
    SELECT s.group_id 
    FROM public.secretarias s
    JOIN public.group_secretary_permissions p ON p.secretary_id = s.id
    WHERE (s.email = auth.jwt()->>'email' OR s.id = auth.uid())
      AND s.type = 'grupo'
      AND p.module = 'fechamento'
  )
);

CREATE POLICY "Group admins can manage closings"
ON public.group_monthly_closings FOR ALL TO authenticated
USING (
  group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Group secretaries can manage closings"
ON public.group_monthly_closings FOR ALL TO authenticated
USING (
  group_id IN (
    SELECT s.group_id 
    FROM public.secretarias s
    JOIN public.group_secretary_permissions p ON p.secretary_id = s.id
    WHERE (s.email = auth.jwt()->>'email' OR s.id = auth.uid())
      AND s.type = 'grupo'
      AND p.module = 'fechamento'
  )
)
WITH CHECK (
  group_id IN (
    SELECT s.group_id 
    FROM public.secretarias s
    JOIN public.group_secretary_permissions p ON p.secretary_id = s.id
    WHERE (s.email = auth.jwt()->>'email' OR s.id = auth.uid())
      AND s.type = 'grupo'
      AND p.module = 'fechamento'
  )
);

-- 5. Políticas para group_distributions
CREATE POLICY "Users can view own or group distributions"
ON public.group_distributions FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR
  group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid() AND role = 'admin')
  OR
  group_id IN (
    SELECT s.group_id 
    FROM public.secretarias s
    JOIN public.group_secretary_permissions p ON p.secretary_id = s.id
    WHERE (s.email = auth.jwt()->>'email' OR s.id = auth.uid())
      AND s.type = 'grupo'
      AND p.module = 'financeiro'
  )
);

CREATE POLICY "Group admins can manage distributions"
ON public.group_distributions FOR ALL TO authenticated
USING (
  group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid() AND role = 'admin')
);

-- 6. Políticas para payments (Grupo PRO)
CREATE POLICY "Users can view group payments"
ON public.payments FOR SELECT TO authenticated
USING (
  group_id IS NOT NULL AND group_id IN (
    SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Group secretaries can view group payments"
ON public.payments FOR SELECT TO authenticated
USING (
  group_id IS NOT NULL AND group_id IN (
    SELECT s.group_id 
    FROM public.secretarias s
    JOIN public.group_secretary_permissions p ON p.secretary_id = s.id
    WHERE (s.email = auth.jwt()->>'email' OR s.id = auth.uid())
      AND s.type = 'grupo'
      AND p.module = 'financeiro'
  )
);

CREATE POLICY "Group admins can manage payments"
ON public.payments FOR ALL TO authenticated
USING (
  group_id IS NOT NULL AND group_id IN (
    SELECT group_id FROM public.group_members WHERE user_id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  group_id IS NOT NULL AND group_id IN (
    SELECT group_id FROM public.group_members WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Group secretaries can manage payments"
ON public.payments FOR ALL TO authenticated
USING (
  group_id IS NOT NULL AND group_id IN (
    SELECT s.group_id 
    FROM public.secretarias s
    JOIN public.group_secretary_permissions p ON p.secretary_id = s.id
    WHERE (s.email = auth.jwt()->>'email' OR s.id = auth.uid())
      AND s.type = 'grupo'
      AND p.module = 'financeiro'
  )
)
WITH CHECK (
  group_id IS NOT NULL AND group_id IN (
    SELECT s.group_id 
    FROM public.secretarias s
    JOIN public.group_secretary_permissions p ON p.secretary_id = s.id
    WHERE (s.email = auth.jwt()->>'email' OR s.id = auth.uid())
      AND s.type = 'grupo'
      AND p.module = 'financeiro'
  )
);

-- 7. Políticas para shifts (Grupo PRO)
CREATE POLICY "Users can view group shifts"
ON public.shifts FOR SELECT TO authenticated
USING (
  group_id IS NOT NULL AND group_id IN (
    SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Group secretaries can view group shifts"
ON public.shifts FOR SELECT TO authenticated
USING (
  group_id IS NOT NULL AND group_id IN (
    SELECT s.group_id 
    FROM public.secretarias s
    JOIN public.group_secretary_permissions p ON p.secretary_id = s.id
    WHERE (s.email = auth.jwt()->>'email' OR s.id = auth.uid())
      AND s.type = 'grupo'
      AND p.module = 'escalas'
  )
);

CREATE POLICY "Group admins can manage group shifts"
ON public.shifts FOR ALL TO authenticated
USING (
  group_id IS NOT NULL AND group_id IN (
    SELECT group_id FROM public.group_members WHERE user_id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  group_id IS NOT NULL AND group_id IN (
    SELECT group_id FROM public.group_members WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Group secretaries can manage group shifts"
ON public.shifts FOR ALL TO authenticated
USING (
  group_id IS NOT NULL AND group_id IN (
    SELECT s.group_id 
    FROM public.secretarias s
    JOIN public.group_secretary_permissions p ON p.secretary_id = s.id
    WHERE (s.email = auth.jwt()->>'email' OR s.id = auth.uid())
      AND s.type = 'grupo'
      AND p.module = 'escalas'
  )
)
WITH CHECK (
  group_id IS NOT NULL AND group_id IN (
    SELECT s.group_id 
    FROM public.secretarias s
    JOIN public.group_secretary_permissions p ON p.secretary_id = s.id
    WHERE (s.email = auth.jwt()->>'email' OR s.id = auth.uid())
      AND s.type = 'grupo'
      AND p.module = 'escalas'
  )
);
