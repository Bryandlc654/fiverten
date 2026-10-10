'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError, api } from '../../lib/api';

type Status = 'loading' | 'success' | 'error';

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('Verificando tu correo…');

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      setStatus('error');
      setMessage('Falta el token de verificación en el enlace.');
      return;
    }

    let active = true;
    api
      .verifyEmail(token)
      .then(() => {
        if (active) {
          setStatus('success');
          setMessage('Tu correo se ha verificado correctamente.');
        }
      })
      .catch((error) => {
        if (active) {
          setStatus('error');
          setMessage(
            error instanceof ApiError ? error.message : 'No se pudo verificar el correo.',
          );
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="auth-shell">
      <div className="card">
        <h1>Verificación de correo</h1>
        {status === 'loading' && <p className="subtitle">{message}</p>}
        {status === 'success' && (
          <>
            <p className="subtitle">{message}</p>
            <Link className="btn" href="/dashboard">
              Ir a mi panel
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="error">{message}</div>
            <div className="footer-link">
              <Link href="/login">Volver al inicio de sesión</Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
