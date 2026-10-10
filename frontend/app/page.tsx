'use client';

import Link from 'next/link';
import { useAuth } from '../lib/auth-context';

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <main className="auth-shell">
      <div className="card">
        <h1>FIVERTEN</h1>
        <p className="subtitle">
          Reseñas y reputación verificable para tu organización.
        </p>

        {isLoading ? (
          <p className="subtitle">Cargando…</p>
        ) : isAuthenticated ? (
          <Link className="btn" href="/dashboard">
            Ir a mi panel
          </Link>
        ) : (
          <>
            <Link className="btn" href="/register">
              Crear cuenta
            </Link>
            <div className="footer-link">
              ¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
