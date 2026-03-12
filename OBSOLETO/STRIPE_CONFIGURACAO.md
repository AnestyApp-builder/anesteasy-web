# 🎨 Configuração da Stripe para AnestEasy

Este documento detalha como configurar a Stripe para processar assinaturas do AnestEasy.

## 📋 Pré-requisitos

1. Conta na Stripe (criar em https://stripe.com)
2. Acesso ao Dashboard da Stripe
3. Acesso ao Supabase SQL Editor
4. Acesso ao arquivo `.env.local` do projeto

---

## 🔧 Passo 1: Obter Chaves da API Stripe

### 1.1. Acessar Dashboard

1. Acesse https://dashboard.stripe.com
2. Faça login na sua conta

### 1.2. Obter Chaves de Teste

1. No menu lateral, clique em **Developers**
2. Clique em **API Keys**
3. Certifique-se de estar em **modo de teste** (toggle no canto superior direito)
4. Copie as seguintes chaves:
   - **Publishable key** (começa com `pk_test_...`)
   - **Secret key** (clique em "Reveal test key" e copie - começa com `sk_test_...`)

### 1.3. Configurar Variáveis de Ambiente

Adicione as chaves no arquivo `.env.local` na raiz do projeto:

```env
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_... # Será configurado no Passo 3

# Manter Supabase
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_BASE_URL=http://localhost:3000  # ou sua URL de produção
```

---

## 💰 Passo 2: Criar Produtos e Preços

### 2.1. Criar Produto

1. No Dashboard da Stripe, vá para **Products** (menu lateral)
2. Clique em **+ Add Product**
3. Preencha os dados:
   - **Name**: `AnestEasy`
   - **Description**: `Plataforma de gestão para anestesistas`
   - **Image**: (opcional) Upload de logo
4. **NÃO clique em "Save product" ainda**

### 2.2. Criar Preços Recorrentes

Ainda na tela de criação do produto, role até a seção **Pricing**:

#### Preço Mensal
1. Clique em **+ Add another price**
2. Configure:
   - **Price**: `79.00`
   - **Currency**: `BRL - Brazilian Real`
   - **Billing period**: `Monthly`
   - **Usage type**: `Licensed`
3. Após salvar, copie o **Price ID** (começa com `price_...`)

#### Preço Trimestral
1. Clique em **+ Add another price** novamente
2. Configure:
   - **Price**: `225.00`
   - **Currency**: `BRL - Brazilian Real`
   - **Billing period**: `Every 3 months`
   - **Usage type**: `Licensed`
3. Após salvar, copie o **Price ID**

#### Preço Anual
1. Clique em **+ Add another price** novamente
2. Configure:
   - **Price**: `850.00`
   - **Currency**: `BRL - Brazilian Real`
   - **Billing period**: `Yearly`
   - **Usage type**: `Licensed`
3. Após salvar, copie o **Price ID**

### 2.3. Salvar Produto

1. Clique em **Save product** no final da página
2. Anote os 3 **Price IDs** que você criou

### 2.4. Configurar Price IDs no Projeto

Adicione os Price IDs no arquivo `.env.local`:

```env
# Stripe Price IDs
STRIPE_PRICE_ID_MONTHLY=price_...
STRIPE_PRICE_ID_QUARTERLY=price_...
STRIPE_PRICE_ID_ANNUAL=price_...
```

---

## 🔔 Passo 3: Configurar Webhook

### 3.1. Criar Endpoint de Webhook

1. No Dashboard da Stripe, vá para **Developers** → **Webhooks**
2. Clique em **+ Add endpoint**
3. Configure:
   - **Endpoint URL**: 
     - **Local (desenvolvimento)**: Use o Stripe CLI (ver seção 3.4)
     - **Produção**: `https://anesteasy.com.br/api/stripe/webhook`
   - **Description**: `AnestEasy Webhook`

### 3.2. Selecionar Eventos

Na seção **Select events to listen to**, escolha os seguintes eventos:

- [x] `checkout.session.completed`
- [x] `customer.subscription.created`
- [x] `customer.subscription.updated`
- [x] `customer.subscription.deleted`
- [x] `invoice.paid`
- [x] `invoice.payment_failed`

### 3.3. Salvar e Obter Signing Secret

1. Clique em **Add endpoint**
2. Na tela do endpoint criado, clique em **Reveal** na seção **Signing secret**
3. Copie o valor (começa com `whsec_...`)
4. Adicione no `.env.local`:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3.4. Testar Localmente com Stripe CLI (Opcional)

Para testar webhooks em desenvolvimento local:

1. Instale o Stripe CLI: https://stripe.com/docs/stripe-cli
2. Execute no terminal:
   ```bash
   stripe login
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
3. O CLI exibirá um webhook signing secret temporário
4. Use este secret no `.env.local` para desenvolvimento

---

## 🏛️ Passo 4: Configurar Customer Portal

O Customer Portal permite que usuários gerenciem suas assinaturas (upgrade, downgrade, cancelamento, atualização de cartão).

### 4.1. Acessar Configurações

1. No Dashboard da Stripe, vá para **Settings** (ícone de engrenagem no canto superior direito)
2. No menu lateral, clique em **Billing**
3. Clique em **Customer portal**

### 4.2. Ativar Portal

1. Clique em **Activate test link** (para ambiente de teste)
2. Configure as opções:

#### Functionality
- [x] **Customers can update their payment methods**
- [x] **Customers can update their billing information**
- [x] **Customers can view their invoices**
- [x] **Customers can switch to a different subscription**
  - Selecione **Charge proration immediately**
  - Marque **Allow switching plans with different billing intervals**
- [x] **Customers can cancel their subscription**
  - Selecione **Cancel at end of billing period**

#### Business information
- **Business name**: `AnestEasy`
- **Support email**: `seu-email@exemplo.com`
- **Privacy policy URL**: (opcional)
- **Terms of service URL**: (opcional)

### 4.3. Personalizar Aparência (Opcional)

1. Na aba **Branding**, você pode:
   - Fazer upload do logo
   - Escolher cor primária
   - Personalizar mensagens

### 4.4. Salvar Configurações

1. Clique em **Save** no final da página
2. O Customer Portal está pronto para uso

---

## 🗄️ Passo 5: Atualizar Banco de Dados

### 5.1. Executar Migration SQL

1. Acesse o Supabase Dashboard: https://app.supabase.com
2. Selecione seu projeto
3. Vá para **SQL Editor** no menu lateral
4. Copie e execute o conteúdo do arquivo `supabase/migrations/add_stripe_columns.sql`:

```sql
-- Adicionar colunas da Stripe na tabela subscriptions
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Adicionar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id 
ON subscriptions(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id 
ON subscriptions(stripe_subscription_id);
```

5. Clique em **Run** para executar

---

## 🚀 Passo 6: Testar a Integração

### 6.1. Iniciar Servidor de Desenvolvimento

```bash
npm run dev
```

### 6.2. Testar Fluxo de Checkout

1. Acesse http://localhost:3000/planos
2. Faça login com uma conta de teste
3. Selecione um plano
4. Use um dos cartões de teste da Stripe:
   - **Sucesso**: `4242 4242 4242 4242`
   - **Falha**: `4000 0000 0000 0002`
   - Data de expiração: qualquer data futura
   - CVV: qualquer 3 dígitos
   - CEP: qualquer CEP válido

### 6.3. Verificar Webhook

1. Após completar o pagamento, verifique os logs do servidor
2. Você deve ver mensagens como:
   ```
   🔔 Webhook Stripe recebido: checkout.session.completed
   ✅ Assinatura ativada
   ```

### 6.4. Testar Customer Portal

1. Acesse http://localhost:3000/assinatura
2. Clique em **Gerenciar Assinatura**
3. Você será redirecionado para o Stripe Customer Portal
4. Teste as funcionalidades:
   - Alterar plano (upgrade/downgrade)
   - Atualizar cartão
   - Cancelar assinatura

---

## 🎯 Passo 7: Migrar para Produção

### 7.1. Ativar Stripe em Produção

1. No Dashboard da Stripe, mude para **modo de produção** (toggle no canto superior direito)
2. Complete o processo de verificação de conta (KYC)
3. Configure informações bancárias para receber pagamentos

### 7.2. Obter Chaves de Produção

1. Vá para **Developers** → **API Keys**
2. Copie as chaves de **produção**:
   - Publishable key (começa com `pk_live_...`)
   - Secret key (começa com `sk_live_...`)

### 7.3. Recriar Produtos e Preços em Produção

**IMPORTANTE**: Os IDs de produtos e preços são diferentes entre teste e produção.

1. Repita o **Passo 2** no modo de produção
2. Copie os novos Price IDs

### 7.4. Configurar Webhook de Produção

1. Vá para **Developers** → **Webhooks**
2. Crie um novo endpoint com a URL de produção:
   ```
   https://seudominio.com.br/api/stripe/webhook
   ```
3. Selecione os mesmos eventos do Passo 3.2
4. Copie o novo webhook signing secret

### 7.5. Atualizar Variáveis de Ambiente na Vercel

1. Acesse o Dashboard da Vercel
2. Selecione seu projeto
3. Vá para **Settings** → **Environment Variables**
4. Adicione/atualize as variáveis com os valores de **produção**:
   ```
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRICE_ID_MONTHLY=price_...
   STRIPE_PRICE_ID_QUARTERLY=price_...
   STRIPE_PRICE_ID_ANNUAL=price_...
   ```

### 7.6. Ativar Customer Portal em Produção

1. Repita o **Passo 4** no modo de produção
2. Clique em **Activate live link**

### 7.7. Fazer Deploy

```bash
git add .
git commit -m "chore: migrar para Stripe em produção"
git push
```

---

## 🔍 Monitoramento e Logs

### Ver Eventos no Dashboard

1. **Logs**: Vá para **Developers** → **Logs** para ver todas as requisições
2. **Events**: Vá para **Developers** → **Events** para ver webhooks enviados
3. **Payments**: Vá para **Payments** para ver transações

### Testar Webhooks

1. Vá para **Developers** → **Webhooks**
2. Clique no endpoint configurado
3. Vá para a aba **Testing**
4. Clique em **Send test webhook** para enviar eventos de teste

---

## 🛠️ Solução de Problemas

### Erro: "No such price"
- Verifique se os Price IDs no `.env.local` estão corretos
- Certifique-se de estar usando IDs de teste em desenvolvimento e IDs de produção em produção

### Erro: "Invalid webhook signature"
- Verifique se o `STRIPE_WEBHOOK_SECRET` está correto
- Em desenvolvimento, use o Stripe CLI para forward de webhooks

### Assinatura não ativa após pagamento
- Verifique os logs do webhook no Dashboard da Stripe
- Confirme que o endpoint do webhook está acessível publicamente
- Verifique os logs do servidor Next.js

### Customer Portal não funciona
- Certifique-se de que o Customer Portal está ativado no Dashboard
- Verifique se o usuário tem uma assinatura ativa com `stripe_customer_id`

---

## 📚 Recursos Adicionais

- [Documentação da Stripe](https://stripe.com/docs)
- [Stripe Billing](https://stripe.com/docs/billing)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Customer Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)
- [Webhooks](https://stripe.com/docs/webhooks)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)

---

## ✅ Checklist Final

Antes de ir para produção, verifique:

- [ ] Produtos e preços criados em produção
- [ ] Chaves de produção configuradas na Vercel
- [ ] Webhook de produção configurado e testado
- [ ] Customer Portal ativado em produção
- [ ] Migration SQL executada no Supabase de produção
- [ ] Testes de checkout completos realizados
- [ ] Testes de upgrade/downgrade realizados
- [ ] Testes de cancelamento realizados
- [ ] Informações bancárias configuradas para receber pagamentos
- [ ] KYC da Stripe completo

---

## 🎉 Pronto!

Sua integração com Stripe está completa. Agora você pode:

- ✅ Processar pagamentos recorrentes
- ✅ Gerenciar assinaturas automaticamente
- ✅ Permitir que usuários façam upgrade/downgrade
- ✅ Calcular proration automaticamente
- ✅ Oferecer portal de autoatendimento para clientes

Bons negócios! 💰

