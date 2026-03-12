-- Migration para adicionar campos de valor e pagamento na tabela shifts
-- Esta migração adiciona suporte para valores de plantões e controle de pagamento

-- Adicionar coluna shift_value (valor do plantão)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shifts' AND column_name = 'shift_value'
  ) THEN
    ALTER TABLE shifts 
    ADD COLUMN shift_value NUMERIC(10, 2) DEFAULT 0;
    
    -- Comentário
    COMMENT ON COLUMN shifts.shift_value IS 'Valor do plantão em reais';
  END IF;
END $$;

-- Adicionar coluna sobreaviso_type (tipo de sobreaviso: fixo ou variável)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shifts' AND column_name = 'sobreaviso_type'
  ) THEN
    ALTER TABLE shifts 
    ADD COLUMN sobreaviso_type TEXT CHECK (sobreaviso_type IN ('fixo', 'variavel')) DEFAULT NULL;
    
    -- Comentário
    COMMENT ON COLUMN shifts.sobreaviso_type IS 'Tipo de sobreaviso: fixo (valor fixo) ou variavel (valor variável)';
  END IF;
END $$;

-- Adicionar coluna payment_status (status de pagamento)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shifts' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE shifts 
    ADD COLUMN payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'cancelled'));
    
    -- Criar índice para payment_status
    CREATE INDEX IF NOT EXISTS idx_shifts_payment_status ON shifts(payment_status);
    
    -- Comentário
    COMMENT ON COLUMN shifts.payment_status IS 'Status de pagamento: pending, paid ou cancelled';
  END IF;
END $$;

-- Adicionar coluna payment_date (data de pagamento)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shifts' AND column_name = 'payment_date'
  ) THEN
    ALTER TABLE shifts 
    ADD COLUMN payment_date TIMESTAMP WITH TIME ZONE DEFAULT NULL;
    
    -- Criar índice para payment_date
    CREATE INDEX IF NOT EXISTS idx_shifts_payment_date ON shifts(payment_date);
    
    -- Comentário
    COMMENT ON COLUMN shifts.payment_date IS 'Data em que o plantão foi pago';
  END IF;
END $$;

-- Adicionar índices para melhorar performance de consultas financeiras
CREATE INDEX IF NOT EXISTS idx_shifts_user_payment_status ON shifts(user_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_shifts_user_value ON shifts(user_id, shift_value);

