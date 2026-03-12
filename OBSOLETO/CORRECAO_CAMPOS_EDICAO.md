# ✅ Correção: Campos Não Salvos na Edição

## 🎯 Problema Identificado

Os seguintes campos não estavam sendo salvos corretamente quando o procedimento era criado:

1. **`patient_gender`** (Sexo do Paciente) - ✅ Já estava correto
2. **`procedure_time`** (Horário) - ❌ Não estava sendo salvo
3. **`duration_minutes`** (Duração) - ❌ Não estava sendo salvo

### Causa Raiz:

O banco de dados tem **campos duplicados** para horário e duração:
- `horario` e `procedure_time` (ambos time)
- `duracao_minutos` e `duration_minutes` (ambos integer)

Quando salvávamos na página de criação, estávamos salvando apenas em:
- `horario` (mas a página de edição lê `procedure_time`)
- `duracao_minutos` (mas a página de edição lê `duration_minutes`)

---

## 🔧 Correções Aplicadas

### 1. **Sincronização de Campos de Horário**

**Arquivo**: `app/procedimentos/novo/page.tsx`

**Antes**:
```javascript
horario: formData.horario || undefined,
duracao_minutos: formData.duracaoMinutos ? Math.round(parseFloat(formData.duracaoMinutos) * 60) : undefined,
```

**Depois**:
```javascript
horario: formData.horario || undefined,
procedure_time: formData.horario || undefined, // Sincronizar com horario
duracao_minutos: formData.duracaoMinutos ? parseInt(formData.duracaoMinutos) : undefined,
duration_minutes: formData.duracaoMinutos ? parseInt(formData.duracaoMinutos) : undefined, // Sincronizar
```

### 2. **Correção da Conversão de Duração**

**Problema**: O código estava multiplicando por 60, mas o campo já está em minutos!

**Antes**:
```javascript
duracao_minutos: formData.duracaoMinutos ? Math.round(parseFloat(formData.duracaoMinutos) * 60) : undefined,
// Se usuário digita "120" minutos, vira 7200 minutos! ❌
```

**Depois**:
```javascript
duracao_minutos: formData.duracaoMinutos ? parseInt(formData.duracaoMinutos) : undefined,
// Se usuário digita "120" minutos, fica 120 minutos! ✅
```

### 3. **Sincronização no Service**

**Arquivo**: `lib/procedures.ts`

**Adicionado**:
```javascript
// Campos de horário e duração
horario: procedure.horario || null,
procedure_time: procedure.horario || procedure.procedure_time || null, // Sincronizar
duracao_minutos: procedure.duracao_minutos || null,
duration_minutes: procedure.duracao_minutos || null, // Sincronizar
```

---

## 📊 Campos do Banco de Dados

### Colunas de Horário (4 colunas):
- ✅ `horario` - time (usado na criação)
- ✅ `procedure_time` - time (usado na edição)
- ⚠️ `hora_inicio` - time (não usado)
- ⚠️ `hora_termino` - time (não usado)

### Colunas de Duração (2 colunas):
- ✅ `duracao_minutos` - integer (usado na criação)
- ✅ `duration_minutes` - integer (usado na edição)

---

## ✅ Resultado Final

### Antes:
```
❌ procedure_time não era salvo
❌ duration_minutes não era salvo
❌ Duração era multiplicada por 60 (erro!)
❌ Campos vazios na página de edição
```

### Depois:
```
✅ procedure_time sincronizado com horario
✅ duration_minutes sincronizado com duracao_minutos
✅ Duração salva corretamente (sem multiplicação)
✅ Todos os campos aparecem na edição
```

---

## 🧪 Como Testar

1. **Criar Novo Procedimento**:
   - Clique em "🧪 Preencher Teste"
   - Verifique que `patient_gender`, `horario` e `duracaoMinutos` estão preenchidos
   - Clique em "Salvar"

2. **Editar Procedimento**:
   - Abra o procedimento salvo
   - Verifique que os campos aparecem preenchidos:
     - ✅ Sexo do Paciente: Feminino
     - ✅ Horário: 14:30
     - ✅ Duração (minutos): 120

3. **Editar e Salvar**:
   - Altere algum campo
   - Salve
   - Verifique que as alterações foram persistidas

---

## 📝 Notas Técnicas

### Por Que Havia Campos Duplicados?

O banco de dados foi evoluindo e alguns campos foram adicionados sem remover os antigos. Para manter compatibilidade, ambos os campos são preenchidos agora.

### Solução Futura (Opcional):

1. **Criar Trigger no Banco** para sincronizar automaticamente:
```sql
CREATE OR REPLACE FUNCTION sync_procedure_time()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.horario IS NOT NULL AND NEW.procedure_time IS NULL THEN
    NEW.procedure_time := NEW.horario;
  ELSIF NEW.procedure_time IS NOT NULL AND NEW.horario IS NULL THEN
    NEW.horario := NEW.procedure_time;
  END IF;
  
  IF NEW.duracao_minutos IS NOT NULL AND NEW.duration_minutes IS NULL THEN
    NEW.duration_minutes := NEW.duracao_minutos;
  ELSIF NEW.duration_minutes IS NOT NULL AND NEW.duracao_minutos IS NULL THEN
    NEW.duracao_minutos := NEW.duration_minutes;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_procedure_fields
BEFORE INSERT OR UPDATE ON procedures
FOR EACH ROW
EXECUTE FUNCTION sync_procedure_time();
```

2. **Ou remover campos duplicados** (requer migração de dados)

---

## ✅ Status: CORRIGIDO

Todos os campos agora são salvos corretamente e aparecem na página de edição! 🎉

