'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { nextPath } from '../../lib/next-path';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<'success' | 'error' | null>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated && feedback !== 'success') {
      router.replace(nextPath());
    }
  }, [isLoading, isAuthenticated, router, feedback]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    setNotice(null);
    setFeedback(null);
    setClosing(false);
    setSubmitting(true);
    try {
      await login({ email, password });
      // Espera a que se vea la animación de éxito antes de entrar al panel.
      setFeedback('success');
      window.setTimeout(() => router.replace(nextPath()), 1100);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo iniciar sesión');
      setSubmitting(false);
      setFeedback('error');
      window.setTimeout(() => setClosing(true), 1000);
      window.setTimeout(() => {
        setFeedback(null);
        setClosing(false);
      }, 1350);
    }
  }

  function handleSso(provider: string) {
    setError(null);
    setNotice(`El acceso con ${provider} estará disponible próximamente.`);
  }

  return (
    <>
      <main className="flex-1 flex flex-col items-center justify-center bg-background px-gutter py-space-xl">
        <div className={`w-full max-w-sm ${feedback === 'error' && !closing ? 'auth-shake' : ''}`}>
          <div className="flex justify-center mb-space-lg">
            <Image
              src="/logo-fiverten.png"
              alt="FIVERTEN"
              width={2000}
              height={347}
              priority
              className="h-10 w-auto"
            />
          </div>

          <div className="space-y-space-md">
            {error && (
              <div
                data-testid="auth-error"
                className="rounded-lg border border-error/30 bg-error-container/20 px-space-md py-space-sm font-body-sm text-body-sm text-on-error-container"
              >
                {error}
              </div>
            )}
            {notice && (
              <div
                data-testid="auth-notice"
                className="rounded-lg border border-primary/30 bg-primary-container/10 px-space-md py-space-sm font-body-sm text-body-sm text-on-primary-container"
              >
                {notice}
              </div>
            )}

            <div className="space-y-space-sm">
              <button
                type="button"
                onClick={() => handleSso('Google')}
                className="w-full h-11 px-space-md rounded-lg border border-outline-variant/40 hover:bg-surface-container-low text-on-surface font-label-md text-label-md flex items-center justify-center gap-space-sm transition-colors"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.94H1.24v3.15C3.26 21.36 7.34 24 12 24z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.28 14.26c-.25-.72-.38-1.49-.38-2.26s.14-1.54.38-2.26V6.59H1.24C.45 8.16 0 9.98 0 12s.45 3.84 1.24 5.41l4.04-3.15z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.24 6.59l4.04 3.15c.95-2.84 3.6-4.99 6.72-4.99z"
                    fill="#EA4335"
                  />
                </svg>
                <span>Iniciar con Google</span>
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-outline-variant/30" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-background px-space-sm font-label-sm text-label-sm uppercase tracking-wider text-outline">
                  o correo corporativo
                </span>
              </div>
            </div>

            <form className="space-y-space-md" onSubmit={onSubmit} noValidate>
              <div className="space-y-1.5">
                <label
                  className="block font-label-md text-label-md text-on-surface"
                  htmlFor="workEmail"
                >
                  Correo corporativo
                </label>
                <input
                  id="workEmail"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="nombre@empresa.com"
                  className="w-full h-11 px-space-md rounded-lg bg-surface-container-low text-on-surface placeholder:text-outline/60 font-body-md text-body-md border border-outline-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    className="block font-label-md text-label-md text-on-surface"
                    htmlFor="workPassword"
                  >
                    Contraseña
                  </label>
                  <Link
                    href="/forgot-password"
                    className="font-label-sm text-label-sm text-primary hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <div className="relative flex items-center">
                  <input
                    id="workPassword"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••••••"
                    className="w-full h-11 pl-space-md pr-11 rounded-lg bg-surface-container-low text-on-surface placeholder:text-outline/70 font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container border border-outline-variant/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    title="Mostrar u ocultar contraseña"
                    className="absolute right-3 p-1 text-outline hover:text-on-surface transition-colors"
                  >
                    <span className="material-symbols-outlined text-[19px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-space-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 rounded accent-primary-container"
                />
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Recordar dispositivo
                </span>
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-11 rounded-lg bg-primary-container hover:bg-inverse-primary disabled:opacity-60 disabled:cursor-not-allowed text-on-primary-container font-label-md text-label-md font-semibold transition-colors"
              >
                {submitting ? 'Accediendo…' : 'Acceder'}
              </button>
            </form>

            <p className="text-center font-body-sm text-body-sm text-on-surface-variant pt-space-xs">
              ¿Tu empresa aún no está registrada?{' '}
              <Link href="/register" className="text-primary hover:underline font-medium">
                Solicitar verificación
              </Link>
            </p>
          </div>
        </div>
      </main>

      {feedback && (
        <div
          data-testid={feedback === 'success' ? 'auth-success' : 'auth-feedback-error'}
          role="status"
          aria-live="polite"
          className={`auth-overlay fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm ${
            closing ? 'is-closing' : ''
          }`}
        >
          <div className="auth-pop flex flex-col items-center gap-space-md">
            {feedback === 'success' ? (
              <>
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary/15 ring-1 ring-secondary/40">
                  <svg
                    viewBox="0 0 52 52"
                    className="h-11 w-11 text-secondary"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path className="auth-draw" d="M14 27l8 8 16-18" />
                  </svg>
                </div>
                <p className="font-label-md text-label-md font-semibold text-secondary">
                  Acceso correcto
                </p>
              </>
            ) : (
              <>
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-error/15 ring-1 ring-error/40">
                  <svg
                    viewBox="0 0 52 52"
                    className="h-11 w-11 text-error"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={5}
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path className="auth-draw" d="M16 16l20 20" />
                    <path className="auth-draw" d="M36 16L16 36" />
                  </svg>
                </div>
                <p className="font-label-md text-label-md font-semibold text-error">
                  Datos incorrectos
                </p>
              </>
            )}
          </div>
        </div>
      )}

      <footer className="w-full bg-background py-space-md">
        <p className="text-center font-body-sm text-[12px] text-outline">
          © 2025 FIVERTEN. Todos los derechos reservados.
        </p>
      </footer>
    </>
  );
}
