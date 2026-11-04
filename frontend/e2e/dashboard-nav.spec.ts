import { expect, test } from '@playwright/test';
import { loginInBrowser, seedOrganization } from './helpers/seed';

test.describe('Navegación del panel', () => {
  test('el sidebar mantiene las mismas opciones en todas las páginas', async ({
    page,
    request,
  }) => {
    const organization = await seedOrganization(request, 'Sidebar E2E SL');
    await loginInBrowser(page, organization);

    await page.goto('/dashboard');
    await expect(page.getByRole('button', { name: 'Resumen' })).toBeVisible();
    const overview = await page.locator('aside nav button').allTextContents();

    await page.goto('/dashboard/company');
    await expect(page.getByRole('button', { name: 'Resumen' })).toBeVisible();
    const company = await page.locator('aside nav button').allTextContents();

    expect(company).toEqual(overview);
    expect(overview.join(' ')).toContain('Resumen');
    expect(overview.join(' ')).toContain('Campañas');
    expect(overview.join(' ')).toContain('Soporte');
    expect(overview.join(' ')).toContain('Mi perfil');
  });
});
