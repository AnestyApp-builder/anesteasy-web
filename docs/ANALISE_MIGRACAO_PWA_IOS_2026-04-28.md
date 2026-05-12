# Análise Detalhada para Migração PWA (iOS) - AnestEasy

Data: 28/04/2026  
Projeto analisado: `D:/PROJETOS/AnestEasy WEB`

## 1) Escopo e premissas

Os diretórios informados no prompt (`/home/ubuntu/anesteasy_old_project` e `/home/ubuntu/anesteasy_current_project`) não existem neste ambiente local.  
Para viabilizar a análise comparativa, foi usado como baseline "projeto antigo" o commit `e659213` (v0.1) e como "projeto atual" o estado atual do branch.

## 2) Comparação entre "antigo" e "atual"

## 2.1 Dependências (impacto em performance/PWA/iOS)

Comparação de `package.json` (`e659213` -> atual):

| Tipo | Mudança | Impacto potencial |
|---|---|---|
| Adição | `framer-motion` | Aumenta bundle do cliente e custo de render/animação no Safari iOS se usado em telas complexas |
| Adição | `date-fns`, `embla-carousel-react`, `react-dropzone` | Pode ampliar JS inicial se importado em rotas críticas |
| Adição | `@google-cloud/speech`, `@google-cloud/vision`, `openai`, `stripe`, `sharp` | Bibliotecas pesadas; devem ficar estritamente em server/API route (não cliente) |
| Atualização | `next` `^15.5.2` -> `15.5.9` | Ganhos de segurança/correções; pode alterar comportamento de build/cache |
| Atualização | `eslint` 8 -> 9 | Sem impacto direto em runtime, mas eleva rigor de qualidade (aqui build ignora lint) |

## 2.2 Estrutura e arquitetura

| Área | Evolução observada | Impacto potencial |
|---|---|---|
| App Router | Forte expansão de rotas em `app/` (web + admin + secretaria + APIs) | Escopo funcional maior e maior pressão no bundle compartilhado |
| Backend in-app | Muitas rotas `app/api/*` | Melhor centralização, mas risco de acoplamento e crescimento de código comum |
| PWA assets | Inclusão de `public/manifest.json`, `public/sw.js`, ícones/splash iOS | Base já preparada para instalação e experiência app-like |
| Docs/scripts | Grande crescimento em `docs/`, `scripts/`, `supabase/migrations/` | Melhora governança, mas aumenta complexidade operacional |

## 2.3 Lógica de negócio

Mudanças significativas detectadas:
- Novo domínio de assinatura/pagamentos (`stripe`, `subscription`, rotas de gestão e webhook).
- Fluxo de secretaria e permissões em múltiplas telas/rotas.
- OCR/voz em APIs específicas.

Impacto:
- Mais estados assíncronos e integrações externas aumentam chance de travas percebidas em iOS quando a UI aguarda respostas/re-renderiza.
- Necessário particionar melhor o que vai para cliente vs servidor para evitar sobrecarga no Safari.

## 2.4 Build e configuração

`next.config.js` atual mostra customização forte de `webpack` e cache headers:
- `compress: true` (positivo).
- Split chunks customizados (positivo, mas precisa validar resultado real).
- Header global `Cache-Control: no-cache, no-store` para `/:path*` (pode conflitar com estratégia PWA/offline).
- `typescript.ignoreBuildErrors` e `eslint.ignoreDuringBuilds` ativos (risco de regressões irem para produção).

## 3) Prontidão PWA no projeto atual

## 3.1 Manifest

Arquivo existe: `public/manifest.json`  
Status:
- OK: `name`, `short_name`, `start_url`, `display: standalone`, `background_color`, `theme_color`, `scope`, `icons`.
- OK: ícones 192/512 e versões `maskable`.
- Gap iOS: iOS usa mais `apple-touch-icon` e splash/meta do que o manifest em si (já parcialmente coberto no layout).

## 3.2 Service Worker

Arquivo existe: `public/sw.js`  
Registro existe em `app/layout.tsx` (script inline com `navigator.serviceWorker.register('/sw.js')`).

Pontos fortes:
- SW registrado.
- Limpeza de caches antigos por versão.
- Cache para `/_next/static/*`.

Gaps críticos:
- HTML e API estão em prática "network only", sem fallback offline.
- Não há `offline.html` nem fallback para navegação.
- Atualização automática força `window.location.reload()` quando encontra novo worker; pode causar recargas inesperadas e instabilidade percebida no iOS.

## 3.3 Meta tags iOS

Em `app/layout.tsx` já existem:
- `apple-mobile-web-app-capable`
- `apple-mobile-web-app-status-bar-style`
- `apple-mobile-web-app-title`
- `apple-touch-icon`
- `apple-touch-startup-image` para múltiplos devices
- `viewportFit: 'cover'`

Status: base iOS está boa.

## 3.4 Otimização de assets

Achados relevantes em `public/`:
- `videos/hero-background.mp4`: ~2.65 MB
- `icon.svg`: ~352 KB
- splash images iOS: ~85 KB a ~289 KB cada

Impacto:
- Hero em vídeo na home tende a penalizar iPhone (CPU/GPU/memória/bateria), especialmente em Safari.
- SVG de ícone grande para uso geral pode aumentar parse/decode desnecessário.

## 4) Gargalos de performance específicos para iOS

## 4.1 Bundle size (evidência)

Build de produção executado (`npm run build`):
- `First Load JS shared by all`: **472 kB**
- Chunk `vendor`: **437 kB**
- Rotas chegando a ~494 kB first-load.

Leitura: JS inicial está alto para experiência móvel fluida em iOS, especialmente com múltiplas telas de uso frequente.

