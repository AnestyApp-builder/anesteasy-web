-- ============================================
-- MIGRAÇÃO: Criar tabela de estatísticas do sistema
-- Data: 2025-01-XX
-- Versão: 20250101000013
-- Descrição: Cria tabela e função para armazenar estatísticas do sistema
-- ============================================

-- ============================================
-- TABELA: system_stats
-- ============================================

CREATE TABLE IF NOT EXISTS system_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Estatísticas de usuários
  total_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  paying_users INTEGER DEFAULT 0,
  
  -- Estatísticas de secretárias
  total_secretarias INTEGER DEFAULT 0,
  active_secretarias INTEGER DEFAULT 0,
  
  -- Estatísticas de médicos/anestesistas
  total_medicos INTEGER DEFAULT 0,
  active_medicos INTEGER DEFAULT 0,
  
  -- Estatísticas de procedimentos
  total_procedures INTEGER DEFAULT 0,
  procedures_this_month INTEGER DEFAULT 0,
  procedures_this_year INTEGER DEFAULT 0,
  
  -- Estatísticas de assinaturas
  total_subscriptions INTEGER DEFAULT 0,
  active_subscriptions INTEGER DEFAULT 0,
  pending_subscriptions INTEGER DEFAULT 0,
  
  -- Metadados
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_system_stats_last_updated 
ON system_stats(last_updated DESC);

-- Comentários
COMMENT ON TABLE system_stats IS 'Armazena estatísticas gerais do sistema atualizadas automaticamente';
COMMENT ON COLUMN system_stats.total_users IS 'Total de usuários cadastrados (anestesistas)';
COMMENT ON COLUMN system_stats.active_users IS 'Usuários ativos (com login nos últimos 30 dias)';
COMMENT ON COLUMN system_stats.paying_users IS 'Usuários com assinatura ativa';
COMMENT ON COLUMN system_stats.total_secretarias IS 'Total de secretárias cadastradas';
COMMENT ON COLUMN system_stats.active_secretarias IS 'Secretárias ativas (status = active)';
COMMENT ON COLUMN system_stats.total_medicos IS 'Total de médicos/anestesistas cadastrados';
COMMENT ON COLUMN system_stats.active_medicos IS 'Médicos ativos (com login recente)';
COMMENT ON COLUMN system_stats.total_procedures IS 'Total de procedimentos cadastrados';
COMMENT ON COLUMN system_stats.procedures_this_month IS 'Procedimentos cadastrados neste mês';
COMMENT ON COLUMN system_stats.procedures_this_year IS 'Procedimentos cadastrados neste ano';

-- ============================================
-- FUNÇÃO: Calcular e atualizar estatísticas
-- ============================================

CREATE OR REPLACE FUNCTION calculate_system_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_users INTEGER;
  v_active_users INTEGER;
  v_paying_users INTEGER;
  v_total_secretarias INTEGER;
  v_active_secretarias INTEGER;
  v_total_medicos INTEGER;
  v_active_medicos INTEGER;
  v_total_procedures INTEGER;
  v_procedures_this_month INTEGER;
  v_procedures_this_year INTEGER;
  v_total_subscriptions INTEGER;
  v_active_subscriptions INTEGER;
  v_pending_subscriptions INTEGER;
