'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { ApiError, api } from '../../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo procesar la solicitud');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="card">
        <h1>Recuperar contraseña</h1>
        <p className="subtitle">
          Te enviaremos un enlace para restablecer tu contraseña.
        </p>

        {error && <div className="error">{error}</div>}

        {sent ? (
          <>
            <div className="error" style={{ background: 'rgba(34,197,94,0.12)', borderColor: 'rgba(34,197,94,0.4)', color: '#86efac' }}>
              Si el correo existe, recibirás un enlace en unos minutos.
            </div>
            <div className="footer-link">
              <Link href="/login">Volver al inicio de sesión</Link>
            </div>
          </>
        ) : (
          <form onSubmit={onSubmit} noValidate>
            <div className="field">
              <label htmlFor="email">Correo electrónico</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Enviando…' : 'Enviar enlace'}
            </button>
          </form>
        )}

        {!sent && (
          <div className="footer-link">
            <Link href="/login">Volver al inicio de sesión</Link>
          </div>
        )}
      </div>
    </main>
  );
}
