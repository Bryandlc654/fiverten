'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, type FocusEvent } from 'react';
import { useAuth } from '../../lib/auth-context';

const NAV_LINKS = [
  { href: '/trust-center', label: 'Trust Center' },
  { href: '/metodologia', label: 'Metodología' },
];

const MEGA_LINKS = [
  {
    href: '/soluciones',
    label: 'Soluciones',
    text: 'Reputación verificable adaptada a tu sector: comercio, salud, inmobiliaria, hostelería y más.',
    cta: 'Ver soluciones',
    icon: (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: '/recursos',
    label: 'Recursos',
    text: 'Guías prácticas sobre reseñas, moderación, sello dinámico y reputación verificable.',
    cta: 'Explorar recursos',
    icon: (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5V5.5Z" />
        <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5A2.5 2.5 0 0 1 4 20.5Z" />
        <path d="M8 7h8M8 10.5h5" />
      </svg>
    ),
  },
];

export default function HomeHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const { user, isLoading } = useAuth();

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || user.email
    : '';
  const initials = user
    ? (
        [user.firstName?.[0], user.lastName?.[0]].filter(Boolean).join('') || user.email[0]
      ).toUpperCase()
    : '';

  function handleMegaBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setMegaOpen(false);
    }
  }

  return (
    <header
      className="fixed top-0 z-50 w-full border-b border-white/10 bg-ink/85 backdrop-blur-xl"
      onMouseLeave={() => setMegaOpen(false)}
    >
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
        <div
          className="hidden lg:block"
          onFocus={() => setMegaOpen(true)}
          onBlur={handleMegaBlur}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setMegaOpen(false);
          }}
        >
          <nav className="flex items-center gap-7">
            <Link
              href="/como-funciona"
              className="home-nav-link inline-flex items-center gap-1.5 text-sm"
              onMouseEnter={() => setMegaOpen(true)}
              aria-haspopup="true"
              aria-expanded={megaOpen}
              aria-controls="home-mega-menu"
            >
              Cómo funciona
              <svg
                className={`h-3.5 w-3.5 transition-transform duration-200 ${
                  megaOpen ? 'rotate-180 text-aqua' : ''
                }`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </Link>
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="home-nav-link text-sm">
                {link.label}
              </Link>
            ))}
            <Link href="/verificar-empresa" className="home-nav-link text-sm">
              Verificar empresa
            </Link>
          </nav>

          <div
            id="home-mega-menu"
            className={`absolute inset-x-0 top-full transition duration-200 ${
              megaOpen
                ? 'visible translate-y-0 opacity-100'
                : 'pointer-events-none invisible -translate-y-2 opacity-0'
            }`}
          >
            <div className="border-t border-white/10 bg-ink/95 shadow-2xl backdrop-blur-xl">
              <div className="mx-auto grid max-w-7xl items-stretch gap-4 px-5 py-6 lg:grid-cols-[1fr_1fr_1.08fr] lg:px-8">
                {MEGA_LINKS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex flex-col rounded-2xl border border-white/10 bg-white/[.04] p-5 transition hover:border-aqua/50 hover:bg-white/[.07]"
                  >
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-aqua/10 text-aqua">
                      {item.icon}
                    </span>
                    <span className="mt-4 font-display text-lg font-bold text-white">
                      {item.label}
                    </span>
                    <span className="mt-2 flex-1 text-xs leading-6 text-slate-400">
                      {item.text}
                    </span>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-aqua">
                      {item.cta}
                      <span className="transition-transform group-hover:translate-x-1">→</span>
                    </span>
                  </Link>
                ))}

                <Link
                  href="/como-funciona"
                  className="group relative min-h-[190px] overflow-hidden rounded-2xl border border-white/10"
                >
                  <Image
                    src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=90"
                    alt="Espacio de trabajo de una empresa verificada"
                    fill
                    sizes="(min-width: 1024px) 30vw, 100vw"
                    className="object-cover object-center opacity-60 transition duration-500 group-hover:scale-105 group-hover:opacity-75"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/10" />
                  <span className="absolute inset-0 flex flex-col justify-end p-5">
                    <span className="text-[10px] font-bold uppercase tracking-[.18em] text-aqua">
                      Cómo funciona
                    </span>
                    <span className="mt-1 font-display text-lg font-bold leading-tight text-white">
                      De la solicitud al sello, paso a paso.
                    </span>
                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-aqua">
                      Ver el proceso
                      <span className="transition-transform group-hover:translate-x-1">→</span>
                    </span>
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/empresas"
            className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-blue-700"
          >
            Explorar directorio <span aria-hidden="true">↗</span>
          </Link>
          {isLoading ? (
            <span className="h-10 w-28 animate-pulse rounded-full bg-white/10" aria-hidden="true" />
          ) : user ? (
            <Link
              href="/app"
              className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 py-1.5 pl-1.5 pr-3.5 transition hover:border-aqua/60 hover:bg-white/10"
              aria-label={`Ir a mi panel (${displayName})`}
              title="Ir a mi panel"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-aqua text-xs font-bold text-ink">
                {initials}
              </span>
              <span className="max-w-[140px] truncate text-sm font-semibold text-white">
                {displayName}
              </span>
              <span aria-hidden="true" className="text-sm text-aqua">
                →
              </span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-sm font-semibold text-white/80 transition hover:text-white"
            >
              Iniciar sesión
            </Link>
          )}
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
        <Link href="/como-funciona" className="home-nav-link" onClick={() => setMenuOpen(false)}>
          Cómo funciona
        </Link>
        <div className="flex flex-col gap-3 border-l border-white/10 pl-4">
          {MEGA_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="home-nav-link text-sm"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
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
          className="rounded-full bg-blue-600 px-5 py-3 text-center font-bold text-white"
          onClick={() => setMenuOpen(false)}
        >
          Verificar empresa
        </Link>
        {isLoading ? (
          <span className="h-12 animate-pulse rounded-full bg-white/10" aria-hidden="true" />
        ) : user ? (
          <Link
            href="/app"
            className="flex items-center justify-center gap-2 rounded-full bg-aqua px-5 py-3 text-center font-bold text-ink"
            onClick={() => setMenuOpen(false)}
          >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-xs font-bold text-white">
              {initials}
            </span>
            Ir a mi panel
          </Link>
        ) : (
          <Link
            href="/login"
            className="rounded-full border border-white/20 px-5 py-3 text-center font-semibold text-white"
            onClick={() => setMenuOpen(false)}
          >
            Iniciar sesión
          </Link>
        )}
      </nav>
    </header>
  );
}
