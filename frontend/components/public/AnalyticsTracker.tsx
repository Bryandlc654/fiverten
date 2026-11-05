'use client';

import { useEffect } from 'react';
import { API_URL, type PublicAnalyticsEvent } from '../../lib/api';

function utmSource(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const value = new URLSearchParams(window.location.search).get('utm_source');
  return value?.trim().slice(0, 40) || undefined;
}

function send(slug: string, type: PublicAnalyticsEvent): void {
  if (!slug) return;
  const body = JSON.stringify({
    slug,
    type,
    source: utmSource(),
    path: window.location.pathname,
    referrer: document.referrer || undefined,
  });
  void fetch(`${API_URL}/public/analytics/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    credentials: 'include',
    keepalive: true,
  }).catch(() => undefined);
}

/**
 * Registra una visita por sesión y los clics marcados con `data-fv-event`.
 * No guarda identificadores del visitante: solo el tipo de evento y la fuente.
 */
export default function AnalyticsTracker({ slug }: { slug: string }) {
  useEffect(() => {
    if (!slug) return;
    const key = `fiverten:view:${slug}`;
    try {
      if (!window.sessionStorage.getItem(key)) {
        window.sessionStorage.setItem(key, '1');
        send(slug, 'profile_view');
      }
    } catch {
      send(slug, 'profile_view');
    }

    function onClick(event: MouseEvent) {
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-fv-event]');
      const type = target?.dataset.fvEvent as PublicAnalyticsEvent | undefined;
      if (type === 'contact_click' || type === 'website_click' || type === 'seal_download') {
        send(slug, type);
      }
    }

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [slug]);

  return null;
}
