# Passo a Passo Pós-Migration

## ✅ Passo 1: SQL Executado
Você já executou a migration `20240101000007_create_pagarme_plans.sql` ✅

## 📋 Passo 2: Criar Planos na Pagar.me

### Opção A: Via Browser (Recomendado)
1. Faça login na aplicação
2. Abra o console do navegador (F12)
3. Execute:
```javascript
fetch('/api/pagarme/plans', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token') || 'SEU_TOKEN_AQUI'}`
  }
})
.then(r => r.json())
.then(data => console.log('Planos criados:', data))
.catch(err => console.error('Erro:', err))
```

### Opção B: Via Terminal/Postman
```bash
# Obter token do Supabase primeiro (faça login na aplicação)
# Depois execute:
curl -X GET http://localhost:3000/api/pagarme/plans \
  -H "Authorization: Bearer SEU_TOKEN_SUPABASE"
```

### Opção C: Criar Endpoint de Inicialização
Criar um endpoint simples que não precisa de autenticação (apenas para desenvolvimento):
- `/api/pagarme/plans/init` - Cria os planos sem autenticação

## 🔔 Passo 3: Configurar Webhook na Pagar.me

1. Acesse o dashboard da Pagar.me
2. Vá em **Configurações** → **Webhooks**
3. Adicione uma nova URL:
   - **URL**: `https://seu-dominio.com/api/pagarme/webhook`
   - **Eventos a selecionar**:
     - ✅ `subscription.created`
     - ✅ `subscription.activated`
     - ✅ `subscription.payment_succeeded`
     - ✅ `subscription.payment_failed`
     - ✅ `subscription.canceled`
     - ✅ `subscription.expired`
4. Salve o webhook

## 🧪 Passo 4: Testar Fluxo Completo

### 4.1. Testar Criação de Planos
```bash
# Verificar se os planos foram criados
GET /api/pagarme/plans
```

### 4.2. Testar Criação de Assinatura
1. Acesse `/planos` na aplicação
2. Clique em "Assinar Agora" em qualquer plano
3. Você será redirecionado para o checkout da Pagar.me
4. Use dados de teste:
   - **Cartão**: `4111 1111 1111 1111`
   - **Validade**: `12/25`
   - **CVV**: `123`
   - **Nome**: `TESTE APROVADO`
   - **CPF**: Qualquer CPF válido

### 4.3. Verificar Webhook
Após completar o pagamento:
1. Verifique os logs do servidor
2. Deve aparecer: `🔔 Webhook recebido: subscription.activated`
3. Verifique no Supabase se a assinatura foi atualizada

### 4.4. Verificar Assinatura no Supabase
```sql
-- Verificar assinaturas criadas
SELECT * FROM subscriptions ORDER BY created_at DESC LIMIT 5;

-- Verificar planos criados
SELECT * FROM pagarme_plans;
```

## 🔍 Passo 5: Verificar Status da Assinatura

### Via API
```bash
GET /api/pagarme/subscription?user_id=SEU_USER_ID
```

### Via Frontend
- Adicionar componente para exibir status da assinatura no dashboard
- Mostrar data da próxima cobrança
- Mostrar opção de cancelamento

## ⚠️ Troubleshooting

### Erro: "Plano não encontrado"
- Execute `GET /api/pagarme/plans` para criar os planos

### Erro: "PAGARME_API_KEY não configurada"
- Verifique `.env.local`:
  ```env
  PAGARME_API_KEY=ak_live_xxxxxxxxxxxxxxxxxx
  PAGARME_API_URL=https://api.pagar.me/core/v5
  ```

### Webhook não está sendo recebido
- Verifique se a URL está acessível publicamente
- Use ngrok para desenvolvimento local:
  ```bash
  ngrok http 3000
  # Use a URL do ngrok no webhook da Pagar.me
  ```

### Assinatura criada mas não ativada
- Verifique os logs do webhook
- Verifique se o evento `subscription.activated` está configurado
- Verifique se o metadata `user_id` está sendo enviado

## 📝 Checklist Final

- [ ] Migration executada no Supabase
- [ ] Planos criados na Pagar.me (via GET /api/pagarme/plans)
- [ ] Webhook configurado na Pagar.me
- [ ] Teste de criação de assinatura realizado
- [ ] Webhook recebido e processado
- [ ] Assinatura ativa no Supabase
- [ ] Status do usuário atualizado

## 🎯 Próximas Melhorias (Opcional)

1. **Página de Gerenciamento de Assinatura**
   - Ver status atual
   - Ver histórico de pagamentos
   - Cancelar assinatura
   - Alterar plano

2. **Notificações por Email**
   - Email quando assinatura é ativada
   - Email quando pagamento falha
   - Email antes do vencimento

3. **Dashboard de Assinaturas**
   - Listar todas as assinaturas
   - Filtrar por status
   - Estatísticas de receita

