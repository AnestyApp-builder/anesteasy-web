# 📧 Configurar SMTP GoDaddy na Edge Function

## Por que usar SMTP GoDaddy?

Você já tem o SMTP da GoDaddy configurado no Supabase Auth. Vamos usar as **mesmas credenciais** na Edge Function para enviar emails de boas-vindas para secretárias.

## Passo 1: Obter Credenciais SMTP

As credenciais já estão configuradas no Supabase Auth. Você pode encontrá-las em:
- **Supabase Dashboard** → **Settings** → **Authentication** → **SMTP Settings**

Anote:
- **SMTP Host**: `smtpout.secureserver.net` (ou `smtp.secureserver.net`)
- **SMTP Port**: `587` (ou `465`)
- **SMTP User**: [seu email completo da GoDaddy]
- **SMTP Pass**: [sua senha do email GoDaddy]
- **SMTP From**: `AnestEasy <noreply@anesteasy.com.br>` (ou seu email GoDaddy)

## Passo 2: Configurar na Edge Function

1. Acesse: https://app.supabase.com
2. Vá para: **Edge Functions** → **send-secretaria-welcome**
3. Clique em **Settings** ou **Secrets**
4. Adicione as seguintes variáveis de ambiente:

```
SMTP_HOST=smtpout.secureserver.net
SMTP_PORT=587
SMTP_USER=[seu email completo da GoDaddy]
SMTP_PASS=[sua senha do email GoDaddy]
SMTP_FROM=AnestEasy <noreply@anesteasy.com.br>
```

**Importante**: Use as **mesmas credenciais** que estão configuradas no Supabase Auth SMTP Settings.

## Passo 3: Testar

1. Crie uma nova secretária no sistema
2. O email será enviado automaticamente usando o SMTP da GoDaddy
3. Verifique a caixa de entrada (e spam) do email da secretária

## Vantagens

✅ **Usa o mesmo SMTP** já configurado no Supabase  
✅ **Sem custos adicionais** (não precisa do Resend)  
✅ **Emails do seu domínio** (anesteasy.com.br)  
✅ **Melhor deliverability**  
✅ **Sem limites de terceiros**

## Troubleshooting

### Erro: "Credenciais SMTP não configuradas"
- Verifique se todas as variáveis de ambiente estão configuradas
- Use as mesmas credenciais do Supabase Auth SMTP Settings

### Erro: "Erro ao enviar email via SMTP"
- Verifique se o SMTP_HOST está correto (`smtpout.secureserver.net`)
- Verifique se a porta está correta (`587` ou `465`)
- Verifique se o usuário e senha estão corretos
- Verifique os logs da Edge Function no Supabase Dashboard

### Email não chega
- Verifique a caixa de spam
- Verifique se o email do destinatário está correto
- Verifique os logs da Edge Function para erros específicos

