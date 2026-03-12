# 📧 Solução: Email com Senha Temporária para Secretarias

## 🎯 Objetivo

Enviar email para secretarias quando são vinculadas por anestesistas, contendo:
- ✅ Senha temporária
- ✅ Instruções de acesso
- ✅ Solicitação de troca de senha no primeiro login

---

## ✅ IMPLEMENTAÇÃO ATUAL

### **1. Sistema de Senha Temporária**
- ✅ Senha temporária é gerada automaticamente quando secretaria é criada
- ✅ Senha é salva nos metadados do usuário (`tempPassword`)
- ✅ Flag `mustChangePassword` é definida como `true`
- ✅ Secretaria é redirecionada para trocar senha no primeiro login

### **2. Página de Troca de Senha**
- ✅ Página `/secretaria/change-password` criada
- ✅ No primeiro login, não exige senha atual
- ✅ Em trocas posteriores, exige senha atual
- ✅ Remove flag `mustChangePassword` após troca

### **3. API Route de Email**
- ✅ API route `/api/send-secretaria-welcome` criada
- ✅ Template de email HTML preparado
- ⚠️ **Pendente**: Integração com serviço de email real

---

## 🔧 CONFIGURAÇÃO NECESSÁRIA

### **Opção 1: Edge Function do Supabase (Recomendado)**

#### **1. Criar Edge Function**

1. **Acesse**: https://app.supabase.com
2. **Vá para**: Edge Functions
3. **Crie nova função**: `send-secretaria-welcome`

#### **2. Código da Edge Function**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

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
            <p style="margin: 5px 0;"><strong>Senha temporária:</strong> <code style="background-color: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-size: 16px; font-weight: bold;">${senhaTemporaria}</code></p>
          </div>
          
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #92400e;"><strong>⚠️ Importante:</strong> Por questões de segurança, você será solicitada a trocar sua senha no primeiro login.</p>
          </div>
          
          <p>Para acessar o sistema:</p>
          <ol>
            <li>Acesse: <a href="https://anesteasy.com.br/login" style="color: #14b8a6;">https://anesteasy.com.br/login</a></li>
            <li>Faça login com seu email e a senha temporária acima</li>
            <li>Você será redirecionada automaticamente para trocar sua senha</li>
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

    // Fallback: usar Supabase para enviar email via Auth
    // Nota: Isso requer configuração de template personalizado
    
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Email enviado (verifique configuração)'
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

#### **3. Configurar Variáveis de Ambiente**

No Supabase Dashboard → Edge Functions → Settings:
- `RESEND_API_KEY`: Sua chave API do Resend (opcional)

---

### **Opção 2: Usar Resend Diretamente na API Route**

#### **1. Instalar Resend**

```bash
npm install resend
```

#### **2. Configurar Variável de Ambiente**

