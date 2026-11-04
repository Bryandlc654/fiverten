import { expect, test } from '@playwright/test';
import { loginInBrowser, seedOrganization } from './helpers/seed';

const PDF = {
  name: 'documento.pdf',
  mimeType: 'application/pdf',
  buffer: Buffer.from('%PDF-1.4 documento de prueba'),
};

test.describe('Sello y verificación', () => {
  test('la empresa sube documentación, proyectos y envía la solicitud', async ({
    page,
    request,
  }) => {
    const organization = await seedOrganization(request, 'Verificación E2E SL');
    await loginInBrowser(page, organization);

    await page.goto('/dashboard/sello');
    await expect(page.getByRole('heading', { name: 'Sello y verificación' })).toBeVisible();
    await expect(page.getByText('Sin verificar').first()).toBeVisible();

    for (const category of ['identity', 'tax', 'address']) {
      await page.getByLabel('Tipo de documento').selectOption(category);
      await page.locator('input[type="file"]').setInputFiles(PDF);
      await expect(page.getByText('Documento añadido', { exact: false })).toBeVisible();
    }

    await page.getByLabel('Nombre del proyecto').fill('Proyecto E2E');
    await page.getByLabel('URL del proyecto').fill('https://example.com/e2e');
    await page.getByLabel('Descripción del proyecto').fill('Evidencia del servicio');
    await page.getByRole('button', { name: 'Añadir proyecto' }).click();
    await expect(page.getByText('Proyecto añadido')).toBeVisible();

    page.on('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Enviar solicitud a FIVERTEN' }).click();
    await expect(page.getByText('Solicitud enviada', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('En revisión').first()).toBeVisible();
  });
});
