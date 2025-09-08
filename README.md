# AnestEasy - Gestão Financeira para Anestesistas

Uma plataforma completa para anestesistas gerenciarem seus procedimentos, controle financeiro e análise profissional.

## 🚀 Funcionalidades

### 📊 Dashboard Inteligente
- Métricas financeiras em tempo real
- Gráficos de receita mensal
- Análise de tipos de procedimentos
- Indicadores de performance

### 🏥 Gestão de Procedimentos
- Cadastro completo de procedimentos anestésicos
- Controle de status de pagamento (Pendente, Pago, Cancelado)
- Informações detalhadas do paciente
- Histórico completo de procedimentos

### 💰 Controle Financeiro
- Acompanhamento de receitas e pagamentos
- Relatórios de performance financeira
- Análise de ticket médio
- Controle de pagamentos pendentes

### 📈 Relatórios e Análises
- Relatórios detalhados por período
- Análise de crescimento profissional
- Gráficos interativos
- Exportação de dados

### ⚙️ Configurações
- Perfil do profissional
- Configurações de notificações
- Gestão de segurança
- Controle de assinatura

## 🛠️ Tecnologias Utilizadas

- **React 18** - Biblioteca para interface de usuário
- **TypeScript** - Tipagem estática
- **Vite** - Build tool e dev server
- **Tailwind CSS** - Framework CSS utilitário
- **React Router** - Roteamento
- **Recharts** - Gráficos e visualizações
- **Lucide React** - Ícones
- **Date-fns** - Manipulação de datas

## 🎨 Design System

### Cores
- **Primary**: #14b8a6 (Teal)
- **Secondary**: #64748b (Slate)
- **Success**: #10b981 (Emerald)
- **Warning**: #f59e0b (Amber)
- **Error**: #ef4444 (Red)

### Tipografia
- **Fonte**: Inter (Google Fonts)
- **Pesos**: 300, 400, 500, 600, 700

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn

### Instalação

1. Clone o repositório:
```bash
git clone <repository-url>
cd anest-easy
```

2. Instale as dependências:
```bash
npm install
```

3. Execute o projeto em modo de desenvolvimento:
```bash
npm run dev
```

4. Acesse no navegador:
```
http://localhost:3000
```

### Scripts Disponíveis

- `npm run dev` - Executa o servidor de desenvolvimento
- `npm run build` - Gera build de produção
- `npm run preview` - Visualiza o build de produção
- `npm run lint` - Executa o linter

## 📱 Páginas da Aplicação

### Públicas
- **Home** (`/`) - Landing page com apresentação da plataforma
- **Login** (`/login`) - Autenticação de usuários
- **Cadastro** (`/register`) - Registro de novos usuários
- **Recuperação de Senha** (`/forgot-password`) - Reset de senha

### Protegidas (Requer autenticação)
- **Dashboard** (`/dashboard`) - Visão geral e métricas
- **Procedimentos** (`/procedimentos`) - Lista e gestão de procedimentos
- **Novo Procedimento** (`/procedimentos/novo`) - Cadastro de procedimentos
- **Financeiro** (`/financeiro`) - Controle financeiro
- **Relatórios** (`/relatorios`) - Análises e relatórios
- **Configurações** (`/configuracoes`) - Configurações da conta

## 🔐 Autenticação

O sistema utiliza um contexto de autenticação simulado que:
- Gerencia estado do usuário logado
- Persiste dados no localStorage
- Protege rotas privadas
- Redireciona usuários não autenticados

## 📊 Dados Mock

A aplicação utiliza dados mock para demonstração:
- Procedimentos de exemplo
- Estatísticas simuladas
- Relatórios com dados fictícios

## 🎯 Próximos Passos

- [ ] Integração com API real
- [ ] Autenticação com JWT
- [ ] Banco de dados
- [ ] Testes automatizados
- [ ] Deploy em produção
- [ ] PWA (Progressive Web App)
- [ ] Notificações push
- [ ] Backup automático

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

## 🤝 Contribuição

Contribuições são bem-vindas! Por favor, abra uma issue ou pull request.

---

Desenvolvido com ❤️ para anestesistas
