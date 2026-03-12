# Configuração do Painel Administrativo

Este documento explica como configurar e usar o painel administrativo do AnestEasy.

## 📋 Requisitos

1. Acesso ao Supabase com Service Role Key
2. Permissões para executar migrações SQL
3. Node.js instalado (para scripts)

## 🔧 Instalação

### 1. Aplicar Migração SQL

Execute a migração SQL para adicionar os campos necessários:

```sql
-- A migração está em: supabase/migrations/20250115000000_add_admin_role_and_fields.sql
```

Você pode aplicar via:
- Supabase Dashboard (SQL Editor)
- Supabase CLI: `supabase migration up`

### 2. Criar Primeira Conta Admin

**IMPORTANTE**: Edite o arquivo `scripts/create-admin-user.ts` e configure:
- Email do admin
- Senha segura

Depois execute:

```bash
# Configure as variáveis de ambiente
export SUPABASE_SERVICE_ROLE_KEY="sua-service-role-key"
export NEXT_PUBLIC_SUPABASE_URL="https://seu-projeto.supabase.co"

# Execute o script
npx ts-node scripts/create-admin-user.ts
```

**OU** crie manualmente via código:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  'https://seu-projeto.supabase.co',
  'sua-service-role-key'
)

await supabaseAdmin.auth.admin.createUser({
  email: 'admin@anesteasy.com',
  password: 'senha-super-segura',
  email_confirm: true,
  user_metadata: {
    role: 'admin',
    is_system_admin: true
  }
})

// Depois atualizar a tabela users
await supabaseAdmin
  .from('users')
  .upsert({
    id: userId,
    email: 'admin@anesteasy.com',
    name: 'Administrador',
    role: 'admin',
    is_system_admin: true,
    created_by_admin: false,
    specialty: 'Administração',
    crm: '000000',
    password_hash: '',
    subscription_plan: 'admin',
    subscription_status: 'active'
  })
```

## 🔐 Acesso ao Painel

### URL de Login

A página de login administrativo está disponível em:

```
/super-admin-login-x872k20
```

**IMPORTANTE**: Esta URL é secreta e não aparece em menus ou sitemaps.

### Dashboard

Após login bem-sucedido, você será redirecionado para:

```
/admin/dashboard
```

## 🛡️ Segurança

### Proteções Implementadas

1. **Rate Limiting**
   - Máximo 5 tentativas por email a cada 15 minutos
   - Máximo 10 tentativas por IP a cada 15 minutos

2. **Logs de Tentativas**
   - Todas as tentativas de login são registradas
   - Inclui IP, user-agent, email e resultado
   - Tabela: `admin_login_attempts`

3. **Verificação de Role**
   - Verifica `role = 'admin'`
   - Verifica `is_system_admin = true`
   - Qualquer outro valor → acesso negado

4. **Proteção de Rotas**
   - Middleware protege todas as rotas `/admin/*`
   - Componente `AdminProtectedRoute` verifica permissões no cliente

5. **Prevenção de Indexação**
   - Meta tag `noindex, nofollow` na página de login
   - URL secreta não aparece em sitemaps

### Boas Práticas

1. **Senhas Fortes**
   - Use senhas com pelo menos 16 caracteres
   - Combine letras, números e símbolos
   - Não reutilize senhas

2. **Acesso Limitado**
   - Crie apenas o número necessário de contas admin
   - Revise periodicamente quem tem acesso

3. **Monitoramento**
   - Verifique logs de tentativas regularmente
   - Configure alertas para múltiplas falhas

4. **2FA (Futuro)**
   - Implementar autenticação de dois fatores
   - Usar TOTP ou SMS

## 📊 Funcionalidades do Dashboard

O dashboard administrativo exibe:

- **Usuários Ativos**: Total e ativos nos últimos 30 dias
- **Secretárias**: Total e ativas
- **Anestesistas**: Total cadastrado
- **Procedimentos**: Total e deste mês
- **Últimos Acessos**: Últimos 10 logins com data/hora
- **Resumo Rápido**: Taxas e métricas importantes

## 🔄 Manutenção

### Limpar Logs Antigos

Os logs de tentativas são limpos automaticamente após 24 horas. Você também pode limpar manualmente:

```sql
DELETE FROM admin_login_attempts 
WHERE created_at < NOW() - INTERVAL '24 hours';
```

### Criar Novos Admins

**IMPORTANTE**: Não crie admins pelo frontend. Use sempre código server-side:

```typescript
// Via API route ou script
await supabaseAdmin.auth.admin.createUser({
  email: 'novo-admin@anesteasy.com',
  password: 'senha-segura',
  email_confirm: true,
  user_metadata: {
    role: 'admin',
    is_system_admin: true
  }
})

// Atualizar tabela users
await supabaseAdmin
  .from('users')
  .upsert({
    id: userId,
    email: 'novo-admin@anesteasy.com',
    role: 'admin',
    is_system_admin: true,
    created_by_admin: true, // Criado por outro admin
    // ... outros campos
  })
```

## 🐛 Troubleshooting

### Erro: "Acesso negado"

1. Verifique se `role = 'admin'` na tabela users
2. Verifique se `is_system_admin = true`
3. Verifique se o email está correto
4. Verifique se a senha está correta

### Erro: "Rate limit excedido"

1. Aguarde 15 minutos
2. Verifique logs em `admin_login_attempts`
3. Se necessário, limpe o cache de rate limiting (reiniciar servidor)

### Erro: "Configuração do servidor inválida"

1. Verifique se `SUPABASE_SERVICE_ROLE_KEY` está configurada
2. Verifique se a key está correta
3. Verifique permissões da key

## 📝 Notas Importantes

- A URL `/super-admin-login-x872k20` é secreta - não compartilhe publicamente
- Todas as tentativas de login são registradas
- O rate limiting protege contra brute force
- Admins têm acesso total ao sistema - use com cuidado
- Revise periodicamente quem tem acesso admin

## 🔮 Melhorias Futuras

- [ ] Autenticação de dois fatores (2FA)
- [ ] Dashboard de logs de tentativas
- [ ] Alertas por email para tentativas suspeitas
- [ ] Histórico de ações administrativas
- [ ] Permissões granulares (read-only, etc.)

