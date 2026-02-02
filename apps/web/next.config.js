/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      maxDuration: 30,
    },
    // Desativar output file tracing para evitar Maximum call stack
    outputFileTracingRoot: undefined,
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
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  swcMinify: true,
  productionBrowserSourceMaps: false,
}

module.exports = nextConfig
