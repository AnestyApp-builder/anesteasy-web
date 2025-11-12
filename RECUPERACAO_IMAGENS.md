# 🔧 Recuperação de Imagens Corrompidas

## 📋 Problema Identificado

As imagens estão sendo armazenadas no Supabase Storage com tipo MIME incorreto. Por exemplo:
- Arquivo: `1760298176996-6qo7m55e3bq.jpg`
- Tipo detectado: `application/json - 2.74 MB`
- Tipo esperado: `image/jpeg`

## 🛠️ Soluções Implementadas

### **Abordagem 1: Recuperação via Storage** (Recomendada para análise completa)

#### 1. **Serviço de Recuperação** (`lib/image-recovery.ts`)
- Detecta arquivos com extensão de imagem mas tipo MIME incorreto
- Analisa o conteúdo real dos arquivos usando magic numbers
- Re-upload com tipo MIME correto
- Atualiza registros no banco de dados

#### 2. **Interface Web** (`app/admin/recover-images/page.tsx`)
- Lista arquivos corrompidos diretamente do storage
- Permite seleção individual ou em lote
- Executa recuperação com feedback visual
- Mostra resultados detalhados

#### 3. **API REST** (`app/api/recover-images/route.ts`)
- Endpoints para listar, detectar e recuperar arquivos
- Suporte a recuperação individual ou em lote
- Atualização automática do banco de dados

#### 4. **Script CLI** (`scripts/recover-images.js`)
- Execução via linha de comando
- Ideal para automação e scripts
- Logs detalhados do processo

### **Abordagem 2: Recuperação via Banco de Dados** (Recomendada para eficiência)

#### 1. **Serviço de Recuperação do Banco** (`lib/database-recovery.ts`)
- Busca anexos corrompidos diretamente da tabela `procedure_attachments`
- Mais eficiente para grandes volumes de dados
- Trabalha com metadados já conhecidos
- Atualização direta dos registros

#### 2. **Interface Web do Banco** (`app/admin/recover-from-database/page.tsx`)
- Lista anexos corrompidos baseado nos registros do banco
- Mostra estatísticas detalhadas (total, corrompidos, saudáveis)
- Interface otimizada para grandes volumes
- Recuperação baseada em IDs de anexos

#### 3. **Script CLI do Banco** (`scripts/recover-from-database.js`)
- Execução via linha de comando baseada no banco
- Comandos específicos para estatísticas e recuperação
- Logs detalhados com IDs de anexos
- Ideal para automação e monitoramento

## 🚀 Como Usar

### **Abordagem 1: Recuperação via Storage (Análise Completa)**

#### **Interface Web:**
1. **Acesse a página de recuperação:**
   ```
   https://anesteasy.com.br/admin/recover-images
   ```

2. **A página irá:**
   - Listar automaticamente todos os arquivos corrompidos do storage
   - Mostrar estatísticas (total, recuperados, com erro)
   - Permitir seleção de arquivos para recuperação

3. **Para recuperar:**
   - Selecione os arquivos desejados (ou todos)
   - Clique em "Recuperar X Arquivo(s)"
   - Aguarde o processo ser concluído
   - Veja os resultados na seção de resultados

### **Abordagem 2: Recuperação via Banco de Dados (Mais Eficiente)**

#### **Interface Web:**
1. **Acesse a página de recuperação do banco:**
   ```
   https://anesteasy.com.br/admin/recover-from-database
   ```

2. **A página irá:**
   - Mostrar estatísticas detalhadas (total, corrompidos, saudáveis)
   - Listar anexos corrompidos baseado nos registros do banco
   - Permitir seleção por ID de anexo
   - Mostrar informações do procedimento associado

3. **Para recuperar:**
   - Selecione os anexos desejados (ou todos)
   - Clique em "Recuperar X Anexo(s)"
   - Aguarde o processo ser concluído
   - Veja os resultados com links para os arquivos recuperados

### **Abordagem 3: Recuperação Direta do Storage (Recomendada)** ⭐

#### **Interface Web:**
1. **Acesse a página de recuperação direta:**
   ```
   https://anesteasy.com.br/admin/recover-direct-storage
   ```

