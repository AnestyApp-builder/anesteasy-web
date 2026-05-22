import { type NextRequest, NextResponse } from 'next/server'

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET

function base64UrlToUint8Array(input: string): Uint8Array {
  const pad = input.length % 4
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    input.length + (pad === 0 ? 0 : 4 - pad),
    '='
  )
  const binary = atob(base64)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i)
  }
  return out
}

async function verifyHs256Jwt(
  token: string,
  secret: string
): Promise<Record<string, unknown> | null> {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [h, p, s] = parts
  const enc = new TextEncoder()
  const data = enc.encode(`${h}.${p}`)
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  )
  const sig = base64UrlToUint8Array(s)
  const ok = await crypto.subtle.verify('HMAC', key, sig, data)
  if (!ok) return null
  try {
    const payloadJson = new TextDecoder().decode(base64UrlToUint8Array(p))
    const payload = JSON.parse(payloadJson) as Record<string, unknown>
    if (typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()) {
      return null
    }
    return payload
  } catch {
    return null
  }
}

function getSupabaseProjectRef(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) return ''
  try {
    return new URL(url).hostname.split('.')[0] || ''
  } catch {
    return ''
  }
}

function readSupabaseSessionFromCookies(request: NextRequest): { access_token: string } | null {
  const ref = getSupabaseProjectRef()
  if (!ref) return null
  const base = `sb-${ref}-auth-token`
  const all = request.cookies.getAll()

  const single = all.find((c) => c.name === base)
  if (single?.value) {
    for (const raw of [single.value, decodeURIComponent(single.value)]) {
      try {
        const parsed = JSON.parse(raw) as { access_token?: string }
        if (parsed?.access_token) return parsed as { access_token: string }
      } catch {
        /* tentar próximo formato */
      }
    }
  }

  const chunks = all
    .filter((c) => c.name.startsWith(`${base}.`))
    .sort((a, b) => {
      const ai = parseInt(a.name.split('.').pop() || '0', 10)
      const bi = parseInt(b.name.split('.').pop() || '0', 10)
      return ai - bi
    })

  if (chunks.length === 0) return null

  const joined = chunks.map((c) => c.value).join('')
  for (const raw of [joined, decodeURIComponent(joined)]) {
    try {
      const parsed = JSON.parse(raw) as { access_token?: string }
      if (parsed?.access_token) return parsed as { access_token: string }
    } catch {
      /* ignore */
    }
  }
  return null
}

type MiddlewareUser = { role?: string } | null

async function getUserFromJwt(request: NextRequest): Promise<MiddlewareUser> {
  if (!JWT_SECRET) return null
  const session = readSupabaseSessionFromCookies(request)
  if (!session?.access_token) return null
  const payload = await verifyHs256Jwt(session.access_token, JWT_SECRET)
  if (!payload) return null
  const um = payload.user_metadata as { role?: string } | undefined
  return { role: um?.role }
}

function routeGuards(request: NextRequest, pathname: string, user: MiddlewareUser): NextResponse | null {
  const isAdminRoute =
    pathname.startsWith('/admin/')

  const isProtectedRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/procedimentos') ||
    pathname.startsWith('/agenda') ||
    pathname.startsWith('/financeiro') ||
    pathname.startsWith('/relatorios') ||
    pathname.startsWith('/configuracoes')

  if ((isProtectedRoute || isAdminRoute) && !user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    return NextResponse.redirect(redirectUrl)
  }

  return null
}

async function createMutableSupabaseResponse(request: NextRequest) {
  const { createServerClient } = await import('@supabase/ssr')
  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )
  return { supabase, getResponse: () => supabaseResponse }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Pular middleware para o Webhook do WhatsApp (acesso público)
  if (pathname.startsWith('/api/whatsapp/webhook')) {
    return NextResponse.next()
  }

  let user: MiddlewareUser = null
  let response: NextResponse

  if (JWT_SECRET) {
    user = await getUserFromJwt(request)
  }

  if (user) {
    response = NextResponse.next()
  } else {
    const { supabase, getResponse } = await createMutableSupabaseResponse(request)
    const {
      data: { user: supaUser },
    } = await supabase.auth.getUser()
    user = supaUser ? { role: supaUser.user_metadata?.role as string | undefined } : null
    response = getResponse()
  }

  const guarded = routeGuards(request, pathname, user)
  if (guarded) return guarded

  return response
}

export const config = {
  matcher: [
    '/((?!api/whatsapp/webhook|api/healthz|monitoring|_next/static|_next/image|favicon.ico|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
