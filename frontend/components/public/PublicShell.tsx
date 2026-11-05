import type { ReactNode } from 'react';
import HomeHeader from './HomeHeader';
import PublicFooter from './PublicFooter';

/** Marco de las páginas públicas (perfil de empresa y formulario de reseña). */
export default function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-slate-50 text-slate-900">
      <HomeHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-8 pt-24">{children}</main>
      <PublicFooter />
    </div>
  );
}
