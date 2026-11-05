import { expect, test } from '@playwright/test';
import { BACKEND_URL, loginInBrowser, makeProfilePublic, seedOrganization } from './helpers/seed';

test.describe('Analítica del panel', () => {
  test('muestra el resumen del perfil y las fuentes de tráfico', async ({ page, request }) => {
    const organization = await seedOrganization(request, 'Analítica E2E SL');
    await makeProfilePublic(request, organization);

    await request.post(`${BACKEND_URL}/api/public/analytics/events`, {
      data: {
        slug: organization.slug,
        type: 'profile_view',
        source: 'google',
        path: `/empresa/${organization.slug}`,
      },
    });
    await request.post(`${BACKEND_URL}/api/public/analytics/events`, {
      data: { slug: organization.slug, type: 'contact_click', source: 'google' },
    });

    await loginInBrowser(page, organization);

    await page.goto('/app');
    await expect(page.getByText('Tu reputación ahora es verificable')).toBeVisible();
    await expect(page.getByText('Perfil completo')).toBeVisible();
    await expect(page.getByText('Visitas · 30 días')).toBeVisible();

    await page.goto('/app/analytics');
    await expect(page.getByRole('heading', { name: 'Analítica', exact: true })).toBeVisible();
    await expect(page.getByText('Visitas al perfil')).toBeVisible();
    await expect(page.getByText('Clics de contacto', { exact: true })).toBeVisible();
    await expect(page.getByText('Google', { exact: true })).toBeVisible();
    await expect(page.getByText('Rendimiento del perfil')).toBeVisible();
  });
});
