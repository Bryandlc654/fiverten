import type { ReactNode } from 'react';
import HomeHeader from './HomeHeader';

/** Marco de las páginas públicas (perfil de empresa y formulario de reseña). */
export default function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-slate-50 text-slate-900">
      <HomeHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-8 pt-24">{children}</main>
      <footer className="border-t border-slate-200 bg-white py-5 text-center text-xs text-slate-400">
        Reseñas gestionadas por FIVERTEN · Las empresas no pueden ocultar ni editar las opiniones de
        sus clientes.
      </footer>
    </div>
  );
}
