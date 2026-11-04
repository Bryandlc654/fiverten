// Formato de las cifras del panel de estadísticas.

export const TONE_STYLES: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  violet: 'bg-violet-50 text-violet-600',
  slate: 'bg-slate-100 text-slate-600',
};

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** "2026-10" -> "Oct" (o "Oct 26" con el año). */
export function monthLabel(month: string, withYear = false): string {
  const [year, index] = month.split('-');
  const label = MONTHS[Number(index) - 1] ?? month;
  return withYear ? `${label} ${year.slice(2)}` : label;
}

export function formatPercent(rate: number | null): string {
  return rate === null ? '—' : `${Math.round(rate * 100)}%`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString('es-ES');
}

/** Tiempo medio de respuesta legible: minutos, horas o días. */
export function formatHours(hours: number | null): string {
  if (hours === null) return '—';
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 48) return `${Math.round(hours)} h`;
  return `${Math.round(hours / 24)} días`;
}
