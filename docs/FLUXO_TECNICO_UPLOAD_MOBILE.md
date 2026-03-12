# 📱 Fluxo Técnico: Cadastro de Procedimento com Imagens no Mobile

## Visão Geral

Este documento descreve o processo técnico completo de cadastro de procedimento com upload de imagens no mobile, incluindo todas as verificações, estados e operações assíncronas.

---

## 🔄 FASE 1: Seleção e Validação de Arquivos

### 1.1. Usuário Seleciona Arquivos (`handleFileUpload`)

**Trigger:** `onChange` do input file

**Processo:**
1. **Extração de arquivos:**
   ```typescript
   const files = Array.from(e.target.files || [])
   ```

2. **Validação de tipo de arquivo:**
   - Verifica tipo MIME: `application/pdf`, `image/jpeg`, `image/jpg`, `image/png`
   - Verifica extensão: `.pdf`, `.jpg`, `.jpeg`, `.png`
   - **Se inválido:** Mostra erro e retorna (não adiciona arquivo)

3. **Validação de tamanho:**
   - Verifica se `file.size === 0`
   - **Se vazio:** Mostra erro e retorna

4. **Validação de quantidade:**
   - Verifica: `formData.fichas.length + validFiles.length <= 10`
   - **Se exceder:** Mostra erro e retorna

5. **Validação utilitária:**
   - Chama `validarArquivos(todosArquivos)` (valida tipos)
   - **Se inválido:** Mostra erro e retorna

**Estado atualizado:**
- `formData.fichas`: Adiciona arquivos válidos
- `fileUploadProgress[index]`: Inicializa com `status: 'pending'`, `progress: 0`
- `previewFiles`: Cria preview usando `FileReader.readAsDataURL()`
- `uploadProgress`: Define `isUploading: true`

**Feedback:**
- `showFeedback('info', '📤 X arquivo(s) adicionado(s). Upload iniciado automaticamente...')`
- `addDebugLog('📤 Iniciando upload de X arquivo(s)', 'info')`

---

## 🚀 FASE 2: Upload Automático Paralelo

### 2.1. Inicialização do Upload Paralelo

**Trigger:** Após validação bem-sucedida

**Processo:**
1. **Cria array de promises:**
   ```typescript
   const uploadPromises = validFiles.map((file, fileIndex) => {
     const index = currentIndex + fileIndex
     return uploadSingleFile(file, index)
   })
   ```

2. **Executa em paralelo:**
   ```typescript
   const results = await Promise.all(uploadPromises)
   ```

3. **Processa resultados:**
   - Conta sucessos: `results.filter(r => r === true).length`
   - Conta falhas: `results.filter(r => r === false).length`
   - Atualiza `uploadProgress.isUploading = false` quando todos terminam

---

### 2.2. Upload Individual (`uploadSingleFile`)

**Para cada arquivo em paralelo:**

#### **Passo 1: Verificação de Autenticação**
```typescript
if (!user?.id) {
  showFeedback('error', '❌ Erro: Usuário não autenticado')
  return false
}
```
- **Se falhar:** Retorna `false`, não faz upload

#### **Passo 2: Atualização de Estado Inicial**
```typescript
setFileUploadProgress(prev => ({
  ...prev,
  [index]: {
    fileName: file.name,
    status: 'uploading',
    progress: 0
  }
}))
```
- Define status como `'uploading'`
- Progresso inicia em `0%`

#### **Passo 3: Tratamento de Nome do Arquivo**
```typescript
// Encurtar se > 100 caracteres
if (originalFileName.length > maxFileNameLength) {
  safeFileName = `${truncatedName}...${Date.now().toString().slice(-6)}.${fileExt}`
}
```
- **Problema no mobile:** Nomes de arquivos da galeria podem ser muito longos
- **Solução:** Encurta para máximo 100 caracteres

