import { expect, test } from '@playwright/test';
import { loginInBrowser, seedOrganization } from './helpers/seed';

const PDF = {
  name: 'documento.pdf',
  mimeType: 'application/pdf',
  buffer: Buffer.from('%PDF-1.4 documento de prueba'),
};

test.describe('Sello y verificación', () => {
  test('documentos en Sello, proyectos en Proyectos y envío de la solicitud', async ({
    page,
    request,
  }) => {
    const organization = await seedOrganization(request, 'Verificación E2E SL');
    await loginInBrowser(page, organization);

    await page.goto('/app/sello');
    await expect(page.getByRole('heading', { name: 'Sello y embeds' })).toBeVisible();
    await expect(page.getByText('Sin verificar').first()).toBeVisible();

    for (const category of ['identity', 'tax', 'address']) {
      await page.getByLabel('Tipo de documento').selectOption(category);
      await page.getByLabel(/Archivo \(PDF o imagen/).setInputFiles(PDF);
      await expect(page.getByText('Documento añadido', { exact: false })).toBeVisible();
    }

    // Sin proyectos no se puede enviar y no hay formulario de alta aquí.
    await expect(page.getByText('Faltan proyectos.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enviar solicitud a FIVERTEN' })).toBeDisabled();
    await expect(page.getByLabel('Nombre del proyecto')).toHaveCount(0);

    await page.getByRole('link', { name: /Añadir proyectos/ }).click();
    await expect(page).toHaveURL(/\/app\/proyectos$/);

    await page.getByLabel('Nombre del proyecto').fill('Proyecto E2E');
    await page.getByLabel('URL (opcional)').fill('https://example.com/e2e');
    await page.getByLabel('Descripción (opcional)').fill('Evidencia del servicio');
    await page
      .getByLabel(/Archivos de evidencia/)
      .setInputFiles({ name: 'evidencia.pdf', mimeType: 'application/pdf', buffer: PDF.buffer });
    await page.getByRole('button', { name: 'Añadir proyecto' }).click();
    await expect(page.getByText('Proyecto añadido', { exact: false })).toBeVisible();

    await page.goto('/app/sello');
    await expect(page.getByText('Faltan proyectos.')).toHaveCount(0);
    await expect(page.getByText(/de \d+ proyecto\(s\) registrados/)).toBeVisible();

    page.on('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Enviar solicitud a FIVERTEN' }).click();
    await expect(page.getByText('Solicitud enviada', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('En revisión').first()).toBeVisible();
  });
});
