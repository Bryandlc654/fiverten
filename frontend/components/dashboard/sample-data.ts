// Datos de ejemplo del resumen del tenant. Se sustituirán por datos reales
// cuando existan los módulos de reseñas, solicitudes y estadísticas.

export const STATS = [
  { label: 'Visitas al perfil', value: '12.847', delta: '+18%', icon: 'visibility', tone: 'blue' },
  { label: 'Opiniones publicadas', value: '127', delta: '+12', icon: 'reviews', tone: 'emerald' },
  { label: 'Valoración media', value: '4,8', delta: '+0,2', icon: 'star', tone: 'amber' },
  { label: 'Solicitudes pendientes', value: '6', delta: '', icon: 'pending_actions', tone: 'violet' },
  { label: 'Tasa de respuesta', value: '92%', delta: '+4%', icon: 'forum', tone: 'slate' },
];

export const TONE_STYLES: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  violet: 'bg-violet-50 text-violet-600',
  slate: 'bg-slate-100 text-slate-600',
};

export const TASKS = [
  { label: 'Completa los datos fiscales de la empresa', done: true },
  { label: 'Sube el CIF y el documento de identidad', done: true },
  { label: 'Vincula tu fuente de opiniones', done: false },
  { label: 'Personaliza tu sello verificado', done: false },
  { label: 'Publica tu perfil público', done: false },
];

export const REVIEWS = [
  {
    name: 'Marta González',
    platform: 'Google',
    rating: 5,
    date: 'Hace 2 días',
    text: 'Trabajo impecable y muy profesional. Repetiré sin duda.',
  },
  {
    name: 'Javier Ruiz',
    platform: 'FIVERTEN',
    rating: 4,
    date: 'Hace 5 días',
    text: 'Buen resultado final y cumplimiento de plazos.',
  },
  {
    name: 'Lucía Fernández',
    platform: 'Google',
    rating: 5,
    date: 'Hace 1 semana',
    text: 'Comunicación excelente durante todo el proyecto.',
  },
];

export const ACTIVITY = [
  { icon: 'reviews', text: 'Nueva opinión verificada de Marta González', time: 'Hace 2 días' },
  { icon: 'verified_user', text: 'Se validó el documento de identidad fiscal', time: 'Hace 3 días' },
  { icon: 'visibility', text: 'Tu perfil superó las 12.000 visitas', time: 'Hace 5 días' },
  { icon: 'content_copy', text: 'Copiaste el widget del sello', time: 'Hace 1 semana' },
];
