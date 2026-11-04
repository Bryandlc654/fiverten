import { expect, test } from '@playwright/test';
import { canSeed, promoteToSuperAdmin } from './helpers/db';
import { loginInBrowser, seedOrganization } from './helpers/seed';

test.describe('Configuración del super admin', () => {
  test('cambia la configuración y gestiona catálogos', async ({ page, request }) => {
    test.skip(!canSeed(), 'Define E2E_DATABASE_URL para sembrar empresas');

    const organization = await seedOrganization(request, `Config E2E ${Date.now()}`);
    await promoteToSuperAdmin(organization.email);
    await loginInBrowser(page, organization);

    await page.goto('/admin/configuracion');
    await expect(page.getByRole('heading', { name: 'Configuración de la plataforma' })).toBeVisible();

    const siteName = `FIVERTEN ${Date.now()}`;
    await page.getByLabel('Nombre de la plataforma').fill(siteName);
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByText('Configuración guardada')).toBeVisible();

    await page.getByRole('button', { name: 'Categorías' }).click();
    const sectorName = `Categoría E2E ${Date.now()}`;
    await page.getByLabel('Nombre', { exact: true }).fill(sectorName);
    await page.getByRole('button', { name: 'Añadir' }).click();
    await expect(page.getByText(sectorName)).toBeVisible();

    await page.getByRole('button', { name: 'Motivos de reporte' }).click();
    const reasonCode = `motivo-${Date.now()}`;
    const reasonLabel = `Motivo E2E ${Date.now()}`;
    await page.getByLabel('Etiqueta').fill(reasonLabel);
    await page.getByLabel('Código', { exact: true }).fill(reasonCode);
    await page.getByRole('button', { name: 'Añadir' }).click();
    await expect(page.getByText(reasonLabel)).toBeVisible();
  });
});