#### **Passo 4: Geração de Caminho Único**
```typescript
const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`
const tempProcedureId = `temp-${user.id.substring(0, 8)}-${Date.now()}`
const filePath = `${user.id}/${tempProcedureId}/${fileName}`
```
- Formato: `userId/temp-userId-timestamp/unique-filename.ext`
- **Exemplo:** `abc123/temp-abc123-1234567890/1234567890-xyz123.jpg`

#### **Passo 5: Determinação de Tipo MIME**
```typescript
const correctMimeType = getCorrectMimeType(safeFileName)
```
- Função síncrona (importada no topo)
- Mapeia extensão para tipo MIME correto

#### **Passo 6: Cálculo de Timeout Dinâmico**
```typescript
const fileSizeMB = file.size / (1024 * 1024)
const baseTimeout = Math.max(120000, fileSizeMB * 15000) // Mínimo 2min, +15s por MB
const uploadTimeout = Math.min(baseTimeout, 300000) // Máximo 5 minutos
```
- **Exemplo:** Arquivo de 1MB = 2min (120s)
- **Exemplo:** Arquivo de 5MB = 2min + 75s = 195s
- **Exemplo:** Arquivo de 20MB = 5min (300s - máximo)

#### **Passo 7: Chamada de Upload**
```typescript
const result = await uploadToSupabaseStorage({
  bucket: 'procedure-attachments',
  path: filePath,
  file: file,
  contentType: correctMimeType,
  timeout: uploadTimeout,
  onProgress: (progress) => { /* atualiza progresso */ }
})
```

---

### 2.3. Upload via API Route (`uploadViaAPIRoute`)

**Fluxo interno:**

#### **Passo 1: Preparação**
```typescript
const userId = path.split('/')[0] // Extrai userId do path
const formData = new FormData()
formData.append('file', file)
formData.append('userId', userId)
formData.append('filePath', path)
```

#### **Passo 2: Criação de XMLHttpRequest**
```typescript
const xhr = new XMLHttpRequest()
xhr.open('POST', '/api/upload-procedure-file')
```

**Por que XHR?**
- Suporte melhor para progresso no mobile
- Eventos `progress` mais confiáveis que Fetch API
- Melhor controle de timeout

#### **Passo 3: Event Listeners**

**a) `xhr.upload.addEventListener('progress')`:**
```typescript
if (e.lengthComputable && onProgress) {
  const uploadPercent = Math.round((e.loaded / e.total) * 100)
  const adjustedPercent = 5 + Math.round((uploadPercent * 85) / 100)
  onProgress({ loaded: e.loaded, total: e.total, percent: Math.min(90, adjustedPercent) })
}
```
- Progresso real: `0% → 90%` (deixa 10% para processamento)
- Atualiza `fileUploadProgress[index].progress`

**b) `xhr.addEventListener('load')`:**
- Verifica `xhr.status >= 200 && xhr.status < 300`
- Parse JSON da resposta
- Se sucesso: `onProgress({ percent: 100 })`
- Resolve promise com resultado

**c) `xhr.addEventListener('error')`:**
- Resolve com `success: false, error: 'Erro de rede'`

**d) `xhr.addEventListener('timeout')`:**
- Resolve com `success: false, error: 'Upload demorou muito tempo'`

#### **Passo 4: Envio**
```typescript
xhr.send(formData)
```

---

### 2.4. API Route Server-Side (`/api/upload-procedure-file`)

**Fluxo no servidor:**

1. **Recebe FormData:**
   - `file`: Arquivo binário
   - `userId`: ID do usuário
   - `filePath`: Caminho completo

2. **Validação:**
   - Verifica se `userId` existe
   - Verifica se arquivo foi recebido

3. **Upload para Supabase Storage:**
   ```typescript
   const { data, error } = await supabaseAdmin.storage
     .from('procedure-attachments')
     .upload(filePath, fileBuffer, {
       contentType: file.type,
       upsert: false
     })
   ```
   - Usa **Service Role Key** (bypass RLS)
   - Mais confiável que upload direto do cliente

4. **Geração de URL pública:**
   ```typescript
   const { data: urlData } = supabaseAdmin.storage
     .from('procedure-attachments')
     .getPublicUrl(filePath)
   ```

5. **Resposta:**
   ```json
   {
     "success": true,
     "data": {
       "path": "userId/temp-id/filename.jpg",
       "id": "...",
       "fullPath": "userId/temp-id/filename.jpg",
       "publicUrl": "https://..."
     }
   }
   ```

---

### 2.5. Processamento Pós-Upload

**Após upload bem-sucedido:**

1. **Atualização de progresso:**
   ```typescript
   setFileUploadProgress(prev => ({
     ...prev,
     [index]: {
       status: 'success',
       progress: 100
     }
   }))
   ```

2. **Verificação de conclusão:**
   ```typescript
   const completedFiles = Object.values(fileUploadProgress).filter(p => p?.status === 'success').length
   if (completedFiles >= totalFiles) {
     setUploadProgress({ isUploading: false, ... })
   }
   ```

3. **Armazenamento de metadados:**
   ```typescript
   setUploadedAttachments(prev => [...prev, {
     file_name: safeFileName,
     file_size: file.size,
     file_type: correctMimeType,
     file_url: publicUrl,
     filePath: filePath
   }])
   ```

4. **Feedback:**
   ```typescript
   showFeedback('success', `✅ ${successCount} arquivo(s) enviado(s) com sucesso!`)
   ```

---

## 💾 FASE 3: Salvamento do Procedimento

### 3.1. Trigger: Usuário Clica em "Salvar Procedimento"

**Função:** `handleSubmit(e: React.FormEvent)`

---

### 3.2. Verificações Iniciais

#### **Verificação 1: Autenticação**
```typescript
if (!user?.id) {
  showFeedback('error', '❌ Não autenticado.')
  return
}
```
- **Se falhar:** Para execução

#### **Verificação 2: Seção Atual**
```typescript
if (currentSection !== 3) {
  showFeedback('error', '⚠️ Complete todas as etapas.')
  return
}
```
- **Se falhar:** Usuário não está na etapa final

#### **Verificação 3: Uploads Ativos**
```typescript
if (formData.fichas && formData.fichas.length > 0) {
  if (uploadProgress.isUploading) {
    showFeedback('error', '⏳ Aguarde os uploads concluírem.')
    return
  }
  
  const comErro = Object.values(fileUploadProgress).filter(p => p?.status === 'error')
  if (comErro.length > 0) {
    showFeedback('error', `❌ ${comErro.length} arquivo(s) com erro.`)
    return
  }
}
```
- **Verifica:** `uploadProgress.isUploading === true`
- **Se houver uploads ativos:** Bloqueia salvamento
- **Se houver erros:** Bloqueia salvamento

#### **Verificação 4: Campos Obrigatórios**
```typescript
const camposObrigatorios = {
  'Nome': formData.nomePaciente,
  'Data': formData.dataProcedimento,
  'Procedimento': formData.tipoProcedimento,
  'Anestesia': formData.tecnicaAnestesica
}
const faltando = Object.entries(camposObrigatorios)
  .filter(([_, value]) => !value)
  .map(([key]) => key)

