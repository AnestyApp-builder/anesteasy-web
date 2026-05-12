# ✅ Checklist de Configuração na Vercel

## 🔍 Verificar se está configurado

Acesse: https://vercel.com/seu-projeto/settings/environment-variables

### ⚠️ VARIÁVEIS CRÍTICAS (Obrigatórias)

#### 1. Supabase
- [ ] `NEXT_PUBLIC_SUPABASE_URL` = `https://zmtwwajyhusyrugobxur.supabase.co`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` ⚠️ **CRÍTICA PARA UPLOAD**

**Onde obter:**
- Acesse: https://app.supabase.com/project/zmtwwajyhusyrugobxur/settings/api
- Copie a **service_role key** (secret)

#### 2. Stripe (se usar pagamentos)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `STRIPE_PRICE_ID_MONTHLY`
- [ ] `STRIPE_PRICE_ID_QUARTERLY`
- [ ] `STRIPE_PRICE_ID_ANNUAL`

#### 3. URLs
- [ ] `NEXT_PUBLIC_BASE_URL` = `https://anesteasy-f536ll2k6-felipe-sousas-projects-8c850f92.vercel.app` (ou sua URL de produção)

---

## 🚨 IMPORTANTE

### Se o upload de imagens não funcionar:
→ Verifique se `SUPABASE_SERVICE_ROLE_KEY` está configurada na Vercel

### Se o procedimento não salvar no mobile:
→ Verifique se `NEXT_PUBLIC_SUPABASE_URL` está correta

---

## 📝 Como Adicionar/Verificar na Vercel

1. Acesse: https://vercel.com/dashboard
2. Selecione o projeto **AnestEasy**
3. Vá em **Settings** → **Environment Variables**
4. Verifique se as variáveis acima estão configuradas
5. Se faltar alguma, clique em **Add** e adicione
6. **Marque para**: Production, Preview, Development
7. Clique em **Save**

---

## 🔄 Após Configurar

Faça um redeploy:
```bash
vercel --prod
```

Ou via Dashboard: **Deployments** → **Redeploy**

---

## ✅ Status Atual

- ✅ URL de produção: https://anesteasy-f536ll2k6-felipe-sousas-projects-8c850f92.vercel.app
- ✅ Código deployado
- ⚠️ **Verificar variáveis de ambiente na Vercel**

