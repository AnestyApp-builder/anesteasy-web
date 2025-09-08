# Deploy na Vercel - AnestEasy

## Pré-requisitos

1. Conta na Vercel (https://vercel.com)
2. Projeto conectado ao GitHub
3. Variáveis de ambiente configuradas

## Passos para Deploy

### 1. Configurar Variáveis de Ambiente na Vercel

No dashboard da Vercel, vá em **Settings > Environment Variables** e adicione:

```
VITE_SUPABASE_URL = https://zmtwwajyhusyrugobxur.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptdHd3YWp5aHVzeXJ1Z29ieHVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMzYzNzAsImV4cCI6MjA3MjkxMjM3MH0.NC6t2w_jFWTMJjVv5FmPLouVyOVgCTBReCr0zOA2dx8
```

### 2. Deploy Automático

O projeto está configurado para deploy automático:

- **Framework**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Node.js Version**: 18.x (recomendado)

### 3. Configurações do Projeto

O arquivo `vercel.json` já está configurado com:

- ✅ Rewrites para SPA (Single Page Application)
- ✅ Cache otimizado para assets estáticos
- ✅ Configuração de variáveis de ambiente
- ✅ Build otimizado com code splitting

### 4. Verificações Pós-Deploy

Após o deploy, verifique:

1. **Autenticação**: Login/registro funcionando
2. **Supabase**: Conexão com banco de dados
3. **Navegação**: Todas as rotas funcionando
4. **Performance**: Carregamento rápido
5. **Responsividade**: Funcionamento em mobile

### 5. Domínio Personalizado (Opcional)

Para configurar um domínio personalizado:

1. Vá em **Settings > Domains**
2. Adicione seu domínio
3. Configure os registros DNS conforme instruções

### 6. Monitoramento

- Use o dashboard da Vercel para monitorar:
  - Performance
  - Erros
  - Analytics
  - Logs

## Troubleshooting

### Build Falhando
- Verifique se todas as dependências estão no `package.json`
- Confirme se as variáveis de ambiente estão configuradas
- Verifique os logs de build na Vercel

### Erro 404 em Rotas
- Confirme se o `vercel.json` está configurado corretamente
- Verifique se o rewrite está funcionando

### Problemas com Supabase
- Confirme se as variáveis de ambiente estão corretas
- Verifique se o projeto Supabase está ativo
- Confirme as configurações de RLS (Row Level Security)

## Comandos Úteis

```bash
# Build local para teste
npm run build

# Preview do build
npm run preview

# Verificar linting
npm run lint
```

## Suporte

Para problemas específicos:
1. Verifique os logs na Vercel
2. Consulte a documentação da Vercel
3. Verifique as configurações do Supabase
