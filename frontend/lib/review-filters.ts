// Opciones de los filtros de reseñas (perfil público y panel de la empresa).
// Deben coincidir con backend/src/reviews/reviews.params.ts.

export type ReviewSort = 'recent' | 'oldest' | 'highest' | 'lowest';
export type ReviewPeriod = '' | '30d' | '90d' | '365d';

export const SORT_OPTIONS: { value: ReviewSort; label: string }[] = [
  { value: 'recent', label: 'Más recientes' },
  { value: 'oldest', label: 'Más antiguas' },
  { value: 'highest', label: 'Mejor valoradas' },
  { value: 'lowest', label: 'Peor valoradas' },
];

export const PERIOD_OPTIONS: { value: ReviewPeriod; label: string }[] = [
  { value: '', label: 'Cualquier fecha' },
  { value: '30d', label: 'Último mes' },
  { value: '90d', label: 'Últimos 3 meses' },
  { value: '365d', label: 'Último año' },
];
