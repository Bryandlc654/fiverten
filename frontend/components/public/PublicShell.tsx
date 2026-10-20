import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

/** Marco de las páginas públicas (perfil de empresa y formulario de reseña). */
export default function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-[#0b101b]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/" aria-label="FIVERTEN">
            <Image
              src="/logo-fiverten.png"
              alt="FIVERTEN"
              width={2000}
              height={347}
              className="h-7 w-auto"
            />
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/5"
          >
            Acceso empresas
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      <footer className="border-t border-slate-200 bg-white py-5 text-center text-xs text-slate-400">
        Reseñas gestionadas por FIVERTEN · Las empresas no pueden ocultar ni editar las opiniones de
        sus clientes.
      </footer>
    </div>
  );
}
