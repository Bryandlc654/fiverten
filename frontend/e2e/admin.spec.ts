import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { test } from '@playwright/test';
import { canSeed, promoteToSuperAdmin } from './helpers/db';
import { seedOrganization } from './helpers/seed';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@fiverten.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin12345!';

/** Usa el admin del entorno o crea uno real y lo promociona en la base de datos. */
async function ensureAdmin(request: APIRequestContext) {
  if (!canSeed()) {
    return { email: ADMIN_EMAIL, password: ADMIN_PASSWORD };
  }
  const organization = await seedOrganization(request, `Admin E2E ${Date.now()}`);
  await promoteToSuperAdmin(organization.email);
  return { email: organization.email, password: organization.password };
}

async function loginAsAdmin(page: Page, email: string, password: string) {
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.getByLabel('Correo corporativo').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Acceder' }).click();
  await page.waitForURL('**/dashboard', { waitUntil: 'domcontentloaded' });
}

test.describe('Panel de administración general', () => {
  test('el super administrador accede al panel, ve estadísticas y usuarios', async ({
    page,
    request,
  }) => {
    const admin = await ensureAdmin(request);
    await loginAsAdmin(page, admin.email, admin.password);

    await page.goto('/admin');

    await expect(page.getByRole('heading', { name: 'Panel general' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Empresas', exact: true })).toBeVisible();
    await expect(page.getByText('Verificadas')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nueva empresa' })).toBeVisible();

    await page.getByRole('button', { name: 'Usuarios', exact: true }).click();
    await expect(page.getByRole('columnheader', { name: 'Usuario' })).toBeVisible();
  });

  test('crea una nueva empresa desde el panel general', async ({ page, request }) => {
    const admin = await ensureAdmin(request);
    await loginAsAdmin(page, admin.email, admin.password);
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
