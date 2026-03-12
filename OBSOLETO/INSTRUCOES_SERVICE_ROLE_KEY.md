# 🔑 INSTRUÇÕES PARA OBTER A SERVICE ROLE KEY CORRETA

## ❌ **PROBLEMA ATUAL:**
A exclusão de conta está removendo todos os dados da aplicação, mas **NÃO está excluindo o usuário do Supabase Auth**. Por isso o usuário ainda consegue fazer login.

## 🎯 **SOLUÇÃO:**
Você precisa obter a **Service Role Key CORRETA** do Supabase.

## 📋 **PASSOS PARA OBTER A SERVICE ROLE KEY:**

### 1. **Acesse o Supabase Dashboard:**
- Vá para: https://app.supabase.com
- Faça login na sua conta

### 2. **Selecione o Projeto Correto:**
- Clique no projeto: **"Anesteasy WEB"**
- (NÃO o "AnestyApp-builder's Project")

### 3. **Vá para Settings > API:**
- No menu lateral, clique em **"Settings"**
- Clique em **"API"**

### 4. **Copie a Service Role Key:**
- Procure por **"service_role"** (não "anon")
- Copie a chave que começa com `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **IMPORTANTE:** É a chave que tem `"role":"service_role"` no payload

### 5. **Atualize o arquivo .env.local:**
- Abra o arquivo `.env.local` na raiz do projeto
- Substitua a linha:
  ```env
  SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui
  ```
- Pela chave real que você copiou

### 6. **Reinicie o servidor:**
```bash
npm run dev
```

## 🧪 **TESTE:**
Após configurar corretamente:
1. Tente excluir uma conta
2. Verifique se o usuário NÃO consegue mais fazer login
3. Se ainda conseguir, a Service Role Key está incorreta

## ⚠️ **IMPORTANTE:**
- A Service Role Key é diferente da Anon Key
- Ela tem privilégios administrativos
- Nunca compartilhe ou commite no git
- Mantenha segura e privada

## 🔍 **COMO IDENTIFICAR A CHAVE CORRETA:**
A Service Role Key correta deve:
- Começar com `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`
- Conter `"role":"service_role"` quando decodificada
- Estar na seção "service_role" do painel API (não "anon")
