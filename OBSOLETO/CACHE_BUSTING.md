# 🔄 Sistema de Cache Busting

Este documento explica o sistema de cache busting implementado no AnestEasy para garantir que os usuários sempre tenham a versão mais recente do aplicativo.

## 📋 Componentes do Sistema

### 1. **Build ID Único** (`next.config.js`)
- Cada build gera um ID único: `build-{timestamp}-{random}`
- Isso força o Next.js a gerar URLs únicas para todos os assets
- Assets em `/_next/static/` terão URLs diferentes a cada deploy

```javascript
generateBuildId: async () => {
  return `build-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}
```

### 2. **Headers HTTP** (`next.config.js`)
Configurados três tipos de cache:

#### a) HTML Pages - **SEM CACHE**
```
Cache-Control: no-cache, no-store, must-revalidate, max-age=0
Pragma: no-cache
Expires: 0
```

#### b) Assets Next.js (`/_next/static/*`) - **CACHE LONGO**
```
Cache-Control: public, max-age=31536000, immutable
```

#### c) Mídia (`/videos/*`) - **CACHE LONGO**
```
Cache-Control: public, max-age=31536000, immutable
```

### 3. **Service Worker** (`public/sw.js`)
- Registrado automaticamente no `app/layout.tsx`
- Estratégia **Network First** para HTML e APIs
- Limpa cache antigo automaticamente
- Detecta novas versões e recarrega a página

Recursos:
- Auto-update a cada 30 segundos
- Reload automático quando nova versão é detectada
- Comando manual: `CLEAR_CACHE` via postMessage

### 4. **Version.json** (`public/version.json`)
Atualizado automaticamente antes de cada build:

```json
{
  "version": "1.0.0",
  "buildDate": "2025-01-14T12:34:56.789Z",
  "buildId": "build-1736857296789-a8f3k9d",
  "buildTimestamp": 1736857296789,
  "environment": "production"
}
```

### 5. **Componente VersionInfo** (`components/VersionInfo.tsx`)
- Verifica novas versões a cada 2 minutos
- Mostra banner quando nova versão está disponível
- Botão "Atualizar" que limpa cache e recarrega
- Em dev, mostra info de versão no canto inferior esquerdo

### 6. **Meta Tags** (`app/layout.tsx`)
Meta tags no `<head>` forçam navegador a não cachear HTML:

```html
<meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
<meta httpEquiv="Pragma" content="no-cache" />
<meta httpEquiv="Expires" content="0" />
```

## 🚀 Como Funciona no Deploy

### Automático (Vercel)
1. **Pre-build**: Script `scripts/update-version.js` atualiza `version.json`
2. **Build**: Next.js gera novo Build ID
3. **Deploy**: Todos os assets têm URLs únicas
4. **Cliente**: Service Worker detecta mudança e recarrega

### Manual
```bash
# Limpar cache local (dev)
npm run clear-cache

# Build com nova versão
npm run build

# Deploy para Vercel
npx vercel --prod --yes
```

## 🔍 Como Testar

### 1. Verificar Build ID
```bash
# No navegador (console)
console.log(window.__NEXT_DATA__.buildId)
```

### 2. Verificar Service Worker
```bash
# No navegador (console)
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => console.log(reg))
})
```

### 3. Verificar Versão
```bash
# Acessar diretamente
https://anesteasy.com.br/version.json
```

### 4. Forçar Limpeza de Cache
```bash
# No navegador (console)
navigator.serviceWorker.getRegistration().then(reg => {
  if (reg) {
    const messageChannel = new MessageChannel()
    messageChannel.port1.onmessage = (event) => {
      console.log('Cache limpo:', event.data)
    }
    reg.active.postMessage(
      { type: 'CLEAR_CACHE' },
      [messageChannel.port2]
    )
  }
})
```

## 🎯 Garantias

✅ **HTML nunca é cacheado** - Sempre busca do servidor
✅ **Assets têm URLs únicas** - Build ID único a cada deploy
✅ **Service Worker detecta mudanças** - Auto-update + reload
✅ **Usuários veem banner** - Notificação de atualização disponível
✅ **Cache antigo é limpo** - Service Worker remove versões antigas

## 📱 Mobile

O sistema funciona especialmente bem em mobile:
- PWA detecta atualizações automaticamente
- Service Worker persiste mesmo quando app está fechado
- Banner de atualização é mobile-friendly
- Reload automático garante versão mais recente

## 🐛 Troubleshooting

### Usuário ainda vê versão antiga?

1. **Verificar Build ID mudou**
```bash
curl https://anesteasy.com.br/version.json
```

2. **Limpar cache do navegador manualmente**
- Chrome: DevTools > Application > Clear storage
- Mobile: Configurações > Limpar dados do site

3. **Desregistrar Service Worker**
```javascript
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => reg.unregister())
})
```

4. **Hard Reload**
- Desktop: Ctrl + Shift + R (Windows) / Cmd + Shift + R (Mac)
- Mobile: Fechar app completamente e reabrir

### Build ID não muda?

Verificar se `scripts/update-version.js` está sendo executado:
```bash
npm run prebuild
```

## 🎓 Referências

- [Next.js Caching](https://nextjs.org/docs/app/building-your-application/caching)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [HTTP Caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching)
- [Cache-Control Header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control)

