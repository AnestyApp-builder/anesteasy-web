# 📋 Passo a Passo: Cadastro de Procedimentos

Este documento detalha os dois processos de cadastro de procedimentos no sistema AnestEasy: **Cadastro Rápido** e **Novo Procedimento Completo**.

---

## 🚀 1. CADASTRO RÁPIDO DE PROCEDIMENTO

### 📍 Localização
- **Rota**: `/procedimentos/rapido`
- **Arquivo**: `app/procedimentos/rapido/page.tsx`

### ✅ Campos Obrigatórios

1. **Nome do Paciente** (`nomePaciente`)
   - Tipo: `string`
   - Validação: Não pode estar vazio ou apenas espaços

2. **Data do Procedimento** (`dataProcedimento`)
   - Tipo: `date` (formato ISO: YYYY-MM-DD)
   - Validação: 
     - Deve estar no formato ISO válido
     - Não pode ser data futura
     - Campo bloqueado para digitação manual (apenas seleção via calendário)

3. **Tipo do Procedimento** (`tipoProcedimento`)
   - Tipo: `string`
   - Opções disponíveis:
     - Cesariana
     - Parto Normal
     - Cirurgia Geral
     - Cirurgia Ortopédica
     - Cirurgia Plástica
     - Cirurgia Vascular
     - Cirurgia Neurológica
     - Cirurgia Cardíaca
     - Cirurgia Digestiva
     - Outro

4. **Técnica Anestésica** (`tecnicaAnestesica`)
   - Tipo: `string`
   - Opções disponíveis:
     - Raquianestesia (código: 30701029)
     - Anestesia Geral (código: 30701037)
     - Bloqueio Periférico (código: 30701045)
     - Sedação Consciente (código: 30701053)
     - Anestesia Regional (código: 30701061)
     - Bloqueio de Plexo (código: 30701088)
     - Anestesia Subaracnoidea (código: 30701096)
     - Anestesia Peridural (código: 30701100)
     - Bloqueio Axilar (código: 30701118)
     - Bloqueio Femoral (código: 30701126)

### 📝 Campos Opcionais

1. **Valor do Procedimento** (`valor`)
   - Tipo: `string` (formatado como moeda)
   - Conversão: Remove caracteres não numéricos e converte vírgula para ponto
   - Valor padrão: `0` se não preenchido

2. **Status do Pagamento** (`statusPagamento`)
   - Tipo: `string`
   - Opções: `'Pendente'`, `'Pago'`, `'Aguardando'`, `'Cancelado'`
   - Valor padrão: `'Pendente'`
   - Conversão para banco:
     - `'Pago'` → `'paid'`
     - `'Cancelado'` → `'cancelled'`
     - Outros → `'pending'`

3. **Secretária Vinculada** (`secretariaId`)
   - Tipo: `uuid` (opcional)
   - Carregamento: Busca secretárias vinculadas na tabela `anestesista_secretaria`
   - Auto-seleção: Se houver apenas uma secretária vinculada, é selecionada automaticamente

### 🔄 Fluxo de Processamento

#### Etapa 1: Validação de Campos
```typescript
// Validação dos campos obrigatórios
const camposObrigatorios = {
  'Nome do Paciente': formData.nomePaciente,
  'Data do Procedimento': formData.dataProcedimento,
  'Tipo do Procedimento': formData.tipoProcedimento,
  'Técnica Anestésica': formData.tecnicaAnestesica,
}
```

#### Etapa 2: Validação de Data
- Verifica formato ISO (YYYY-MM-DD)
- Verifica se não é data futura
- Retorna erro específico se inválida

