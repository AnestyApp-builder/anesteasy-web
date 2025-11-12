# 🎯 Instruções Finais - Configuração RLS para procedure-attachments

## 🚨 **Problema Identificado**

O bucket `procedure-attachments` existe e tem arquivos, mas não é acessível via código devido à falta de políticas RLS (Row Level Security).

## 🛠️ **Solução: Configurar Políticas RLS**

### **Passo 1: Acessar o SQL Editor**

1. **Acesse**: https://app.supabase.com
2. **Faça login** na sua conta
3. **Selecione o projeto**: `zmtwwajyhusyrugobxur`
4. **Vá para**: SQL Editor (no menu lateral)

### **Passo 2: Executar as Políticas SQL**

Execute os seguintes comandos SQL **um por vez**:

```sql
-- Política 1: Leitura pública
CREATE POLICY "Public read access for procedure attachments" ON storage.objects
FOR SELECT
USING (bucket_id = 'procedure-attachments');
```

```sql
-- Política 2: Upload para usuários autenticados
CREATE POLICY "Authenticated users can upload procedure attachments" ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'procedure-attachments' AND auth.role() = 'authenticated');
```

```sql
-- Política 3: Atualização para usuários autenticados
CREATE POLICY "Authenticated users can update procedure attachments" ON storage.objects
FOR UPDATE
USING (bucket_id = 'procedure-attachments' AND auth.role() = 'authenticated');
```

```sql
-- Política 4: Exclusão para usuários autenticados
CREATE POLICY "Authenticated users can delete procedure attachments" ON storage.objects
FOR DELETE
USING (bucket_id = 'procedure-attachments' AND auth.role() = 'authenticated');
```

### **Passo 3: Verificar se Funcionou**

Após executar as políticas, execute o script de teste:

```bash
node scripts/manual-rls-setup.js
```

**Resultado esperado**:
```
✅ Acesso ao bucket funcionando!
✅ Download funcionando
✅ Upload funcionando
🎉 SUCESSO! Todas as operações funcionando!
```

## 📋 **Arquivos Criados para Ajudar**

### **Scripts de Teste:**
- `scripts/manual-rls-setup.js` - Testa o acesso após configurar RLS
- `scripts/test-final-solution.js` - Teste completo da solução
- `scripts/add-storage-rls-policies.js` - Tentativa automática (não funcionou)

### **Arquivos SQL:**
- `POLITICAS_RLS_PROCEDURE_ATTACHMENTS.sql` - Comandos SQL completos

### **Documentação:**
- `SOLUCAO_FINAL_IMAGENS.md` - Solução completa
- `INSTRUCOES_FINAIS_RLS.md` - Este arquivo

## 🎉 **Resultado Final**

Após configurar as políticas RLS:

- ✅ **Imagens serão acessíveis** via código
- ✅ **Upload funcionará** normalmente
- ✅ **Visualização funcionará** sem erros
- ✅ **Download funcionará** corretamente
- ✅ **Erro "Failed to retrieve folder contents"** será resolvido

## 🔧 **Código Já Corrigido**

O código de upload já foi corrigido para:
- ✅ Detectar tipo MIME correto automaticamente
- ✅ Criar arquivo com metadados corretos
- ✅ Fazer upload com `contentType` explícito
- ✅ Registrar no banco com tipo MIME correto

## 🚀 **Próximos Passos**

1. **Execute as políticas SQL** no Supabase Dashboard
2. **Teste com o script**: `node scripts/manual-rls-setup.js`
3. **Faça upload de uma imagem** em um procedimento
4. **Verifique se a imagem aparece** corretamente

---

**💡 A solução está 100% pronta! Só precisa executar as políticas SQL no Supabase Dashboard.**
