const apiProxyTarget = (process.env.API_PROXY_TARGET ?? '').replace(/\/+$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  outputFileTracingRoot: process.cwd(),
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
  async redirects() {
    return [
      { source: '/dashboard', destination: '/app', permanent: true },
      { source: '/dashboard/company', destination: '/app/perfil', permanent: true },
      { source: '/app/configuracion/empresa', destination: '/app/perfil', permanent: true },
      { source: '/dashboard/users', destination: '/app/configuracion', permanent: true },
      { source: '/dashboard/seguridad', destination: '/app/configuracion/seguridad', permanent: true },
      { source: '/dashboard/membresia', destination: '/app/facturacion', permanent: true },
      { source: '/dashboard/campanas', destination: '/app/clientes', permanent: true },
      { source: '/dashboard/reviews', destination: '/app/opiniones', permanent: true },
      { source: '/dashboard/sello', destination: '/app/sello', permanent: true },
      { source: '/dashboard/perfil', destination: '/app/perfil/cuenta', permanent: true },
      { source: '/dashboard/casos', destination: '/app/casos', permanent: true },
      { source: '/dashboard/soporte', destination: '/app/soporte', permanent: true },
      { source: '/dashboard/:path*', destination: '/app/:path*', permanent: true },
    ];
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
