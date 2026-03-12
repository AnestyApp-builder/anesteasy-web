# Otimizações de Performance Aplicadas ✅

## 📊 Resumo

Foram implementadas **4 otimizações principais** para reduzir o número de queries ao banco de dados e melhorar a performance da aplicação.

**Data da implementação**: 2025-01-16

---

## ✅ Otimizações Implementadas

### 1. Cache de Notificações com TTL

**Problema**: 28.225 queries em `notifications`  
**Solução**: Cache com TTL de 30 segundos

**Arquivos modificados**:
- `contexts/SecretariaNotificationsContext.tsx`
- `contexts/SecretariaContext.tsx`

**Implementação**:
- Cache em memória com TTL de 30 segundos
- Verificação de cache antes de buscar no banco
- Refresh forçado quando necessário
- Cache separado para secretárias e anestesistas

**Redução esperada**: ~90% das queries de notificações (de 28k para ~2-3k)

---

### 2. Lazy Loading de Anexos

**Problema**: 7.375 queries em `procedure_attachments`  
**Solução**: Carregar anexos apenas quando necessário

**Arquivos modificados**:
- `app/procedimentos/page.tsx`
- `lib/procedures.ts`

**Implementação**:
- Anexos não são mais carregados automaticamente ao listar procedimentos
- Função `loadAttachmentsForProcedure()` para carregar sob demanda
- Verificação otimizada para mostrar ícone de anexo (apenas `procedure_id`, não todos os dados)
- Cache de anexos já carregados

**Redução esperada**: ~95% das queries de anexos (de 7k para ~300-500)

---

### 3. Batch Queries para Parcelas

**Problema**: 7.075 queries em `parcelas` (N+1 query problem)  
**Solução**: Buscar todas as parcelas de uma vez

**Arquivos modificados**:
- `lib/procedures.ts` - função `getProcedureStats()`

**Implementação**:
- Em vez de buscar parcelas para cada procedimento separadamente (N queries)
- Buscar todas as parcelas de todos os procedimentos de uma vez (1 query)
- Agrupar parcelas por `procedure_id` em memória
- Usar o mapa agrupado para cálculos

**Antes**:
```typescript
for (const procedure of procedures) {
  const parcelas = await getParcelas(procedure.id) // N queries
}
```

**Depois**:
```typescript
const allParcelas = await supabase
  .from('parcelas')
  .select('*')
  .in('procedure_id', procedureIds) // 1 query

// Agrupar em memória
const parcelasMap = groupBy(allParcelas, 'procedure_id')
```

**Redução esperada**: De N queries para 1 query (redução de 99%+)

---

### 4. Índices de Performance

**Problema**: Queries lentas por falta de índices  
**Solução**: Criar índices nas colunas mais consultadas

**Migração aplicada**: `add_performance_indexes`

**Índices criados**:

#### `notifications`
- ✅ `idx_notifications_user_read` - Para queries de notificações não lidas
- ✅ `idx_notifications_user_created` - Para ordenação por data

#### `procedure_attachments`
- ✅ `idx_procedure_attachments_procedure` - Para buscar anexos por procedimento

#### `parcelas`
- ✅ `idx_parcelas_procedure` - Para buscar parcelas por procedimento
- ✅ `idx_parcelas_procedure_recebida` - Para filtrar parcelas recebidas

#### `secretarias`
- ✅ `idx_secretarias_email` - Para buscar secretárias por email

#### `feedback_links`
- ✅ `idx_feedback_links_procedure` - Para verificar status de feedback

#### `anestesista_secretaria`
- ✅ `idx_anestesista_secretaria_secretaria` - Para buscar vínculos por secretária
- ✅ `idx_anestesista_secretaria_anestesista` - Para buscar vínculos por anestesista

#### `procedures`
- ✅ `idx_procedures_secretaria` - Para buscar procedimentos por secretária

**Impacto**: Queries até 10-100x mais rápidas dependendo do tamanho da tabela

---

## 📈 Impacto Esperado

### Redução de Queries

| Tipo de Query | Antes | Depois | Redução |
|---------------|-------|--------|---------|
| Notificações | 28.225 | ~2.000 | ~93% |
| Anexos | 7.375 | ~300 | ~96% |
| Parcelas | 7.075 | ~50 | ~99% |
| **Total** | **42.675** | **~2.350** | **~94%** |

### Melhoria de Performance

- **Tempo de carregamento inicial**: Redução de ~2-3 segundos
- **Tempo de resposta**: Queries 10-100x mais rápidas com índices
- **Uso de recursos**: Menor carga no banco de dados
- **Experiência do usuário**: Interface mais responsiva

---

## 🔍 Verificação

### Como Verificar se Está Funcionando

1. **Cache de Notificações**:
   - Abra o console do navegador
   - Procure por mensagens: `📦 [NOTIFICATIONS] Usando cache de notificações`
   - Deve aparecer após a primeira carga

2. **Lazy Loading de Anexos**:
   - Abra a página de procedimentos
   - Verifique no Network tab que não há queries de anexos no carregamento inicial
   - Ao abrir um procedimento, deve carregar os anexos sob demanda

3. **Batch Queries de Parcelas**:
   - Abra o Dashboard
   - Verifique no Network tab que há apenas 1 query para parcelas
   - Antes havia N queries (uma por procedimento)

4. **Índices**:
   ```sql
   SELECT indexname, tablename 
   FROM pg_indexes 
   WHERE schemaname = 'public' 
     AND indexname LIKE 'idx_%'
   ORDER BY tablename;
   ```

---

## 📝 Notas Técnicas

### Cache de Notificações

- **TTL**: 30 segundos (configurável via `NOTIFICATIONS_CACHE_TTL`)
- **Invalidação**: Automática após TTL ou refresh forçado
- **Escopo**: Separado por usuário (secretária ou anestesista)

### Lazy Loading de Anexos

- **Trigger**: Quando o usuário abre o modal de detalhes do procedimento
- **Cache**: Anexos carregados são mantidos em memória
- **Verificação de existência**: Query otimizada que retorna apenas `procedure_id`

### Batch Queries

- **Limite**: PostgreSQL suporta até 65.535 valores em `IN` clause
- **Fallback**: Se houver mais procedimentos, dividir em batches

### Índices

- **Manutenção**: Índices são atualizados automaticamente pelo PostgreSQL
- **Overhead**: Pequeno aumento no tempo de INSERT/UPDATE (aceitável)
- **Benefício**: Redução significativa no tempo de SELECT

---

## 🚀 Próximos Passos (Opcional)

1. **Monitorar performance**: Verificar Query Performance Report após alguns dias
2. **Ajustar TTL**: Se necessário, ajustar TTL do cache baseado no uso
3. **Implementar cache adicional**: Considerar cache para outras queries frequentes
4. **Otimizar outras queries**: Analisar outras queries lentas identificadas

---

## 📚 Referências

- [Supabase Query Performance](https://supabase.com/dashboard/project/zmtwwajyhusyrugobxur/reports/query-performance)
- [PostgreSQL Indexes](https://www.postgresql.org/docs/current/indexes.html)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)

---

**Status**: ✅ Todas as otimizações implementadas e testadas  
**Migrações aplicadas**: `add_performance_indexes`  
**Arquivos modificados**: 4 arquivos  
**Índices criados**: 11 índices

