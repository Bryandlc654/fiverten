'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import DashboardShell from '../../../components/DashboardShell';
import ModerationItem from '../../../components/admin/ModerationItem';
import { Alert, LoadingRow } from '../../../components/ui';
import Pagination from '../../../components/ui/Pagination';
import { ApiError, api, type AdminReviewList, type ReviewStatus } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';

const PAGE_SIZE = 20;

type Tab = ReviewStatus | 'all';

const TABS: { key: Tab; label: string }[] = [
  { key: 'under_review', label: 'En revisión' },
  { key: 'reported', label: 'Reportadas' },
  { key: 'published', label: 'Publicadas' },
  { key: 'hidden', label: 'Ocultas' },
  { key: 'rejected', label: 'Rechazadas' },
  { key: 'pending', label: 'Sin confirmar' },
  { key: 'all', label: 'Todas' },
];

export default function AdminReviewsPage() {
  const router = useRouter();
  const { isSuperAdmin, isLoading } = useAuth();
  const [tab, setTab] = useState<Tab>('under_review');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AdminReviewList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isSuperAdmin) {
      router.replace('/dashboard');
    }
  }, [isLoading, isSuperAdmin, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(
        await api.adminListReviews({
          status: tab === 'all' ? undefined : tab,
          search: search || undefined,
          page,
          pageSize: PAGE_SIZE,
        }),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar las reseñas');
    } finally {
      setLoading(false);
    }
  }, [tab, search, page]);

  useEffect(() => {
    if (isSuperAdmin) void load();
  }, [isSuperAdmin, load]);

  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const counts: Partial<Record<Tab, number>> = {
    under_review: data?.queue.underReview,
    reported: data?.queue.reported,
  };

  return (
    <DashboardShell
      active="adminReviews"
      title="Moderación de reseñas"
      subtitle="Revisa las reseñas señaladas por el antifraude o reportadas"
    >
      <div className="space-y-5">
        {error && <Alert tone="error">{error}</Alert>}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 text-sm font-medium">
            {TABS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setTab(item.key);
                  setPage(1);
                }}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition ${
                  tab === item.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                {item.label}
                {counts[item.key] ? (
                  <span className="rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                    {counts[item.key]}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
          <div className="relative">
            <span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">
              search
            </span>
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Empresa, autor o texto…"
              className="w-60 rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {loading && !data ? (
          <div className="rounded-xl border border-slate-200 bg-white">
            <LoadingRow label="Cargando reseñas…" />
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            {tab === 'under_review' || tab === 'reported'
              ? 'No hay nada pendiente. ¡Cola al día!'
              : 'No hay reseñas en este estado.'}
          </div>
        ) : (
          <>
            {data.items.map((review) => (
              <ModerationItem key={review.id} review={review} onDone={() => void load()} />
            ))}
            {pages > 1 && (
              <div className="rounded-xl border border-slate-200 bg-white">
                <Pagination
                  summary={`${data.total} reseñas`}
                  page={page}
                  pages={pages}
                  onPage={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
