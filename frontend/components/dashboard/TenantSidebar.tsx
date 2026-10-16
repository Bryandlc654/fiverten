'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';

const NAV_ITEMS = [
  { icon: 'dashboard', label: 'Resumen', href: '/dashboard', active: true },
  { icon: 'storefront', label: 'Empresa', href: '/dashboard/company' },
  { icon: 'group', label: 'Usuarios', href: '/dashboard/users' },
  { icon: 'reviews', label: 'Opiniones', href: '/dashboard/reviews' },
  { icon: 'verified', label: 'Sello', href: '/dashboard' },
  { icon: 'settings', label: 'Configuración', href: '/dashboard' },
];

interface TenantSidebarProps {
  initials: string;
  company: string;
  publicId: string | undefined;
  isVerified: boolean;
  mobileOpen: boolean;
  desktopCollapsed: boolean;
  signingOut: boolean;
  onCloseMobile: () => void;
  onLogout: () => void;
}

export default function TenantSidebar({
  initials,
  company,
  publicId,
  isVerified,
  mobileOpen,
  desktopCollapsed,
  signingOut,
  onCloseMobile,
  onLogout,
}: TenantSidebarProps) {
  const router = useRouter();

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed bottom-0 left-0 top-0 z-40 flex w-64 shrink-0 flex-col bg-[#0b101b] text-slate-300 transition-transform duration-300 lg:sticky lg:inset-auto lg:top-0 lg:h-screen lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${desktopCollapsed ? 'lg:hidden' : ''}`}
      >
        <div className="flex shrink-0 items-center justify-between px-6 pt-6 pb-5">
          <Image
            src="/logo-fiverten.png"
            alt="FIVERTEN"
            width={2170}
            height={349}
            className="h-8 w-auto"
          />
          <button
            type="button"
            onClick={onCloseMobile}
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
              <p className="truncate text-xs text-slate-400">{publicId ?? '—'}</p>
            </div>
          </div>
          <div
            className={`mt-3 flex items-center gap-1.5 text-xs font-medium ${
              isVerified ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {isVerified ? 'verified' : 'pending'}
            </span>
            {isVerified ? 'Empresa verificada' : 'Verificación pendiente'}
          </div>
        </div>

        <nav className="mt-6 min-h-0 flex-1 space-y-1 overflow-y-auto px-3">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => router.push(item.href)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                item.active
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
          <div className="rounded-xl border border-[#2563eb]/30 bg-[#2563eb]/10 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-white">
              <span className="material-symbols-outlined text-[18px] text-[#60a5fa]">help</span>
              ¿Necesitas ayuda?
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Nuestro equipo puede ayudarte a completar tu perfil verificado.
            </p>
            <button
              type="button"
              className="mt-3 w-full rounded-lg bg-[#2563eb] px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-600"
            >
              Contactar soporte
            </button>
          </div>

          <button
            type="button"
            onClick={onLogout}
            disabled={signingOut}
            className="mt-3 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            {signingOut ? 'Saliendo…' : 'Cerrar sesión'}
          </button>
        </div>
      </aside>
    </>
  );
}
