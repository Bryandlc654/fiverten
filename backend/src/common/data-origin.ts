export const DATA_ORIGINS = [
  'company_submitted',
  'fiverten_verified',
  'source_derived',
  'system_calculated',
] as const;

export type DataOrigin = (typeof DATA_ORIGINS)[number];

export const DATA_ORIGIN_LABELS: Record<DataOrigin, string> = {
  company_submitted: 'Dato propuesto por la empresa',
  fiverten_verified: 'Dato validado por FIVERTEN',
  source_derived: 'Dato obtenido de una fuente externa',
  system_calculated: 'Métrica calculada por la plataforma',
};
