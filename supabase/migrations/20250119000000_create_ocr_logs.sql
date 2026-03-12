-- Migration para criar tabela ocr_logs
-- Esta tabela armazena logs de OCR processados para fichas anestésicas

-- Criar tabela ocr_logs
CREATE TABLE IF NOT EXISTS ocr_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  raw_text TEXT NOT NULL,
  parsed JSONB,
  confidence NUMERIC(5, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_ocr_logs_user_id ON ocr_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ocr_logs_created_at ON ocr_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ocr_logs_parsed ON ocr_logs USING GIN (parsed);

-- Comentários nas colunas
COMMENT ON TABLE ocr_logs IS 'Tabela para armazenar logs de OCR de fichas anestésicas';
COMMENT ON COLUMN ocr_logs.id IS 'ID único do log de OCR';
COMMENT ON COLUMN ocr_logs.user_id IS 'ID do usuário que processou o OCR';
COMMENT ON COLUMN ocr_logs.raw_text IS 'Texto bruto extraído do OCR';
COMMENT ON COLUMN ocr_logs.parsed IS 'Dados parseados extraídos do texto (JSON)';
COMMENT ON COLUMN ocr_logs.confidence IS 'Nível de confiança do OCR (0-100)';
COMMENT ON COLUMN ocr_logs.created_at IS 'Data e hora em que o OCR foi processado';

-- Habilitar RLS (Row Level Security)
ALTER TABLE ocr_logs ENABLE ROW LEVEL SECURITY;

-- Política RLS: Usuários podem ver apenas seus próprios logs de OCR
CREATE POLICY "Users can view their own OCR logs"
  ON ocr_logs
  FOR SELECT
  USING (user_id = auth.uid());

-- Política RLS: Usuários podem inserir seus próprios logs de OCR
CREATE POLICY "Users can insert their own OCR logs"
  ON ocr_logs
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Política RLS: Administradores podem ver todos os logs de OCR
CREATE POLICY "Admins can view all OCR logs"
  ON ocr_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_system_admin = TRUE
    )
  );

