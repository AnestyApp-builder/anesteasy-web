-- Reforçar políticas RLS para blindagem total de dados
-- Remover todas as políticas existentes e recriar com maior segurança

-- Remover políticas existentes
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can view own procedures" ON procedures;
DROP POLICY IF EXISTS "Users can insert own procedures" ON procedures;
DROP POLICY IF EXISTS "Users can update own procedures" ON procedures;
DROP POLICY IF EXISTS "Users can delete own procedures" ON procedures;
DROP POLICY IF EXISTS "Users can view own payments" ON payments;
DROP POLICY IF EXISTS "Users can insert own payments" ON payments;
DROP POLICY IF EXISTS "Users can update own payments" ON payments;
DROP POLICY IF EXISTS "Users can view own reports" ON reports;
DROP POLICY IF EXISTS "Users can insert own reports" ON reports;
DROP POLICY IF EXISTS "Users can update own reports" ON reports;
DROP POLICY IF EXISTS "Users can delete own reports" ON reports;
DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;

-- Criar políticas mais restritivas para users
CREATE POLICY "users_select_own_data" ON users
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND 
    auth.uid()::text = id::text
  );

CREATE POLICY "users_update_own_data" ON users
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND 
    auth.uid()::text = id::text
  );

CREATE POLICY "users_insert_own_data" ON users
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND 
    auth.uid()::text = id::text
  );

-- Criar políticas mais restritivas para procedures
CREATE POLICY "procedures_select_own_data" ON procedures
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND 
    auth.uid()::text = user_id::text
  );

CREATE POLICY "procedures_insert_own_data" ON procedures
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND 
    auth.uid()::text = user_id::text
  );

CREATE POLICY "procedures_update_own_data" ON procedures
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND 
    auth.uid()::text = user_id::text
  );

CREATE POLICY "procedures_delete_own_data" ON procedures
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND 
    auth.uid()::text = user_id::text
  );

-- Criar políticas mais restritivas para payments
CREATE POLICY "payments_select_own_data" ON payments
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND 
    auth.uid()::text = user_id::text
  );

CREATE POLICY "payments_insert_own_data" ON payments
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND 
    auth.uid()::text = user_id::text
  );

CREATE POLICY "payments_update_own_data" ON payments
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND 
    auth.uid()::text = user_id::text
  );

CREATE POLICY "payments_delete_own_data" ON payments
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND 
    auth.uid()::text = user_id::text
  );

-- Criar políticas mais restritivas para reports
CREATE POLICY "reports_select_own_data" ON reports
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND 
    auth.uid()::text = user_id::text
  );

CREATE POLICY "reports_insert_own_data" ON reports
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND 
    auth.uid()::text = user_id::text
  );

CREATE POLICY "reports_update_own_data" ON reports
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND 
    auth.uid()::text = user_id::text
  );

CREATE POLICY "reports_delete_own_data" ON reports
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND 
    auth.uid()::text = user_id::text
  );

-- Criar políticas mais restritivas para user_settings
CREATE POLICY "user_settings_select_own_data" ON user_settings
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND 
    auth.uid()::text = user_id::text
  );

CREATE POLICY "user_settings_insert_own_data" ON user_settings
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND 
    auth.uid()::text = user_id::text
  );

CREATE POLICY "user_settings_update_own_data" ON user_settings
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND 
    auth.uid()::text = user_id::text
  );

-- Forçar RLS em todas as tabelas (garantia extra)
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE procedures FORCE ROW LEVEL SECURITY;
ALTER TABLE payments FORCE ROW LEVEL SECURITY;
ALTER TABLE reports FORCE ROW LEVEL SECURITY;
ALTER TABLE user_settings FORCE ROW LEVEL SECURITY;
