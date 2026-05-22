/**
 * Endpoint de healthcheck ultra-leve.
 * Retorna 200 com resposta estática — zero hit no Supabase, zero lógica.
 * Aponte monitores de uptime (UptimeRobot, Better Uptime, Vercel) para cá
 * em vez de GET / para economizar Function Invocations.
 */
export async function GET() {
  return new Response(
    JSON.stringify({ status: 'ok', ts: Date.now() }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  )
}

// Impedir que o Next.js faça cache estático desta rota
export const dynamic = 'force-dynamic'
export const runtime = 'edge' // Edge runtime = mais rápido, mais barato