#### Etapa 3: Preparação dos Dados
```typescript
const procedureData = {
  user_id: user.id,                    // Obrigatório - ID do usuário autenticado
  patient_name: formData.nomePaciente,  // Obrigatório
  procedure_date: dataISO,              // Obrigatório - formato ISO
  procedure_type: formData.tipoProcedimento,  // Obrigatório
  procedure_name: formData.tipoProcedimento,  // Obrigatório
  tecnica_anestesica: formData.tecnicaAnestesica,  // Obrigatório
  procedure_value: valorNumerico || undefined,    // Opcional
  payment_status: paymentStatus,        // Opcional (padrão: 'pending')
  forma_pagamento: 'Aguardando',        // Opcional
  secretaria_id: formData.secretariaId || undefined,  // Opcional
  data_nascimento: undefined,           // Não preenchido no cadastro rápido
  anesthesiologist_name: user.name || undefined,  // Preenchido automaticamente
}
```

#### Etapa 4: Criação do Procedimento
- Chama `procedureService.createProcedure(procedureData)`
- Aguarda resultado
- Em caso de sucesso, redireciona para `/procedimentos` após 1 segundo

### 🗄️ Tabelas e Colunas Preenchidas no Supabase

#### Tabela: `procedures`

**Colunas Obrigatórias Preenchidas:**
- `id` - UUID gerado automaticamente
- `user_id` - UUID do usuário autenticado
- `procedure_name` - Nome do procedimento (mesmo valor de `tipoProcedimento`)
- `procedure_type` - Tipo do procedimento
- `procedure_date` - Data do procedimento (formato DATE)
- `procedure_value` - Valor numérico (padrão: 0 se não informado)

**Colunas Opcionais Preenchidas:**
- `patient_name` - Nome do paciente
- `tecnica_anestesica` - Técnica anestésica selecionada
- `anesthesiologist_name` - Nome do anestesista (do usuário logado)
- `payment_status` - Status do pagamento ('pending', 'paid', 'cancelled')
- `forma_pagamento` - Forma de pagamento (padrão: 'Aguardando')
- `secretaria_id` - UUID da secretária vinculada (se selecionada)

**Colunas com Valores Padrão:**
- `created_at` - Timestamp automático
- `updated_at` - Timestamp automático
- `payment_status` - Padrão: 'pending'
- `grupo_anestesico` - Padrão: 'Nenhum'

**Colunas NÃO Preenchidas no Cadastro Rápido:**
- `patient_age`, `patient_gender`, `data_nascimento`
- `convenio`, `carteirinha`
- `nome_cirurgiao`, `especialidade_cirurgiao`, `nome_equipe`
- `hospital_clinic`, `horario`, `duracao_minutos`
- Campos de procedimento (sangramento, náusea, dor, etc.)
- Campos obstétricos (tipo_parto, tipo_cesariana, etc.)
- Campos de feedback (email_cirurgiao, telefone_cirurgiao)
- `codigo_tssu`, `numero_parcelas`, `parcelas_recebidas`

---

## 📋 2. NOVO PROCEDIMENTO COMPLETO

### 📍 Localização
- **Rota**: `/procedimentos/novo`
- **Arquivo**: `app/procedimentos/novo/page.tsx`

### 🎯 Estrutura em 4 Etapas

O cadastro completo é dividido em 4 etapas sequenciais:

1. **Etapa 0: Identificação do Procedimento**
2. **Etapa 1: Dados do Procedimento**
3. **Etapa 2: Dados Administrativos**
4. **Etapa 3: Upload de Fichas (Opcional)**

### ✅ Campos Obrigatórios

#### Etapa 0: Identificação do Procedimento

1. **Nome do Paciente** (`nomePaciente`)
   - Tipo: `string`
   - Validação: Não pode estar vazio

2. **Data do Procedimento** (`dataProcedimento`)
   - Tipo: `date` (formato brasileiro DD/MM/YYYY no formulário, convertido para ISO)
   - Validação: Não pode ser data futura

3. **Tipo do Procedimento** (`tipoProcedimento`)
   - Tipo: `string`
   - Validação: Não pode estar vazio

4. **Técnica Anestésica** (`tecnicaAnestesica`)
   - Tipo: `string`
   - Validação: Não pode estar vazio

