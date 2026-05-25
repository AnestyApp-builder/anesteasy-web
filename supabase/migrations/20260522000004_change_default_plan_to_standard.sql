-- Alterar o plano padrão de 'premium' para 'standard' no trigger de criação de conta

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    name,
    specialty,
    crm,
    phone,
    gender,
    cpf,
    subscription_plan,
    subscription_status,
    role,
    trial_ends_at
  ) VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', 'Usuário'),
    COALESCE(new.raw_user_meta_data->>'specialty', 'Anestesiologia'),
    new.raw_user_meta_data->>'crm',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'gender',
    new.raw_user_meta_data->>'cpf',
    'standard', -- Modificado de premium para standard
    'active',
    'anestesista',
    (now() + interval '7 days')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
EXCEPTION WHEN others THEN
  -- Fallback to minimal info if metadata causes issues (e.g. unique constraint on CPF)
  INSERT INTO public.users (
    id,
    email,
    name,
    subscription_plan,
    subscription_status,
    role,
    trial_ends_at
  ) VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', 'Usuário'),
    'standard', -- Modificado de premium para standard
    'active',
    'anestesista',
    (now() + interval '7 days')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
