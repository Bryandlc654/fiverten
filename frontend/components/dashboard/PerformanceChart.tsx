export default function PerformanceChart() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 xl:col-span-2">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">Rendimiento del perfil</h3>
          <p className="text-xs text-slate-500">Visitas de los últimos 6 meses</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
          <span className="material-symbols-outlined text-[16px]">calendar_month</span>
          Últimos 6 meses
        </span>
      </div>

      <div className="mt-4">
        <svg viewBox="0 0 640 200" className="h-48 w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="fillArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0,150 C60,120 90,160 150,120 C210,80 240,110 300,90 C360,70 390,40 450,50 C510,60 540,20 600,30 L640,25 L640,200 L0,200 Z"
            fill="url(#fillArea)"
          />
          <path
            d="M0,150 C60,120 90,160 150,120 C210,80 240,110 300,90 C360,70 390,40 450,50 C510,60 540,20 600,30 L640,25"
            fill="none"
            stroke="#2563eb"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
        <div className="mt-1 flex justify-between text-[11px] text-slate-400">
          {['May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct'].map((month) => (
            <span key={month}>{month}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
