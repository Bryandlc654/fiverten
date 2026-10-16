export default function WelcomeBanner({
  firstName,
  isVerified,
  publicId,
}: {
  firstName: string | null;
  isVerified: boolean;
  publicId: string | undefined;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-[#0b101b] px-6 py-7 text-white">
      <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[#2563eb]/30 blur-3xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-6">
        <div className="max-w-lg">
          <p className="text-sm text-slate-400">
            Hola{firstName ? `, ${firstName}` : ''} 👋
          </p>
          <h2 className="mt-1 text-2xl font-bold">Tu reputación verificada, lista para compartir</h2>
          <p className="mt-2 text-sm text-slate-400">
            Muestra tu sello FIVERTEN en tu web y convierte más visitantes en clientes que
            confían en ti.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600"
            >
              <span className="material-symbols-outlined text-[18px]">verified</span>
              Obtener mi sello
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/5"
            >
              Ver mi perfil
            </button>
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
            <p className="text-lg font-bold">
              {isVerified ? 'Verificado' : 'En revisión'}
            </p>
            <p className="text-xs text-slate-400">{publicId ?? '—'}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
