'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, api, type InvitationPreview } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { roleLabel } from '../../lib/roles';

const SUCCESS_STYLE = {
  background: 'rgba(34,197,94,0.12)',
  borderColor: 'rgba(34,197,94,0.4)',
  color: '#86efac',
};

export default function AcceptInvitationPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, login, reloadSession } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<InvitationPreview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get('token');
    if (!value) {
      setLoadError('Falta el token de la invitación en el enlace.');
      return;
    }
    setToken(value);
    let active = true;
    api
      .previewInvitation(value)
      .then((data) => {
        if (!active) return;
        setInvitation(data);
        setFirstName(data.firstName ?? '');
        setLastName(data.lastName ?? '');
      })
      .catch((err) => {
        if (active) {
          setLoadError(err instanceof ApiError ? err.message : 'No se pudo cargar la invitación');
        }
      });
    return () => {
      active = false;
    };
  }, []);

  async function finish() {
    await reloadSession();
    router.replace('/dashboard');
  }

  async function onCreateAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !invitation) return;
    if (password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.acceptInvitation({
        token,
        password,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
      });
      await login({ email: invitation.email, password });
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo aceptar la invitación');
      setSubmitting(false);
    }
  }

  async function onAcceptAsUser() {
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.acceptInvitationAsUser(token);
      await finish();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo aceptar la invitación');
      setSubmitting(false);
    }
  }

  const loginHref = token
    ? `/login?next=${encodeURIComponent(`/accept-invitation?token=${token}`)}`
    : '/login';
  const sameUser =
    isAuthenticated && invitation && user?.email.toLowerCase() === invitation.email.toLowerCase();

  return (
    <main className="auth-shell">
      <div className="card">
        <h1>Invitación</h1>

        {loadError ? (
          <>
            <div className="error">{loadError}</div>
            <div className="footer-link">
              <Link href="/login">Ir al inicio de sesión</Link>
            </div>
          </>
        ) : !invitation || isLoading ? (
          <p className="subtitle">Cargando invitación…</p>
        ) : (
          <>
            <p className="subtitle">
              Te han invitado a unirte a <strong>{invitation.organization.tradeName}</strong> como{' '}
              <strong>{roleLabel(invitation.role)}</strong> con el correo{' '}
              <strong>{invitation.email}</strong>.
            </p>

            {error && <div className="error">{error}</div>}

            {sameUser ? (
              <button type="button" onClick={() => void onAcceptAsUser()} disabled={submitting}>
                {submitting ? 'Uniéndote…' : 'Aceptar y unirme'}
              </button>
            ) : isAuthenticated ? (
              <div className="error">
                Has iniciado sesión como {user?.email}. Esta invitación es para {invitation.email}:
                cierra sesión e inicia con esa cuenta para aceptarla.
              </div>
            ) : invitation.hasAccount ? (
              <>
                <div className="error" style={SUCCESS_STYLE}>
                  Ya tienes una cuenta con este correo. Inicia sesión para aceptar la invitación.
                </div>
                <Link className="btn" href={loginHref}>
                  Iniciar sesión y aceptar
                </Link>
              </>
            ) : (
              <form onSubmit={onCreateAccount} noValidate>
                <div className="field">
                  <label htmlFor="firstName">Nombre</label>
                  <input
                    id="firstName"
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="lastName">Apellidos</label>
                  <input
                    id="lastName"
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="password">Elige tu contraseña</label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="confirm">Repite la contraseña</label>
                  <input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" disabled={submitting}>
                  {submitting ? 'Creando cuenta…' : 'Crear cuenta y unirme'}
                </button>
              </form>
            )}

            <p className="subtitle" style={{ marginTop: 16 }}>
              Si no esperabas esta invitación, ignórala: no se creará ninguna cuenta.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
