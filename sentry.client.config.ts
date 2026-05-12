import * as Sentry from '@sentry/nextjs'

const isProd = process.env.NODE_ENV === 'production'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Session Replay retira centenas de KB do JS inicial e pesa muito em CPU/rede no mobile.
  // Reative Sentry.replayIntegration() apenas se precisar de replay (ex.: ambiente desktop / flag).
  integrations: [],

  tracesSampleRate: isProd ? 0.08 : 1.0,

  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  debug: false,
})
