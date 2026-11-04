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
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl gap-5 overflow-x-auto px-4 py-2.5 text-xs font-semibold text-slate-600">
          <Link href="/empresas" className="shrink-0 hover:text-blue-600">
            Directorio
          </Link>
          <Link href="/como-funciona" className="shrink-0 hover:text-blue-600">
            Cómo funciona
          </Link>
          <Link href="/trust-center" className="shrink-0 hover:text-blue-600">
            Trust Center
          </Link>
          <Link href="/metodologia" className="shrink-0 hover:text-blue-600">
            Metodología
          </Link>
          <Link href="/soluciones" className="shrink-0 hover:text-blue-600">
            Soluciones
          </Link>
          <Link href="/recursos" className="shrink-0 hover:text-blue-600">
            Recursos
          </Link>
          <Link href="/verificar-empresa" className="shrink-0 font-bold text-blue-600">
            Verificar empresa
          </Link>
        </div>
      </nav>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      <footer className="border-t border-slate-200 bg-white py-5 text-center text-xs text-slate-400">
        Reseñas gestionadas por FIVERTEN · Las empresas no pueden ocultar ni editar las opiniones de
        sus clientes.
      </footer>
    </div>
  );
}
