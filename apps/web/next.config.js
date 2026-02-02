/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      maxDuration: 30,
    },
  },
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  // Desativar verificação de tipos no build para economizar memória
  typescript: {
    ignoreBuildErrors: true,
  },
  // Desativar ESLint no build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Reduzir uso de memória
  swcMinify: true,
  // Otimizar para produção
  productionBrowserSourceMaps: false,
  // Evitar problema de Maximum call stack
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };
    return config;
  },
}

module.exports = nextConfig
