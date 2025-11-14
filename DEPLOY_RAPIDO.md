# ⚡ Deploy Rápido para Vercel

## 🚀 Passos Rápidos

### 1. Preparar Código
```bash
git add .
git commit -m "Preparar para deploy"
git push origin main
```

### 2. Deploy na Vercel

#### Opção A: Via Dashboard (Recomendado)
1. Acesse: https://vercel.com/new
2. Importe seu repositório do GitHub
3. Configure variáveis de ambiente (veja `VARIAVEIS_AMBIENTE_VERCEL.md`)
4. Clique em **Deploy**

#### Opção B: Via CLI
```bash
# Instalar Vercel CLI
npm i -g vercel

# Fazer login
vercel login

# Deploy
vercel

# Deploy em produção
vercel --prod
```

### 3. Configurar Variáveis de Ambiente

**⚠️ CRÍTICO:** Configure TODAS as variáveis antes do deploy!

Veja lista completa em: `VARIAVEIS_AMBIENTE_VERCEL.md`

**Variáveis Obrigatórias:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID_MONTHLY`
- `STRIPE_PRICE_ID_QUARTERLY`
- `STRIPE_PRICE_ID_ANNUAL`
- `NEXT_PUBLIC_BASE_URL`

### 4. Atualizar Webhook da Stripe

Após o deploy, atualize a URL do webhook:

1. Dashboard Stripe → Developers → Webhooks
2. Edite seu endpoint
3. URL: `https://anesteasy.com.br/api/stripe/webhook`
   (ou URL da Vercel se ainda não tiver domínio)
4. Salve

### 5. Verificar Deploy

1. Acesse a URL do deploy
2. Teste login
3. Teste checkout
4. Verifique logs na Vercel

---

## 📚 Documentação Completa

- **Guia Completo**: `GUIA_DEPLOY_VERCEL.md`
- **Variáveis de Ambiente**: `VARIAVEIS_AMBIENTE_VERCEL.md`

---

## ✅ Checklist Final

- [ ] Código commitado e pushado
- [ ] Todas as variáveis configuradas na Vercel
- [ ] Deploy concluído com sucesso
- [ ] Webhook da Stripe atualizado
- [ ] Testes básicos passando
- [ ] Logs sem erros críticos

---

## 🎉 Pronto!

Sua aplicação está no ar! 🚀

