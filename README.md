# 🏥 AnestEasy - Plataforma de Gestão Anestésica

> **Plataforma mobile-first para gestão completa de procedimentos anestésicos**

[![React](https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)

## 📱 **Mobile-First Design**

Desenvolvido pensando nos **90% dos usuários** que utilizam dispositivos móveis:

- ✅ **Interface 100% responsiva** com breakpoints otimizados
- ✅ **Sidebar responsiva** que vira drawer no mobile
- ✅ **Componentes touch-friendly** com interações otimizadas
- ✅ **Navegação fluida** com animações suaves
- ✅ **Performance otimizada** para dispositivos móveis

## 🚀 **Funcionalidades**

### **📊 Dashboard Inteligente**
- Estatísticas em tempo real
- Gráficos interativos responsivos
- Procedimentos recentes
- Métricas de performance

### **💰 Gestão Financeira**
- Controle de pagamentos
- Filtros avançados
- Relatórios de receita
- Status de cobrança

### **📋 Procedimentos**
- Cadastro completo de procedimentos
- Histórico detalhado
- Categorização por tipo
- Integração com pacientes

### **📈 Relatórios**
- Análises estatísticas
- Gráficos personalizáveis
- Exportação de dados
- Insights de performance

### **⚙️ Configurações**
- Perfil do usuário
- Preferências do sistema
- Configurações de segurança
- Backup de dados

## 🛠️ **Tecnologias**

### **Frontend**
- **React 18+** - Biblioteca de interface
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização utilitária
- **Framer Motion** - Animações fluidas
- **Recharts** - Gráficos interativos
- **Lucide React** - Ícones modernos

### **Backend & Database**
- **Supabase** - Backend-as-a-Service
- **PostgreSQL** - Banco de dados
- **Row Level Security (RLS)** - Segurança avançada
- **Real-time subscriptions** - Atualizações em tempo real

### **Ferramentas**
- **Vite** - Build tool ultra-rápido
- **ESLint** - Linting de código
- **PostCSS** - Processamento CSS
- **Git** - Controle de versão

## 🏗️ **Arquitetura**

```
src/
├── components/          # Componentes reutilizáveis
│   ├── auth/           # Autenticação
│   ├── charts/         # Gráficos
│   ├── layout/         # Layout responsivo
│   ├── navigation/     # Navegação inteligente
│   └── ui/             # Componentes UI
├── context/            # Context API
├── hooks/              # Custom hooks
├── lib/                # Configurações
├── pages/              # Páginas da aplicação
├── services/           # Serviços de API
├── types/              # Definições TypeScript
└── utils/              # Utilitários
```

## 🚀 **Instalação e Uso**

### **Pré-requisitos**
- Node.js 18+
- npm ou yarn
- Conta no Supabase

### **1. Clone o repositório**
```bash
git clone https://github.com/seuusuario/anesteasy-web.git
cd anesteasy-web
```

### **2. Instale as dependências**
```bash
npm install
```

### **3. Configure o Supabase**
```bash
# Copie o arquivo de exemplo
cp .env.example .env.local

# Configure suas variáveis
VITE_SUPABASE_URL=sua_url_aqui
VITE_SUPABASE_ANON_KEY=sua_chave_aqui
```

### **4. Execute as migrações**
```bash
# Instale o Supabase CLI
npm install -g supabase

# Execute as migrações
supabase db push
```

### **5. Inicie o servidor**
```bash
npm run dev
```

## 📱 **Testando no Mobile**

### **Método 1: Rede Local**
```bash
# Descubra seu IP
ipconfig

# Acesse no celular
http://SEU_IP:3000
```

### **Método 2: Tunnel**
```bash
# Instale o ngrok
npm install -g ngrok

# Crie um tunnel
ngrok http 3000
```

### **Método 3: Deploy**
```bash
# Vercel
npm install -g vercel
vercel --prod

# Netlify
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

## 🔒 **Segurança**

- ✅ **Row Level Security (RLS)** ativo
- ✅ **Autenticação JWT** com Supabase
- ✅ **Validação de dados** em todas as entradas
- ✅ **Sanitização** de inputs
- ✅ **Auditoria** de ações críticas
- ✅ **Backup automático** de dados

## 📊 **Performance**

- ⚡ **Vite** - Build ultra-rápido
- 🎯 **Code splitting** - Carregamento otimizado
- 📱 **Mobile-first** - Performance em dispositivos móveis
- 🖼️ **Lazy loading** - Componentes sob demanda
- 💾 **Caching inteligente** - Redução de requisições

## 🤝 **Contribuição**

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'feat: adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 **Licença**

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👨‍💻 **Desenvolvedor**

**Dr. [Seu Nome]** - Anestesiologista & Desenvolvedor
- GitHub: [@seuusuario](https://github.com/seuusuario)
- LinkedIn: [Seu Perfil](https://linkedin.com/in/seuperfil)

## 🙏 **Agradecimentos**

- Supabase pela infraestrutura
- React Team pela biblioteca incrível
- Tailwind CSS pelo sistema de design
- Comunidade open source

---

**⭐ Se este projeto te ajudou, considere dar uma estrela!**