# 🧪 Teste de Envio de Email

## Credenciais SMTP GoDaddy Fornecidas

- **Email**: `contato@anesteasyapp.com.br`
- **Senha**: `Felipe02171995@`
- **Host**: `smtpout.secureserver.net` (ou `smtp.secureserver.net`)
- **Porta**: `587`

## ⚠️ Problema Identificado

A secretária está sendo criada e vinculada com sucesso, mas o email não está sendo enviado.

## 🔍 Possíveis Causas

1. **SMTP não configurado na Edge Function**
   - As variáveis de ambiente `SMTP_USER` e `SMTP_PASS` não estão configuradas
   - A Edge Function retorna erro: "Credenciais SMTP não configuradas"

2. **SUPABASE_SERVICE_ROLE_KEY não configurada**
   - A API route não consegue invocar a Edge Function
   - Erro: "Cliente Supabase servidor não configurado"

3. **Erro na biblioteca SMTP do Deno**
   - A biblioteca `deno.land/x/smtp` pode não estar funcionando corretamente
   - Pode haver problema de conexão com o servidor SMTP

## 🔧 Solução: Configurar SMTP na Edge Function

### Passo 1: Acessar Supabase Dashboard
1. Acesse: https://app.supabase.com
2. Vá para: **Edge Functions** → **send-secretaria-welcome**
3. Clique em **Settings** ou **Secrets**

### Passo 2: Adicionar Variáveis de Ambiente
Adicione estas variáveis:

```
SMTP_HOST=smtpout.secureserver.net
SMTP_PORT=587
SMTP_USER=contato@anesteasyapp.com.br
SMTP_PASS=Felipe02171995@
SMTP_FROM=AnestEasy <contato@anesteasyapp.com.br>
```

### Passo 3: Verificar SUPABASE_SERVICE_ROLE_KEY
No arquivo `.env.local` do projeto, verifique se existe:

```
SUPABASE_SERVICE_ROLE_KEY=[sua service role key]
```

## 🧪 Teste Após Configurar

1. Crie uma nova secretária
2. Verifique o console do navegador (F12)
3. Você deve ver:
   - ✅ Senha temporária gerada
   - ✅ Tentativa de envio de email
   - ✅ Status do envio (sucesso ou erro)

## 📋 Logs Esperados no Console

Se tudo estiver configurado corretamente, você verá:

```
🚀 [SECRETARIAS] Iniciando createOrLinkSecretaria
🔑 [SECRETARIAS] Senha temporária gerada: [senha]
📧 TENTANDO ENVIAR EMAIL DE BOAS-VINDAS
🔄 Chamando API /api/send-secretaria-welcome...
📡 Resposta da API: Status 200
✅ EMAIL ENVIADO COM SUCESSO!
```

Se houver erro, você verá:

```
❌ ERRO ao enviar email de boas-vindas:
Status: 500
Erro: { error: 'Credenciais SMTP não configuradas', ... }
```

