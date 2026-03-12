# 📧 Configuração de Edge Function para Email de Secretária

## 🎯 Objetivo

Configurar uma Edge Function do Supabase para enviar automaticamente o email de boas-vindas para secretárias com a senha temporária quando uma nova conta é criada.

---

## 🔧 Passo 1: Criar Edge Function no Supabase

### **1.1. Acessar o Supabase Dashboard**

1. Acesse: https://app.supabase.com
2. Selecione o projeto: "AnestEasy WEB"
3. Vá para: **Edge Functions** (no menu lateral)

### **1.2. Criar Nova Edge Function**

1. Clique em **"New Function"** ou **"Create Function"**
2. Nome da função: `send-secretaria-welcome`
3. Clique em **"Create Function"**

### **1.3. Copiar o Código da Edge Function**

1. Abra o arquivo: `supabase/functions/send-secretaria-welcome/index.ts`
2. Copie todo o conteúdo do arquivo
3. Cole no editor da Edge Function no Supabase Dashboard
4. Clique em **"Deploy"** para publicar a função

---

## 🔑 Passo 2: Configurar Variáveis de Ambiente (Opcional - Resend)

### **2.1. Se você usar Resend para envio de emails:**

1. No Supabase Dashboard, vá para: **Edge Functions** → **Settings**
2. Na seção **"Secrets"**, adicione:
   - **Nome**: `RESEND_API_KEY`
   - **Valor**: Sua chave API do Resend (obtenha em https://resend.com)

### **2.2. Se você usar apenas o SMTP do Supabase:**

1. Configure o SMTP no Supabase Dashboard:
   - Vá para: **Settings** → **Authentication** → **SMTP Settings**
   - Ative o **"Enable custom SMTP"**
   - Configure as credenciais SMTP (GoDaddy, etc.)
   - Salve as configurações

---

## 🚀 Passo 3: Testar a Edge Function

### **3.1. Testar via API Route**

1. A API route `/api/send-secretaria-welcome` já está configurada
2. Ela tentará invocar a Edge Function automaticamente
3. Se a Edge Function não estiver configurada, o email será apenas logado no console

### **3.2. Testar Manualmente**

1. Crie uma nova secretária através da interface
2. Verifique os logs do console para ver se a Edge Function foi invocada
3. Verifique o email da secretária para confirmar o recebimento

---

## 📝 Passo 4: Configurar Resend (Recomendado)

### **4.1. Criar Conta no Resend**

1. Acesse: https://resend.com
2. Crie uma conta gratuita
3. Verifique seu domínio (anesteasy.com.br)
4. Obtenha sua API Key

### **4.2. Adicionar API Key no Supabase**

1. No Supabase Dashboard, vá para: **Edge Functions** → **Settings**
2. Adicione a secret:
   - **Nome**: `RESEND_API_KEY`
   - **Valor**: `re_xxxxxxxxxxxxx` (sua chave API do Resend)

### **4.3. Verificar Configuração**

1. A Edge Function verificará automaticamente se `RESEND_API_KEY` está configurada
2. Se estiver configurada, usará o Resend para enviar emails
3. Se não estiver configurada, retornará um aviso (modo desenvolvimento)

---

## 🔍 Verificação e Troubleshooting

### **Verificar se a Edge Function está funcionando:**

1. **Logs da Edge Function:**
   - No Supabase Dashboard, vá para: **Edge Functions** → **send-secretaria-welcome** → **Logs**
   - Verifique se há erros ou mensagens de sucesso

2. **Logs da API Route:**
   - No console do servidor Next.js, verifique se há erros ao invocar a Edge Function
   - Verifique se a resposta da Edge Function está correta

3. **Testar diretamente:**
   ```bash
   curl -X POST https://zmtwwajyhusyrugobxur.supabase.co/functions/v1/send-secretaria-welcome \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "to": "teste@exemplo.com",
       "nome": "Teste",
       "senhaTemporaria": "senha123"
     }'
   ```

---

## 📋 Estrutura de Arquivos

```
supabase/
  functions/
    send-secretaria-welcome/
      index.ts          # Código da Edge Function
```

---

## ✅ Checklist de Configuração

- [ ] Edge Function criada no Supabase Dashboard
- [ ] Código da Edge Function copiado e deployado
- [ ] Variável de ambiente `RESEND_API_KEY` configurada (se usar Resend)
- [ ] SMTP configurado no Supabase (se não usar Resend)
- [ ] Edge Function testada via API route
- [ ] Email de teste enviado e recebido
- [ ] Logs verificados para confirmar funcionamento

---

## 🔒 Segurança

- ✅ A Edge Function valida os parâmetros de entrada
- ✅ CORS configurado corretamente
- ✅ API Key do Resend armazenada como secret (não exposta)
- ✅ Tratamento de erros implementado
- ✅ Fallback para modo desenvolvimento

---

## 📝 Notas Importantes

1. **Resend (Recomendado):**
   - Oferece 3.000 emails/mês gratuitos
   - Melhor deliverability
   - Fácil configuração
   - Suporte a templates HTML

2. **SMTP do Supabase:**
   - Requer configuração de SMTP personalizado
   - Limites de rate limiting podem se aplicar
   - Menos flexível que Resend

3. **Modo Desenvolvimento:**
   - Se nenhum serviço de email estiver configurado, o email será apenas logado no console
   - A senha temporária será exibida no console para desenvolvimento
   - Em produção, configure sempre um serviço de email real

---

## 🚀 Próximos Passos

1. **Criar a Edge Function** no Supabase Dashboard
2. **Configurar Resend** (recomendado) ou SMTP
3. **Testar o envio** de email criando uma nova secretária
4. **Verificar os logs** para confirmar funcionamento
5. **Monitorar** o envio de emails em produção

---

**Data**: $(date)
**Versão**: 1.0.0

