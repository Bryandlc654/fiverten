export default function Pagination({
  summary,
  page,
  pages,
  onPage,
}: {
  summary: string;
  page: number;
  pages: number;
  onPage: (page: number) => void;
}) {
  const buttonClass =
    'rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 transition hover:border-slate-300 disabled:opacity-40';
  return (
    <div className="flex items-center justify-between px-5 py-3 text-xs text-slate-500">
      <span>{summary}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className={buttonClass}
        >
          Anterior
        </button>
        <span>
          {page}/{pages}
        </span>
        <button
          type="button"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
          className={buttonClass}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
