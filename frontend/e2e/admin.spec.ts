import { expect, type Page } from '@playwright/test';
import { test } from '@playwright/test';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@fiverten.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin12345!';

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Correo corporativo').fill(ADMIN_EMAIL);
  await page.getByLabel('Contraseña').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Acceder' }).click();
  await page.waitForURL('**/dashboard');
}

test.describe('Panel de administración general', () => {
  test('el super administrador accede al panel, ve estadísticas y usuarios', async ({ page }) => {
    await loginAsAdmin(page);

    await page.getByTestId('admin-panel-link').click();
    await page.waitForURL('**/admin');

    await expect(page.getByRole('heading', { name: 'Panel general' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Empresas' })).toBeVisible();
    await expect(page.getByText('Verificadas')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nueva empresa' })).toBeVisible();

    await page.getByRole('button', { name: 'Usuarios', exact: true }).click();
    await expect(page.getByRole('columnheader', { name: 'Usuario' })).toBeVisible();
  });

  test('crea una nueva empresa desde el panel general', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin');

    await page.getByRole('button', { name: 'Nueva empresa' }).click();
    await page.waitForURL('**/admin/organizations/new');

    const tradeName = `Empresa E2E ${Date.now()}`;
    await page.getByLabel(/Nombre comercial/).fill(tradeName);
    await page.getByRole('button', { name: 'Crear empresa' }).click();

    await page.waitForURL(/\/admin\/organizations\/(?!new)[0-9a-f-]+$/);
    await expect(page.getByRole('heading', { name: tradeName })).toBeVisible();
    await expect(page.getByText(/Miembros \(/)).toBeVisible();
  });
});
