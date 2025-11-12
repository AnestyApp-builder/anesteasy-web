# ⚡ CONFIGURAR SMTP AGORA - Credenciais Fornecidas

## 📧 Credenciais SMTP GoDaddy

- **Email**: `contato@anesteasyapp.com.br`
- **Senha**: `Felipe02171995@`
- **Host**: `smtpout.secureserver.net`
- **Porta**: `587`

## 🔧 Passo a Passo para Configurar

### 1. Acessar Supabase Dashboard
1. Acesse: https://app.supabase.com
2. Faça login na sua conta
3. Selecione o projeto: **Anesteasy WEB**

### 2. Configurar Variáveis de Ambiente na Edge Function
1. No menu lateral, clique em **Edge Functions**
2. Clique na função: **send-secretaria-welcome**
3. Clique na aba **Settings** (ou procure por **Secrets** ou **Environment Variables**)
4. Clique em **Add new secret** ou **Add variable**

### 3. Adicionar as 5 Variáveis

Adicione uma por uma:

**Variável 1:**
- **Nome**: `SMTP_HOST`
- **Valor**: `smtpout.secureserver.net`

**Variável 2:**
- **Nome**: `SMTP_PORT`
- **Valor**: `587`

**Variável 3:**
- **Nome**: `SMTP_USER`
- **Valor**: `contato@anesteasyapp.com.br`

**Variável 4:**
- **Nome**: `SMTP_PASS`
- **Valor**: `Felipe02171995@`

**Variável 5:**
- **Nome**: `SMTP_FROM`
- **Valor**: `AnestEasy <contato@anesteasyapp.com.br>`

### 4. Salvar e Aguardar
- Clique em **Save** ou **Update** em cada variável
- Aguarde alguns segundos para as variáveis serem aplicadas

## ✅ Verificar Configuração

Após configurar, você pode verificar:

1. As variáveis devem aparecer na lista de **Secrets** ou **Environment Variables**
2. Os valores devem estar corretos (exceto a senha que pode aparecer como `***`)

## 🧪 Testar

1. Crie uma nova secretária no sistema
2. Abra o console do navegador (F12)
3. Você deve ver:
   - ✅ Senha temporária gerada
   - ✅ Tentativa de envio de email
   - ✅ Status: "Email enviado com sucesso" (se SMTP estiver correto)
   - ❌ Ou erro específico se houver problema

## ⚠️ Se Ainda Não Funcionar

### Verificar SUPABASE_SERVICE_ROLE_KEY
No arquivo `.env.local` do projeto, verifique se existe:

```env
SUPABASE_SERVICE_ROLE_KEY=[sua service role key do Supabase]
```

Para obter a Service Role Key:
1. Supabase Dashboard → **Settings** → **API**
2. Copie a chave em **service_role** (não a anon key)
3. Cole no `.env.local`
4. Reinicie o servidor Next.js

### Verificar Logs da Edge Function
1. Supabase Dashboard → **Edge Functions** → **send-secretaria-welcome**
2. Clique em **Logs**
3. Veja os erros mais recentes
4. Se aparecer "Credenciais SMTP não configuradas", as variáveis não foram salvas corretamente

## 📋 Checklist

- [ ] Variável `SMTP_HOST` configurada
- [ ] Variável `SMTP_PORT` configurada
- [ ] Variável `SMTP_USER` configurada
- [ ] Variável `SMTP_PASS` configurada
- [ ] Variável `SMTP_FROM` configurada
- [ ] `SUPABASE_SERVICE_ROLE_KEY` no `.env.local`
- [ ] Servidor Next.js reiniciado após adicionar Service Role Key

## 🎯 Após Configurar

Teste criando uma nova secretária. O email deve ser enviado automaticamente para o endereço informado com a senha temporária.