if (faltando.length > 0) {
  showFeedback('error', `⚠️ Campos obrigatórios: ${faltando.join(', ')}`)
  return
}
```
- **Se faltar:** Mostra quais campos faltam e para

---

### 3.3. Preparação de Dados

#### **Passo 1: Timeout de Segurança**
```typescript
const safetyTimeout = setTimeout(() => {
  setLoading(false)
  showFeedback('error', '❌ Operação demorou muito. Verifique sua conexão.')
  addDebugLog('❌ TIMEOUT: 60 segundos excedidos', 'error')
}, 60000) // 60 segundos
```
- **Timeout total:** 60 segundos
- **Se exceder:** Cancela operação e mostra erro

#### **Passo 2: Ativação de Loading**
```typescript
setLoading(true)
showFeedback('info', '⏳ Salvando procedimento...')
```

#### **Passo 3: Construção de Payload**

**Estratégia:** Adicionar apenas campos com valor (remove `undefined`/`null`)

```typescript
const procedureData: any = {
  // Campos obrigatórios (sempre presentes)
  procedure_name: formData.tipoProcedimento,
  procedure_value: parseFloat(formData.valor.replace(/[^\d,]/g, '').replace(',', '.')) || 0,
  procedure_date: formData.dataProcedimento,
  procedure_type: formData.tipoProcedimento,
  patient_name: formData.nomePaciente,
  tecnica_anestesica: formData.tecnicaAnestesica,
  user_id: user.id,
  anesthesiologist_name: user.name || 'Anônimo',
}

