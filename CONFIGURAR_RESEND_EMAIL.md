# 📧 Como Configurar Resend para Envio de Emails

## Problema Atual
O email de boas-vindas para secretárias não está sendo enviado porque o **Resend** não está configurado na Edge Function do Supabase.

## Solução: Configurar Resend API Key

### Passo 1: Criar Conta no Resend
1. Acesse: https://resend.com
2. Crie uma conta gratuita
3. Verifique seu domínio (ou use o domínio de teste do Resend)

### Passo 2: Obter API Key
1. No dashboard do Resend, vá para **API Keys**
2. Clique em **Create API Key**
3. Dê um nome (ex: "AnestEasy Secretaria Emails")
4. Copie a chave API (começa com `re_`)

### Passo 3: Configurar no Supabase
1. Acesse: https://app.supabase.com
2. Selecione o projeto: **Anesteasy WEB**
3. Vá para: **Edge Functions** → **send-secretaria-welcome**
4. Clique em **Settings** ou **Secrets**
5. Adicione uma nova variável de ambiente:
   - **Nome**: `RESEND_API_KEY`
   - **Valor**: Cole a chave API do Resend (ex: `re_xxxxxxxxxxxxx`)
6. Salve as configurações

### Passo 4: Verificar Domínio (Opcional mas Recomendado)
Para melhor deliverability:
1. No Resend, vá para **Domains**
2. Adicione seu domínio: `anesteasy.com.br`
3. Configure os registros DNS conforme instruções
4. Aguarde verificação (pode levar algumas horas)

### Passo 5: Testar
1. Crie uma nova secretária no sistema
2. Verifique se o email foi recebido
3. Se não receber, verifique:
   - Se a API Key está correta
   - Se o domínio está verificado (ou use o domínio de teste)
   - Os logs da Edge Function no Supabase Dashboard

## Alternativa Temporária: Usar Console

Enquanto o Resend não está configurado:
- A senha temporária é exibida no **console do navegador (F12)**
- Procure por: `📧 NOVA SECRETARIA CRIADA`
- A senha estará destacada no console

## Estrutura do Email Enviado

O email contém:
- ✅ Senha temporária destacada
- ✅ Instruções para primeiro login
- ✅ Link para acessar o sistema
- ✅ Aviso sobre troca obrigatória de senha

## Limites do Resend Gratuito

- **3.000 emails/mês** no plano gratuito
- **100 emails/dia** no plano gratuito
- Suficiente para testes e uso moderado

## Próximos Passos

Após configurar o Resend:
1. ✅ Emails serão enviados automaticamente
2. ✅ Senha temporária estará no email
3. ✅ Secretárias receberão instruções completas

