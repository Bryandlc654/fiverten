import { STATS, TONE_STYLES } from './sample-data';

export default function StatsGrid() {
  return (
    <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {STATS.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${TONE_STYLES[stat.tone]}`}
            >
              <span className="material-symbols-outlined text-[20px]">{stat.icon}</span>
            </span>
            {stat.delta && (
              <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-600">
                <span className="material-symbols-outlined text-[14px]">trending_up</span>
                {stat.delta}
              </span>
            )}
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{stat.value}</p>
          <p className="text-xs text-slate-500">{stat.label}</p>
        </div>
      ))}
    </section>
  );
}
