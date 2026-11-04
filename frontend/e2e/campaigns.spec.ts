import { expect, test } from '@playwright/test';
import { loginInBrowser, seedOrganization } from './helpers/seed';

test.describe('Campañas de reseñas', () => {
  test('crea una campaña con varios destinatarios y muestra el seguimiento', async ({
    page,
    request,
  }) => {
    const organization = await seedOrganization(request, 'Campaña E2E SL');
    await loginInBrowser(page, organization);

    await page.goto('/app/clientes');
    await expect(page.getByRole('heading', { name: 'Clientes' })).toBeVisible();
    await page.getByRole('button', { name: 'Nueva campaña' }).click();

    const dialog = page.getByRole('dialog', { name: 'Nueva campaña de reseñas' });
    const name = `Campaña ${Date.now()}`;
    await dialog.getByLabel('Nombre de la campaña').fill(name);
    await dialog
      .getByLabel('Destinatarios (uno por línea: Nombre, email)')
      .fill('Lucía Campaña, lucia-campana@cliente.test\nMario Campaña, mario-campana@cliente.test');
    await expect(dialog.getByText('2 destinatarios válidos')).toBeVisible();
    await dialog.getByRole('button', { name: 'Crear y enviar' }).click();

    await expect(page.getByText('Campaña creada', { exact: false })).toBeVisible();
    await expect(page.getByText(name, { exact: false }).first()).toBeVisible();
    await expect(page.getByText('2 enviadas', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Lucía Campaña')).toBeVisible();
  });

  test('el dashboard muestra las estadísticas de solicitudes', async ({ page, request }) => {
    const organization = await seedOrganization(request, 'Stats Solicitudes E2E');
    await loginInBrowser(page, organization);

    await page.goto('/app');
    await expect(page.getByText('Solicitudes de reseña')).toBeVisible();
    await expect(page.getByText('Conversión', { exact: false }).first()).toBeVisible();
  });
});
