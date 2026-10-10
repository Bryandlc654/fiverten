'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ApiError, api } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { roleLabel } from '../../lib/roles';

const NAV_ITEMS = [
  { icon: 'dashboard', label: 'Resumen', href: '/dashboard', active: true },
  { icon: 'storefront', label: 'Empresa', href: '/dashboard/company' },
  { icon: 'group', label: 'Usuarios', href: '/dashboard/users' },
  { icon: 'reviews', label: 'Opiniones', href: '/dashboard' },
  { icon: 'verified', label: 'Sello', href: '/dashboard' },
  { icon: 'settings', label: 'Configuración', href: '/dashboard' },
];

const STATS = [
  { label: 'Visitas al perfil', value: '12.847', delta: '+18%', icon: 'visibility', tone: 'blue' },
  { label: 'Opiniones publicadas', value: '127', delta: '+12', icon: 'reviews', tone: 'emerald' },
  { label: 'Valoración media', value: '4,8', delta: '+0,2', icon: 'star', tone: 'amber' },
  { label: 'Solicitudes pendientes', value: '6', delta: '', icon: 'pending_actions', tone: 'violet' },
  { label: 'Tasa de respuesta', value: '92%', delta: '+4%', icon: 'forum', tone: 'slate' },
];

const TONE_STYLES: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  violet: 'bg-violet-50 text-violet-600',
  slate: 'bg-slate-100 text-slate-600',
};

const TASKS = [
  { label: 'Completa los datos fiscales de la empresa', done: true },
  { label: 'Sube el CIF y el documento de identidad', done: true },
  { label: 'Vincula tu fuente de opiniones', done: false },
  { label: 'Personaliza tu sello verificado', done: false },
  { label: 'Publica tu perfil público', done: false },
];

const REVIEWS = [
  {
    name: 'Marta González',
    platform: 'Google',
    rating: 5,
    date: 'Hace 2 días',
    text: 'Trabajo impecable y muy profesional. Repetiré sin duda.',
  },
  {
    name: 'Javier Ruiz',
    platform: 'FIVERTEN',
    rating: 4,
    date: 'Hace 5 días',
    text: 'Buen resultado final y cumplimiento de plazos.',
  },
  {
    name: 'Lucía Fernández',
    platform: 'Google',
    rating: 5,
    date: 'Hace 1 semana',
    text: 'Comunicación excelente durante todo el proyecto.',
  },
];

