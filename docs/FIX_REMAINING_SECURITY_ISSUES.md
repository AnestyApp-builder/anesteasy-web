# Correção de Problemas de Segurança Restantes

## ✅ Problemas Corrigidos via Migração

### 1. Function Search Path Mutable (14 funções corrigidas)

**Status**: ✅ **CORRIGIDO**

Todas as 14 funções que tinham `search_path` mutável foram corrigidas:

#### Funções de Trigger (7 funções)
- ✅ `update_subscriptions_updated_at`
- ✅ `update_payment_transactions_updated_at`
- ✅ `update_pagarme_plans_updated_at`
- ✅ `update_system_stats_updated_at`
- ✅ `update_secretaria_invites_updated_at`
- ✅ `update_link_requests_updated_at`
- ✅ `update_updated_at_column`

#### Funções de Autenticação (2 funções)
- ✅ `register_user`
- ✅ `login_user`

#### Funções de Estatísticas (4 funções)
- ✅ `calculate_system_stats`
- ✅ `get_system_stats`
- ✅ `get_user_stats`
- ✅ `generate_monthly_report`

#### Funções de Email (1 função)
- ✅ `send_feedback_email`

**Solução aplicada**: Todas as funções agora têm `SET search_path = ''` ou `SET search_path = public` definido, prevenindo vulnerabilidades de injeção através de schemas maliciosos.

---

## ⚠️ Problemas que Requerem Ajuste Manual no Dashboard

Os seguintes problemas **não podem ser corrigidos via código** e precisam ser ajustados manualmente no Supabase Dashboard:

### 1. Auth OTP Long Expiry

**Problema**: OTP de email com expiração muito longa (mais de 1 hora)

**Nível**: WARN  
**Categoria**: SECURITY

**Como corrigir**:
1. Acesse: https://app.supabase.com
2. Vá para: **Authentication** → **Settings** → **Email Auth**
3. Localize: **OTP Expiry** ou **Email OTP Expiry**
4. Altere para: **3600 segundos (1 hora)** ou menos (recomendado: **1800 segundos = 30 minutos**)
5. Salve as alterações

**Documentação**: https://supabase.com/docs/guides/platform/going-into-prod#security

---

### 2. Leaked Password Protection Disabled

**Problema**: Proteção contra senhas vazadas (HaveIBeenPwned) está desabilitada

**Nível**: WARN  
**Categoria**: SECURITY

**Como corrigir**:
1. Acesse: https://app.supabase.com
2. Vá para: **Authentication** → **Settings** → **Password**
3. Localize: **Leaked Password Protection** ou **Password Strength**
4. **Habilite** a opção "Check passwords against HaveIBeenPwned database"
5. Salve as alterações

**Documentação**: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

**Benefício**: Previne que usuários usem senhas que foram vazadas em breaches conhecidos.

---

### 3. Vulnerable Postgres Version

**Problema**: Versão do Postgres tem patches de segurança disponíveis

**Nível**: WARN  
**Categoria**: SECURITY

**Versão atual**: `supabase-postgres-17.4.1.075`  
**Status**: Tem patches de segurança disponíveis

**Como corrigir**:
1. Acesse: https://app.supabase.com
2. Vá para: **Settings** → **Infrastructure** → **Database**
3. Verifique se há atualizações disponíveis
4. Se houver, **agende uma atualização** (pode requerer downtime)
5. **IMPORTANTE**: Faça backup antes de atualizar

**Documentação**: https://supabase.com/docs/guides/platform/upgrading

**Nota**: Atualizações de Postgres geralmente são seguras, mas é recomendado:
- Fazer backup completo antes
- Testar em ambiente de staging primeiro (se disponível)
- Agendar para horário de baixo tráfego

---

## 📊 Resumo dos Problemas

| Problema | Status | Tipo | Ação Necessária |
|----------|--------|------|-----------------|
| Function Search Path Mutable (14 funções) | ✅ Corrigido | Código | Migração aplicada |
| Auth OTP Long Expiry | ⚠️ Pendente | Config | Ajustar no Dashboard |
| Leaked Password Protection | ⚠️ Pendente | Config | Habilitar no Dashboard |
| Vulnerable Postgres Version | ⚠️ Pendente | Infra | Atualizar Postgres |

---

## 🎯 Prioridade de Correção

### Alta Prioridade (Segurança Crítica)
1. ✅ **Function Search Path Mutable** - JÁ CORRIGIDO
2. ⚠️ **Leaked Password Protection** - Habilitar o quanto antes
3. ⚠️ **Auth OTP Long Expiry** - Reduzir para 30 minutos

### Média Prioridade (Manutenção)
4. ⚠️ **Vulnerable Postgres Version** - Agendar atualização

---

## 📝 Checklist de Ações

- [x] Corrigir Function Search Path Mutable (via migração)
- [ ] Ajustar OTP Expiry no Dashboard
- [ ] Habilitar Leaked Password Protection no Dashboard
- [ ] Agendar atualização do Postgres (se disponível)
- [ ] Verificar Supabase Advisor após correções
- [ ] Testar autenticação após ajustes
- [ ] Documentar alterações feitas

---

## 🔍 Verificação Pós-Correção

Após fazer os ajustes manuais, verifique:

1. **Supabase Advisor**: Acesse o Advisor e confirme que os problemas foram resolvidos
2. **Testes de Autenticação**: 
   - Teste login/logout
   - Teste registro de novos usuários
   - Teste recuperação de senha
   - Verifique se senhas vazadas são rejeitadas
3. **OTP Expiry**: Teste se OTPs expiram no tempo correto

---

## 📚 Referências

- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/going-into-prod#security)
- [Password Security Guide](https://supabase.com/docs/guides/auth/password-security)
- [Database Linter Documentation](https://supabase.com/docs/guides/database/database-linter)
- [Upgrading Postgres](https://supabase.com/docs/guides/platform/upgrading)

---

**Última atualização**: 2025-01-16  
**Migração aplicada**: `fix_function_search_path_security`

