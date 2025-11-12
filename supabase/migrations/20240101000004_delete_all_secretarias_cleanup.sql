-- Script para deletar TODAS as secretárias e dados relacionados
-- ATENÇÃO: Esta operação é IRREVERSÍVEL!

-- 1. Deletar vínculos de anestesistas com secretárias
-- (O trigger já faz isso automaticamente, mas vamos garantir)
DELETE FROM anestesista_secretaria;

-- 2. Deletar solicitações de vinculação
DELETE FROM secretaria_link_requests;

-- 3. Deletar convites pendentes
DELETE FROM secretaria_invites;

-- 4. Deletar notificações relacionadas a secretárias
-- (Notificações são vinculadas por user_id que é o id da secretária)
DELETE FROM notifications 
WHERE user_id IN (SELECT id FROM secretarias);

-- 5. Deletar todas as secretárias
DELETE FROM secretarias;

-- Verificar se deletou tudo
DO $$
DECLARE
  remaining_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_count FROM secretarias;
  
  IF remaining_count > 0 THEN
    RAISE EXCEPTION 'Ainda existem % secretárias no banco', remaining_count;
  ELSE
    RAISE NOTICE 'Todas as secretárias foram deletadas com sucesso!';
  END IF;
END $$;

-- Log da operação
COMMENT ON SCHEMA public IS 'Limpeza completa de secretárias realizada em ' || CURRENT_TIMESTAMP;

