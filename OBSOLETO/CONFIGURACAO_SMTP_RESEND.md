# Configuração SMTP GoDaddy para Supabase

## Problema Identificado
O erro 500 no signup está sendo causado pelo limite de rate limiting do SMTP padrão do Supabase (30 emails por hora). Para resolver isso definitivamente, é necessário configurar um SMTP personalizado.

## Solução: Configurar SMTP GoDaddy

### Passo 1: Obter credenciais SMTP da GoDaddy
1. Acesse sua conta GoDaddy
2. Vá para "Email & Office" ou "Workspace Email"
3. Encontre as configurações SMTP do seu email
4. Anote as credenciais SMTP:
   - **Host**: smtpout.secureserver.net (ou smtp.secureserver.net)
   - **Port**: 587 (ou 465 para SSL)
   - **Username**: [seu email completo da GoDaddy]
   - **Password**: [sua senha do email]
   - **From Email**: [seu email da GoDaddy, ex: no-reply@anesteasy.com.br]

### Passo 2: Configurar no Supabase
1. Acesse o Supabase Dashboard: https://app.supabase.com
2. Vá para o projeto "Anesteasy WEB"
3. Navegue para: Settings > Authentication > SMTP Settings
4. Configure:
   - **Enable custom SMTP**: ✅
   - **SMTP Host**: smtpout.secureserver.net
   - **SMTP Port**: 587
   - **SMTP User**: [seu email completo da GoDaddy]
   - **SMTP Pass**: [sua senha do email GoDaddy]
   - **SMTP Admin Email**: [seu email da GoDaddy]
   - **SMTP Sender Name**: AnestEasy

### Passo 3: Testar
Após configurar, teste criando uma nova conta para verificar se o email de confirmação é enviado corretamente.

## Configurações Alternativas da GoDaddy
Se as configurações acima não funcionarem, tente:
- **Host alternativo**: smtp.secureserver.net
- **Porta SSL**: 465 (em vez de 587)
- **Autenticação**: Certifique-se de que a autenticação SMTP está habilitada

## Informações Importantes
- ✅ Use seu domínio personalizado (anesteasy.com.br)
- ✅ Emails virão do seu domínio oficial
- ✅ Melhor deliverability
- ✅ Sem limites de rate limiting

## Benefícios
- ✅ Resolve o erro 500 no signup
- ✅ Remove limite de 30 emails/hora
- ✅ Melhor deliverability
- ✅ Controle total sobre templates de email
- ✅ Logs detalhados de entrega
