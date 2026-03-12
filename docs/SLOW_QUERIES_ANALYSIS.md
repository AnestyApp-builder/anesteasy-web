# Análise de Slow Queries no Supabase

## 📊 O que são Slow Queries?

**Slow Queries** (Queries Lentas) são consultas SQL que demoram mais tempo do que o ideal para serem executadas. O Supabase monitora essas queries através da extensão `pg_stat_statements` do PostgreSQL.

### Como o Supabase identifica Slow Queries?

O Supabase usa a tabela `pg_stat_statements` que:
- Registra todas as queries executadas
- Mede o tempo de execução de cada query
- Conta quantas vezes cada query foi executada
- Identifica queries que consomem mais recursos

**Fonte**: [Supabase Query Performance Report](https://supabase.com/dashboard/project/zmtwwajyhusyrugobxur/reports/query-performance)

---

## 🔍 Análise das Queries do Projeto

### Queries Mais Executadas (Possíveis N+1 Queries)

| Query | Execuções | Tempo Médio | Tempo Total | Problema Potencial |
|-------|-----------|-------------|-------------|-------------------|
| `SELECT wal->>$5 as type...` | 62.166 | 3.76ms | 233.77s | Query do sistema (WAL) |
| `notifications` SELECT | 28.225 | 0.048ms | 1.35s | Muitas verificações |
| `procedure_attachments` SELECT | 7.375 | 0.35ms | 2.56s | Possível N+1 |
| `parcelas` SELECT | 7.075 | 0.052ms | 0.37s | Queries frequentes |
| `secretarias` SELECT | 3.530 | 0.051ms | 0.18s | Verificações de autenticação |

### Problemas Identificados

#### 1. **Query de WAL (Write-Ahead Log) - 62.166 execuções**
```
SELECT wal->>$5 as type, wal->>$6 as schema, wal->>$7 as table...
```
- **Tempo médio**: 3.76ms
- **Tempo total**: 233.77 segundos
- **Causa**: Query do sistema do Supabase para monitoramento
- **Ação**: Não requer ação - é uma query interna do Supabase

#### 2. **Queries em `notifications` - 28.225 execuções**
- **Problema**: Muitas verificações de notificações
- **Causa provável**: Verificação em cada carregamento de página
- **Solução**: Implementar cache ou verificar apenas quando necessário

#### 3. **Queries em `procedure_attachments` - 7.375 execuções**
- **Tempo médio**: 0.35ms (aceitável, mas muitas execuções)
- **Causa provável**: Carregamento de anexos junto com procedimentos
- **Solução**: Carregar anexos sob demanda (lazy loading)

#### 4. **Queries em `parcelas` - 7.075 execuções**
- **Causa provável**: Cálculo de estatísticas financeiras
- **Solução**: Otimizar queries ou usar cache

---

## 🎯 Queries que Precisam de Otimização

### 1. Verificação de Notificações

**Problema**: Query executada 28.225 vezes

**Código atual** (provavelmente em `AuthContext` ou similar):
```typescript
// Verificação frequente de notificações
const { data } = await supabase
  .from('notifications')
  .select('*')
  .eq('user_id', userId)
  .eq('is_read', false)
```

**Solução**:
```typescript
// 1. Verificar apenas quando necessário (não em cada render)
useEffect(() => {
  // Verificar apenas quando o usuário está ativo
  const interval = setInterval(() => {
    checkNotifications()
  }, 30000) // A cada 30 segundos, não em cada render
  
  return () => clearInterval(interval)
}, [])

// 2. Usar cache
const [notificationsCache, setNotificationsCache] = useState([])
```

### 2. Carregamento de Anexos

**Problema**: Query executada 7.375 vezes

**Solução**: Lazy loading de anexos
```typescript
// Não carregar anexos automaticamente
// Carregar apenas quando o usuário expandir o procedimento
const loadAttachments = async (procedureId: string) => {
  const { data } = await supabase
    .from('procedure_attachments')
    .select('*')
    .eq('procedure_id', procedureId)
}
```

### 3. Queries de Parcelas

**Problema**: Query executada 7.075 vezes

**Solução**: Otimizar cálculo de estatísticas
```typescript
// Em vez de calcular parcelas para cada procedimento separadamente
// Calcular tudo de uma vez
const { data: parcelas } = await supabase
  .from('parcelas')
  .select('*')
  .in('procedure_id', procedureIds) // Múltiplos IDs de uma vez
```

---

## 📈 Índices Recomendados

Verificar se existem índices nas colunas mais consultadas:

```sql
-- Verificar índices existentes
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('notifications', 'procedure_attachments', 'parcelas', 'secretarias')
ORDER BY tablename, indexname;

-- Criar índices se não existirem
CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
ON notifications(user_id, is_read) 
WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_procedure_attachments_procedure 
ON procedure_attachments(procedure_id);

CREATE INDEX IF NOT EXISTS idx_parcelas_procedure 
ON parcelas(procedure_id);

CREATE INDEX IF NOT EXISTS idx_secretarias_email 
ON secretarias(email);
```

---

## 🔧 Otimizações Recomendadas

### 1. Implementar Cache de Notificações

```typescript
// contexts/NotificationsContext.tsx
const NOTIFICATIONS_CACHE_TTL = 30000 // 30 segundos

let notificationsCache: {
  data: Notification[]
  timestamp: number
} | null = null

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  
  const fetchNotifications = async () => {
    const now = Date.now()
    
    // Usar cache se ainda válido
    if (notificationsCache && (now - notificationsCache.timestamp) < NOTIFICATIONS_CACHE_TTL) {
      setNotifications(notificationsCache.data)
      return
    }
    
    // Buscar do banco
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
    
    notificationsCache = {
      data: data || [],
      timestamp: now
    }
    
    setNotifications(data || [])
  }
}
```

### 2. Lazy Loading de Anexos

```typescript
// Carregar anexos apenas quando necessário
const [attachments, setAttachments] = useState<Record<string, Attachment[]>>({})
const [loadingAttachments, setLoadingAttachments] = useState<Set<string>>(new Set())

const loadAttachments = async (procedureId: string) => {
  if (attachments[procedureId] || loadingAttachments.has(procedureId)) {
    return // Já carregado ou carregando
  }
  
  setLoadingAttachments(prev => new Set(prev).add(procedureId))
  
  const { data } = await supabase
    .from('procedure_attachments')
    .select('*')
    .eq('procedure_id', procedureId)
  
  setAttachments(prev => ({
    ...prev,
    [procedureId]: data || []
  }))
  
  setLoadingAttachments(prev => {
    const next = new Set(prev)
    next.delete(procedureId)
    return next
  })
}
```

### 3. Batch Queries para Parcelas

```typescript
// Em vez de:
procedures.forEach(async (proc) => {
  const parcelas = await getParcelas(proc.id) // N queries
})

// Fazer:
const procedureIds = procedures.map(p => p.id)
const { data: allParcelas } = await supabase
  .from('parcelas')
  .select('*')
  .in('procedure_id', procedureIds) // 1 query

// Agrupar por procedure_id
const parcelasByProcedure = allParcelas.reduce((acc, parcela) => {
  if (!acc[parcela.procedure_id]) {
    acc[parcela.procedure_id] = []
  }
  acc[parcela.procedure_id].push(parcela)
  return acc
}, {} as Record<string, Parcela[]>)
```

---

## 📊 Monitoramento Contínuo

### Como Verificar Slow Queries

1. **Via Dashboard Supabase**:
   - Acesse: https://supabase.com/dashboard/project/zmtwwajyhusyrugobxur/reports/query-performance
   - Veja queries mais lentas e mais executadas

2. **Via SQL**:
```sql
-- Queries mais lentas
SELECT 
  query,
  calls,
  mean_exec_time,
  total_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100 -- Mais de 100ms
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Queries mais executadas
SELECT 
  LEFT(query, 100) as query_preview,
  calls,
  mean_exec_time
FROM pg_stat_statements
WHERE calls > 1000
ORDER BY calls DESC
LIMIT 20;
```

---

## ✅ Checklist de Otimização

- [ ] Implementar cache de notificações
- [ ] Implementar lazy loading de anexos
- [ ] Otimizar queries de parcelas (batch queries)
- [ ] Verificar e criar índices necessários
- [ ] Reduzir frequência de verificações de autenticação
- [ ] Monitorar queries após otimizações
- [ ] Documentar mudanças de performance

---

## 📚 Referências

- [Supabase Query Performance](https://supabase.com/dashboard/project/zmtwwajyhusyrugobxur/reports/query-performance)
- [PostgreSQL pg_stat_statements](https://www.postgresql.org/docs/current/pgstatstatements.html)
- [Supabase Performance Best Practices](https://supabase.com/docs/guides/database/performance)

---

**Última análise**: 2025-01-16  
**Próxima revisão recomendada**: Após implementar otimizações