#### Etapas 1, 2 e 3: Todos os campos são opcionais

### 📝 Campos Opcionais por Etapa

#### Etapa 0: Identificação do Procedimento

**Dados do Paciente:**
- `dataNascimento` - Data de nascimento (formato DD/MM/YYYY)
- `patientGender` - Gênero ('M', 'F', 'Other', '')
- `convenio` - Convênio
- `carteirinha` - Número da carteirinha

**Dados do Procedimento:**
- `codigoTSSU` - Código TSSU
- `grupoAnestesico` - Grupo anestésico (padrão: 'Nenhum')
- `especialidadeCirurgiao` - Especialidade do cirurgião
- `nomeCirurgiao` - Nome do cirurgião
- `nomeEquipe` - Nome da equipe
- `hospital` - Hospital/clínica
- `horario` - Horário do procedimento
- `duracaoMinutos` - Duração em minutos

#### Etapa 1: Dados do Procedimento

**Para Procedimentos Não-Obstétricos:**
- `sangramento` - 'Sim', 'Não' ou ''
- `nauseaVomito` - 'Sim', 'Não' ou ''
- `dor` - 'Sim', 'Não' ou ''
- `observacoesProcedimento` - Texto livre

**Para Procedimentos Obstétricos:**
- `acompanhamentoAntes` - 'Sim', 'Não' ou ''
- `tipoParto` - 'Instrumentalizado', 'Vaginal', 'Cesariana' ou ''
- `tipoCesariana` - 'Nova Ráqui', 'Geral', 'Complementação pelo Cateter', 'Raquianestesia' ou ''
- `indicacaoCesariana` - 'Sim', 'Não' ou ''
- `descricaoIndicacaoCesariana` - Texto livre
- `retencaoPlacenta` - 'Sim', 'Não' ou ''
- `laceracaoPresente` - 'Sim', 'Não' ou ''
- `grauLaceracao` - '1', '2', '3', '4' ou ''
- `hemorragiaPuerperal` - 'Sim', 'Não' ou ''
- `transfusaoRealizada` - 'Sim', 'Não' ou ''

**Relatório do Cirurgião:**
- `enviarRelatorioCirurgiao` - 'Sim', 'Não' ou ''
- `emailCirurgiao` - Email (obrigatório se `enviarRelatorioCirurgiao === 'Sim'`)
- `telefoneCirurgiao` - Telefone (obrigatório se `enviarRelatorioCirurgiao === 'Sim'`)

**Validação de Email:**
- Se `emailCirurgiao` for preenchido, deve ter formato válido de email

#### Etapa 2: Dados Administrativos

**Campos Financeiros:**
- `valor` - Valor do procedimento (formato moeda)
- `statusPagamento` - 'Pendente', 'Pago', 'Aguardando', 'Cancelado'
- `dataPagamento` - Data do pagamento (obrigatório se status = 'Pago')
- `formaPagamento` - Forma de pagamento
- `numero_parcelas` - Número de parcelas
- `parcelas_recebidas` - Parcelas recebidas
- `parcelas` - Array de parcelas individuais:
  ```typescript
  Array<{
    numero: number
    valor: number
    recebida: boolean
    data_recebimento: string
  }>
  ```
- `secretariaId` - UUID da secretária vinculada
- `observacoes` - Observações financeiras

**Validações Especiais:**
- Se `statusPagamento === 'Pago'`:
  - `dataPagamento` é obrigatório
  - `valor` deve ser maior que 0

#### Etapa 3: Upload de Fichas (Opcional)

- `fichas` - Array de arquivos (máximo 10 arquivos)
- Tipos permitidos: PDF, JPEG, PNG
- Cada arquivo é enviado para o Supabase Storage no bucket `procedure-attachments`
- Caminho: `{user_id}/{procedure_id}/{timestamp}-{random}.{ext}`

### 🔄 Fluxo de Processamento Completo

