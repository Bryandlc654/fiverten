export const VERIFICATION_STATUS: Record<string, { label: string; tone: string; help: string }> = {
  not_verified: {
    label: 'Sin verificar',
    tone: 'bg-slate-100 text-slate-600',
    help: 'Esta empresa todavía no ha completado la verificación.',
  },
  pending: {
    label: 'Verificación en curso',
    tone: 'bg-amber-50 text-amber-700',
    help: 'La documentación está siendo revisada por FIVERTEN.',
  },
  verified: {
    label: 'Empresa verificada',
    tone: 'bg-emerald-50 text-emerald-600',
    help: 'Identidad, documentación fiscal y evidencias comprobadas.',
  },
  rejected: {
    label: 'Verificación rechazada',
    tone: 'bg-red-50 text-red-600',
    help: 'La verificación no se ha aprobado.',
  },
  expired: {
    label: 'Verificación caducada',
    tone: 'bg-slate-100 text-slate-500',
    help: 'La verificación ha caducado o se ha revocado.',
  },
};

export const VERIFICATION_CATEGORIES: Record<string, string> = {
  identity: 'Identidad del representante',
  tax: 'Documentación fiscal',
  address: 'Domicilio de la empresa',
  project: 'Proyecto o evidencia',
  other: 'Otra documentación',
};

export function formatVerificationDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
