# 🔧 Atualizar .env.local com Chaves de Teste

## ✅ Chaves Recebidas

- **Secret Key**: `sk_test_620404b048f547f3b9214a152b287211`
- **Public Key**: `pk_test_ENO8LDSevfBw8X6Y`

## 📝 Passo a Passo

### 1. Abrir o arquivo `.env.local`

Abra o arquivo `.env.local` na raiz do projeto (mesma pasta onde está o `package.json`).

### 2. Localizar e Substituir

Encontre estas linhas:

```env
PAGARME_API_KEY=sk_028d061594634fb3af97504787f6bcb3
NEXT_PUBLIC_PAGARME_PUBLIC_KEY=pk_EXANarahdFqDWKMQ
```

**Substitua por:**

```env
PAGARME_API_KEY=sk_test_620404b048f547f3b9214a152b287211
NEXT_PUBLIC_PUBLIC_KEY=pk_test_ENO8LDSevfBw8X6Y
```

### 3. Remover ou Comentar PAGARME_API_URL (Opcional)

Se tiver esta linha:
```env
PAGARME_API_URL=https://api.pagar.me/core/v5
```

Você pode:
- **Remover** (recomendado - o sistema detecta automaticamente)
- **Ou comentar**: `# PAGARME_API_URL=https://api.pagar.me/core/v5`

### 4. Salvar o arquivo

Salve o arquivo (Ctrl+S).

### 5. Reiniciar o servidor

```bash
# Pare o servidor (Ctrl+C no terminal)
# Depois inicie novamente:
npm run dev
```

## ✅ Verificar se Funcionou

Após reiniciar, ao criar uma assinatura, você verá nos logs:

```
🌐 Fazendo requisição: https://sdx-api.pagar.me/core/v5/subscriptions
🔧 Ambiente: SANDBOX (Teste)
```

Se aparecer "PRODUÇÃO", verifique se a chave começa com `sk_test_`.

## 🧪 Testar

1. Acesse: `http://localhost:3000/planos`
2. Clique em "Assinar Agora"
3. Use o cartão de teste: `4111 1111 1111 1111`
4. Preencha os outros dados
5. Clique em "Finalizar Pagamento"

**Deve funcionar sem erro de verificação de cartão!** ✅

## 📋 Exemplo Completo do .env.local

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key

# Pagar.me - SANDBOX (Teste)
PAGARME_API_KEY=sk_test_620404b048f547f3b9214a152b287211
NEXT_PUBLIC_PAGARME_PUBLIC_KEY=pk_test_ENO8LDSevfBw8X6Y

# Outras variáveis que você já tem...
```

