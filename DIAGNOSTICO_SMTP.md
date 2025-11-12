# 🔍 Diagnóstico de Problemas SMTP

## ⚠️ Problema: Teste diz que está configurado, mas email não chega

## 📋 Credenciais GoDaddy para Configurar

```
SMTP Host: smtpout.secureserver.net
SMTP Port: 587
SMTP User: contato@anesteasyapp.com.br
SMTP Pass: Felipe02171995@
SMTP Admin Email: contato@anesteasyapp.com.br
SMTP Sender Name: AnestEasy
```

**⚡ GUIA PASSO A PASSO:** `CONFIGURAR_SMTP_SUPABASE_AGORA.md`

**Configure agora:**
1. Acesse: https://app.supabase.com
2. Projeto: "Anesteasy WEB"
3. Settings → Authentication → SMTP Settings
4. Enable Custom SMTP: **ATIVAR**
5. Preencha com as credenciais acima
6. Save e aguarde 2-3 minutos

### Por que isso acontece?

O Supabase `generateLink()` pode retornar sucesso mesmo quando o email não é enviado. Isso acontece porque:

1. **O Supabase apenas gera o link** - não garante envio
2. **Erros de SMTP podem ser silenciosos** - o Supabase pode não reportar falhas
3. **Configuração SMTP pode estar incorreta** - mas o Supabase não valida antes de gerar o link

## 🔧 Como Diagnosticar

### 1. Verificar Logs do Supabase

**Passos:**
1. Acesse: https://app.supabase.com
2. Vá em: **Logs** → **Auth**
3. Procure por tentativas de envio de email
4. Verifique se há erros relacionados a SMTP

**O que procurar:**
- Erros como "SMTP connection failed"
- Erros como "Authentication failed"
- Erros como "Email send failed"
- Warnings sobre SMTP não configurado

### 2. Verificar Configuração SMTP

**No Supabase Dashboard:**
1. **Settings** → **Authentication** → **SMTP Settings**
2. Verifique se **"Enable custom SMTP"** está realmente **ATIVADO**
3. Verifique se todas as credenciais estão corretas:
   - SMTP Host
   - SMTP Port
   - SMTP User (email completo)
   - SMTP Pass (senha correta)
   - SMTP Admin Email
   - SMTP Sender Name

### 3. Testar Credenciais SMTP Manualmente

**Usando Outlook/Thunderbird/Mail:**

1. Configure um cliente de email com as mesmas credenciais:
   ```
   Servidor SMTP: smtpout.secureserver.net
   Porta: 587
   Segurança: STARTTLS
   Usuário: seu@email.com
   Senha: sua_senha
   ```

2. Tente enviar um email de teste

3. **Se funcionar:** O problema está no Supabase
4. **Se não funcionar:** As credenciais estão incorretas

### 4. Verificar Configurações GoDaddy

**Problemas comuns:**

1. **Porta incorreta:**
   - Tente: `587` (STARTTLS)
   - Ou: `465` (SSL)
   - Ou: `25` (sem criptografia)

2. **Host incorreto:**
   - Tente: `smtpout.secureserver.net`
   - Ou: `smtp.secureserver.net`
   - Ou: `relay-hosting.secureserver.net`

3. **Autenticação:**
   - Certifique-se de que a autenticação SMTP está habilitada na GoDaddy
   - Verifique se não há bloqueios de firewall

### 5. Verificar DNS/SPF/DKIM

**Problemas de deliverability:**

1. **SPF Record:** Adicione ao DNS:
   ```
   v=spf1 include:secureserver.net ~all
   ```

2. **DKIM:** Configure no painel GoDaddy

3. **DMARC:** Configure política de email

## 🛠️ Soluções

### Solução 1: Usar Resend (Recomendado)

Resend é mais confiável que SMTP direto:

1. Crie conta em: https://resend.com
2. Obtenha API Key
3. Configure na Edge Function:
   ```env
   RESEND_API_KEY=re_xxxxx
   ```
4. Use a Edge Function `send-secretaria-welcome` que já está configurada

### Solução 2: Corrigir SMTP GoDaddy

**Configuração correta:**

```
SMTP Host: smtpout.secureserver.net
SMTP Port: 587
SMTP User: seu@email.com.br (email completo)
SMTP Pass: sua_senha_do_email
SMTP Admin Email: seu@email.com.br
SMTP Sender Name: AnestEasy
Enable custom SMTP: ✅ ATIVADO
```

**Teste alternativo:**

Se `smtpout.secureserver.net` não funcionar, tente:

```
SMTP Host: smtp.secureserver.net
SMTP Port: 587
```

Ou:

```
SMTP Host: smtpout.secureserver.net
SMTP Port: 465
Segurança: SSL
```

### Solução 3: Usar SendGrid

SendGrid é mais confiável:

1. Crie conta em: https://sendgrid.com
2. Configure SMTP no Supabase:
   ```
   SMTP Host: smtp.sendgrid.net
   SMTP Port: 587
   SMTP User: apikey
   SMTP Pass: [sua API key do SendGrid]
   ```

## 📋 Checklist de Diagnóstico

- [ ] Verificou logs do Supabase (Logs → Auth)?
- [ ] Verificou se "Enable custom SMTP" está ativado?
- [ ] Testou credenciais SMTP em cliente de email?
- [ ] Verificou porta SMTP (587, 465, ou 25)?
- [ ] Verificou host SMTP (smtpout.secureserver.net)?
- [ ] Verificou se email e senha estão corretos?
- [ ] Verificou pasta de spam/lixo eletrônico?
- [ ] Aguardou alguns minutos (emails podem demorar)?

## 🎯 Próximos Passos

1. **Verifique os logs do Supabase primeiro** - isso mostrará o erro real
2. **Teste as credenciais manualmente** - confirme que funcionam
3. **Considere usar Resend ou SendGrid** - mais confiável que SMTP direto
4. **Configure DNS corretamente** - SPF, DKIM, DMARC

## 📞 Suporte

Se nada funcionar:
1. Verifique os logs do Supabase
2. Entre em contato com suporte GoDaddy
3. Considere migrar para Resend ou SendGrid

