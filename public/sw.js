// Service Worker para Cache Busting
// Este SW força o navegador a sempre buscar a versão mais recente

const CACHE_VERSION = 'v1';
const CACHE_NAME = `anesteasy-${CACHE_VERSION}`;

// Instalar e ativar imediatamente
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando nova versão...');
  self.skipWaiting(); // Força ativação imediata
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando e limpando cache antigo...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deletando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Cache limpo, assumindo controle...');
      return self.clients.claim(); // Assume controle de todas as páginas
    })
  );
});

// Estratégia: Network First (sempre buscar da rede primeiro)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Não cachear HTML, API calls ou dados dinâmicos
  if (
    request.method !== 'GET' ||
    url.pathname.startsWith('/api/') ||
    url.pathname.endsWith('.html') ||
    request.headers.get('accept')?.includes('text/html')
  ) {
    // Network only para páginas HTML e APIs
    event.respondWith(fetch(request));
    return;
  }

  // Para assets estáticos (_next/static), usar cache com revalidação
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return fetch(request)
          .then((response) => {
            // Cachear a resposta da rede
            cache.put(request, response.clone());
            return response;
          })
          .catch(() => {
            // Se falhar, tentar buscar do cache
            return cache.match(request);
          });
      })
    );
    return;
  }

  // Para outros recursos, sempre buscar da rede
  event.respondWith(fetch(request));
});

// Limpar cache quando receber mensagem do cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('[SW] Recebida solicitação para limpar cache');
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            console.log('[SW] Deletando cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }).then(() => {
        console.log('[SW] Todo cache foi limpo!');
        // Notificar o cliente que o cache foi limpo
        event.ports[0].postMessage({ success: true });
      })
    );
  }
});

