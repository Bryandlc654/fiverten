// Colores de las etiquetas de estado de empresa y de verificación.
export const STATUS_TONE: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-600',
  pending: 'bg-amber-50 text-amber-600',
  suspended: 'bg-red-50 text-red-600',
  inactive: 'bg-slate-100 text-slate-500',
};

export const VERIFICATION_TONE: Record<string, string> = {
  verified: 'bg-emerald-50 text-emerald-600',
  pending: 'bg-blue-50 text-blue-600',
  not_verified: 'bg-slate-100 text-slate-500',
  rejected: 'bg-red-50 text-red-600',
};

export const NEUTRAL_TONE = 'bg-slate-100 text-slate-500';