// Campos opcionais (apenas se tiverem valor)
if (formData.dataNascimento) {
  procedureData.data_nascimento = formData.dataNascimento
  procedureData.patient_age = parseInt(calculateAge(formData.dataNascimento))
}
// ... (outros campos condicionais)
```

**Logs:**
```typescript
console.log('[SUBMIT] 📦 Dados preparados:', Object.keys(procedureData).length, 'campos')
console.log('[SUBMIT] 📦 Payload size:', JSON.stringify(procedureData).length, 'bytes')
addDebugLog(`📦 Payload: ${(JSON.stringify(procedureData).length / 1024).toFixed(1)}KB`, 'info')
```

---

### 3.4. Criação do Procedimento com Retry

#### **Loop de Retry (Máximo 2 tentativas)**

```typescript
let result = null
let attempts = 0
const maxAttempts = 2

while (attempts < maxAttempts && !result) {
  attempts++
  
  try {
    // Timeout de 30 segundos por tentativa
    const createPromise = procedureService.createProcedure(procedureData)
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), 30000)
    })
    
    result = await Promise.race([createPromise, timeoutPromise])
    
    if (result) {
      // Sucesso!
      break
    } else {
      // Timeout - tentar novamente se não for última tentativa
      if (attempts < maxAttempts) {
        showFeedback('info', `⏳ Tentando novamente (${attempts}/${maxAttempts})...`)
        await new Promise(resolve => setTimeout(resolve, 2000)) // Pausa 2s
      }
    }
  } catch (error: any) {
    // Se for erro de rede/timeout, tentar novamente
    if (attempts < maxAttempts && (
      error?.message?.includes('network') || 
      error?.message?.includes('fetch') ||
      error?.message?.includes('timeout')
    )) {
      showFeedback('info', `⏳ Erro de conexão. Tentando novamente...`)
      await new Promise(resolve => setTimeout(resolve, 2000))
    } else {
      throw error // Re-throw se não for erro de rede
    }
  }
}
```

**Lógica de Retry:**
- **Tentativa 1:** Timeout de 30s
- **Se falhar:** Pausa 2s, tenta novamente
- **Tentativa 2:** Timeout de 30s
- **Se falhar:** Mostra erro e para

**Tratamento de Erros:**
- **Erro de rede/timeout:** Tenta novamente automaticamente
- **Outros erros:** Para e mostra erro

---

### 3.5. Processamento Pós-Criação

#### **Passo 1: Verificação de Sucesso**
```typescript
if (!result) {
  // Falha após todas as tentativas
  showFeedback('error', '❌ Não foi possível salvar. Verifique sua conexão e tente novamente.')
  return
}
```

#### **Passo 2: Criação de Link de Feedback (Não Bloqueante)**
```typescript
if (formData.enviarRelatorioCirurgiao === 'Sim' && formData.emailCirurgiao) {
  try {
    const feedbackLink = await feedbackService.createFeedbackLinkOnly({...})
    if (feedbackLink) feedbackUrl = feedbackLink
  } catch (e) {
    console.warn('[SUBMIT] ⚠️ Erro ao criar link de feedback:', e)
    // Não bloqueia - continua
  }
}
```

#### **Passo 3: Salvamento de Parcelas (Não Bloqueante)**
```typescript
if (formData.parcelas && formData.parcelas.length > 0) {
  try {
    await procedureService.createParcelas(parcelasData)
  } catch (e) {
    console.warn('[SUBMIT] ⚠️ Erro ao salvar parcelas:', e)
    // Não bloqueia - continua
  }
}
```

---

### 3.6. Vinculação de Attachments em Background

#### **Processo Não-Bloqueante**

```typescript
if (uploadedAttachments.length > 0) {
  // Background - não aguardar
  setTimeout(async () => {
    try {
      for (let i = 0; i < uploadedAttachments.length; i++) {
        const attachment = uploadedAttachments[i]
        
        try {
          await procedureService.createAttachment({
            procedure_id: result!.id,
            file_name: attachment.file_name,
            file_size: attachment.file_size,
            file_type: attachment.file_type,
            file_url: attachment.file_url
          })
          
          console.log(`[SUBMIT] ✅ Attachment ${i + 1} vinculado`)
        } catch (e) {
          console.error(`[SUBMIT] ❌ Erro attachment ${i + 1}:`, e)
          // Continua com próximo attachment
        }
        
        // Pausa entre attachments no mobile
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    } catch (e) {
      console.error('[SUBMIT] ❌ Erro ao vincular attachments:', e)
    }
  }, 1000) // Inicia após 1s
}
```

**Características:**
- **Não bloqueia:** Usa `setTimeout` (executa depois)
- **Sequencial:** Processa um attachment por vez
- **Pausa:** 500ms entre cada attachment (mobile pode ser lento)
- **Tolerante a erros:** Se um falhar, continua com os outros
- **Não afeta sucesso:** Procedimento já foi salvo

---

### 3.7. Finalização

#### **Passo 1: Preparar Modal de Sucesso**
```typescript
setSuccessData({
  paciente: formData.nomePaciente,
  procedimento: formData.tipoProcedimento,
  valor: formData.valor,
  parcelas: formData.parcelas?.length > 0 
    ? `${formData.parcelas.filter(p => p.recebida).length}/${formData.parcelas.length} recebidas`
    : 'Não parcelado',
  feedbackUrl: feedbackUrl || undefined,
  emailCirurgiao: formData.emailCirurgiao || undefined,
  telefoneCirurgiao: formData.telefoneCirurgiao || undefined
})
```

#### **Passo 2: Limpar Estados**
```typescript
clearTimeout(safetyTimeout)
setLoading(false)
setShowSuccessModal(true)
showFeedback('success', '✅ Procedimento salvo!')
addDebugLog('🎉 Procedimento salvo com sucesso!', 'success')
```

---

## 📊 Estados e Variáveis de Controle

### Estados Principais

1. **`fileUploadProgress`** (Record<number, {...}>)
   - **Chave:** Índice do arquivo na lista
   - **Valor:**
     ```typescript
     {
       fileName: string
       progress: number (0-100)
       status: 'pending' | 'uploading' | 'success' | 'error'
       error?: string
     }
     ```

2. **`uploadProgress`** (objeto)
   ```typescript
   {
     isUploading: boolean
     currentFile: number
     totalFiles: number
     currentFileName: string
     progress: number (0-100)
   }
   ```

3. **`uploadedAttachments`** (Array)
   ```typescript
   [{
     file_name: string
     file_size: number
     file_type: string
     file_url: string
     filePath: string
   }]
   ```

4. **`loading`** (boolean)
   - `true`: Salvamento em andamento
   - `false`: Não está salvando

---

## 🔍 Verificações Críticas

### Durante Upload

1. ✅ Usuário autenticado
2. ✅ Nome do arquivo não muito longo
3. ✅ Tipo MIME válido
4. ✅ Arquivo não vazio
5. ✅ Quantidade dentro do limite (10 arquivos)
6. ✅ Timeout dinâmico baseado no tamanho

### Durante Salvamento

1. ✅ Usuário autenticado
2. ✅ Seção atual = 3 (Upload)
3. ✅ Nenhum upload ativo (`uploadProgress.isUploading === false`)
4. ✅ Nenhum arquivo com erro
5. ✅ Campos obrigatórios preenchidos
6. ✅ Timeout de segurança (60s)
7. ✅ Retry automático (2 tentativas)

---

## ⚠️ Pontos de Atenção no Mobile

### 1. Nomes de Arquivo Longos
- **Problema:** Galeria do mobile gera nomes muito longos
- **Solução:** Encurta para máximo 100 caracteres

### 2. Conexão Instável
- **Problema:** Mobile pode ter conexão intermitente
- **Solução:** Retry automático com 2 tentativas

### 3. Timeout em Uploads Grandes
- **Problema:** Arquivos grandes podem demorar muito
- **Solução:** Timeout dinâmico (2min mínimo, +15s por MB, máximo 5min)

### 4. Sincronização de Estado
- **Problema:** Estado pode não atualizar imediatamente
- **Solução:** Verificação simplificada (apenas `isUploading`)

### 5. Processamento Sequencial de Attachments
- **Problema:** Múltiplos attachments podem sobrecarregar
- **Solução:** Processa sequencialmente com pausa de 500ms

---

## 📈 Fluxograma Simplificado

```
[Usuário Seleciona Arquivos]
         ↓
[Validação de Tipo/Tamanho/Quantidade]
         ↓
[Inicializa Estado: pending]
         ↓
[Upload Paralelo Inicia]
         ↓
[Para cada arquivo:]
  ├─ [Encurta nome se necessário]
  ├─ [Gera caminho único]
  ├─ [Calcula timeout dinâmico]
  ├─ [Upload via API Route (XHR)]
  │   ├─ [Progresso: 0% → 90%]
  │   ├─ [API Route faz upload para Supabase]
  │   └─ [Gera URL pública]
  ├─ [Atualiza: success, progress: 100%]
  └─ [Armazena em uploadedAttachments]
         ↓
[Todos uploads concluídos]
         ↓
[uploadProgress.isUploading = false]
         ↓
[Usuário Clica "Salvar"]
         ↓
[Verifica: isUploading === false?]
         ↓
[Prepara payload (remove undefined)]
         ↓
[Tentativa 1: Criar procedimento (30s timeout)]
         ├─ [Sucesso] → Continua
         └─ [Falha/Timeout] → Pausa 2s → Tentativa 2
         ↓
[Procedimento Criado]
         ↓
[Cria link feedback (não bloqueia)]
         ↓
[Salva parcelas (não bloqueia)]
         ↓
[Vincula attachments em background (setTimeout)]
         ↓
[Mostra Modal de Sucesso]
```

---

## 🎯 Resumo Técnico

### Upload de Arquivos
- **Método:** API Route + XMLHttpRequest
- **Estratégia:** Paralelo (todos ao mesmo tempo)
- **Progresso:** 0% → 90% (upload) → 95% (URL) → 100% (completo)
- **Timeout:** Dinâmico (2-5 minutos baseado no tamanho)
- **Armazenamento:** Supabase Storage (bucket `procedure-attachments`)

### Salvamento do Procedimento
- **Método:** Retry com 2 tentativas
- **Timeout por tentativa:** 30 segundos
- **Timeout total:** 60 segundos
- **Estratégia:** Payload limpo (sem undefined/null)
- **Attachments:** Vinculados em background (não bloqueia)

### Verificações
- **Uploads:** Apenas verifica `isUploading === false`
- **Erros:** Bloqueia se houver arquivos com erro
- **Campos:** Valida apenas obrigatórios antes de salvar

---

**Última atualização:** Baseado no código atual (versão otimizada para mobile)