2. **A página irá:**
   - Mostrar estatísticas em tempo real do storage
   - Listar arquivos corrompidos diretamente do storage
   - Permitir verificação individual de arquivos
   - Interface otimizada para grandes volumes

3. **Para recuperar:**
   - Selecione os arquivos desejados (ou todos)
   - Clique em "Recuperar X Arquivo(s)"
   - Aguarde o processo ser concluído
   - Veja os resultados com informações detalhadas

### **Scripts CLI**

#### **Abordagem 1: Via Storage**
1. **Listar arquivos corrompidos:**
   ```bash
   node scripts/recover-images.js --list
   ```

2. **Detectar tipo MIME de um arquivo específico:**
   ```bash
   node scripts/recover-images.js --detect-mime "user123/proc456/image.jpg"
   ```

3. **Recuperar um arquivo específico:**
   ```bash
   node scripts/recover-images.js --recover-file "user123/proc456/image.jpg"
   ```

4. **Recuperar todos os arquivos corrompidos:**
   ```bash
   node scripts/recover-images.js --recover-all
   ```

#### **Abordagem 2: Via Banco de Dados**
1. **Mostrar estatísticas:**
   ```bash
   node scripts/recover-from-database.js --stats
   ```

2. **Listar anexos corrompidos:**
   ```bash
   node scripts/recover-from-database.js --list
   ```

3. **Recuperar anexo específico:**
   ```bash
   node scripts/recover-from-database.js --recover-attachment "123e4567-e89b-12d3-a456-426614174000"
   ```

4. **Recuperar todos os anexos corrompidos:**
   ```bash
   node scripts/recover-from-database.js --recover-all
   ```

#### **Abordagem 3: Via Storage Direto (Recomendada)** ⭐
1. **Mostrar estatísticas do storage:**
   ```bash
   node scripts/recover-direct-storage.js --stats
   ```

2. **Listar arquivos corrompidos:**
   ```bash
   node scripts/recover-direct-storage.js --list
   ```

3. **Verificar status de um arquivo:**
   ```bash
   node scripts/recover-direct-storage.js --check "user123/proc456/image.jpg"
   ```

4. **Recuperar arquivo específico:**
   ```bash
   node scripts/recover-direct-storage.js --recover-file "user123/proc456/image.jpg"
   ```

5. **Recuperar todos os arquivos corrompidos:**
   ```bash
   node scripts/recover-direct-storage.js --recover-all
   ```

### **Opção 3: API REST**

1. **Listar arquivos corrompidos:**
   ```bash
   curl "https://anesteasy.com.br/api/recover-images?action=list"
   ```

2. **Detectar tipo MIME:**
   ```bash
   curl "https://anesteasy.com.br/api/recover-images?action=detect-mime&path=user123/proc456/image.jpg"
   ```

3. **Recuperar arquivos:**
   ```bash
   curl -X POST "https://anesteasy.com.br/api/recover-images" \
     -H "Content-Type: application/json" \
     -d '{"action": "recover", "filePaths": ["user123/proc456/image.jpg"]}'
   ```

## ⚖️ Comparação das Abordagens

| Aspecto | Via Storage | Via Banco de Dados | Via Storage Direto ⭐ |
|---------|-------------|-------------------|---------------------|
| **Eficiência** | Média (lista todos os arquivos) | Alta (busca direta no banco) | **Máxima** (trabalha direto no storage) |
| **Precisão** | 100% (analisa todos os arquivos) | 100% (baseado em registros conhecidos) | **100%** (análise completa do storage) |
| **Velocidade** | Mais lenta para grandes volumes | Mais rápida para grandes volumes | **Mais rápida** (otimizada para storage) |
| **Informações** | Apenas dados do storage | Dados completos (procedimento, usuário, etc.) | **Dados do storage + metadados** |
| **Uso Recomendado** | Análise completa do storage | Recuperação eficiente de anexos conhecidos | **Recuperação geral e eficiente** |
| **Recursos** | Mais uso de API do storage | Menos uso de API do storage | **Uso otimizado de API** |
| **Dependências** | Storage + Banco | Banco + Storage | **Apenas Storage** |

### **Abordagem 3: Recuperação Direta do Storage** (Mais Eficiente) ⭐

