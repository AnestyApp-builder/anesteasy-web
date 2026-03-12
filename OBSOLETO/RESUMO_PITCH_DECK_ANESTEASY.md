## 🎯 Visão geral da plataforma

O **AnestEasy** é uma plataforma SaaS de gestão focada **exclusivamente em anestesiologistas**, já com **versão 1.0 implementada e pronta para produção**.  
Combina **gestão de procedimentos**, **controle financeiro**, **relatórios** e **fluxos de secretárias** em um único sistema moderno, seguro (Supabase + RLS) e hospedado na Vercel.

## ✅ O que já está implementado (produto hoje)

- **Autenticação e contas**
  - Cadastro e login de anestesiologistas com validação de CRM.
  - Cadastro e login de secretárias com fluxo dedicado.
  - Confirmação de e‑mail, recuperação de senha e segurança com Supabase Auth.
  - Controle de acesso baseado em perfis (anestesista x secretária) com Row Level Security.

- **Dashboard inteligente**
  - Visão geral em tempo real de procedimentos, faturamento e performance.
  - Cards de métricas (procedimentos realizados, pendentes, cancelados, receita, metas).
  - Destaque de procedimentos recentes e ações rápidas.

- **Gestão completa de procedimentos**
  - Cadastro rico de procedimentos com dados do paciente, equipe, hospital e tipo de anestesia.
  - Campos específicos para obstetrícia (tipo de parto, tipo de cesariana, complicações).
  - Registro de complicações (sangramento, náusea, dor, transfusão, etc.).
  - Histórico pesquisável e filtros por data, status, tipo, hospital e outros critérios.

- **Imagens e anexos (fichas digitalizadas)**
  - Upload de anexos em bucket dedicado no Supabase Storage.
  - Detecção automática de arquivos de imagem (por extensão e MIME).
  - Thumbnails, modal de visualização em tela cheia, abrir em nova aba e download.
  - Tratamento de erro e layout responsivo para visualização em desktop e mobile.

- **Gestão financeira**
  - Controle de receitas por procedimento, status de pagamento (pendente, pago, cancelado, reembolsado).
  - Suporte a parcelamento e diferentes formas de pagamento.
  - Visão de fluxo de caixa e metas financeiras mensais.
  - Relatórios financeiros por período, com indicadores de performance.

- **Relatórios e exportação**
  - Relatórios de procedimentos e relatórios financeiros consolidados.
  - Filtros por período, tipo de procedimento, status e outros.
  - Exportação de dados (CSV/PDF) planejada e parcialmente estruturada no código.

- **Sistema de secretárias (já implementado)**
  - Fluxo completo de convite: anestesista gera link de cadastro para a secretária.
  - Página de cadastro de secretária via token com verificação de validade (7 dias, uso único).
  - Secretária existente recebe notificação dentro do dashboard para aceitar/recusar vínculo.
  - Contexto de notificações em tempo real e componentes de UI (sino com badge, lista, ações).
  - Regras de segurança com RLS garantindo acesso apenas aos médicos vinculados.

- **Assinaturas e cobrança recorrente (Stripe)**
  - Migração concluída de Pagar.me para **Stripe** (checkout + customer portal).
  - API de checkout para criação de sessões de pagamento.
  - API de portal para gerenciamento da assinatura pelo próprio médico (upgrade/downgrade, cartão, histórico).
  - Webhook Stripe implementado para ativar/atualizar assinatura no banco.
  - Colunas e índices de Stripe adicionados nas tabelas (ids de cliente, assinatura, planos).
  - Página de planos e página de assinatura integradas ao Stripe.

- **Arquitetura técnica**
  - Frontend em **Next.js 15 + React 19 + TypeScript + Tailwind CSS**, já responsivo (mobile‑first).
  - Backend e banco em **Supabase (PostgreSQL)** com RLS configurado para usuários, procedimentos e secretárias.
  - Armazenamento de arquivos em Supabase Storage com políticas RLS para o bucket de anexos.
  - Deploy planejado e documentado para **Vercel**, com configuração de variáveis de ambiente e domínios.

## 💡 Diferenciais competitivos para o pitch

- **Foco extremo na anestesiologia**: campos, fluxos e relatórios desenhados especificamente para a rotina do anestesista (incluindo obstetrícia, tipo de cesariana, complicações, feedback pós‑procedimento).
- **Fluxo de secretárias nativo**: processo estruturado de convite, cadastro e vinculação, com permissões claras e notificações em tempo real.
- **Gestão ponta a ponta**: do cadastro do procedimento à cobrança recorrente via assinatura, passando por controle financeiro e relatórios.
- **Infra moderna e escalável**: stack atual (Next.js 15, Supabase, Stripe, Vercel) com performance e segurança de nível enterprise.
- **LGPD by design**: uso de RLS, separação de perfis, logs de ações e boas práticas de proteção de dados.

## 📈 Estado atual do produto (para investidores)

- **Versão 1.0 implementada** com: autenticação, dashboard, procedimentos, financeiro, secretárias, anexos, Stripe e RLS.
- **Fluxos críticos testados**: cadastro/login, cadastro de secretária, criação de procedimentos, upload de imagens, criação de assinatura e gerenciamento via portal da Stripe (em ambiente de teste).
- **Documentação extensa**: PRD completo, guias de deploy, configuração de ambiente, scripts SQL e correções já mapeadas.
- **Pronto para produção**, dependendo apenas de:
  - Configuração definitiva de Stripe em modo live (produtos, preços, webhook).
  - Ajuste final das variáveis de ambiente e domínio na Vercel.

## 🧩 Ideias claras de roadmap (gancho para o slide de futuro)

- App mobile dedicado para anestesiologistas.
- Relatórios avançados com análise de performance e previsões de receita.
- Integração com calendários e sistemas hospitalares.
- Módulo de IA para insights automáticos sobre rentabilidade e risco.


