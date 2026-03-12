# Correção de Problemas de Segurança RLS no Supabase

## 📋 Resumo do Problema

O Supabase Advisor identificou **87 problemas** que precisam de atenção:
- **23 problemas de SEGURANÇA**
- **64 problemas de PERFORMANCE**

### Problemas de Segurança Identificados

As seguintes tabelas estavam **públicas mas sem RLS (Row Level Security) habilitado**:

1. ✅ `public.goals` - Metas dos anestesistas
2. ✅ `public.procedure_logs` - Logs de procedimentos
3. ✅ `public.anestesista_secretaria` - Vínculos entre anestesistas e secretárias
4. ✅ `public.secretarias` - Secretárias cadastradas
5. ✅ `public.parcelas` - Parcelas de pagamento

**Problema adicional**: Algumas tabelas tinham políticas RLS criadas, mas o RLS não estava habilitado na tabela.

## 🔍 Por que isso aconteceu?

1. **Tabelas criadas manualmente**: Essas tabelas provavelmente foram criadas diretamente no Supabase Dashboard ou através de scripts SQL que não incluíram a configuração de RLS.

2. **Falta de migrações**: Não existiam migrações formais para essas tabelas no diretório `supabase/migrations/`, então o RLS nunca foi configurado de forma padronizada.

3. **Desenvolvimento rápido**: Durante o desenvolvimento, a segurança pode ter sido negligenciada para focar na funcionalidade.

## ✅ Solução Implementada

Foi criada uma migração completa (`20250116000000_fix_rls_security_issues.sql`) que:

### 1. Habilita RLS em todas as tabelas
```sql
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedure_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE anestesista_secretaria ENABLE ROW LEVEL SECURITY;
ALTER TABLE secretarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcelas ENABLE ROW LEVEL SECURITY;
```

### 2. Cria políticas RLS apropriadas para cada tabela

#### **goals** (Metas)
- Usuários podem ver/criar/atualizar/excluir apenas suas próprias metas
- Service role pode gerenciar todas as metas (para APIs administrativas)

#### **procedure_logs** (Logs de Procedimentos)
- Usuários podem ver/criar/atualizar/excluir logs apenas de seus próprios procedimentos
- Verificação através de JOIN com a tabela `procedures`

#### **anestesista_secretaria** (Vínculos)
- Anestesistas podem ver/criar/excluir vínculos onde são o anestesista
- Secretárias podem ver vínculos onde estão vinculadas
- Service role pode gerenciar todos os vínculos

#### **secretarias** (Secretárias)
- Anestesistas podem ver/criar/atualizar/excluir secretárias vinculadas a eles
- Secretárias podem ver seus próprios dados
- Service role pode gerenciar todas as secretárias

#### **parcelas** (Parcelas de Pagamento)
- Usuários podem ver/criar/atualizar/excluir parcelas apenas de seus próprios procedimentos
- Verificação através de JOIN com a tabela `procedures`

## 🚀 Como Aplicar a Correção

### Opção 1: Via Supabase CLI (Recomendado)

```bash
# Aplicar a migração
supabase db push

# Ou aplicar manualmente
supabase migration up
```

### Opção 2: Via Supabase Dashboard

1. Acesse: https://app.supabase.com
2. Vá para: **SQL Editor**
3. Abra o arquivo: `supabase/migrations/20250116000000_fix_rls_security_issues.sql`
4. Copie e cole o conteúdo no editor
5. Execute o script

### Opção 3: Via API (Service Role)

Se você tiver acesso programático, pode executar o SQL através da API do Supabase.

## ✅ Verificação Pós-Aplicação

Após aplicar a migração, verifique:

1. **RLS habilitado**: Execute no SQL Editor:
```sql
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('goals', 'procedure_logs', 'anestesista_secretaria', 'secretarias', 'parcelas');
```

Todos devem retornar `rls_enabled = true`.

2. **Políticas criadas**: Execute:
```sql
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('goals', 'procedure_logs', 'anestesista_secretaria', 'secretarias', 'parcelas')
ORDER BY tablename, cmd;
```

Deve retornar múltiplas políticas para cada tabela.

3. **Supabase Advisor**: Acesse o Advisor novamente e verifique se os problemas de segurança foram resolvidos.

## ⚠️ Problemas de Performance

Os **64 problemas de performance** identificados são principalmente relacionados a:

1. **Queries lentas**: Algumas queries estão levando mais de 1-2 segundos
2. **Falta de índices**: Algumas tabelas podem precisar de índices adicionais
3. **Queries complexas**: Algumas queries com múltiplos JOINs podem precisar de otimização

### Próximos Passos para Performance

1. Analisar as queries lentas identificadas pelo Advisor
2. Criar índices apropriados nas colunas mais consultadas
3. Otimizar queries complexas
4. Considerar materialized views para relatórios pesados

## 📝 Notas Importantes

- **Service Role**: As políticas incluem acesso total para `service_role`, que é necessário para APIs administrativas e webhooks. Isso é seguro porque o service role só pode ser usado com a chave secreta do servidor.

- **Testes**: Após aplicar a migração, teste todas as funcionalidades do sistema para garantir que as políticas RLS não quebraram nenhuma funcionalidade existente.

- **Backup**: Sempre faça backup do banco de dados antes de aplicar migrações em produção.

## 🔗 Referências

- [Documentação RLS do Supabase](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Advisor](https://supabase.com/docs/guides/platform/advisor)
- [Políticas RLS - Guia Completo](https://supabase.com/docs/guides/database/postgres/row-level-security)

