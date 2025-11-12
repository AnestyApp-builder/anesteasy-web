-- Script para deletar todas as secretarias do banco de dados
-- ATENÇÃO: Este script irá deletar TODAS as secretarias e suas vinculações

-- Primeiro, deletar todas as vinculações de anestesistas com secretarias
DELETE FROM anestesista_secretaria;

-- Depois, deletar todas as secretarias
-- Isso também deletará automaticamente os usuários do Supabase Auth se houver cascade
DELETE FROM secretarias;

-- Verificar se há procedimentos com secretaria_id e limpar (opcional)
-- UPDATE procedures SET secretaria_id = NULL WHERE secretaria_id IS NOT NULL;

-- Mensagem de confirmação
DO $$
BEGIN
  RAISE NOTICE 'Todas as secretarias foram deletadas com sucesso!';
END $$;