#### Etapa 1: Navegação entre Etapas
- Usuário pode navegar entre etapas usando botões "Próximo" e "Anterior"
- Etapas completadas podem ser acessadas novamente
- Indicador de progresso visual mostra etapa atual

#### Etapa 2: Validação Final (ao clicar em "Salvar")
```typescript
// Validação 1: Verificar se está na etapa final
if (currentSection !== 3) {
  return error('Complete todas as etapas antes de finalizar.')
}

// Validação 2: Campos obrigatórios
const camposObrigatorios = {
  'Nome do Paciente': formData.nomePaciente,
  'Data do Procedimento': formData.dataProcedimento,
  'Tipo do Procedimento': formData.tipoProcedimento,
  'Técnica Anestésica': formData.tecnicaAnestesica
}

// Validação 3: Data de nascimento (se preenchida)
if (formData.dataNascimento && !validateBirthDate(formData.dataNascimento)) {
  return error('Data de nascimento inválida: A data não pode ser futura.')
}

// Validação 4: Status Pago
if (formData.statusPagamento === 'Pago') {
  if (!formData.dataPagamento) {
    return error('Para status "Pago", é necessário informar a data do pagamento')
  }
  if (!formData.valor || parseFloat(...) <= 0) {
    return error('Para status "Pago", é necessário informar um valor válido')
  }
}

// Validação 5: Email do cirurgião (se preenchido)
if (formData.emailCirurgiao && !emailValido) {
  return error('Email do cirurgião inválido')
}
```

#### Etapa 3: Preparação dos Dados
```typescript
const procedureData = {
  // Campos obrigatórios
  procedure_name: formData.tipoProcedimento,
  procedure_value: parseFloat(formData.valor.replace(/[^\d,]/g, '').replace(',', '.')) || 0,
  procedure_date: formData.dataProcedimento || new Date().toISOString().split('T')[0],
  procedure_type: formData.tipoProcedimento,
  
  // Campos do paciente
  patient_name: formData.nomePaciente,
  patient_age: formData.dataNascimento ? parseInt(calculateAge(formData.dataNascimento)) : undefined,
  data_nascimento: formData.dataNascimento || undefined,
  convenio: formData.convenio,
  carteirinha: formData.carteirinha,
  patient_gender: formData.patientGender,
  
  // Campos da equipe
  anesthesiologist_name: user.name,
  nome_cirurgiao: formData.nomeCirurgiao,
  surgeon_name: formData.nomeCirurgiao,
  especialidade_cirurgiao: formData.especialidadeCirurgiao,
  nome_equipe: formData.nomeEquipe,
  hospital_clinic: formData.hospital,
  
  // Campos de horário e duração
  horario: formData.horario || undefined,
  procedure_time: formData.horario || undefined,
  duracao_minutos: formData.duracaoMinutos ? parseInt(formData.duracaoMinutos) : undefined,
  duration_minutes: formData.duracaoMinutos ? parseInt(formData.duracaoMinutos) : undefined,
  
  // Campos de anestesia
  tecnica_anestesica: formData.tecnicaAnestesica,
  codigo_tssu: formData.codigoTSSU,
  grupo_anestesico: formData.grupoAnestesico?.trim() || 'Nenhum',
  
  // Campos do procedimento (não-obstétrico)
  sangramento: formData.sangramento || undefined,
  nausea_vomito: formData.nauseaVomito || undefined,
  dor: formData.dor || undefined,
  observacoes_procedimento: formData.observacoesProcedimento,
  
  // Campos do procedimento (obstétrico)
  acompanhamento_antes: formData.acompanhamentoAntes || undefined,
  tipo_parto: formData.tipoParto || undefined,
  tipo_cesariana: formData.tipoCesariana || undefined,
  indicacao_cesariana: formData.indicacaoCesariana || undefined,
  descricao_indicacao_cesariana: formData.descricaoIndicacaoCesariana || undefined,
  retencao_placenta: formData.retencaoPlacenta || undefined,
  laceracao_presente: formData.laceracaoPresente || undefined,
  grau_laceracao: formData.grauLaceracao || undefined,
  hemorragia_puerperal: formData.hemorragiaPuerperal || undefined,
  transfusao_realizada: formData.transfusaoRealizada || undefined,
  
  // Campos financeiros
  payment_status: STATUS_PAGAMENTO_MAP[formData.statusPagamento] || 'pending',
  payment_date: formData.statusPagamento === 'Pago' && formData.dataPagamento ? formData.dataPagamento : undefined,
  forma_pagamento: formData.formaPagamento,
  numero_parcelas: formData.numero_parcelas ? parseInt(formData.numero_parcelas) : undefined,
  parcelas_recebidas: formData.parcelas ? formData.parcelas.filter(p => p.recebida).length : 0,
  observacoes_financeiras: formData.observacoes,
  secretaria_id: formData.secretariaId && formData.secretariaId.trim() !== '' ? formData.secretariaId : null,
  user_id: user.id,
  
  // Campos de feedback
  feedback_solicitado: formData.enviarRelatorioCirurgiao === 'Sim',
  email_cirurgiao: formData.enviarRelatorioCirurgiao === 'Sim' ? formData.emailCirurgiao : undefined,
  telefone_cirurgiao: formData.enviarRelatorioCirurgiao === 'Sim' ? formData.telefoneCirurgiao : undefined
}
```