const ACTIVITY = [
  { icon: 'reviews', text: 'Nueva opinión verificada de Marta González', time: 'Hace 2 días' },
  { icon: 'verified_user', text: 'Se validó el documento de identidad fiscal', time: 'Hace 3 días' },
  { icon: 'visibility', text: 'Tu perfil superó las 12.000 visitas', time: 'Hace 5 días' },
  { icon: 'content_copy', text: 'Copiaste el widget del sello', time: 'Hace 1 semana' },
];

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex text-amber-400">
      {[0, 1, 2, 3, 4].map((index) => (
        <span
          key={index}
          className="material-symbols-outlined text-[16px]"
          style={{ fontVariationSettings: index < rating ? "'FILL' 1" : "'FILL' 0" }}
        >
          star
        </span>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, organization, role, isAuthenticated, isLoading, isSuperAdmin, logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [tasks, setTasks] = useState(TASKS);
  const [activeTab, setActiveTab] = useState<'link' | 'widget' | 'qr'>('link');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
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

  const fullName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || user.email
    : '';
  const initials = user
    ? (
        [user.firstName?.[0], user.lastName?.[0]].filter(Boolean).join('') || user.email[0]
      ).toUpperCase()
    : '';
  const roleText = roleLabel(role);
  const company = organization?.tradeName ?? 'Sin organización';
  const isVerified = organization?.verificationStatus === 'verified';
  const publicUrl = organization?.slug
    ? `https://fiverten.com/${organization.slug}`
    : 'https://fiverten.com/mi-empresa';

  function toggleSidebar() {
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches) {
      setDesktopCollapsed((value) => !value);
    } else {
      setMobileOpen((value) => !value);
    }
  }

  async function onLogout() {
    setSigningOut(true);
    setUserMenuOpen(false);
    await logout();
    router.replace('/login');
  }

  async function onResendVerification() {
    setSendingVerification(true);
    setNotice(null);
    try {
      const result = await api.requestEmailVerification();
      setNotice(
        result.alreadyVerified
          ? 'Tu correo ya estaba verificado.'
          : 'Te hemos enviado un nuevo enlace de verificación.',
      );
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : 'No se pudo enviar el enlace');
    } finally {
      setSendingVerification(false);
    }
  }

  function toggleTask(index: number) {
    setTasks((current) =>
      current.map((task, i) => (i === index ? { ...task, done: !task.done } : task)),
    );
  }

  function copyEmbed() {
    const value =
      activeTab === 'widget'
        ? `<script src="https://fiverten.com/seal/${organization?.publicId ?? ''}.js"></script>`
        : publicUrl;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(value);
    }
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

  const completedTasks = tasks.filter((task) => task.done).length;

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
              <p className="truncate text-xs text-slate-400">{organization?.publicId ?? '—'}</p>
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
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => router.push('/admin')}
              data-testid="admin-panel-link"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-amber-300 transition hover:bg-white/5 hover:text-amber-200"
            >
              <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
              Panel general
            </button>
          )}
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

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-200 bg-white/85 px-6 py-4 backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={toggleSidebar}
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
              <p className="truncate text-xs text-slate-500">
                Panel de gestión · {roleText}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="hidden md:inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              <span className="material-symbols-outlined text-[18px]">open_in_new</span>
              Ver mi perfil público
            </button>
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
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={onLogout}
                    disabled={signingOut}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-[20px] text-slate-500">
                      logout
                    </span>
                    {signingOut ? 'Saliendo…' : 'Cerrar sesión'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 px-6 py-6">
          {notice && (
            <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              {notice}
            </div>
          )}

          {!user.isVerified && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">mark_email_unread</span>
                Tu correo aún no está verificado.
              </span>
              <button
                type="button"
                onClick={onResendVerification}
                disabled={sendingVerification}
                className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
              >
                {sendingVerification ? 'Enviando…' : 'Reenviar verificación'}
              </button>
            </div>
          )}

          <section className="relative overflow-hidden rounded-2xl bg-[#0b101b] px-6 py-7 text-white">
            <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[#2563eb]/30 blur-3xl" />
            <div className="relative flex flex-wrap items-center justify-between gap-6">
              <div className="max-w-lg">
                <p className="text-sm text-slate-400">
                  Hola{user.firstName ? `, ${user.firstName}` : ''} 👋
                </p>
                <h2 className="mt-1 text-2xl font-bold">Tu reputación verificada, lista para compartir</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Muestra tu sello FIVERTEN en tu web y convierte más visitantes en clientes que
                  confían en ti.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600"
                  >
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    Obtener mi sello
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/5"
                  >
                    Ver mi perfil
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-full ${
                    isVerified ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                  }`}
                >
                  <span className="material-symbols-outlined text-[30px]">
                    {isVerified ? 'verified' : 'pending'}
                  </span>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Estado del sello</p>
                  <p className="text-lg font-bold">
                    {isVerified ? 'Verificado' : 'En revisión'}
                  </p>
                  <p className="text-xs text-slate-400">{organization?.publicId ?? '—'}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${TONE_STYLES[stat.tone]}`}
                  >
                    <span className="material-symbols-outlined text-[20px]">{stat.icon}</span>
                  </span>
                  {stat.delta && (
                    <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-600">
                      <span className="material-symbols-outlined text-[14px]">trending_up</span>
                      {stat.delta}
                    </span>
                  )}
                </div>
                <p className="mt-3 text-2xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            ))}
          </section>

          <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5 xl:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Rendimiento del perfil</h3>
                  <p className="text-xs text-slate-500">Visitas de los últimos 6 meses</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                  <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                  Últimos 6 meses
                </span>
              </div>

              <div className="mt-4">
                <svg viewBox="0 0 640 200" className="h-48 w-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="fillArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,150 C60,120 90,160 150,120 C210,80 240,110 300,90 C360,70 390,40 450,50 C510,60 540,20 600,30 L640,25 L640,200 L0,200 Z"
                    fill="url(#fillArea)"
                  />
                  <path
                    d="M0,150 C60,120 90,160 150,120 C210,80 240,110 300,90 C360,70 390,40 450,50 C510,60 540,20 600,30 L640,25"
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="mt-1 flex justify-between text-[11px] text-slate-400">
                  {['May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct'].map((month) => (
                    <span key={month}>{month}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="text-base font-bold text-slate-900">Sello verificado</h3>
              <p className="text-xs text-slate-500">Inserta tu sello donde quieras</p>

              <div className="mt-4 flex gap-1 rounded-lg bg-slate-100 p-1 text-xs font-medium">
                {[
                  { id: 'link', label: 'Enlace' },
                  { id: 'widget', label: 'Widget' },
                  { id: 'qr', label: 'QR' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as 'link' | 'widget' | 'qr')}
                    className={`flex-1 rounded-md px-2 py-1.5 transition ${
                      activeTab === tab.id
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 py-6">
                <div className="flex items-center gap-2 rounded-lg bg-[#0b101b] px-3 py-2 text-white">
                  <span className="material-symbols-outlined text-[20px] text-emerald-400">
                    verified
                  </span>
                  <div className="leading-none">
                    <p className="text-[11px] font-bold">FIVERTEN</p>
                    <p className="text-[9px] text-slate-400">Empresa verificada</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="material-symbols-outlined text-[16px] text-slate-400">link</span>
                <span className="truncate text-xs text-slate-500">
                  {activeTab === 'widget' ? 'Código de inserción HTML' : publicUrl}
                </span>
                <button
                  type="button"
                  onClick={copyEmbed}
                  className="ml-auto shrink-0 rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-slate-700"
                >
                  Copiar
                </button>
              </div>
            </div>
          </section>

          <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">Tareas pendientes</h3>
                <span className="text-xs font-semibold text-slate-500">
                  {completedTasks}/{tasks.length}
                </span>
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[#2563eb] transition-all"
                  style={{ width: `${(completedTasks / tasks.length) * 100}%` }}
                />
              </div>
              <ul className="mt-4 space-y-2">
                {tasks.map((task, index) => (
                  <li key={task.label}>
                    <button
                      type="button"
                      onClick={() => toggleTask(index)}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-slate-50"
                    >
                      <span
                        className={`material-symbols-outlined text-[20px] ${
                          task.done ? 'text-emerald-500' : 'text-slate-300'
                        }`}
                      >
                        {task.done ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                      <span
                        className={`text-sm ${
                          task.done ? 'text-slate-400 line-through' : 'text-slate-700'
                        }`}
                      >
                        {task.label}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 xl:col-span-2">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">Últimas opiniones</h3>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  Ver todas
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
              </div>
              <ul className="mt-4 divide-y divide-slate-100">
                {REVIEWS.map((review) => (
                  <li key={review.name} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                      {review.name
                        .split(' ')
                        .map((part) => part[0])
                        .join('')
                        .slice(0, 2)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{review.name}</p>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                          {review.platform}
                        </span>
                        <span className="text-[11px] text-slate-400">{review.date}</span>
                      </div>
                      <Stars rating={review.rating} />
                      <p className="mt-0.5 text-sm text-slate-600">{review.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-base font-bold text-slate-900">Actividad reciente</h3>
            <ul className="mt-4 space-y-4">
              {ACTIVITY.map((item) => (
                <li key={item.text} className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                  </span>
                  <div className="flex-1">
                    <p className="text-sm text-slate-700">{item.text}</p>
                    <p className="text-xs text-slate-400">{item.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </main>
      </div>
    </div>
  );
}
