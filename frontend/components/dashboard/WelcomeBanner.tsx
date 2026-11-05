import Link from 'next/link';

export default function WelcomeBanner({
  firstName,
  isVerified,
  publicId,
  slug,
  profileCompletion,
  pendingDocuments,
  visits,
  reviews,
}: {
  firstName: string | null;
  isVerified: boolean;
  publicId: string | undefined;
  slug: string | undefined;
  profileCompletion: number;
  pendingDocuments: number;
  visits: number;
  reviews: number;
}) {
  const metrics = [
    { label: 'Perfil completo', value: `${profileCompletion}%`, icon: 'donut_large' },
    {
      label: 'Documentos pendientes',
      value: String(pendingDocuments),
      icon: 'description',
    },
    { label: 'Visitas · 30 días', value: String(visits), icon: 'visibility' },
    { label: 'Opiniones', value: String(reviews), icon: 'reviews' },
  ];

  return (
    <section className="relative overflow-hidden rounded-2xl bg-[#10161C] px-6 py-7 text-white">
      <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-blue-600/30 blur-3xl" />
      <div className="absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-blue-600/10 blur-3xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-6">
        <div className="max-w-xl">
          <p className="text-sm text-slate-400">Hola{firstName ? `, ${firstName}` : ''}</p>
          <h2 className="mt-1 text-2xl font-bold">Tu reputación ahora es verificable</h2>
          <p className="mt-2 text-sm text-slate-400">
            Completa tu perfil, consigue opiniones reales y muestra el sello FIVERTEN para convertir
            más visitas en clientes que confían en ti.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/app/perfil"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
              Completar perfil
            </Link>
            <Link
              href="/app/sello"
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/5"
            >
              <span className="material-symbols-outlined text-[18px]">verified</span>
              Gestionar sello
            </Link>
            {slug && (
              <Link
                href={`/empresa/${slug}`}
                target="_blank"
                className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/5"
              >
                Ver mi perfil
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-full ${
              isVerified ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
            }`}
          >
            <span className="material-symbols-outlined text-[30px]">
              {isVerified ? 'verified' : 'pending'}
            </span>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Estado del sello</p>
            <p className="text-lg font-bold">{isVerified ? 'Verificado' : 'En revisión'}</p>
            <p className="text-xs text-slate-400">{publicId ?? '—'}</p>
          </div>
        </div>
      </div>

      <div className="relative mt-6 grid grid-cols-2 gap-2 border-t border-white/10 pt-4 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="flex items-center gap-2.5 rounded-lg px-1 py-1.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-slate-300">
              <span className="material-symbols-outlined text-[18px]">{metric.icon}</span>
            </span>
            <div className="min-w-0">
              <p className="text-base font-bold leading-tight text-white">{metric.value}</p>
              <p className="truncate text-[11px] text-slate-400">{metric.label}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
