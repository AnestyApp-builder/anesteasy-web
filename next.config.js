/** @type {import('next').NextConfig} */
const path = require('path')

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // ⚡ CACHE BUSTING: Gerar buildId único a cada deploy
  generateBuildId: async () => {
    // Usar timestamp + random para garantir uniqueness em cada build
    return `build-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  },
  // Otimizações para mobile
  images: {
    domains: ['localhost', 'zmtwwajyhusyrugobxur.supabase.co'],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Compressão e otimização
  compress: true,
  poweredByHeader: false,
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Configurações do webpack para o servidor
      config.resolve = config.resolve || {}
      config.resolve.alias = config.resolve.alias || {}
      // Garantir resolução correta de módulos
      config.resolve.fallback = config.resolve.fallback || {}
      // Garantir que node_modules seja resolvido corretamente
      config.resolve.modules = [
        ...(config.resolve.modules || []),
        'node_modules',
        path.resolve(__dirname, 'node_modules'),
      ]
    } else {
      // No cliente, garantir que stripe não seja incluído (é apenas server-side)
      config.resolve = config.resolve || {}
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    
    // Otimizações para mobile
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        runtimeChunk: 'single',
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
            // Common chunk
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
          },
        },
      }
    }
    
    return config
  },
  // Headers para otimização mobile e CACHE BUSTING
  async headers() {
    return [
      // Assets estáticos (vídeos, imagens) - cache longo
      {
        source: '/videos/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Assets do Next.js (_next/static) - cache longo com hash automático
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // ⚡ CACHE BUSTING: HTML pages - NUNCA fazer cache
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate, max-age=0',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
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
    ];
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://zmtwwajyhusyrugobxur.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptdHd3YWp5aHVzeXJ1Z29ieHVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMzYzNzAsImV4cCI6MjA3MjkxMjM3MH0.NC6t2w_jFWTMJjVv5FmPLouVyOVgCTBReCr0zOA2dx8',
    NEXT_PUBLIC_BASE_URL: 'https://anesteasy.com.br',
    NEXT_PUBLIC_PAGARME_PUBLIC_KEY: 'pk_EXANarahdFqDWKMQ',
  },
}

module.exports = nextConfig
