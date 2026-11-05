'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import DashboardShell from '../../../components/DashboardShell';
import Modal from '../../../components/ui/Modal';
import { Alert, Badge, Field, inputClass } from '../../../components/ui';
import {
  ApiError,
  api,
  type ReviewCampaignDetail,
  type ReviewCampaignSummary,
} from '../../../lib/api';

const STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  draft: { label: 'Borrador', tone: 'bg-slate-100 text-slate-500' },
  active: { label: 'Activa', tone: 'bg-blue-50 text-blue-600' },
  completed: { label: 'Completada', tone: 'bg-emerald-50 text-emerald-600' },
};

const REQUEST_STATUS: Record<string, string> = {
  sent: 'Enviada',
  opened: 'Abierta',
  completed: 'Completada',
};

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<ReviewCampaignSummary[] | null>(null);
  const [selected, setSelected] = useState<ReviewCampaignDetail | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await api.listReviewCampaigns({ page: 1, pageSize: 50 });
      setCampaigns(data.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar las campañas');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function openCampaign(id: string) {
    setError(null);
    try {
      setSelected(await api.getReviewCampaign(id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo abrir la campaña');
    }
  }

  const totals = (campaigns ?? []).reduce(
    (acc, campaign) => ({
      sent: acc.sent + campaign.stats.sent,
      opened: acc.opened + campaign.stats.opened,
      completed: acc.completed + campaign.stats.completed,
    }),
    { sent: 0, opened: 0, completed: 0 },
  );
  const conversion = totals.sent > 0 ? totals.completed / totals.sent : 0;

  return (
    <DashboardShell
      active="campaigns"
      title="Clientes"
      subtitle="Solicitudes y campañas de reseñas para tus clientes"
    >
      <div className="space-y-5">
        {error && <Alert tone="error">{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}

        <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-blue-800">
          <span className="material-symbols-outlined text-[20px] text-blue-600">lock</span>
          <p>
            Los nombres y correos de tus clientes son privados: solo los ve tu empresa. FIVERTEN no
            los publica en el perfil ni los comparte con otras empresas.
          </p>
        </div>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="Enviadas" value={totals.sent} />
          <Metric label="Abiertas" value={totals.opened} />
          <Metric label="Completadas" value={totals.completed} />
          <Metric label="Conversión" value={percent(conversion)} />
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900">Tus campañas</h2>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600"
          >
            <span className="material-symbols-outlined text-[18px]">campaign</span>
            Nueva campaña
          </button>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_420px]">
          <section className="rounded-xl border border-slate-200 bg-white">
            {!campaigns ? (
              <p className="px-5 py-4 text-sm text-slate-500">Cargando campañas…</p>
            ) : campaigns.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-500">
                Aún no has creado campañas. Crea una para enviar enlaces personalizados a varios
                clientes a la vez.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {campaigns.map((campaign) => (
                  <li key={campaign.id}>
                    <button
                      type="button"
                      onClick={() => void openCampaign(campaign.id)}
                      className={`w-full px-5 py-4 text-left transition hover:bg-slate-50 ${
                        selected?.id === campaign.id ? 'bg-blue-50/60' : ''
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-slate-900">{campaign.name}</p>
                        <Badge
                          label={STATUS_LABELS[campaign.status]?.label ?? campaign.status}
                          tone={STATUS_LABELS[campaign.status]?.tone ?? 'bg-slate-100 text-slate-500'}
                        />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {campaign.stats.sent} enviadas · {campaign.stats.opened} abiertas ·{' '}
                        {campaign.stats.completed} completadas ·{' '}
                        {percent(campaign.stats.conversion)} conversión ·{' '}
                        {formatDate(campaign.sentAt ?? campaign.createdAt)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-5">
            {!selected ? (
              <p className="text-sm text-slate-500">
                Selecciona una campaña para ver el detalle de los envíos.
              </p>
            ) : (
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">{selected.name}</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Creada el {formatDate(selected.createdAt)}
                    </p>
                  </div>
                  <Badge
                    label={STATUS_LABELS[selected.status]?.label ?? selected.status}
                    tone={STATUS_LABELS[selected.status]?.tone ?? 'bg-slate-100 text-slate-500'}
                  />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <Mini label="Enviadas" value={selected.stats.sent} />
                  <Mini label="Abiertas" value={selected.stats.opened} />
                  <Mini label="Completadas" value={selected.stats.completed} />
                </div>
                <ul className="mt-4 divide-y divide-slate-100">
                  {selected.requests.map((request) => (
                    <li
                      key={request.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">
                          {request.reviewerName}
                        </p>
                        <p className="truncate text-xs text-slate-500">{request.reviewerEmail}</p>
                      </div>
                      <span className="text-xs font-semibold text-slate-600">
                        {REQUEST_STATUS[request.status] ?? request.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      </div>

      {creating && (
        <CampaignModal
          onClose={() => setCreating(false)}
          onCreated={async (campaign) => {
            setCreating(false);
            setNotice(
              `Campaña creada: ${campaign.stats.sent} solicitudes enviadas.`,
            );
            await load();
            await openCampaign(campaign.id);
          }}
        />
      )}
    </DashboardShell>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-50 px-2 py-2">
      <p className="text-lg font-bold text-slate-900">{value}</p>
      <p className="text-[10px] text-slate-500">{label}</p>
    </div>
  );
}

function parseRecipients(value: string): { name: string; email: string }[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [first, ...rest] = line.split(/[,;]/).map((part) => part.trim());
      if (rest.length === 0) {
        return { name: first.split('@')[0] || 'Cliente', email: first };
      }
      return { name: first || rest.join(' ').split('@')[0], email: rest.join(' ').trim() };
    })
    .filter((recipient) => recipient.email.includes('@'));
}

function CampaignModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (campaign: ReviewCampaignSummary) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [recipients, setRecipients] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const parsed = parseRecipients(recipients);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (parsed.length === 0) {
      setError('Añade al menos un destinatario válido');
      return;
    }
    if (parsed.length > 200) {
      setError('Máximo 200 destinatarios por campaña');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const campaign = await api.createReviewCampaign({
        name: name.trim(),
        recipients: parsed,
      });
      await onCreated(campaign);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear la campaña');
      setBusy(false);
    }
  }

  return (
    <Modal title="Nueva campaña de reseñas" onClose={onClose} busy={busy}>
      <form onSubmit={submit} className="space-y-3">
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="Nombre de la campaña" className="block">
          <input
            required
            minLength={2}
            maxLength={150}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Clientes septiembre"
            className={inputClass}
          />
        </Field>
        <Field
          label="Destinatarios (uno por línea: Nombre, email)"
          className="block"
        >
          <textarea
            required
            rows={8}
            value={recipients}
            onChange={(event) => setRecipients(event.target.value)}
            placeholder={'Juan Pérez, juan@email.com\nAna Ruiz, ana@email.com'}
            className={inputClass}
          />
        </Field>
        <p className="text-xs text-slate-500">
          {parsed.length} destinatario{parsed.length === 1 ? '' : 's'} válido
          {parsed.length === 1 ? '' : 's'}.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={busy || parsed.length === 0}
            className="rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? 'Enviando…' : 'Crear y enviar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
