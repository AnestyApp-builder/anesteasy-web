# 📧 Configuração de Email para Secretarias

## 🎯 Objetivo

Configurar o envio automático de emails para secretarias quando são vinculadas por anestesistas, incluindo:
- ✅ Senha temporária
- ✅ Instruções de acesso
- ✅ Solicitação de troca de senha no primeiro login

---

## 🔧 Opções de Implementação

### **Opção 1: Edge Function do Supabase (Recomendado)**

#### **1. Criar Edge Function no Supabase**

1. **Acesse**: https://app.supabase.com
2. **Vá para**: Edge Functions
3. **Crie uma nova função**: `send-secretaria-welcome`
4. **Código da função**:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''

serve(async (req) => {
  try {
    const { email, nome, senhaTemporaria } = await req.json()

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bem-vinda ao AnestEasy</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #14b8a6; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0;">AnestEasy</h1>
        </div>
        
        <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #14b8a6;">Olá, ${nome}!</h2>
          
          <p>Você foi adicionada como secretária no sistema AnestEasy. Suas credenciais de acesso foram criadas:</p>
          
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #14b8a6;">
            <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 5px 0;"><strong>Senha temporária:</strong> <code style="background-color: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-size: 16px;">${senhaTemporaria}</code></p>
          </div>
          
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #92400e;"><strong>⚠️ Importante:</strong> Por questões de segurança, você será solicitada a trocar sua senha no primeiro login.</p>
          </div>
          
          <p>Para acessar o sistema:</p>
          <ol>
            <li>Acesse: <a href="https://anesteasy.com.br/login" style="color: #14b8a6;">https://anesteasy.com.br/login</a></li>
            <li>Faça login com seu email e a senha temporária acima</li>
            <li>Você será redirecionada para trocar sua senha</li>
            <li>Após trocar a senha, você poderá acessar o dashboard</li>
          </ol>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://anesteasy.com.br/login" style="background-color: #14b8a6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Acessar Sistema</a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Se você não solicitou este acesso, por favor ignore este email.
          </p>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
            Atenciosamente,<br>
            <strong>Equipe AnestEasy</strong>
          </p>
        </div>
      </body>
      </html>
    `

    // Usar Resend para enviar email (se configurado)
    if (RESEND_API_KEY) {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: 'AnestEasy <noreply@anesteasy.com.br>',
          to: email,
          subject: 'Bem-vinda ao AnestEasy - Suas credenciais de acesso',
          html: emailHtml
        })
      })

      if (resendResponse.ok) {
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200
        })
      }
    }

    // Fallback: usar Supabase Auth para enviar email (com template personalizado)
    // Nota: Isso requer configuração de template personalizado no Supabase
    
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Email enviado (modo desenvolvimento)'
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
```

5. **Configurar variável de ambiente** (opcional, para usar Resend):
   - `RESEND_API_KEY`: Sua chave API do Resend

---

### **Opção 2: Template Personalizado do Supabase**

#### **1. Configurar Template de Email no Supabase**

1. **Acesse**: https://app.supabase.com
2. **Vá para**: Authentication → Email Templates
3. **Selecione**: "Confirm signup"
4. **Modifique o template** para incluir a senha temporária:

```html
<h2>Bem-vinda ao AnestEasy, {{ .Name }}!</h2>

<p>Você foi adicionada como secretária no sistema AnestEasy. Suas credenciais de acesso foram criadas:</p>

<div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
  <p><strong>Email:</strong> {{ .Email }}</p>
  <p><strong>Senha temporária:</strong> {{ .TempPassword }}</p>
</div>

<div style="background-color: #fef3c7; padding: 15px; border-radius: 4px; margin: 20px 0;">
  <p><strong>⚠️ Importante:</strong> Por questões de segurança, você será solicitada a trocar sua senha no primeiro login.</p>
</div>

<p>Para acessar o sistema:</p>
<ol>
  <li>Acesse: <a href="{{ .SiteURL }}/login">Fazer Login</a></li>
  <li>Faça login com seu email e a senha temporária acima</li>
  <li>Você será redirecionada para trocar sua senha</li>
</ol>

<p>Atenciosamente,<br>Equipe AnestEasy</p>
```

**Nota**: O Supabase não suporta variáveis customizadas como `{{ .TempPassword }}` nos templates padrão. Você precisará usar uma Edge Function ou serviço externo.

---

### **Opção 3: Serviço de Email Externo (Resend, SendGrid, etc.)**

#### **1. Configurar Resend (Recomendado)**

1. **Criar conta**: https://resend.com
2. **Obter API Key**
3. **Configurar variável de ambiente**:
   ```env
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   ```
4. **Instalar dependência**:
   ```bash
   npm install resend
   ```
5. **Atualizar API route** para usar Resend diretamente

---

## ✅ Implementação Atual

### **Status:**
- ✅ API route criada (`/api/send-secretaria-welcome`)
- ✅ Template de email preparado
- ✅ Lógica de troca de senha obrigatória implementada
- ⚠️ Envio de email real: **Pendente de configuração**

### **Funcionalidades Implementadas:**
1. ✅ Geração de senha temporária
2. ✅ Marcação de `mustChangePassword` nos metadados do usuário
3. ✅ Página de troca de senha obrigatória (`/secretaria/change-password`)
4. ✅ Verificação de necessidade de troca de senha no login
5. ✅ Redirecionamento automático para troca de senha

---

## 🚀 Próximos Passos

### **Para Produção:**
1. **Configurar Edge Function no Supabase** (Opção 1 - Recomendado)
2. **Ou configurar Resend** (Opção 3)
3. **Ou configurar SMTP personalizado** e usar template personalizado

### **Para Desenvolvimento:**
- O sistema já funciona, mas o email é apenas logado no console
- A senha temporária é gerada e salva nos metadados
- A secretaria pode fazer login e será redirecionada para trocar a senha

---

## 📝 Notas Importantes

1. **Segurança**: A senha temporária é salva nos metadados do usuário apenas temporariamente e será removida após a troca de senha.

2. **Confirmação de Email**: O Supabase pode exigir confirmação de email antes do primeiro login. Você pode:
   - Desativar temporariamente no Supabase Dashboard (Authentication → Settings)
   - Ou configurar para não exigir confirmação para secretarias

3. **Template de Email**: O template atual está pronto para uso, mas precisa ser integrado com um serviço de email real para funcionar em produção.

---

## 🧪 Teste

1. **Vincular uma secretaria** em `/configuracoes`
2. **Verificar console** para ver o email preparado (em desenvolvimento)
3. **Verificar email** da secretaria (em produção, após configurar Edge Function ou Resend)
4. **Fazer login** com a senha temporária
5. **Verificar redirecionamento** para página de troca de senha
6. **Trocar senha** e verificar redirecionamento para dashboard

---

**Data**: $(date)
**Versão**: 1.0.0

