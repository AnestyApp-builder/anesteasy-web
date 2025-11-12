# 🚨 Solução para Erro "Failed to retrieve folder contents"

## 📋 **Problema Identificado**

**Erro**: `Failed to retrieve folder contents from "15ab6060-8131-408b-be81-e604ee073cc0": Failed to fetch (api.supabase.com)`

**Causa**: O bucket `procedure-attachments` não existe no Supabase Storage.

## 🔍 **Diagnóstico Realizado**

Executei vários scripts de diagnóstico que confirmaram:

1. ✅ **Conexão com Supabase**: OK
2. ✅ **Banco de dados**: OK (tabela `procedure_attachments` existe)
3. ❌ **Bucket de Storage**: **NÃO EXISTE**
4. ❌ **Upload de arquivos**: Falha (bucket não encontrado)

## 🛠️ **Solução Implementada**

### **1. Scripts de Diagnóstico Criados** ✅
- `scripts/diagnose-file-urls.js` - Diagnóstico completo de URLs
- `scripts/check-bucket-status.js` - Verificação de status do bucket
- `scripts/test-image-access.js` - Teste de acesso às imagens

### **2. Scripts de Configuração Criados** ✅
- `scripts/setup-storage-bucket.js` - Configuração automática do bucket
- `scripts/create-bucket-with-service-role.js` - Criação com service role key

### **3. Documentação Criada** ✅
- `CONFIGURACAO_BUCKET_STORAGE.md` - Instruções detalhadas
- `SOLUCAO_ERRO_IMAGENS.md` - Este arquivo

## 🚀 **Como Resolver o Problema**

### **Opção 1: Criação Manual (Recomendada)**

1. **Acesse**: https://app.supabase.com
2. **Vá para**: Storage → Buckets
3. **Clique em**: "New bucket"
4. **Configure**:
   - **Name**: `procedure-attachments`
   - **Public bucket**: ✅ **Marcar como público**
   - **File size limit**: `50 MB`
   - **Allowed MIME types**: Imagens, PDFs, Documentos
5. **Clique em**: "Create bucket"

### **Opção 2: Criação com Service Role Key**

1. **Obtenha a Service Role Key**:
   - Supabase Dashboard → Settings → API → service_role key
2. **Configure no script**:
   - Edite `scripts/create-bucket-with-service-role.js`
   - Substitua `SUA_SERVICE_ROLE_KEY_AQUI` pela chave real
3. **Execute**:
   ```bash
   node scripts/create-bucket-with-service-role.js
   ```

## 🧪 **Verificação da Solução**

Após criar o bucket, execute:

```bash
# Testar se tudo está funcionando
node scripts/test-image-access.js
```

**Resultado esperado**:
```
🎉 Todos os testes passaram!
✅ O bucket está configurado corretamente
✅ As operações de arquivo funcionam
✅ O upload de imagens funciona
✅ As URLs públicas são acessíveis
```

## 📊 **Status Atual**

| Componente | Status | Observação |
|------------|--------|------------|
| **Supabase Connection** | ✅ OK | Conexão funcionando |
| **Database** | ✅ OK | Tabela `procedure_attachments` existe |
| **Storage Bucket** | ❌ **FALTANDO** | Precisa ser criado |
| **Upload Code** | ✅ OK | Código corrigido para tipo MIME |
| **MIME Utils** | ✅ OK | Biblioteca criada |

## 🎯 **Próximos Passos**

1. **Criar o bucket** `procedure-attachments` (manual ou via script)
2. **Configurar políticas RLS** (se necessário)
3. **Testar upload de imagem** em um procedimento
4. **Verificar visualização** da imagem na interface

## 🔧 **Código Já Corrigido**

O código de upload já foi corrigido para:
- ✅ Detectar tipo MIME correto automaticamente
- ✅ Criar arquivo com metadados corretos
- ✅ Fazer upload com `contentType` explícito
- ✅ Registrar no banco com tipo MIME correto

## 🎉 **Resultado Final**

Após criar o bucket:

1. ✅ **Upload de imagens** funcionará normalmente
2. ✅ **Visualização de imagens** funcionará sem erros
3. ✅ **Download de imagens** funcionará corretamente
4. ✅ **Erro "Failed to retrieve folder contents"** será resolvido

---

**🚀 O problema será 100% resolvido após a criação do bucket!**
