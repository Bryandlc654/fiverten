import { REVIEWS } from './sample-data';

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex text-amber-400">
      {[0, 1, 2, 3, 4].map((index) => (
        <span
          key={index}
          className="material-symbols-outlined text-[16px]"
          style={{ fontVariationSettings: index < rating ? "'FILL' 1" : "'FILL' 0" }}
        >
          star
        </span>
      ))}
    </div>
  );
}

export default function LatestReviews() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 xl:col-span-2">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-900">Últimas opiniones</h3>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          Ver todas
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        </button>
      </div>
      <ul className="mt-4 divide-y divide-slate-100">
        {REVIEWS.map((review) => (
          <li key={review.name} className="flex gap-3 py-3 first:pt-0 last:pb-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
              {review.name
                .split(' ')
                .map((part) => part[0])
                .join('')
                .slice(0, 2)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-slate-900">{review.name}</p>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                  {review.platform}
                </span>
                <span className="text-[11px] text-slate-400">{review.date}</span>
              </div>
              <Stars rating={review.rating} />
              <p className="mt-0.5 text-sm text-slate-600">{review.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