#### Etapa 4: Criação do Procedimento
1. Chama `procedureService.createProcedure(procedureData)`
2. Aguarda resultado (timeout de 60 segundos)
3. Se solicitado relatório para cirurgião:
   - Cria link de feedback via `feedbackService.createFeedbackLinkOnly()`
4. Se houver parcelas:
   - Salva cada parcela na tabela `procedure_parcelas`
5. Se houver arquivos:
   - Para cada arquivo:
     - Converte para ArrayBuffer
     - Faz upload para Supabase Storage (`procedure-attachments`)
     - Cria registro na tabela `procedure_attachments`

### 🗄️ Tabelas e Colunas Preenchidas no Supabase

#### Tabela: `procedures`

**Colunas Obrigatórias Preenchidas:**
- `id` - UUID gerado automaticamente
- `user_id` - UUID do usuário autenticado
- `procedure_name` - Nome do procedimento
- `procedure_type` - Tipo do procedimento
- `procedure_date` - Data do procedimento (DATE)
- `procedure_value` - Valor numérico (padrão: 0)

**Colunas Opcionais Preenchidas (conforme preenchimento):**

**Dados do Paciente:**
- `patient_name` - Nome do paciente
- `patient_age` - Idade calculada (se `data_nascimento` informado)
- `patient_gender` - Gênero ('M', 'F', 'Other')
- `data_nascimento` - Data de nascimento (DATE)
- `convenio` - Convênio
- `carteirinha` - Número da carteirinha

**Dados da Equipe:**
- `anesthesiologist_name` - Nome do anestesista (do usuário logado)
- `nome_cirurgiao` - Nome do cirurgião
- `surgeon_name` - Nome do cirurgião (sincronizado com `nome_cirurgiao`)
- `especialidade_cirurgiao` - Especialidade do cirurgião
- `nome_equipe` - Nome da equipe
- `hospital_clinic` - Hospital/clínica

**Horário e Duração:**
- `horario` - Horário do procedimento (TIME)
- `procedure_time` - Horário do procedimento (sincronizado com `horario`)
- `duracao_minutos` - Duração em minutos
- `duration_minutes` - Duração em minutos (sincronizado com `duracao_minutos`)

**Anestesia:**
- `tecnica_anestesica` - Técnica anestésica
- `codigo_tssu` - Código TSSU
- `grupo_anestesico` - Grupo anestésico (padrão: 'Nenhum')
- `tipo_anestesia` - Tipo de anestesia (sincronizado com `tecnica_anestesica`)

