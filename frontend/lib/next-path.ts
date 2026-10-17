/**
 * Destino tras iniciar sesión (?next=...), fijado por middleware.ts o por la
 * página de invitación. Solo se aceptan rutas internas para evitar redirecciones
 * abiertas a otros dominios.
 */
export function nextPath(fallback = '/dashboard'): string {
  if (typeof window === 'undefined') {
    return fallback;
  }
  const next = new URLSearchParams(window.location.search).get('next');
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
    return fallback;
  }
  return next;
}
