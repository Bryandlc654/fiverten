'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '../lib/auth-context';
import { ROLE_LABELS } from '../lib/roles';

export type NavKey =
  | 'overview'
  | 'company'
  | 'users'
  | 'profile'
  | 'reviews'
  | 'adminOrgs'
  | 'adminUsers'
  | 'adminReviews';

interface DashboardShellProps {
  active: NavKey;
  title: string;
  subtitle?: string;
  userName?: string;
  userEmail?: string;
  userInitials?: string;
  children: ReactNode;
}

interface NavItem {
  key: NavKey;
  label: string;
  icon: string;
  href: string;
}

const TENANT_NAV: NavItem[] = [
  { key: 'overview', label: 'Resumen', icon: 'dashboard', href: '/dashboard' },
  { key: 'company', label: 'Empresa', icon: 'storefront', href: '/dashboard/company' },
  { key: 'users', label: 'Usuarios', icon: 'group', href: '/dashboard/users' },
  { key: 'reviews', label: 'Opiniones', icon: 'reviews', href: '/dashboard/reviews' },
  { key: 'profile', label: 'Perfil público', icon: 'verified', href: '/empresa' },
];

const ADMIN_NAV: NavItem[] = [
  { key: 'overview', label: 'Resumen', icon: 'dashboard', href: '/dashboard' },
  {
    key: 'adminOrgs',
    label: 'Empresas',
    icon: 'storefront',
    href: '/admin?tab=organizations',
  },
  { key: 'adminUsers', label: 'Usuarios', icon: 'group', href: '/admin?tab=users' },
  { key: 'adminReviews', label: 'Reseñas', icon: 'gavel', href: '/admin/reviews' },
];

export default function DashboardShell({
  active,
  title,
  subtitle,
  userName,
  userEmail,
  userInitials,
  children,
}: DashboardShellProps) {
  const router = useRouter();
  const { user, organization, role, isAuthenticated, isLoading, isSuperAdmin, logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router]);

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

  const fullName =
    userName ??
    (user
      ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || user.email
      : '');
  const initials =
    userInitials ??
    (user
      ? (
          [user.firstName?.[0], user.lastName?.[0]].filter(Boolean).join('') || user.email[0]
        ).toUpperCase()
      : '');
  const email = userEmail ?? user?.email ?? '';
  const roleLabel =
    role === null && isSuperAdmin
      ? 'Administrador general'
      : ROLE_LABELS[role ?? ''] ?? (role || 'Consulta');
  const company = organization?.tradeName ?? (isSuperAdmin ? 'FIVERTEN' : 'Sin organización');

  async function onLogout() {
    setSigningOut(true);
    setUserMenuOpen(false);
    await logout();
    router.replace('/login');
  }

  if (isLoading || !user) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span className="material-symbols-outlined animate-spin">progress_activity</span>
          Cargando panel…
        </div>
      </div>
    );
  }

  const visibleNav = isSuperAdmin ? ADMIN_NAV : TENANT_NAV;

  return (
    <div className="flex-1 flex min-h-screen bg-slate-50 text-slate-900">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed bottom-0 left-0 top-0 z-40 flex w-64 shrink-0 flex-col bg-[#0b101b] text-slate-300 transition-transform duration-300 lg:sticky lg:inset-auto lg:top-0 lg:h-screen lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex shrink-0 items-center justify-between px-6 pt-6 pb-5">
          <Image
            src="/logo-fiverten.png"
            alt="FIVERTEN"
            width={2000}
            height={347}
            className="h-8 w-auto"
          />
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menú"
            className="text-slate-400 transition hover:text-white lg:hidden"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        <div className="mx-4 shrink-0 rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#2563eb] text-sm font-bold text-white">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{company}</p>
              <p className="truncate text-xs text-slate-400">
                {organization?.publicId ?? roleLabel}
              </p>
            </div>
          </div>
        </div>

        <nav className="mt-6 min-h-0 flex-1 space-y-1 overflow-y-auto px-3">
          {visibleNav.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setMobileOpen(false);
                // El perfil público depende del slug de la empresa.
                router.push(
                  item.key === 'profile' && organization ? `/empresa/${organization.slug}` : item.href,
                );
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active === item.key
                  ? 'bg-[#2563eb] text-white'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="shrink-0 px-4 pb-6">
          <button
            type="button"
            onClick={onLogout}
            disabled={signingOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            {signingOut ? 'Saliendo…' : 'Cerrar sesión'}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-200 bg-white/85 px-6 py-4 backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Mostrar u ocultar menú"
              className="shrink-0 rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:text-slate-900 lg:hidden"
            >
              <span className="material-symbols-outlined text-[20px]">menu</span>
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold text-slate-900">{title}</h1>
              {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
            </div>
          </div>

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
                <p className="text-[11px] text-slate-500">{roleLabel}</p>
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
                  onClick={onLogout}
                  disabled={signingOut}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[20px] text-slate-500">logout</span>
                  {signingOut ? 'Saliendo…' : 'Cerrar sesión'}
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
