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
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  // Headers para CORS nas APIs
  async headers() {
    // Get allowed origins from environment
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const isDev = process.env.NODE_ENV === 'development';
    
    // In development, allow localhost; in production, use specific origin
    const allowedOrigin = isDev 
      ? 'http://localhost:3000' 
      : appUrl;
    
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: allowedOrigin },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
}

module.exports = nextConfig
