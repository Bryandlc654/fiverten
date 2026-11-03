'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import DashboardShell from '../../../components/DashboardShell';
import { Alert, Field, inputClass } from '../../../components/ui';
import { ApiError, api, type SessionInfo } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;

/** "Chrome en Windows" a partir del user agent (aproximado, solo para mostrar). */
function describeDevice(userAgent: string | null): { label: string; icon: string } {
  if (!userAgent) return { label: 'Dispositivo desconocido', icon: 'devices' };
  const ua = userAgent;
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Chrome\//.test(ua)
          ? 'Chrome'
          : /Safari\//.test(ua)
            ? 'Safari'
            : 'Navegador';
  const os = /Android/.test(ua)
    ? 'Android'
    : /iPhone|iPad|iPod/.test(ua)
      ? 'iOS'
      : /Windows/.test(ua)
        ? 'Windows'
        : /Mac OS X/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : 'otro sistema';
  const mobile = /Android|iPhone|iPad|iPod|Mobile/.test(ua);
  return { label: `${browser} en ${os}`, icon: mobile ? 'smartphone' : 'computer' };
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SecurityPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);

  const [sessions, setSessions] = useState<SessionInfo[] | null>(null);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [closingAll, setClosingAll] = useState(false);

  const loadSessions = useCallback(() => {
    setSessionsError(null);
    api
      .listSessions()
      .then((data) => setSessions(data.sessions))
      .catch((err) =>
        setSessionsError(err instanceof ApiError ? err.message : 'No se pudieron cargar'),
      );
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  async function onChangePassword(event: FormEvent) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordNotice(null);
    if (!PASSWORD_RULE.test(next)) {
      setPasswordError(
        'La nueva contraseña debe tener entre 8 y 72 caracteres e incluir una letra y un número.',
      );
      return;
    }
    if (next !== confirmation) {
      setPasswordError('Las contraseñas nuevas no coinciden.');
      return;
    }
    setSaving(true);
    try {
      const result = await api.changePassword(current, next);
      setCurrent('');
      setNext('');
      setConfirmation('');
      setPasswordNotice(
        result.revokedSessions > 0
          ? `Contraseña actualizada. Hemos cerrado ${result.revokedSessions} ${
              result.revokedSessions === 1 ? 'sesión' : 'sesiones'
            } en otros dispositivos.`
          : 'Contraseña actualizada.',
      );
      loadSessions();
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : 'No se pudo cambiar la contraseña');
    } finally {
      setSaving(false);
    }
  }

  async function onRevoke(session: SessionInfo) {
    setRevoking(session.id);
    try {
      await api.revokeSession(session.id);
      setSessions((list) => list?.filter((s) => s.id !== session.id) ?? null);
    } catch (err) {
      setSessionsError(err instanceof ApiError ? err.message : 'No se pudo cerrar la sesión');
    } finally {
      setRevoking(null);
    }
  }

  async function onLogoutAll() {
    if (
      !window.confirm(
        'Se cerrará la sesión en todos tus dispositivos, también en este. ¿Continuar?',
      )
    )
      return;
    setClosingAll(true);
    try {
      await api.logoutAll();
    } catch {
      // Aunque falle, se cierra la sesión local.
    }
    await logout();
    router.replace('/login');
  }

  const others = sessions?.filter((s) => !s.current).length ?? 0;

  return (
    <DashboardShell
      active="security"
      title="Seguridad de la cuenta"
      subtitle="Contraseña y sesiones abiertas"
    >
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-5">
        <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2">
          <h2 className="text-base font-bold text-slate-900">Cambiar contraseña</h2>
          <p className="mt-1 text-xs text-slate-500">
            Al cambiarla se cerrarán tus sesiones en otros dispositivos.
          </p>
          <form onSubmit={onChangePassword} className="mt-4 space-y-3">
            {passwordError && <Alert tone="error">{passwordError}</Alert>}
            {passwordNotice && <Alert tone="success">{passwordNotice}</Alert>}
            <Field label="Contraseña actual" className="block">
              <input
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                required
                className={inputClass}
              />
            </Field>
            <Field label="Nueva contraseña" className="block">
              <input
                type="password"
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                required
                className={inputClass}
              />
            </Field>
            <Field label="Repite la nueva contraseña" className="block">
              <input
                type="password"
                autoComplete="new-password"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                required
                className={inputClass}
              />
            </Field>
            <p className="text-[11px] text-slate-400">
              Mínimo 8 caracteres, con al menos una letra y un número.
            </p>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-60 sm:w-auto"
            >
              <span className="material-symbols-outlined text-[18px]">key</span>
              {saving ? 'Guardando…' : 'Cambiar contraseña'}
            </button>
          </form>
        </section>

        <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 lg:col-span-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Sesiones activas</h2>
              <p className="mt-1 text-xs text-slate-500">
                Dispositivos desde los que has iniciado sesión.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void onLogoutAll()}
              disabled={closingAll}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              {closingAll ? 'Cerrando…' : 'Cerrar sesión en todos los dispositivos'}
            </button>
          </div>

          {sessionsError && (
            <div className="mt-3">
              <Alert tone="error">{sessionsError}</Alert>
            </div>
          )}

          {sessions === null ? (
            <p className="mt-4 text-sm text-slate-400">Cargando sesiones…</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {sessions.map((session) => {
                const device = describeDevice(session.userAgent);
                return (
                  <li key={session.id} className="flex items-start gap-3 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                      <span className="material-symbols-outlined text-[20px]">{device.icon}</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
                        {device.label}
                        {session.current && (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                            Esta sesión
                          </span>
                        )}
                      </p>
                      <p className="break-words text-xs text-slate-500">
                        {[session.ipAddress, session.country].filter(Boolean).join(' · ') ||
                          'IP desconocida'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Última actividad: {formatDateTime(session.lastActivityAt)} · Inicio:{' '}
                        {formatDateTime(session.createdAt)}
                      </p>
                    </div>
                    {!session.current && (
                      <button
                        type="button"
                        onClick={() => void onRevoke(session)}
                        disabled={revoking === session.id}
                        className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-red-200 hover:text-red-600 disabled:opacity-60"
                      >
                        {revoking === session.id ? 'Cerrando…' : 'Cerrar'}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {sessions !== null && others === 0 && (
            <p className="mt-2 text-xs text-slate-400">
              No tienes sesiones abiertas en otros dispositivos.
            </p>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
