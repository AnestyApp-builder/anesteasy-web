# 🔍 Verificação de Ambiente - Checklist

## ✅ **1. Verificar Token no Frontend**

O código em `app/planos/page.tsx` já está correto:
```typescript
const { data: { session } } = await supabase.auth.getSession()
// ...
'Authorization': `Bearer ${session.access_token}`
```

**Teste no Console do Navegador:**
```javascript
// Cole no console do navegador (F12)
const { supabase } = await import('/lib/supabase')
const { data: { session } } = await supabase.auth.getSession()
console.log('Token:', session?.access_token ? '✅ Presente' : '❌ Ausente')
console.log('Token (primeiros 20 chars):', session?.access_token?.substring(0, 20))
```

---

## ✅ **2. Verificar Validação no Backend**

O código em `app/api/pagarme/checkout/route.ts` já está correto:
```typescript
const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken)
```

**Verificar logs no terminal do servidor** quando testar o checkout.

---

## ⚠️ **3. Verificar Variáveis de Ambiente**

### **Arquivo `.env.local` deve conter:**

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://zmtwwajyhusyrugobxur.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptdHd3YWp5aHVzeXJ1Z29ieHVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzMzNjM3MCwiZXhwIjoyMDcyOTEyMzcwfQ.392K4Owjfn2aP8YmG4wpv2RbJCUrDAVjF1-Ez88I5fw

# Pagar.me
PAGARME_API_KEY=sk_028d061594634fb3af97504787f6bcb3
PAGARME_WEBHOOK_SECRET=sk_bacf426dd3a8463f8eba1498d37afb3a
NEXT_PUBLIC_PAGARME_PUBLIC_KEY=pk_EXANarahdFqDWKMQ
PAGARME_ACCOUNT_ID=acc_LBQW9n8FOSjonMlm

# Base URL
NEXT_PUBLIC_BASE_URL=https://anesteasy.com.br
```

### **Como Verificar:**

1. **Verificar se o arquivo existe:**
   ```bash
   # No terminal, na raiz do projeto
   ls .env.local
   # ou no Windows PowerShell:
   Test-Path .env.local
   ```

2. **Verificar se as variáveis estão sendo lidas:**
   - Reinicie o servidor Next.js após modificar `.env.local`
   - Os logs no terminal mostrarão se as variáveis estão configuradas

3. **Teste rápido no código:**
   - Os logs adicionados mostrarão se as variáveis estão presentes

---

## 🧪 **Teste Completo**

### **Passo 1: Verificar Frontend**
1. Abra o navegador em `http://localhost:3000/planos`
2. Abra o Console (F12)
3. Clique em "Assinar Agora"
4. Verifique os logs no console:
   - `Session data:` - deve mostrar `hasToken: true`
   - `Enviando requisição para checkout com token:` - deve mostrar os primeiros 20 caracteres

### **Passo 2: Verificar Backend**
1. Olhe o terminal onde está rodando `npm run dev`
2. Quando clicar em "Assinar Agora", deve aparecer:
   - `Auth header recebido: Presente`
   - `Token recebido: ...`
   - `✅ Usuário autenticado: [id] [email]`

### **Passo 3: Se ainda der erro**
- Copie TODOS os logs do console do navegador
- Copie TODOS os logs do terminal do servidor
- Envie para análise

---

## 🔧 **Solução Rápida**

Se o problema persistir, tente:

1. **Limpar cache e recarregar:**
   ```bash
   # Pare o servidor (Ctrl+C)
   # Limpe o cache do Next.js
   rm -rf .next
   # ou no Windows:
   Remove-Item -Recurse -Force .next
   
   # Reinicie
   npm run dev
   ```

2. **Fazer logout e login novamente:**
   - Vá para `/login`
   - Faça logout
   - Faça login novamente
   - Tente o checkout novamente

3. **Verificar se está logado:**
   - No console do navegador:
   ```javascript
   const { supabase } = await import('/lib/supabase')
   const { data: { session } } = await supabase.auth.getSession()
   console.log('Usuário logado:', session?.user?.email)
   ```

---

## 📝 **Logs Esperados (Sucesso)**

### **Console do Navegador:**
```
Session data: { hasSession: true, hasToken: true, error: null }
Enviando requisição para checkout com token: eyJhbGciOiJIUzI1NiIs...
Response status: 200
Response data: { success: true, checkout_url: "https://..." }
```

### **Terminal do Servidor:**
```
Auth header recebido: Presente
Token recebido: eyJhbGciOiJIUzI1NiIs...
✅ Usuário autenticado: [user-id] [user-email]
```

---

**Se os logs mostrarem algo diferente, envie para análise!**

