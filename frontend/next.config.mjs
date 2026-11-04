const apiProxyTarget = (process.env.API_PROXY_TARGET ?? '').replace(/\/+$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    // Logos y portadas se suben a Cloudflare R2 con dominios configurables, así
    // que el optimizador acepta cualquier host HTTPS (y local en desarrollo).
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '127.0.0.1' },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },
  async rewrites() {
    if (!apiProxyTarget) {
      return [];
    }
    return [
      {
        source: '/api/:path*',
        destination: `${apiProxyTarget}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
