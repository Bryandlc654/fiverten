import { expect, test } from '@playwright/test';
import { loginInBrowser, seedOrganization } from './helpers/seed';

test.describe('Mi plan (empresa)', () => {
  test('muestra el plan, los límites y el historial de pagos', async ({ page, request }) => {
    const organization = await seedOrganization(request, 'Membresía Empresa E2E');
    await loginInBrowser(page, organization);

    await page.goto('/app/facturacion');
    await expect(page.getByRole('heading', { name: 'Plan y facturación' })).toBeVisible();
    await expect(page.getByText('Historial de pagos')).toBeVisible();
    await expect(page.getByText('Usuarios e invitaciones')).toBeVisible();
    await expect(page.getByText('Reseñas recibidas')).toBeVisible();
  });
});