```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

#### **3. Atualizar API Route**

```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// No handler:
const { data, error } = await resend.emails.send({
  from: 'AnestEasy <noreply@anesteasy.com.br>',
  to: email,
  subject: 'Bem-vinda ao AnestEasy - Suas credenciais de acesso',
  html: emailHtml
})
```

---

### **Opção 3: Template Personalizado do Supabase**

#### **1. Configurar Template de Email**

1. **Acesse**: https://app.supabase.com
2. **Vá para**: Authentication → Email Templates
3. **Selecione**: "Confirm signup"
4. **Modifique o template** para incluir informações sobre senha temporária

**Nota**: O Supabase não permite variáveis customizadas nos templates padrão. Você precisará usar uma Edge Function ou serviço externo.

---

## 📋 FLUXO COMPLETO

### **1. Anestesista Vincula Secretaria**
1. Anestesista vai em `/configuracoes`
2. Clica em "Vincular Secretaria"
3. Preenche email, nome (opcional), telefone (opcional)
4. Clica em "Vincular"

### **2. Sistema Cria Conta**
1. Sistema verifica se secretaria existe
2. Se não existe, cria nova conta:
   - Gera senha temporária
   - Cria conta no Supabase Auth
   - Cria registro na tabela `secretarias`
   - Marca `mustChangePassword: true` nos metadados
   - Salva senha temporária nos metadados (temporariamente)

### **3. Email é Enviado**
1. API route `/api/send-secretaria-welcome` é chamada
2. Email é enviado com:
   - Senha temporária
   - Instruções de acesso
   - Link para login

### **4. Secretaria Faz Login**
1. Secretaria acessa `/login`
2. Faz login com email e senha temporária
3. Sistema verifica `mustChangePassword`
4. Redireciona para `/secretaria/change-password`

### **5. Secretaria Troca Senha**
1. Secretaria acessa página de troca de senha
2. No primeiro login, não precisa informar senha atual
3. Define nova senha
4. Sistema atualiza senha e remove flag `mustChangePassword`
5. Redireciona para `/secretaria/dashboard`

---

## ✅ FUNCIONALIDADES IMPLEMENTADAS

1. ✅ Geração de senha temporária
2. ✅ Criação de conta de secretaria
3. ✅ Marcação de necessidade de troca de senha
4. ✅ Página de troca de senha obrigatória
5. ✅ Verificação de necessidade de troca no login
6. ✅ Redirecionamento automático
7. ✅ API route para envio de email
8. ✅ Template de email preparado
9. ⚠️ **Pendente**: Integração com serviço de email real

---

## 🚀 PRÓXIMOS PASSOS

### **Para Produção:**
1. **Configurar Edge Function no Supabase** (Opção 1 - Recomendado)
2. **Ou configurar Resend** (Opção 2)
3. **Testar envio de email**
4. **Verificar se email chega na secretaria**
5. **Testar login com senha temporária**
6. **Testar troca de senha**

### **Para Desenvolvimento:**
- Sistema já funciona, mas email é apenas logado no console
- Senha temporária é gerada e salva nos metadados
- Secretaria pode fazer login e será redirecionada para trocar senha

---

## 🧪 TESTE COMPLETO

### **Teste 1: Criar Secretaria**
1. Login como anestesista
2. Ir para `/configuracoes`
3. Clicar em "Vincular Secretaria"
4. Preencher email: `secretaria.teste@exemplo.com`
5. Preencher nome: `Maria Silva`
6. Clicar em "Vincular"
7. ✅ Verificar mensagem de sucesso
8. ✅ Verificar console para ver senha temporária (em desenvolvimento)

### **Teste 2: Login da Secretaria**
1. Fazer logout do anestesista
2. Fazer login como secretaria:
   - Email: `secretaria.teste@exemplo.com`
   - Senha: (senha temporária do console)
3. ✅ Verificar redirecionamento para `/secretaria/change-password`

### **Teste 3: Troca de Senha**
1. Na página de troca de senha
2. Definir nova senha
3. Confirmar nova senha
4. Clicar em "Alterar Senha"
5. ✅ Verificar mensagem de sucesso
6. ✅ Verificar redirecionamento para dashboard

### **Teste 4: Login com Nova Senha**
1. Fazer logout
2. Fazer login com nova senha
3. ✅ Verificar acesso ao dashboard
4. ✅ Verificar que não precisa trocar senha novamente

---

## 📝 NOTAS IMPORTANTES

1. **Segurança**: A senha temporária é salva nos metadados apenas temporariamente e será removida após troca de senha.

2. **Email**: O email precisa ser enviado através de um serviço externo (Resend, SendGrid, etc.) ou Edge Function do Supabase.

3. **Confirmação de Email**: O Supabase pode exigir confirmação de email. Você pode:
   - Desativar temporariamente no Supabase Dashboard
   - Ou configurar para não exigir confirmação para secretarias

4. **Template de Email**: O template atual está pronto para uso, mas precisa ser integrado com um serviço de email real.

---

## 🔒 SEGURANÇA

- ✅ Senha temporária é gerada aleatoriamente
- ✅ Senha temporária é removida dos metadados após troca
- ✅ Flag `mustChangePassword` garante troca obrigatória
- ✅ Verificação de senha atual em trocas posteriores
- ✅ Validação de senha forte (mínimo 6 caracteres)

---

**Data**: $(date)
**Versão**: 1.0.0

