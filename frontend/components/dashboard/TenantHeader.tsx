'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

interface TenantHeaderProps {
  company: string;
  slug: string | undefined;
  isVerified: boolean;
  roleText: string;
  initials: string;
  fullName: string;
  email: string;
  signingOut: boolean;
  onToggleSidebar: () => void;
  onLogout: () => void;
}

export default function TenantHeader({
  company,
  slug,
  isVerified,
  roleText,
  initials,
  fullName,
  email,
  signingOut,
  onToggleSidebar,
  onLogout,
}: TenantHeaderProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userMenuOpen) return;
    function handleClick(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [userMenuOpen]);

  function logout() {
    setUserMenuOpen(false);
    onLogout();
  }

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-200 bg-white/85 px-6 py-4 backdrop-blur">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Mostrar u ocultar menú"
          className="shrink-0 rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:text-slate-900"
        >
          <span className="material-symbols-outlined text-[20px]">menu</span>
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-lg font-bold text-slate-900">{company}</h1>
            {isVerified && (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-600">
                <span className="material-symbols-outlined text-[13px]">verified</span>
                Verified
              </span>
            )}
          </div>
          <p className="truncate text-xs text-slate-500">Panel de gestión · {roleText}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {slug && (
          <Link
            href={`/empresa/${slug}`}
            target="_blank"
            className="hidden md:inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
          >
            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
            Ver mi perfil público
          </Link>
        )}
        <button
          type="button"
          className="relative rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:text-slate-900"
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-blue-600" />
        </button>
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setUserMenuOpen((value) => !value)}
            aria-haspopup="menu"
            aria-expanded={userMenuOpen}
            aria-label="Menú de usuario"
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white py-1.5 pl-1.5 pr-2 transition hover:border-slate-300"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-xs font-bold text-white">
              {initials}
            </span>
            <div className="hidden text-left leading-tight sm:block">
              <p className="max-w-[140px] truncate text-sm font-semibold text-slate-900">
                {fullName}
              </p>
              <p className="text-[11px] text-slate-500">{roleText}</p>
            </div>
            <span className="material-symbols-outlined text-[18px] text-slate-400">
              expand_more
            </span>
          </button>
          {userMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-20 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
            >
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="truncate text-sm font-semibold text-slate-900">{fullName}</p>
                <p className="truncate text-xs text-slate-500">{email}</p>
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={logout}
                disabled={signingOut}
                className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-[20px] text-slate-500">logout</span>
                {signingOut ? 'Saliendo…' : 'Cerrar sesión'}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
