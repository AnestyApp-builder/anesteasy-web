-- =====================================================
-- POLÍTICAS RLS PARA BUCKET PROCEDURE-ATTACHMENTS
-- =====================================================
-- 
-- Este arquivo contém as políticas RLS necessárias para
-- permitir acesso aos arquivos do bucket procedure-attachments
--
-- INSTRUÇÕES:
-- 1. Acesse: https://app.supabase.com
-- 2. Vá para: SQL Editor
-- 3. Execute os comandos abaixo um por vez
-- 4. Teste o acesso executando: node scripts/manual-rls-setup.js
--
-- =====================================================

-- Política 1: Permitir leitura pública de todos os arquivos
-- Esta política permite que qualquer pessoa possa visualizar/downloadar os arquivos
CREATE POLICY "Public read access for procedure attachments" ON storage.objects
FOR SELECT
USING (bucket_id = 'procedure-attachments');

-- Política 2: Permitir upload para usuários autenticados
-- Esta política permite que usuários logados façam upload de arquivos
CREATE POLICY "Authenticated users can upload procedure attachments" ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'procedure-attachments' AND auth.role() = 'authenticated');

-- Política 3: Permitir atualização para usuários autenticados
-- Esta política permite que usuários logados atualizem arquivos
CREATE POLICY "Authenticated users can update procedure attachments" ON storage.objects
FOR UPDATE
USING (bucket_id = 'procedure-attachments' AND auth.role() = 'authenticated');

-- Política 4: Permitir exclusão para usuários autenticados
-- Esta política permite que usuários logados excluam arquivos
CREATE POLICY "Authenticated users can delete procedure attachments" ON storage.objects
FOR DELETE
USING (bucket_id = 'procedure-attachments' AND auth.role() = 'authenticated');

-- =====================================================
-- VERIFICAÇÃO DAS POLÍTICAS
-- =====================================================
-- 
-- Para verificar se as políticas foram criadas corretamente,
-- execute a consulta abaixo:
--
-- SELECT 
--   policyname,
--   cmd,
--   qual,
--   with_check
-- FROM pg_policies 
-- WHERE tablename = 'objects' 
--   AND schemaname = 'storage'
--   AND policyname LIKE '%procedure%';
--
-- =====================================================

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================
--
-- 1. Estas políticas permitem:
--    - Leitura pública (qualquer um pode ver/downloadar)
--    - Upload/Update/Delete apenas para usuários autenticados
--
-- 2. Se você quiser restringir mais o acesso, pode modificar
--    as políticas para incluir verificações de usuário específico
--
-- 3. Após executar estas políticas, teste com:
--    node scripts/manual-rls-setup.js
--
-- 4. Se ainda houver problemas, verifique se:
--    - O bucket 'procedure-attachments' existe
--    - O bucket está marcado como público
--    - As políticas foram aplicadas corretamente
--
-- =====================================================
