import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://app-fiverten.onrender.com';

export const viewport: Viewport = {
  themeColor: '#10161C',
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'FIVERTEN — Reputación verificable',
  description:
    'Empresas verificadas, reseñas reales y reputación verificable. Decide con confianza con FIVERTEN.',
  openGraph: {
    siteName: 'FIVERTEN',
    locale: 'es_ES',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-on-surface font-sans min-h-screen flex flex-col justify-between antialiased selection:bg-signal selection:text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