**Procedimento Não-Obstétrico:**
- `sangramento` - 'Sim' ou 'Não'
- `nausea_vomito` - 'Sim' ou 'Não'
- `dor` - 'Sim' ou 'Não'
- `observacoes_procedimento` - Observações do procedimento
- `notes` - Observações (sincronizado com `observacoes_procedimento`)

**Procedimento Obstétrico:**
- `acompanhamento_antes` - 'Sim' ou 'Não'
- `tipo_parto` - 'Instrumentalizado', 'Vaginal' ou 'Cesariana'
- `tipo_cesariana` - 'Nova Ráqui', 'Geral', 'Complementação pelo Cateter' ou 'Raquianestesia'
- `indicacao_cesariana` - 'Sim' ou 'Não'
- `descricao_indicacao_cesariana` - Descrição da indicação
- `retencao_placenta` - 'Sim' ou 'Não'
- `laceracao_presente` - 'Sim' ou 'Não'
- `grau_laceracao` - '1', '2', '3' ou '4'
- `hemorragia_puerperal` - 'Sim' ou 'Não'
- `transfusao_realizada` - 'Sim' ou 'Não'

**Financeiro:**
- `payment_status` - 'pending', 'paid' ou 'cancelled'
- `payment_date` - Data do pagamento (DATE, se status = 'Pago')
- `forma_pagamento` - Forma de pagamento
- `numero_parcelas` - Número de parcelas
- `parcelas_recebidas` - Número de parcelas recebidas
- `observacoes_financeiras` - Observações financeiras
- `secretaria_id` - UUID da secretária vinculada

**Feedback:**
- `feedback_solicitado` - Boolean (true se `enviarRelatorioCirurgiao === 'Sim'`)
- `email_cirurgiao` - Email do cirurgião (se feedback solicitado)
- `telefone_cirurgiao` - Telefone do cirurgião (se feedback solicitado)

**Timestamps Automáticos:**
- `created_at` - Timestamp de criação
- `updated_at` - Timestamp de atualização

#### Tabela: `procedure_parcelas` (se houver parcelas)

**Colunas Preenchidas:**
- `id` - UUID gerado automaticamente
- `procedure_id` - UUID do procedimento (foreign key)
- `numero_parcela` - Número da parcela
- `valor_parcela` - Valor da parcela
- `recebida` - Boolean indicando se foi recebida
- `data_recebimento` - Data de recebimento (DATE, se recebida)
- `created_at` - Timestamp automático
- `updated_at` - Timestamp automático

#### Tabela: `procedure_attachments` (se houver arquivos)

**Colunas Preenchidas:**
- `id` - UUID gerado automaticamente
- `procedure_id` - UUID do procedimento (foreign key)
- `file_name` - Nome original do arquivo
- `file_size` - Tamanho do arquivo em bytes
- `file_type` - Tipo MIME do arquivo (application/pdf, image/jpeg, image/png)
- `file_url` - URL pública do arquivo no Supabase Storage
- `uploaded_at` - Timestamp de upload
- `created_at` - Timestamp automático
- `updated_at` - Timestamp automático

**Storage:**
- **Bucket**: `procedure-attachments`
- **Caminho**: `{user_id}/{procedure_id}/{timestamp}-{random}.{ext}`

---

## 🔍 Validações no Backend (`lib/procedures.ts`)

### Validações Obrigatórias no `createProcedure`:

1. **user_id**: Deve existir (obtido da sessão ou fornecido)
2. **procedure_date**: Não pode estar vazio
3. **procedure_name**: Não pode estar vazio
4. **procedure_type**: Não pode estar vazio
5. **patient_name**: Não pode estar vazio

### Processamento:

1. Limpeza de campos `undefined` antes da inserção
2. Conversão de valores vazios para `null`
3. Sincronização de campos duplicados:
   - `nome_cirurgiao` ↔ `surgeon_name`
   - `horario` ↔ `procedure_time`
   - `duracao_minutos` ↔ `duration_minutes`
   - `tecnica_anestesica` ↔ `tipo_anestesia`
   - `observacoes_procedimento` ↔ `notes`