BEGIN
  -- Total de usuários (anestesistas)
  SELECT COUNT(*) INTO v_total_users
  FROM users;
  
  -- Usuários ativos (login nos últimos 30 dias)
  SELECT COUNT(*) INTO v_active_users
  FROM users
  WHERE last_login_at IS NOT NULL
    AND last_login_at >= CURRENT_TIMESTAMP - INTERVAL '30 days';
  
  -- Usuários pagando (com assinatura ativa)
  SELECT COUNT(DISTINCT s.user_id) INTO v_paying_users
  FROM subscriptions s
  WHERE s.status = 'active';
  
  -- Total de secretárias
  SELECT COUNT(*) INTO v_total_secretarias
  FROM secretarias;
  
  -- Secretárias ativas
  SELECT COUNT(*) INTO v_active_secretarias
  FROM secretarias
  WHERE status = 'active';
  
  -- Total de médicos (mesmo que total_users, mas separado para clareza)
  SELECT COUNT(*) INTO v_total_medicos
  FROM users;
  
  -- Médicos ativos (login nos últimos 30 dias)
  SELECT COUNT(*) INTO v_active_medicos
  FROM users
  WHERE last_login_at IS NOT NULL
    AND last_login_at >= CURRENT_TIMESTAMP - INTERVAL '30 days';
  
  -- Total de procedimentos
  SELECT COUNT(*) INTO v_total_procedures
  FROM procedures;
  
  -- Procedimentos deste mês
  SELECT COUNT(*) INTO v_procedures_this_month
  FROM procedures
  WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_TIMESTAMP);
  
  -- Procedimentos deste ano
  SELECT COUNT(*) INTO v_procedures_this_year
  FROM procedures
  WHERE DATE_TRUNC('year', created_at) = DATE_TRUNC('year', CURRENT_TIMESTAMP);
  
  -- Total de assinaturas
  SELECT COUNT(*) INTO v_total_subscriptions
  FROM subscriptions;
  
  -- Assinaturas ativas
  SELECT COUNT(*) INTO v_active_subscriptions
  FROM subscriptions
  WHERE status = 'active';
  
  -- Assinaturas pendentes
  SELECT COUNT(*) INTO v_pending_subscriptions
  FROM subscriptions
  WHERE status = 'pending';
  
  -- Inserir ou atualizar estatísticas
  INSERT INTO system_stats (
    total_users,
    active_users,
    paying_users,
    total_secretarias,
    active_secretarias,
    total_medicos,
    active_medicos,
    total_procedures,
    procedures_this_month,
    procedures_this_year,
    total_subscriptions,
    active_subscriptions,
    pending_subscriptions,
    last_updated,
    updated_at
  ) VALUES (
    v_total_users,
    v_active_users,
    v_paying_users,
    v_total_secretarias,
    v_active_secretarias,
    v_total_medicos,
    v_active_medicos,
    v_total_procedures,
    v_procedures_this_month,
    v_procedures_this_year,
    v_total_subscriptions,
    v_active_subscriptions,
    v_pending_subscriptions,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT (id) DO UPDATE SET
    total_users = EXCLUDED.total_users,
    active_users = EXCLUDED.active_users,
    paying_users = EXCLUDED.paying_users,
    total_secretarias = EXCLUDED.total_secretarias,
    active_secretarias = EXCLUDED.active_secretarias,
    total_medicos = EXCLUDED.total_medicos,
    active_medicos = EXCLUDED.active_medicos,
    total_procedures = EXCLUDED.total_procedures,
    procedures_this_month = EXCLUDED.procedures_this_month,
    procedures_this_year = EXCLUDED.procedures_this_year,
    total_subscriptions = EXCLUDED.total_subscriptions,
    active_subscriptions = EXCLUDED.active_subscriptions,
    pending_subscriptions = EXCLUDED.pending_subscriptions,
    last_updated = EXCLUDED.last_updated,
    updated_at = EXCLUDED.updated_at;
    
  -- Se não há registro, criar um único registro
  IF NOT EXISTS (SELECT 1 FROM system_stats LIMIT 1) THEN
    INSERT INTO system_stats (
      total_users,
      active_users,
      paying_users,
      total_secretarias,
      active_secretarias,
      total_medicos,
      active_medicos,
      total_procedures,
      procedures_this_month,
      procedures_this_year,
      total_subscriptions,
      active_subscriptions,
      pending_subscriptions
    ) VALUES (
      v_total_users,
      v_active_users,
      v_paying_users,
      v_total_secretarias,
      v_active_secretarias,
      v_total_medicos,
      v_active_medicos,
      v_total_procedures,
      v_procedures_this_month,
      v_procedures_this_year,
      v_total_subscriptions,
      v_active_subscriptions,
      v_pending_subscriptions
    );
  END IF;
END;
$$;

-- ============================================
-- FUNÇÃO: Obter estatísticas atuais (view simplificada)
-- ============================================

CREATE OR REPLACE FUNCTION get_system_stats()
RETURNS TABLE (
  total_users INTEGER,
  active_users INTEGER,
  paying_users INTEGER,
  total_secretarias INTEGER,
  active_secretarias INTEGER,
  total_medicos INTEGER,
  active_medicos INTEGER,
  total_procedures INTEGER,
  procedures_this_month INTEGER,
  procedures_this_year INTEGER,
  total_subscriptions INTEGER,
  active_subscriptions INTEGER,
  pending_subscriptions INTEGER,
  last_updated TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Atualizar estatísticas antes de retornar
  PERFORM calculate_system_stats();
  
  -- Retornar estatísticas mais recentes
  RETURN QUERY
  SELECT 
    s.total_users,
    s.active_users,
    s.paying_users,
    s.total_secretarias,
    s.active_secretarias,
    s.total_medicos,
    s.active_medicos,
    s.total_procedures,
    s.procedures_this_month,
    s.procedures_this_year,
    s.total_subscriptions,
    s.active_subscriptions,
    s.pending_subscriptions,
    s.last_updated
  FROM system_stats s
  ORDER BY s.last_updated DESC
  LIMIT 1;
END;
$$;

-- ============================================
-- TRIGGER: Atualizar updated_at automaticamente
-- ============================================

CREATE OR REPLACE FUNCTION update_system_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_system_stats_updated_at
  BEFORE UPDATE ON system_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_system_stats_updated_at();

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE system_stats ENABLE ROW LEVEL SECURITY;

-- Política: Todos podem ler as estatísticas (público)
CREATE POLICY "Anyone can view system stats"
  ON system_stats
  FOR SELECT
  TO public
  USING (true);

-- Política: Apenas service_role pode atualizar
CREATE POLICY "Service role can manage stats"
  ON system_stats
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- INICIALIZAR ESTATÍSTICAS
-- ============================================

-- Calcular e inserir estatísticas iniciais
SELECT calculate_system_stats();

-- ============================================
-- COMENTÁRIOS FINAIS
-- ============================================

COMMENT ON FUNCTION calculate_system_stats() IS 
'Calcula e atualiza todas as estatísticas do sistema. Pode ser chamada manualmente ou via cron job.';

COMMENT ON FUNCTION get_system_stats() IS 
'Retorna as estatísticas mais recentes do sistema, atualizando-as automaticamente antes de retornar.';

