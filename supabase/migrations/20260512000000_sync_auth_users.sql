-- Function to handle new user creation in public.users
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
    'premium',
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
    'premium',
    'active',
    'anestesista',
    (now() + interval '7 days')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function after a user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- One-time sync for existing users using a robust block
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN 
        SELECT id, email, raw_user_meta_data, created_at 
        FROM auth.users 
        WHERE id NOT IN (SELECT id FROM public.users)
    LOOP
        BEGIN
            INSERT INTO public.users (
                id, email, name, specialty, crm, phone, gender, cpf, 
                subscription_plan, subscription_status, role, trial_ends_at
            ) VALUES (
                user_record.id,
                user_record.email,
                COALESCE(user_record.raw_user_meta_data->>'name', 'Usuário'),
                COALESCE(user_record.raw_user_meta_data->>'specialty', 'Anestesiologia'),
                user_record.raw_user_meta_data->>'crm',
                user_record.raw_user_meta_data->>'phone',
                user_record.raw_user_meta_data->>'gender',
                user_record.raw_user_meta_data->>'cpf',
                'premium',
                'active',
                'anestesista',
                (user_record.created_at + interval '7 days')
            );
        EXCEPTION WHEN others THEN
            -- Retry with minimal data on any error (like unique constraint violation)
            INSERT INTO public.users (
                id, email, name, specialty, 
                subscription_plan, subscription_status, role, trial_ends_at
            ) VALUES (
                user_record.id,
                user_record.email,
                COALESCE(user_record.raw_user_meta_data->>'name', 'Usuário'),
                COALESCE(user_record.raw_user_meta_data->>'specialty', 'Anestesiologia'),
                'premium',
                'active',
                'anestesista',
                (user_record.created_at + interval '7 days')
            ) ON CONFLICT (id) DO NOTHING;
        END;
    END LOOP;
END $$;
