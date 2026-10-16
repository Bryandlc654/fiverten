import { NextResponse, type NextRequest } from 'next/server';

// Cookie indicadora que fija el backend al iniciar sesión o refrescar (path "/").
// No contiene secretos: solo dice que el navegador tiene una sesión. La
// autorización real (rol, empresa, super admin) la sigue haciendo la API en cada
// petición; esto evita servir las páginas privadas a quien no ha iniciado sesión.
// Debe coincidir con SESSION_HINT_COOKIE en backend/src/auth/auth.controller.ts.
const SESSION_HINT_COOKIE = 'fiverten_session';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

/**
 * Las cookies van ligadas al host (no al puerto). Si la API vive en otro
 * dominio sin el proxy same-origin, la cookie no llega a este servidor y el
 * middleware no puede comprobar nada: en ese caso se deja pasar y la página
 * redirige en el navegador como antes.
 */
function canSeeSessionCookie(request: NextRequest): boolean {
  if (API_URL.startsWith('/')) {
    return true;
  }
  try {
    return new URL(API_URL).hostname === request.nextUrl.hostname;
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  if (!canSeeSessionCookie(request) || request.cookies.has(SESSION_HINT_COOKIE)) {
    return NextResponse.next();
  }
  const login = request.nextUrl.clone();
  login.pathname = '/login';
  login.search = '';
  login.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
