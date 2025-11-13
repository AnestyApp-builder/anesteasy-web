# Configuração da API de Teste da Pagar.me

## 🧪 Ambiente de Teste vs Produção

A Pagar.me possui dois ambientes:

### 1. **Ambiente de TESTE** (Sandbox)
- **URL da API**: `https://sdx-api.pagar.me/core/v5`
- **Chave Secreta**: Começa com `sk_test_`
- **Chave Pública**: Começa com `pk_test_`
- **Uso**: Para desenvolvimento e testes
- **Cobranças**: NÃO gera cobranças reais

### 2. **Ambiente de PRODUÇÃO**
- **URL da API**: `https://api.pagar.me/core/v5`
- **Chave Secreta**: Começa com `sk_` (sem test)
- **Chave Pública**: Começa com `pk_` (sem test)
- **Uso**: Para transações reais
- **Cobranças**: Gera cobranças REAIS

## ⚙️ Como Configurar

### Para usar ambiente de TESTE:

1. Edite o arquivo `.env.local`:

```env
# Pagar.me - TESTE
PAGARME_API_KEY=sk_test_SEU_TOKEN_AQUI
NEXT_PUBLIC_PAGARME_PUBLIC_KEY=pk_test_SEU_TOKEN_AQUI
PAGARME_API_URL=https://sdx-api.pagar.me/core/v5
```

2. Reinicie o servidor de desenvolvimento:

```bash
npm run dev
```

### Para usar ambiente de PRODUÇÃO:

1. Edite o arquivo `.env.local`:

```env
# Pagar.me - PRODUÇÃO
PAGARME_API_KEY=sk_SEU_TOKEN_DE_PRODUCAO_AQUI
NEXT_PUBLIC_PAGARME_PUBLIC_KEY=pk_SEU_TOKEN_DE_PRODUCAO_AQUI
PAGARME_API_URL=https://api.pagar.me/core/v5
```

2. Reinicie o servidor de desenvolvimento

## 🔐 Obter Chaves de Teste

1. Acesse o [Dashboard da Pagar.me](https://dashboard.pagar.me)
2. Clique no menu **Configurações** > **Chaves de API**
3. Alterne para o ambiente de **Teste** no topo da página
4. Copie as chaves:
   - **Chave Secreta** (Secret Key) → `PAGARME_API_KEY`
   - **Chave Pública** (Public Key) → `NEXT_PUBLIC_PAGARME_PUBLIC_KEY`

## 💳 Cartões de Teste

Use estes cartões para simular diferentes cenários:

### ✅ Pagamento APROVADO
```
Número: 4111 1111 1111 1111
Nome: TESTE APROVADO
Validade: Qualquer data futura (ex: 12/25)
CVV: 123
```

### ❌ Pagamento RECUSADO
```
Número: 4000 0000 0000 0002
Nome: TESTE RECUSADO
Validade: Qualquer data futura
CVV: 123
```

### ⏱️ Pagamento com TIMEOUT
```
Número: 4000 0000 0000 0259
Nome: TESTE TIMEOUT
Validade: Qualquer data futura
CVV: 123
```

## 🚨 IMPORTANTE

- **NUNCA** commit as chaves reais no Git
- Use `.env.local` (já está no `.gitignore`)
- Para produção, configure as variáveis de ambiente no servidor/Vercel
- Sempre teste em ambiente de teste antes de ir para produção

## ✅ Status Atual

**Configuração atual**: 
- URL: `https://api.pagar.me/core/v5` (PRODUÇÃO)
- Chave: `sk_028d061594634fb3af97504787f6bcb3`

⚠️ **ATENÇÃO**: Você está usando chaves de PRODUÇÃO. Para testes, obtenha chaves de teste no dashboard.

## 📝 Checklist para Ir para Produção

- [ ] Testar todos os fluxos com cartões de teste
- [ ] Configurar webhook em produção
- [ ] Testar webhook com ngrok/servidor público
- [ ] Atualizar chaves para produção
- [ ] Atualizar URL da API para produção
- [ ] Testar com cartão real (valor pequeno)
- [ ] Configurar monitoramento de erros
- [ ] Documentar procedimentos para equipe

