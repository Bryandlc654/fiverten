import HomeHeader from './HomeHeader';
import PublicFooter from './PublicFooter';

function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-slate-200 ${className}`} />;
}

function DarkBar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-white/15 ${className}`} />;
}

/**
 * Esqueleto de carga de las páginas públicas de una empresa, con la misma
 * estructura que el contenido real para evitar saltos de maquetación.
 */
export default function CompanyPageSkeleton({
  variant = 'profile',
}: {
  variant?: 'profile' | 'section';
}) {
  if (variant === 'section') {
    return (
      <div
        className="flex min-h-screen flex-1 flex-col bg-slate-50 text-slate-900"
        role="status"
        aria-live="polite"
      >
        <HomeHeader />
        <span className="sr-only">Cargando información de la empresa…</span>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-8 pt-24">
          <Bar className="h-3 w-32" />
          <Bar className="mt-3 h-8 w-64 max-w-full" />
          <div className="mt-5 flex gap-2 border-b border-slate-200 pb-3">
            {[0, 1, 2, 3, 4].map((item) => (
              <Bar key={item} className="h-3 w-20" />
            ))}
          </div>
          <div className="mt-5 space-y-4">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <Bar className="h-4 w-48 max-w-full" />
                <div className="mt-4 space-y-2">
                  <Bar className="h-3 w-full" />
                  <Bar className="h-3 w-5/6" />
                  <Bar className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen flex-col bg-[#F4F3EF] font-sans text-slate-900 antialiased"
      role="status"
      aria-live="polite"
    >
      <HomeHeader />
      <span className="sr-only">Cargando perfil de la empresa…</span>

      {/* Cabecera oscura */}
      <section className="relative overflow-hidden bg-slate-900 pt-16">
        <div className="mx-auto max-w-7xl px-4 pb-8 pt-7 sm:px-6 lg:px-8">
          <DarkBar className="mb-5 h-3 w-40" />
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-5">
              <div className="h-20 w-20 shrink-0 animate-pulse rounded-lg bg-white/10 sm:h-24 sm:w-24" />
              <div className="min-w-0 flex-1 space-y-3">
                <DarkBar className="h-7 w-56 max-w-full" />
                <DarkBar className="h-3 w-40 max-w-full" />
                <div className="flex flex-wrap gap-3">
                  <DarkBar className="h-3 w-24" />
                  <DarkBar className="h-3 w-28" />
                  <DarkBar className="h-3 w-20" />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <DarkBar className="h-9 w-28 rounded-md" />
              <DarkBar className="h-9 w-28 rounded-md" />
            </div>
          </div>
        </div>
      </section>

      {/* Navegación del perfil */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl gap-7 overflow-hidden px-4 py-3.5 sm:px-6 lg:px-8">
          {[0, 1, 2, 3, 4].map((item) => (
            <Bar key={item} className="h-3 w-20 shrink-0" />
          ))}
        </div>
      </div>

      <main className="mx-auto w-full max-w-7xl flex-grow px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Descripción + presentación */}
            <div className="rounded-lg border border-slate-200/80 bg-white p-6 shadow-sm">
              <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <Bar className="h-3 w-24" />
                  <Bar className="h-7 w-3/4" />
                  <Bar className="h-3 w-full" />
                  <Bar className="h-3 w-5/6" />
                  <div className="flex gap-3 pt-3">
                    <div className="h-9 w-28 animate-pulse rounded-md bg-blue-100" />
                    <Bar className="h-9 w-28" />
                  </div>
                </div>
                <div className="aspect-video animate-pulse rounded-lg bg-slate-200" />
              </div>
            </div>

            {/* Verificación, proyectos y documentación */}
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="rounded-lg border border-slate-200/80 bg-white p-6 shadow-sm"
              >
                <div className="flex items-center justify-between gap-4">
                  <Bar className="h-4 w-48 max-w-full" />
                  <Bar className="h-3 w-20" />
                </div>
                <div className="mt-5 space-y-2">
                  <Bar className="h-3 w-full" />
                  <Bar className="h-3 w-4/5" />
                  {item === 0 && <Bar className="h-3 w-2/3" />}
                </div>
              </div>
            ))}
          </div>

          {/* Columna lateral */}
          <aside className="space-y-6">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="rounded-lg border border-slate-200/80 bg-white p-5 shadow-sm"
              >
                <Bar className="h-4 w-32" />
                {item === 0 ? (
                  <div className="mt-5 grid grid-cols-2 gap-4">
                    {[0, 1, 2, 3].map((metric) => (
                      <div key={metric} className="space-y-2">
                        <Bar className="h-5 w-10" />
                        <Bar className="h-3 w-20" />
                        <Bar className="h-2.5 w-16" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    <Bar className="h-3 w-full" />
                    <Bar className="h-3 w-5/6" />
                    <Bar className="h-3 w-2/3" />
                  </div>
                )}
              </div>
            ))}
          </aside>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
