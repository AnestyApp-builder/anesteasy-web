# ⚡ CONFIGURAR SMTP NO SUPABASE - PASSO A PASSO

## 🎯 SUAS CREDENCIAIS GODADDY

```
SMTP Host: smtpout.secureserver.net
SMTP Port: 587
SMTP User: contato@anesteasyapp.com.br
SMTP Pass: Felipe02171995@
```

## 📋 PASSO A PASSO (SIGA EXATAMENTE)

### 1️⃣ Acesse o Supabase Dashboard

1. Abra o navegador
2. Vá para: **https://app.supabase.com**
3. Faça login com sua conta
4. Selecione o projeto: **"Anesteasy WEB"**

### 2️⃣ Vá para Configurações de SMTP

1. No menu lateral esquerdo, clique em **"Settings"** (⚙️ ícone de engrenagem)
2. No submenu que abrir, clique em **"Authentication"**
3. Role a página para baixo até encontrar a seção **"SMTP Settings"**

### 3️⃣ Ative o SMTP Personalizado

1. Localize a opção **"Enable Custom SMTP"**
2. **CLIQUE NO TOGGLE** para ativar (deve ficar verde/azul)
3. ⚠️ **IMPORTANTE:** Certifique-se de que está MARCADO/ATIVADO

### 4️⃣ Preencha os Campos (COPIE EXATAMENTE)

**Copie e cole cada valor exatamente como está abaixo:**

#### Campo: SMTP Host
```
smtpout.secureserver.net
```

#### Campo: SMTP Port Number
```
587
```

#### Campo: SMTP Username
```
contato@anesteasyapp.com.br
```

#### Campo: SMTP Password
```
Felipe02171995@
```

#### Campo: SMTP Sender Email
```
contato@anesteasyapp.com.br
```

#### Campo: SMTP Sender Name
```
AnestEasy
```

### 5️⃣ Salvar Configurações

1. Role até o final da seção SMTP Settings
2. Clique no botão **"Save"** ou **"Update"**
3. Aguarde a confirmação (normalmente aparece uma mensagem verde)
4. **Aguarde 2-3 minutos** para as configurações serem aplicadas

### 6️⃣ Verificar se Funcionou

1. Acesse: `https://anesteasy.com.br/test-smtp` (ou `http://localhost:3000/test-smtp`)
2. Digite seu email: `contato@anesteasyapp.com.br`
3. Clique em "Enviar Email de Teste"
4. **Verifique sua caixa de entrada** (também verifique spam)

## 🔍 VERIFICAÇÃO DE LOGS

Após configurar e testar:

1. No Supabase Dashboard, vá em **"Logs"** (menu lateral)
2. Clique em **"Auth"**
3. Procure por tentativas de envio de email
4. Verifique se há erros de SMTP

### O que procurar nos logs:

✅ **BOM (Email enviado):**
- Nenhum erro de SMTP
- Requisição completada com sucesso

❌ **RUIM (Email não enviado):**
- "SMTP connection failed"
- "SMTP authentication failed"
- "Invalid credentials"
- "Connection timeout"

## ⚠️ PROBLEMAS COMUNS E SOLUÇÕES

### Problema 1: "SMTP authentication failed"
**Causa:** Senha ou usuário incorretos
**Solução:**
1. Verifique se copiou a senha **exatamente** (incluindo o @ no final)
2. Verifique se o email está completo: `contato@anesteasyapp.com.br`
3. Tente fazer login no webmail da GoDaddy com essas credenciais

### Problema 2: "Connection timeout" ou "Connection failed"
**Causa:** Porta bloqueada ou host incorreto
**Solução:**
1. Tente trocar a porta para **465** (SSL)
2. Ou tente trocar o host para `smtp.secureserver.net`

### Problema 3: Email não chega mas não há erros nos logs
**Causa:** Email pode estar indo para spam ou configuração de DNS
**Solução:**
1. Verifique a pasta de spam/lixo eletrônico
2. Adicione `contato@anesteasyapp.com.br` aos contatos
3. Aguarde alguns minutos (pode demorar)

### Problema 4: "Enable Custom SMTP" não salva
**Causa:** Navegador ou sessão expirada
**Solução:**
1. Recarregue a página do Supabase
2. Faça logout e login novamente
3. Tente em outro navegador (Chrome, Firefox)

## 📊 CHECKLIST FINAL

Antes de testar, confirme:

- [ ] "Enable Custom SMTP" está **ATIVADO** (toggle verde/azul)
- [ ] SMTP Host: `smtpout.secureserver.net`
- [ ] SMTP Port: `587`
- [ ] SMTP Username: `contato@anesteasyapp.com.br`
- [ ] SMTP Password: `Felipe02171995@` (com @ no final)
- [ ] SMTP Sender Email: `contato@anesteasyapp.com.br`
- [ ] SMTP Sender Name: `AnestEasy`
- [ ] Clicou em **Save** e aguardou confirmação
- [ ] Aguardou 2-3 minutos após salvar

## 🧪 TESTE FINAL

Após configurar:

1. Acesse `/test-smtp`
2. Envie email de teste
3. Verifique caixa de entrada
4. Se não receber, verifique os logs em **Logs → Auth**

## 🆘 SE AINDA NÃO FUNCIONAR

1. **Verifique na GoDaddy:**
   - O email `contato@anesteasyapp.com.br` existe?
   - A senha está correta?
   - SMTP está habilitado para este email?

2. **Teste as credenciais em um cliente de email:**
   - Configure Outlook/Thunderbird com as mesmas credenciais
   - Se funcionar no cliente mas não no Supabase = problema no Supabase
   - Se não funcionar no cliente = problema nas credenciais

3. **Alternativas de porta/host:**
   ```
   Opção 1: smtpout.secureserver.net:587 (STARTTLS)
   Opção 2: smtpout.secureserver.net:465 (SSL)
   Opção 3: smtp.secureserver.net:587 (STARTTLS)
   ```

## 📸 COMO DEVE FICAR

A seção SMTP Settings deve estar assim:

```
✅ Enable Custom SMTP: [TOGGLE ATIVADO]

SMTP Host: smtpout.secureserver.net
SMTP Port Number: 587
SMTP Username: contato@anesteasyapp.com.br
SMTP Password: ••••••••••••••••
SMTP Sender Email: contato@anesteasyapp.com.br
SMTP Sender Name: AnestEasy

[Save/Update Button]
```

---

## ⚡ DICA IMPORTANTE

**O Supabase pode levar alguns minutos para aplicar as configurações de SMTP.**

Se você acabou de salvar:
1. Aguarde 2-3 minutos
2. Recarregue a página do Dashboard
3. Verifique se as configurações ainda estão salvas
4. Então teste o envio de email

---

**Siga este guia passo a passo e o SMTP funcionará!** 🚀

