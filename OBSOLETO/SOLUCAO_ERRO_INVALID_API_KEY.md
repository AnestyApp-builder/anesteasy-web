# 🔧 Solução: Erro "Não autorizado: Invalid API key" em Produção

## ❌ Problema Identificado

O erro **"Não autorizado: Invalid API key"** está aparecendo na versão em produção porque a variável de ambiente `SUPABASE_SERVICE_ROLE_KEY` não está configurada corretamente na Vercel.

### Onde o erro ocorre:

O erro acontece na rota `/api/stripe/subscription` quando tenta validar o token do usuário:

```52:57:app/api/stripe/subscription/route.ts
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken)

    if (authError) {
      console.error('❌ Erro ao validar token:', authError.message)
      return NextResponse.json(
        { error: `Não autorizado: ${authError.message}` },
```

Se a `SUPABASE_SERVICE_ROLE_KEY` estiver ausente ou incorreta, o Supabase retorna "Invalid API key".

---

## ✅ Solução: Configurar SUPABASE_SERVICE_ROLE_KEY na Vercel

### Passo 1: Obter a Service Role Key do Supabase

1. Acesse: https://app.supabase.com
2. Selecione o projeto: **"Anesteasy WEB"** (ou o projeto correto)
3. Vá em **Settings** → **API**
4. Na seção **"service_role"** (NÃO "anon"), copie a chave completa
5. A chave deve começar com: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Passo 2: Configurar na Vercel

1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto **AnestEasy WEB**
3. Vá em **Settings** → **Environment Variables**
4. Procure pela variável `SUPABASE_SERVICE_ROLE_KEY`
5. Se não existir, clique em **Add New**:
   - **Key**: `SUPABASE_SERVICE_ROLE_KEY`
   - **Value**: Cole a Service Role Key que você copiou
   - **Environments**: Marque **Production**, **Preview** e **Development**
6. Clique em **Save**

### Passo 3: Verificar outras variáveis necessárias

Certifique-se de que estas variáveis também estão configuradas:

```env
NEXT_PUBLIC_SUPABASE_URL=https://zmtwwajyhusyrugobxur.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptdHd3YWp5aHVzeXJ1Z29ieHVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMzYzNzAsImV4cCI6MjA3MjkxMjM3MH0.NC6t2w_jFWTMJjVv5FmPLouVyOVgCTBReCr0zOA2dx8
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (sua service role key completa)
```

### Passo 4: Fazer novo deploy

**IMPORTANTE:** Após adicionar/atualizar variáveis de ambiente na Vercel:

1. Vá em **Deployments**
2. Clique nos **3 pontos** do último deploy
3. Selecione **Redeploy**
4. Ou faça um novo commit e push (o deploy automático aplicará as novas variáveis)

**Nota:** As variáveis de ambiente só são aplicadas em novos deploys. Se você apenas adicionar a variável sem fazer redeploy, o erro continuará.

---

## 🔍 Como Verificar se Está Funcionando

Após o redeploy:

1. Acesse a página de assinatura: `https://anesteasy.com.br/assinatura` (ou sua URL)
2. Faça login
3. O erro "Não autorizado: Invalid API key" **não deve mais aparecer**
4. A página deve carregar normalmente mostrando as informações do período de teste ou assinatura

---

## 🧪 Teste Local (Opcional)

Para testar localmente antes de fazer deploy:

1. Verifique se o arquivo `.env.local` existe na raiz do projeto
2. Adicione/verifique a linha:
   ```env
   SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui
   ```
3. Reinicie o servidor:
   ```bash
   npm run dev
   ```
4. Teste acessando: `http://localhost:3000/assinatura`

---

## ⚠️ Importante

- **NUNCA** commite a `SUPABASE_SERVICE_ROLE_KEY` no Git
- A Service Role Key tem **privilégios administrativos** - mantenha segura
- Use a mesma chave em todos os ambientes (Production, Preview, Development) se for o mesmo projeto Supabase
- Se você tiver projetos Supabase diferentes para dev/prod, use chaves diferentes

---

## 📝 Checklist Final

- [ ] Service Role Key copiada do Supabase Dashboard
- [ ] Variável `SUPABASE_SERVICE_ROLE_KEY` adicionada na Vercel
- [ ] Variável marcada para Production, Preview e Development
- [ ] Novo deploy realizado na Vercel
- [ ] Erro não aparece mais na página de assinatura
- [ ] Página carrega normalmente após login

---

## 🆘 Se o Erro Persistir

1. **Verifique os logs da Vercel:**
   - Vá em **Deployments** → Selecione o deploy → **Functions** → Veja os logs
   - Procure por mensagens de erro relacionadas a `SUPABASE_SERVICE_ROLE_KEY`

2. **Verifique se a chave está correta:**
   - A chave deve começar com `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`
   - Não deve ter espaços ou quebras de linha
   - Deve ser a chave da seção **"service_role"** (não "anon")

3. **Verifique se o projeto Supabase está correto:**
   - Confirme que está usando o projeto correto no Supabase
   - A URL deve ser: `https://zmtwwajyhusyrugobxur.supabase.co`

4. **Tente fazer um redeploy forçado:**
   - Na Vercel, vá em **Deployments**
   - Clique nos 3 pontos do último deploy
   - Selecione **Redeploy** (não "Redeploy with existing Build Cache")

---

**Última atualização:** 2025-01-15

