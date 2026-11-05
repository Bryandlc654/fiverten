'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

const NAV_LINKS = [
  { href: '/como-funciona', label: 'Cómo funciona' },
  { href: '/trust-center', label: 'Trust Center' },
  { href: '/metodologia', label: 'Metodología' },
  { href: '/soluciones', label: 'Soluciones' },
  { href: '/recursos', label: 'Recursos' },
];

export default function HomeHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-ink/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5" aria-label="FIVERTEN inicio">
          <Image
            src="/logo-fiverten.png"
            alt="FIVERTEN"
            width={2000}
            height={347}
            className="h-8 w-auto"
            priority
          />
        </Link>
        <nav className="hidden items-center gap-7 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="home-nav-link text-sm">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/verificar-empresa"
            className="text-sm font-semibold text-white/80 transition hover:text-white"
          >
            Verificar empresa
          </Link>
          <Link
            href="/empresas"
            className="rounded-full bg-aqua px-5 py-2.5 text-sm font-bold text-ink transition hover:-translate-y-0.5 hover:bg-mint"
          >
            Explorar directorio <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen((value) => !value)}
          className="grid h-10 w-10 place-items-center rounded-xl border border-white/15 text-white lg:hidden"
          aria-label="Abrir menú"
          aria-expanded={menuOpen}
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            viewBox="0 0 24 24"
          >
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </div>
      <nav
        className={`home-mobile-menu flex-col gap-4 border-t border-white/10 bg-ink px-6 py-5 lg:hidden ${
          menuOpen ? 'show' : ''
        }`}
      >
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="home-nav-link"
            onClick={() => setMenuOpen(false)}
          >
            {link.label}
          </Link>
        ))}
        <Link
          href="/verificar-empresa"
          className="rounded-full bg-aqua px-5 py-3 text-center font-bold text-ink"
          onClick={() => setMenuOpen(false)}
        >
          Verificar empresa
        </Link>
      </nav>
    </header>
  );
}
