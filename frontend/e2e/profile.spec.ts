import { expect, test } from '@playwright/test';
import { loginInBrowser, seedOrganization } from './helpers/seed';

test.describe('Mi perfil', () => {
  test('edita los datos personales y muestra el aviso', async ({ page, request }) => {
    const organization = await seedOrganization(request, 'Perfil E2E SL');
    await loginInBrowser(page, organization);

    await page.goto('/app/perfil/cuenta');
    await expect(page.getByRole('heading', { name: 'Mi cuenta' })).toBeVisible();

    await page.getByLabel('Nombre', { exact: true }).fill('Nombre Editado');
    await page.getByLabel('Apellidos', { exact: true }).fill('Apellido Editado');
    await page.getByLabel('Teléfono').fill('+34 611 222 333');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(page.getByText('Perfil actualizado.')).toBeVisible();
    await expect(page.getByText('Nombre Editado Apellido Editado').first()).toBeVisible();
  });
});
