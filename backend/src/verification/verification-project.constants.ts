export const PROJECT_TYPES = [
  'reforma_integral',
  'obra_nueva',
  'rehabilitacion',
  'instalacion',
  'consultoria',
  'otro',
] as const;

export const PROJECT_STATUSES = ['ongoing', 'completed'] as const;

export const PROJECT_CLIENT_STATUSES = ['identified', 'confirmed', 'verified'] as const;

export const PROJECT_EVIDENCE_TYPES = [
  'contract',
  'budget',
  'invoice',
  'photos',
  'certificate',
  'act',
  'other',
] as const;

export const REVIEW_VERIFICATION_STATUSES = ['identified', 'confirmed', 'verified'] as const;
