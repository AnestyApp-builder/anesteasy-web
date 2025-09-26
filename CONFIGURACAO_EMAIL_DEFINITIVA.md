# 🚀 CONFIGURAÇÃO DEFINITIVA DE EMAIL - SUPABASE

## ❌ PROBLEMA ATUAL
O Supabase está com rate limit de email, impedindo o cadastro de novos usuários.

## ✅ SOLUÇÃO DEFINITIVA

### **1. CONFIGURAR SMTP PERSONALIZADO NO SUPABASE**

**Acesse o Supabase Dashboard:**
1. **URL**: https://app.supabase.com
2. **Projeto**: "Anesteasy WEB" 
3. **Settings** → **Authentication** → **SMTP Settings**

**Configure o SMTP:**
```
✅ Enable custom SMTP: ATIVADO
📧 SMTP Host: smtpout.secureserver.net
🔌 SMTP Port: 587
👤 SMTP User: [seu email GoDaddy completo]
🔑 SMTP Pass: [sua senha do email GoDaddy]
📨 SMTP Admin Email: [seu email GoDaddy]
🏷️ SMTP Sender Name: AnestEasy
```

### **2. ALTERAR RATE LIMITS**

**No mesmo dashboard:**
1. **Settings** → **Rate Limits**
2. **Altere os limites:**
   ```
   📧 Rate limit for sending emails: 100 (era 2)
   👥 Rate limit for sign ups: 100 (era 50)
   ```

### **3. VERIFICAR CONFIGURAÇÕES DE EMAIL**

**Settings** → **Authentication** → **Email Templates**
- ✅ **Confirm signup**: Ativado
- ✅ **Reset password**: Ativado
- ✅ **Email change**: Ativado

### **4. TESTAR CONFIGURAÇÃO**

Após configurar:
1. **Teste o cadastro** em https://anesteasy.com.br/register
2. **Verifique se o email chega** na caixa de entrada
3. **Clique no link** para confirmar a conta
4. **Teste o login** após confirmação

## 🔧 CONFIGURAÇÕES ALTERNATIVAS GODADDY

Se `smtpout.secureserver.net` não funcionar, tente:

**Opção 1:**
```
Host: smtp.secureserver.net
Port: 587
```

**Opção 2:**
```
Host: smtpout.secureserver.net  
Port: 465 (SSL)
```

**Opção 3:**
```
Host: relay-hosting.secureserver.net
Port: 25
```

## ⚠️ IMPORTANTE

- ✅ **Use seu domínio**: anesteasy.com.br
- ✅ **Senha correta**: A senha do seu email GoDaddy
- ✅ **Teste primeiro**: Configure e teste antes de usar em produção
- ✅ **Aguarde propagação**: Pode levar alguns minutos para funcionar

## 🎯 RESULTADO ESPERADO

Após configurar corretamente:
1. ✅ **Cadastro funciona** sem rate limit
2. ✅ **Email enviado** para confirmação  
3. ✅ **Link funciona** e confirma a conta
4. ✅ **Login funciona** após confirmação

## 📞 SUPORTE

Se ainda não funcionar:
1. **Verifique as credenciais** do email GoDaddy
2. **Teste em outro email** (Gmail, Outlook)
3. **Aguarde 1 hora** para rate limit resetar
4. **Contate o suporte** do GoDaddy se necessário
