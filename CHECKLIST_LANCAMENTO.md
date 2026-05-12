# 🚀 Checklist Pré-Lançamento AnestEasy

Este checklist cobre as áreas técnicas, financeiras e operacionais necessárias para um lançamento seguro e profissional.

## 1. Infraestrutura e Chaves (Obrigatório)
- [ ] **Configurar Variáveis de Ambiente em Produção**: Garantir que o Vercel/Supabase tenha todas as chaves (Stripe, OpenAI, Sentry, Encryption Key).
- [ ] **Validar IDs do Stripe**: Confirmar se os IDs de preço no `.env` de produção batem com os produtos criados na Stripe Dashboard (Modo Live).
- [ ] **Verificar Webhook do Stripe**: No painel do Stripe, garantir que a URL do webhook aponta para `https://seu-dominio.com/api/stripe/webhook` e que o segredo bate.
- [ ] **Domínio Próprio**: Validar se o SSL (cadeado) está ativo e se o domínio principal está configurado corretamente.

## 2. Segurança e LGPD (Blindagem)
- [ ] **Backup da Encryption Key**: Guardar a `ENCRYPTION_KEY` em um local offline seguro. Se perder essa chave, os dados dos pacientes nunca poderão ser descriptografados.
- [ ] **Termos de Uso e Privacidade**: Garantir que os textos legais mencionam explicitamente a criptografia e o tratamento de dados sensíveis.
- [ ] **Políticas de RLS**: Executar um teste final no Supabase para garantir que um usuário nunca consiga ver dados de outro.

## 3. Experiência do Usuário (UX/UI)
- [ ] **Fluxo de Onboarding**: Fazer um cadastro do zero como se fosse um médico novo. O e-mail de boas-vindas chegou? O trial de 7 dias ativou?
- [ ] **Teste de Relatório**: Gerar um PDF com dados reais. A marca d'água está legível? Os gráficos estão corretos?
- [ ] **Responsividade**: Abrir o app no celular e testar o menu lateral e o preenchimento de procedimentos (90% dos médicos usarão mobile).

## 4. Monitoramento e Suporte
- [ ] **Alertas Sentry**: Confirmar se você está recebendo e-mails de erro do Sentry.
- [ ] **Link de Suporte/WhatsApp**: Testar se o botão de ajuda direciona corretamente para o canal de suporte.
- [ ] **SEO**: Validar se a meta-description da Home está atrativa para o Google.

## 5. Marketing e Conversão
- [ ] **Pixel/Analytics**: Garantir que o Google Analytics ou Meta Pixel está instalado para rastrear de onde vêm os leads.
- [ ] **Copy da Landing Page**: Revisar se a promessa de "Dashboard Analítico" e "Segurança LGPD" está clara.
- [ ] **Voucher de Desconto**: (Opcional) Testar se os cupons de desconto do Stripe estão funcionando, caso vá usar no lançamento.

---

> [!IMPORTANT]
> **DICA DE OURO:** Faça um pagamento real de 1 Real (ou o valor mínimo) no plano diário usando seu próprio cartão antes de abrir para o público. Isso valida todo o ciclo financeiro.
