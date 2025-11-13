/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ['localhost'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Garantir que pagarme seja resolvido corretamente no servidor
      config.resolve = config.resolve || {}
      config.resolve.alias = config.resolve.alias || {}
      // Não fazer bundle do pagarme, usar require nativo do Node.js
      config.externals = config.externals || []
      if (Array.isArray(config.externals)) {
        config.externals.push('pagarme')
      }
    }
    return config
  },
  // Headers para vídeos
  async headers() {
    return [
      {
        source: '/videos/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
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
