import { expect, test } from '@playwright/test';
import { makeProfilePublic, seedOrganization } from './helpers/seed';

interface NavigationMetrics {
  domContentLoaded: number;
  load: number;
  lcp: number | null;
  resources: number;
}

declare global {
  interface Window {
    __lcp?: number;
  }
}

test.describe('Rendimiento', () => {
  test('el perfil público cumple los presupuestos de carga', async ({ page, request }) => {
    const organization = await seedOrganization(request);
    await makeProfilePublic(request, organization);

    await page.addInitScript(() => {
      window.__lcp = 0;
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const last = entries[entries.length - 1];
          if (last) window.__lcp = last.startTime;
        });
        observer.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch {
        // Navegadores sin soporte LCP: se omite esa métrica.
      }
    });

    const startedAt = Date.now();
    await page.goto(`/empresa/${organization.slug}`, { waitUntil: 'networkidle' });
    const elapsed = Date.now() - startedAt;

    const metrics = await page.evaluate<NavigationMetrics>(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as
        | PerformanceNavigationTiming
        | undefined;
      return {
        domContentLoaded: navigation?.domContentLoadedEventEnd ?? 0,
        load: navigation?.loadEventEnd ?? 0,
        lcp: window.__lcp && window.__lcp > 0 ? window.__lcp : null,
        resources: performance.getEntriesByType('resource').length,
      };
    });

    // Presupuestos amplios: detectan regresiones graves sin ser frágiles en CI.
    expect(metrics.domContentLoaded).toBeLessThan(6000);
    expect(metrics.load).toBeLessThan(8000);
    if (metrics.lcp !== null) {
      expect(metrics.lcp).toBeLessThan(5000);
    }
    expect(elapsed).toBeLessThan(12_000);
  });

  test('el login no bloquea la interfaz con recursos excesivos', async ({ page }) => {
    const navigation = page.goto('/login', { waitUntil: 'networkidle' });
    await navigation;
    const metrics = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as
        | PerformanceNavigationTiming
        | undefined;
      const resources = performance.getEntriesByType('resource');
      const bytes = resources.reduce((total, entry) => {
        const resource = entry as PerformanceResourceTiming;
        return total + (resource.transferSize || 0);
      }, 0);
      return {
        domContentLoaded: nav?.domContentLoadedEventEnd ?? 0,
        bytes,
      };
    });

    expect(metrics.domContentLoaded).toBeLessThan(6000);
    // Presupuesto de recursos iniciales del login (JS + CSS + fuentes).
    expect(metrics.bytes).toBeLessThan(8 * 1024 * 1024);
  });
});
