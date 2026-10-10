'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';

const inputClass =
  'w-full h-11 px-space-md rounded-lg bg-surface-container-low text-on-surface placeholder:text-outline/60 font-body-md text-body-md border border-outline-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-colors';

const labelClass = 'block font-label-md text-label-md text-on-surface';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated, isLoading } = useAuth();
  const [form, setForm] = useState({
    companyName: '',
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isLoading, isAuthenticated, router]);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    setSubmitting(true);
    try {
      const response = await register({
        email: form.email,
        password: form.password,
        companyName: form.companyName,
        firstName: form.firstName || undefined,
        lastName: form.lastName || undefined,
        username: form.username || undefined,
      });
      if (response.requiresEmailVerification) {
        setNotice(
          'Cuenta creada. Revisa tu correo electrónico para verificarla e iniciar sesión.',
        );
        return;
      }
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo completar el registro');
    } finally {
      setSubmitting(false);
    }
  }

  function handleSso(provider: string) {
    setError(null);
    setNotice(`El acceso con ${provider} estará disponible próximamente.`);
  }

  return (
    <>
      <main className="flex-1 flex flex-col items-center justify-center bg-background px-gutter py-space-xl">
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-space-lg">
            <Image
              src="/logo-fiverten.png"
              alt="FIVERTEN"
              width={2170}
              height={349}
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
                  <path d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z" fill="#4285F4" />
                  <path d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.94H1.24v3.15C3.26 21.36 7.34 24 12 24z" fill="#34A853" />
                  <path d="M5.28 14.26c-.25-.72-.38-1.49-.38-2.26s.14-1.54.38-2.26V6.59H1.24C.45 8.16 0 9.98 0 12s.45 3.84 1.24 5.41l4.04-3.15z" fill="#FBBC05" />
                  <path d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.24 6.59l4.04 3.15c.95-2.84 3.6-4.99 6.72-4.99z" fill="#EA4335" />
                </svg>
                <span>Registrarse con Google</span>
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
                <label className={labelClass} htmlFor="companyName">
                  Nombre de la empresa
                </label>
                <input
                  id="companyName"
                  value={form.companyName}
                  onChange={(event) => update('companyName', event.target.value)}
                  placeholder="Mi empresa S.L."
                  required
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                <div className="space-y-1.5">
                  <label className={labelClass} htmlFor="firstName">
                    Nombre
                  </label>
                  <input
                    id="firstName"
                    value={form.firstName}
                    onChange={(event) => update('firstName', event.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass} htmlFor="lastName">
                    Apellidos
                  </label>
                  <input
                    id="lastName"
                    value={form.lastName}
                    onChange={(event) => update('lastName', event.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="username">
                  Usuario (opcional)
                </label>
                <input
                  id="username"
                  value={form.username}
                  onChange={(event) => update('username', event.target.value)}
                  placeholder="Se genera automáticamente si lo dejas vacío"
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="email">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(event) => update('email', event.target.value)}
                  placeholder="nombre@empresa.com"
                  required
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="password">
                  Contraseña
                </label>
                <div className="relative flex items-center">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(event) => update('password', event.target.value)}
                    placeholder="••••••••••••"
                    required
                    className={`${inputClass} pr-11`}
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

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-11 rounded-lg bg-primary-container hover:bg-inverse-primary disabled:opacity-60 disabled:cursor-not-allowed text-on-primary-container font-label-md text-label-md font-semibold transition-colors"
              >
                {submitting ? 'Creando cuenta…' : 'Crear cuenta'}
              </button>
            </form>

            <p className="text-center font-body-sm text-body-sm text-on-surface-variant pt-space-xs">
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Inicia sesión
              </Link>
            </p>
          </div>
        </div>
      </main>

      <footer className="w-full bg-background py-space-md">
        <p className="text-center font-body-sm text-[12px] text-outline">
          © 2025 FIVERTEN. Todos los derechos reservados.
        </p>
      </footer>
    </>
  );
}
