# 🔧 Configuração do Bucket de Storage

## 🚨 **Problema Identificado**

O erro "Failed to retrieve folder contents" ocorre porque o bucket `procedure-attachments` não existe no Supabase Storage.

## 🛠️ **Solução: Criar o Bucket Manualmente**

### **Passo 1: Acessar o Supabase Dashboard**

1. Acesse: https://app.supabase.com
2. Faça login na sua conta
3. Selecione o projeto: `zmtwwajyhusyrugobxur`

### **Passo 2: Criar o Bucket**

1. **Vá para**: Storage → Buckets
2. **Clique em**: "New bucket"
3. **Configure**:
   - **Name**: `procedure-attachments`
   - **Public bucket**: ✅ **Marcar como público**
   - **File size limit**: `50 MB`
   - **Allowed MIME types**: 
     ```
     image/jpeg
     image/png
     image/gif
     image/webp
     image/bmp
     image/svg+xml
     application/pdf
     application/msword
     application/vnd.openxmlformats-officedocument.wordprocessingml.document
     application/vnd.ms-excel
     application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
     text/plain
     application/zip
     ```
4. **Clique em**: "Create bucket"

### **Passo 3: Configurar Políticas RLS (Row Level Security)**

1. **Vá para**: Storage → Policies
2. **Selecione o bucket**: `procedure-attachments`
3. **Crie as seguintes políticas**:

#### **Política 1: Permitir leitura pública**
```sql
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'procedure-attachments');
```

#### **Política 2: Permitir upload para usuários autenticados**
```sql
CREATE POLICY "Authenticated users can upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'procedure-attachments' 
  AND auth.role() = 'authenticated'
);
```

#### **Política 3: Permitir atualização para usuários autenticados**
```sql
CREATE POLICY "Authenticated users can update" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'procedure-attachments' 
  AND auth.role() = 'authenticated'
);
```

#### **Política 4: Permitir exclusão para usuários autenticados**
```sql
CREATE POLICY "Authenticated users can delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'procedure-attachments' 
  AND auth.role() = 'authenticated'
);
```

### **Passo 4: Verificar a Configuração**

Execute o script de verificação:

```bash
node scripts/check-bucket-status.js
```

## 🔧 **Script de Verificação Automática**

Após criar o bucket, execute:

```bash
# Verificar se o bucket foi criado corretamente
node scripts/check-bucket-status.js

# Testar operações de upload/download
node scripts/setup-storage-bucket.js
```

## 📋 **Configurações Recomendadas**

### **Bucket Settings:**
- ✅ **Público**: Sim (para acesso direto às imagens)
- ✅ **Limite de tamanho**: 50MB
- ✅ **Tipos MIME permitidos**: Imagens, PDFs, Documentos

### **Políticas RLS:**
- ✅ **Leitura**: Pública (qualquer um pode ver as imagens)
- ✅ **Upload**: Apenas usuários autenticados
- ✅ **Atualização**: Apenas usuários autenticados
- ✅ **Exclusão**: Apenas usuários autenticados

## 🚀 **Após a Configuração**

1. ✅ O bucket `procedure-attachments` estará criado
2. ✅ As políticas RLS estarão configuradas
3. ✅ Os uploads de imagens funcionarão normalmente
4. ✅ As imagens serão acessíveis publicamente
5. ✅ O erro "Failed to retrieve folder contents" será resolvido

## 🔍 **Verificação Final**

Após configurar tudo, teste:

1. **Upload de uma imagem** em um procedimento
2. **Visualização da imagem** na lista de anexos
3. **Download da imagem** clicando em "Ver"

Se tudo estiver funcionando, você verá as imagens normalmente sem erros!

## ⚠️ **Nota Importante**

Se você não conseguir criar o bucket manualmente, pode ser necessário:

1. **Verificar permissões** da sua conta no Supabase
2. **Contatar o administrador** do projeto
3. **Usar a chave de service role** (se disponível) para criar via script

---

**🎯 Após seguir estes passos, o problema das imagens será completamente resolvido!**
