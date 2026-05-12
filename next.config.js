/** @type {import('next').NextConfig} */
const path = require('path')
const { withSentryConfig } = require("@sentry/nextjs");
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

const nextConfig = {
  // Evita o Next inferir o root errado quando há múltiplos lockfiles
  outputFileTracingRoot: __dirname,
  experimental: {
    optimizePackageImports: ['lucide-react', '@supabase/supabase-js', '@supabase/ssr', 'framer-motion', 'recharts'],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Otimizações de imagem
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'zmtwwajyhusyrugobxur.supabase.co',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  compress: true,
  poweredByHeader: false,

  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve = config.resolve || {}
      config.resolve.alias = config.resolve.alias || {}
      config.resolve.fallback = config.resolve.fallback || {}
      config.resolve.modules = [
        ...(config.resolve.modules || []),
        'node_modules',
        path.resolve(__dirname, 'node_modules'),
      ]
    } else {
      // No cliente, stripe é apenas server-side
      config.resolve = config.resolve || {}
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }

    return config
  },

  async headers() {
    return [
      // Vídeos e imagens estáticas — cache longo
      {
        source: '/videos/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },

      // Assets do Next.js (_next/static) — cache longo, hash garante invalidação automática
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },

      // Imagens públicas — cache de 1 dia
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=3600',
          },
        ],
      },

      // Ícones e favicon — cache de 7 dias
      {
        source: '/:path(favicon.*|icon.*|apple-touch-icon.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=604800, stale-while-revalidate=86400',
          },
        ],
      },

      // HTML das páginas — revalida mas usa cache enquanto revalida
      // ISSO ERA O GRANDE PROBLEMA: estava com no-store, forçando download completo a cada visita no iPhone
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]
  },

  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://zmtwwajyhusyrugobxur.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptdHd3YWp5aHVzeXJ1Z29ieHVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMzYzNzAsImV4cCI6MjA3MjkxMjM3MH0.NC6t2w_jFWTMJjVv5FmPLouVyOVgCTBReCr0zOA2dx8',
    NEXT_PUBLIC_BASE_URL: 'https://anesteasy.com.br',
    NEXT_PUBLIC_PAGARME_PUBLIC_KEY: 'pk_EXANarahdFqDWKMQ',
  },
}

module.exports = withBundleAnalyzer(
  withSentryConfig(
    nextConfig,
    {
      silent: !process.env.CI,
      widenClientFileUpload: true,
      tunnelRoute: "/monitoring",
      hideSourceMaps: true,
      
      // Novas opções para evitar avisos de depreciação
      webpack: {
        treeshake: {
          removeDebugLogging: true,
        },
        automaticVercelMonitors: true,
        reactComponentAnnotation: {
          enabled: true,
        },
      },
    }
  )
)