## 4.2 Padrões de memory leak / lifecycle

Riscos identificados:
- `app/page.tsx`: `setTimeout` no `useEffect` de redirecionamento sem cleanup explícito.
- `lib/reports.ts`: `URL.createObjectURL(blob)` sem `URL.revokeObjectURL(url)` após uso.
- `app/layout.tsx`: script inline cria `setInterval` de update do SW sem estratégia de teardown; além disso, listeners são adicionados em cadeia.

Observação: há vários componentes com limpeza correta de timers/listeners, mas os pontos acima merecem correção prioritária.

## 4.3 Operações custosas/main thread

Principais candidatas:
- Home (`app/page.tsx`) com vídeo full-screen + layout extenso + elementos visuais ricos.
- Uso de `framer-motion` e `recharts` em rotas de dashboard/financeiro/procedimentos.
- Recarregamento automático quando SW detecta update pode interromper fluxos de uso.

## 4.4 Compatibilidade de APIs (Safari/iOS)

Status atual:
- APIs usadas são majoritariamente compatíveis.
- Atenção para comportamento de autoplay de vídeo no iOS (já mitigado com `muted`, `playsInline`).
- Falta estratégia explícita de fallback quando offline (crítico para percepção de robustez de PWA).

## 5) Recomendações detalhadas para implementação PWA

## 5.1 Manifest (ajustes)

1. Manter `display: standalone`, `theme_color`, `background_color`.
2. Adicionar/validar `id` no manifest para consistência de instalação.
3. Garantir que `start_url` preserve contexto mínimo (`/?source=pwa` opcional para telemetria).
4. Revisar `name/short_name` para exibição ideal na tela inicial iOS.

## 5.2 Service Worker (estratégia recomendada)

Migrar para estratégia por tipo de recurso:
- **App Shell (`/_next/static/*`, CSS, fontes, ícones):** `stale-while-revalidate`.
- **Navegação HTML:** `network-first` com fallback para `/offline`.
- **APIs críticas:** `network-only` com timeout + fallback de erro amigável.
- **Assets de mídia pesados (vídeo):** preferir `network-first` sem persistência longa em cache.

Também recomendado:
- Remover auto-reload imediato; trocar por banner "Nova versão disponível".
- Versionar cache por build id.
- Incluir `offline.html`/rota offline no App Router.

## 5.3 Otimização de performance

Prioridade alta:
1. Reduzir JS inicial (meta: first-load shared < 300 KB):
   - Lazy loading agressivo para módulos de gráfico/animação.
   - Garantir que libs server-only nunca vazem para cliente.
2. Otimizar home:
   - Fornecer versão sem vídeo em iOS (feature flag por user-agent/capability).
   - Adiar reprodução até interação/visibilidade.
3. Corrigir leaks:
   - Cleanup de timeout no `app/page.tsx`.
   - `URL.revokeObjectURL` no export CSV.
4. Revisar headers de cache:
   - Evitar `no-store` global para tudo em `/:path*`; manter política granular para HTML vs assets.

## 5.4 Compatibilidade iOS

- Manter meta tags Apple já implementadas.
- Validar splash screens em iPhones atuais (14/15/16 e tamanhos Pro/Plus).
- Adicionar detecção de low-power/reduced-motion para reduzir animações.
- Garantir UX clara para estado offline e reconexão.

## 6) Plano de testes recomendado (PWA + iOS)

## 6.1 Matriz mínima

| Categoria | Teste | Critério de aceite |
|---|---|---|
| Instalação PWA | Adicionar à tela inicial no iOS Safari | App abre em standalone, ícone correto |
| Boot offline | Abrir app sem rede após 1º acesso | Exibe shell/offline fallback sem travar |
| Atualização SW | Publicar nova build | Usuário recebe aviso de atualização sem reload forçado |
| Performance inicial | Carregamento de home/dashboard | Sem travamentos; TTI perceptível em até ~3s em rede boa |
| Memória | Navegação longa entre telas (15-20 min) | Sem degradação progressiva/trava no Safari |
| Rede instável | 3G/latência alta/intermitência | UI responde com estados de loading/erro claros |

## 6.2 Ferramentas

- Lighthouse (PWA + Performance).
- Safari Web Inspector (Timeline/Memory/Network).
- Testes reais em iPhone (não apenas simulador), incluindo diferentes versões de iOS.

## 7) Roadmap sugerido (execução)

Fase 1 (1-2 dias):
- Corrigir leaks rápidos (`setTimeout` cleanup, `revokeObjectURL`).
- Ajustar estratégia de atualização SW sem reload forçado.

Fase 2 (2-4 dias):
- Refatorar SW para cache por categoria + offline fallback.
- Revisar headers de cache no `next.config.js`.

Fase 3 (2-3 dias):
- Redução de bundle (lazy loading adicional, revisão de imports cliente).
- Otimização da home para iOS (vídeo opcional/degradado).

Fase 4 (1-2 dias):
- Rodada completa de testes iOS + ajustes finais.

## 8) Conclusão executiva

O projeto já tem uma base PWA funcional (manifest, SW, meta tags iOS), porém ainda não está "pronto para produção iOS crítica" devido a três pontos principais:
1. Estratégia de SW/offline incompleta e agressiva na atualização (reload automático).
2. Bundle inicial elevado para mobile (472 kB compartilhados).
3. Alguns padrões de lifecycle/memória que podem agravar travamentos no Safari.

Com as correções priorizadas acima, a migração para PWA no iPhone é viável e tende a reduzir sensivelmente a percepção de lentidão/travamento no uso diário.
