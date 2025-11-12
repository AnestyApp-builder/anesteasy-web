# 🔍 Como Verificar se o SMTP está Configurado

## Status Atual

### ✅ Edge Function
- **Nome**: `send-secretaria-welcome`
- **Status**: `ACTIVE` (versão 10)
- **Código**: Correto e pronto para usar SMTP

### ⚠️ Verificação Necessária
As variáveis de ambiente precisam estar configuradas na Edge Function.

## Como Verificar

### Opção 1: Via Supabase Dashboard
1. Acesse: https://app.supabase.com
2. Vá para: **Edge Functions** → **send-secretaria-welcome**
3. Clique em **Settings** ou **Secrets**
4. Verifique se estas variáveis existem:
   - `SMTP_HOST`
   - `SMTP_PORT`
   - `SMTP_USER`
   - `SMTP_PASS`
   - `SMTP_FROM`

### Opção 2: Testar Criando uma Secretária
1. Crie uma nova secretária no sistema
2. Abra o console do navegador (F12)
3. Verifique a mensagem de erro/sucesso
4. Se aparecer erro sobre "Credenciais SMTP não configuradas", significa que não está configurado

### Opção 3: Verificar Logs da Edge Function
1. Acesse: **Supabase Dashboard** → **Edge Functions** → **send-secretaria-welcome**
2. Clique em **Logs**
3. Procure por erros recentes
4. Se aparecer "Credenciais SMTP não configuradas", precisa configurar

## O que a Edge Function Verifica

A Edge Function verifica se `SMTP_USER` e `SMTP_PASS` estão configuradas:

```typescript
if (!SMTP_USER || !SMTP_PASS) {
  return {
    success: false,
    error: 'Credenciais SMTP não configuradas',
    message: 'Configure SMTP_USER e SMTP_PASS...'
  }
}
```

## Valores Esperados

Use as **mesmas credenciais** do Supabase Auth SMTP Settings:

```
SMTP_HOST=smtpout.secureserver.net
SMTP_PORT=587
SMTP_USER=[seu email GoDaddy completo, ex: no-reply@anesteasy.com.br]
SMTP_PASS=[sua senha do email GoDaddy]
SMTP_FROM=AnestEasy <noreply@anesteasy.com.br>
```

## Teste Rápido

Após configurar, teste criando uma nova secretária. Se o SMTP estiver correto:
- ✅ Email será enviado automaticamente
- ✅ Secretária receberá a senha temporária por email
- ✅ Mensagem de sucesso será exibida

Se não estiver configurado:
- ❌ Erro será exibido: "Credenciais SMTP não configuradas"
- ⚠️ Secretária será criada, mas email não será enviado

