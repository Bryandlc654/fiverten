import { ACTIVITY } from './sample-data';

export default function RecentActivity() {
  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="text-base font-bold text-slate-900">Actividad reciente</h3>
      <ul className="mt-4 space-y-4">
        {ACTIVITY.map((item) => (
          <li key={item.text} className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
            </span>
            <div className="flex-1">
              <p className="text-sm text-slate-700">{item.text}</p>
              <p className="text-xs text-slate-400">{item.time}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
