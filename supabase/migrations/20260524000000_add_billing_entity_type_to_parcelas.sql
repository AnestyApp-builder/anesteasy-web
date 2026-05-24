-- Migration: Add billing_entity_type to parcelas
-- Description: Adds billing_entity_type column to parcelas table to support per-installment billing entity configuration.

ALTER TABLE public.parcelas ADD COLUMN IF NOT EXISTS billing_entity_type TEXT 
  CHECK (billing_entity_type IN ('cnpj_anestesista', 'cnpj_grupo'));

-- Add a comment on column for documentation
COMMENT ON COLUMN public.parcelas.billing_entity_type IS 'Entidade de faturamento para esta parcela específica (cnpj_anestesista ou cnpj_grupo)';