4. Timeout de 20 segundos para inserção no banco
5. Tratamento de erros específicos:
   - `23505`: Violação de constraint única
   - `23503`: Violação de foreign key
   - `23502`: Campo obrigatório não preenchido
   - `42501`: Erro de permissão (RLS)
   - `PGRST301`: Política RLS bloqueando inserção

---

## 📊 Resumo Comparativo

| Aspecto | Cadastro Rápido | Novo Procedimento Completo |
|---------|----------------|---------------------------|
| **Campos Obrigatórios** | 4 campos | 4 campos (mesmos) |
| **Campos Opcionais** | 3 campos | ~50+ campos |
| **Etapas** | 1 etapa única | 4 etapas sequenciais |
| **Upload de Arquivos** | ❌ Não | ✅ Sim (até 10 arquivos) |
| **Parcelas** | ❌ Não | ✅ Sim |
| **Feedback para Cirurgião** | ❌ Não | ✅ Sim |
| **Campos Obstétricos** | ❌ Não | ✅ Sim |
| **Tempo Estimado** | ~30 segundos | ~2-5 minutos |

---

## 🔐 Segurança e Permissões

### Row Level Security (RLS)
- A tabela `procedures` possui políticas RLS
- Usuários só podem inserir procedimentos com seu próprio `user_id`
- Verificação: `auth.uid() = user_id`

### Validação de Sessão
- Verifica se usuário está autenticado antes de criar procedimento
- Timeout de 5 segundos para obter sessão
- Retorna erro se sessão não encontrada

---

## 📝 Notas Importantes

1. **Formato de Data**: 
   - Frontend usa formato brasileiro (DD/MM/YYYY) para exibição
   - Backend sempre usa formato ISO (YYYY-MM-DD) para armazenamento

2. **Formato de Valor**:
   - Frontend permite entrada com vírgula (R$ 1.234,56)
   - Backend converte para número decimal (1234.56)

3. **Campos Sincronizados**:
   - Alguns campos têm versões duplicadas para compatibilidade
   - Exemplo: `nome_cirurgiao` e `surgeon_name` sempre têm o mesmo valor

4. **Grupo Anestésico**:
   - Valor padrão: 'Nenhum'
   - Sempre preenchido, mesmo que não informado

5. **Status de Pagamento**:
   - Padrão: 'pending'
   - Se status = 'Pago', `dataPagamento` e `valor > 0` são obrigatórios

---

## 🐛 Tratamento de Erros

### Erros Comuns e Soluções:

1. **"Campos obrigatórios não preenchidos"**
   - Verificar se todos os 4 campos obrigatórios estão preenchidos

2. **"Data inválida"**
   - Verificar se a data não é futura
   - Verificar formato da data

3. **"Erro de autenticação"**
   - Fazer login novamente
   - Verificar se a sessão não expirou

4. **"Timeout ao criar procedimento"**
   - Verificar conexão com internet
   - Verificar políticas RLS no Supabase
   - Verificar se o `user_id` é válido

5. **"Erro ao fazer upload do arquivo"**
   - Verificar tamanho do arquivo
   - Verificar tipo do arquivo (PDF, JPEG, PNG)
   - Verificar permissões do bucket `procedure-attachments`

---

## 📚 Referências

- **Arquivo de Cadastro Rápido**: `app/procedimentos/rapido/page.tsx`
- **Arquivo de Cadastro Completo**: `app/procedimentos/novo/page.tsx`
- **Service de Procedimentos**: `lib/procedures.ts`
- **Tipos TypeScript**: `lib/types.ts`
- **Tabela Principal**: `procedures` (Supabase)
- **Tabelas Relacionadas**: `procedure_parcelas`, `procedure_attachments`

