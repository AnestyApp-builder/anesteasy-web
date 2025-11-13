# 🧪 Configurar Sandbox da Pagar.me

## ✅ Correção Aplicada

O sistema agora **detecta automaticamente** o ambiente baseado na chave:
- Se a chave começar com `sk_test_` ou `ak_test_` → usa **SANDBOX** (`https://sdx-api.pagar.me/core/v5`)
- Se a chave começar com `sk_` ou `ak_` (sem test) → usa **PRODUÇÃO** (`https://api.pagar.me/core/v5`)

## 📋 Passos para Configurar Sandbox

### 1. Obter Chaves de Teste

1. Acesse: https://dashboard.pagar.me
2. Faça login na sua conta
3. Vá em **Configurações** → **Chaves de API**
4. **Alterne para ambiente "Teste"** no topo da página
5. Copie as chaves:
   - **Chave Secreta** (Secret Key) → começa com `sk_test_`
   - **Chave Pública** (Public Key) → começa com `pk_test_`

### 2. Configurar no .env.local

Edite o arquivo `.env.local` na raiz do projeto:

```env
# Pagar.me - SANDBOX (Teste)
PAGARME_API_KEY=sk_test_SUA_CHAVE_AQUI
NEXT_PUBLIC_PAGARME_PUBLIC_KEY=pk_test_SUA_CHAVE_AQUI

# Opcional: Se quiser forçar a URL (senão detecta automaticamente)
# PAGARME_API_URL=https://sdx-api.pagar.me/core/v5
```

### 3. Reiniciar o Servidor

```bash
# Pare o servidor (Ctrl+C)
# Inicie novamente
npm run dev
```

## 💳 Cartões de Teste para Sandbox

### ✅ Pagamento APROVADO
```
Número: 4111 1111 1111 1111
Nome: TESTE APROVADO
Validade: 12/25 (ou qualquer data futura)
CVV: 123
CPF: 12345678900
```

### ❌ Pagamento RECUSADO
```
Número: 4000 0000 0000 0002
Nome: TESTE RECUSADO
Validade: 12/25
CVV: 123
```

### ⏱️ Pagamento com TIMEOUT
```
Número: 4000 0000 0000 0259
Nome: TESTE TIMEOUT
Validade: 12/25
CVV: 123
```

## 🔍 Verificar se Está Funcionando

Após configurar, você verá nos logs do servidor:

```
🌐 Fazendo requisição: https://sdx-api.pagar.me/core/v5/subscriptions
🔧 Ambiente: SANDBOX (Teste)
```

Se aparecer "PRODUÇÃO", verifique se a chave começa com `sk_test_`.

## ⚠️ Importante

- ✅ **Sandbox não gera cobranças reais**
- ✅ **Pode testar quantas vezes quiser**
- ✅ **Cartões de teste funcionam apenas no sandbox**
- ⚠️ **Para produção, use chaves sem `_test_`**

## 🚀 Próximos Passos

1. Configure as chaves de teste no `.env.local`
2. Reinicie o servidor
3. Teste criar uma assinatura com o cartão `4111 1111 1111 1111`
4. Deve funcionar sem erros de verificação de cartão!

