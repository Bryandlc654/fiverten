import type { CaseOutcome, CaseStatus } from '../../lib/api';

// Etiquetas del caso de evidencias. El admin ve la fase; la empresa y el cliente
// la ven redactada desde su lado.

export const CASE_STATUS: Record<CaseStatus, { label: string; tone: string }> = {
  awaiting_admin: { label: 'Nuevo', tone: 'bg-red-50 text-red-600' },
  evidence_requested: { label: 'Esperando al cliente', tone: 'bg-amber-50 text-amber-600' },
  evidence_submitted: { label: 'Evidencias recibidas', tone: 'bg-red-50 text-red-600' },
  company_notified: { label: 'Esperando a la empresa', tone: 'bg-amber-50 text-amber-600' },
  company_responded: { label: 'Empresa ha respondido', tone: 'bg-red-50 text-red-600' },
  closed: { label: 'Cerrado', tone: 'bg-slate-100 text-slate-500' },
};

export const CASE_OUTCOME: Record<CaseOutcome, { label: string; tone: string }> = {
  rejected: { label: 'Reseña rechazada', tone: 'bg-slate-100 text-slate-600' },
  published: { label: 'Reseña publicada', tone: 'bg-blue-50 text-blue-600' },
  withdrawn: { label: 'Retirada por acuerdo', tone: 'bg-emerald-50 text-emerald-600' },
};

/** Etiqueta del caso: el resultado si está cerrado, si no la fase. */
export function caseBadge(status: CaseStatus, outcome: CaseOutcome | null) {
  return status === 'closed' && outcome ? CASE_OUTCOME[outcome] : CASE_STATUS[status];
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
}