#### 1. **Serviço de Recuperação Direta** (`lib/direct-storage-recovery.ts`)
- Trabalha diretamente com o Supabase Storage
- Não depende do banco de dados para identificar arquivos
- Análise completa de todos os arquivos no storage
- Detecção automática de tipo MIME real
- Re-upload otimizado com metadados corretos

#### 2. **Interface Web Direta** (`app/admin/recover-direct-storage/page.tsx`)
- Lista arquivos corrompidos diretamente do storage
- Estatísticas em tempo real do storage
- Interface otimizada para grandes volumes
- Recuperação direta sem dependências do banco

#### 3. **Script CLI Direto** (`scripts/recover-direct-storage.js`)
- Execução via linha de comando direta do storage
- Comandos específicos para verificação e recuperação
- Logs detalhados com informações do storage
- Ideal para automação e monitoramento contínuo

### **Recomendação:**
- **Use a Abordagem 3 (Storage Direto)** ⭐ - Mais eficiente e completa
- **Use a Abordagem 1 (Storage)** se quiser análise detalhada
- **Use a Abordagem 2 (Banco)** se quiser trabalhar com anexos específicos

## 🔍 Como Funciona a Detecção

### **Magic Numbers (Assinaturas de Arquivo)**
O sistema analisa os primeiros bytes dos arquivos para detectar o tipo real:

- **JPEG**: `FF D8 FF`
- **PNG**: `89 50 4E 47 0D 0A 1A 0A`
- **GIF**: `47 49 46` (GIF87a ou GIF89a)
- **WebP**: `52 49 46 46` + `57 45 42 50` (RIFF + WEBP)
- **BMP**: `42 4D` (BM)

### **Processo de Recuperação**
1. **Download** do arquivo original
2. **Análise** do conteúdo real
3. **Criação** de novo arquivo com tipo MIME correto
4. **Upload** com nome único (sufixo `-recovered`)
5. **Atualização** dos registros no banco de dados
6. **Remoção** do arquivo original (opcional)

## 📊 Monitoramento

### **Estatísticas Disponíveis**
- Total de arquivos corrompidos encontrados
- Número de arquivos recuperados com sucesso
- Número de arquivos com erro na recuperação
- Detalhes de cada operação (sucesso/erro)

### **Logs Detalhados**
- Progresso da recuperação em tempo real
- Erros específicos para cada arquivo
- Informações sobre tipos MIME detectados
- Atualizações no banco de dados

## ⚠️ Considerações Importantes

### **Segurança**
- Os arquivos originais são mantidos até confirmação
- Novos arquivos recebem sufixo `-recovered`
- Backup automático dos registros do banco

### **Performance**
- Processamento em lotes para evitar rate limiting
- Pausas entre operações para não sobrecarregar o Supabase
- Limite de 1000 arquivos por execução

### **Limitações**
- Funciona apenas com arquivos de imagem
- Requer permissões de administrador
- Não recupera arquivos realmente corrompidos (apenas tipo MIME)

## 🆘 Solução de Problemas

### **Erro: "Arquivo não encontrado"**
- Verifique se o caminho está correto
- Confirme se o arquivo existe no bucket

### **Erro: "Rate limit exceeded"**
- Aguarde alguns minutos
- Execute em lotes menores
- Use a interface web que tem controle automático

### **Erro: "Permissão negada"**
- Verifique as credenciais do Supabase
- Confirme se o bucket é público
- Verifique as políticas RLS

### **Arquivo não é recuperado**
- Verifique se é realmente uma imagem
- Confirme se o arquivo não está corrompido
- Teste com `--detect-mime` primeiro

## 📈 Próximos Passos

1. **Execute a recuperação** usando uma das opções acima
2. **Verifique os resultados** na interface ou logs
3. **Teste o acesso** às imagens recuperadas
4. **Monitore** se novos arquivos corrompidos aparecem
5. **Implemente prevenção** no código de upload

## 🔧 Prevenção Futura

Para evitar que o problema aconteça novamente, certifique-se de que:

1. **Upload correto**: O tipo MIME seja definido corretamente no upload
2. **Validação**: Verificar o tipo MIME antes do upload
3. **Monitoramento**: Executar verificação periódica de arquivos corrompidos

---

**✅ Com esta ferramenta, você pode recuperar todas as suas imagens corrompidas de forma segura e eficiente!**
