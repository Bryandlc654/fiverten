import { expect, test } from '@playwright/test';
import { loginInBrowser, seedOrganization } from './helpers/seed';

test.describe('Navegación del panel', () => {
  test('el sidebar mantiene las mismas opciones en todas las páginas', async ({
    page,
    request,
  }) => {
    const organization = await seedOrganization(request, 'Sidebar E2E SL');
    await loginInBrowser(page, organization);

    await page.goto('/app');
    await expect(page.getByRole('button', { name: 'Resumen' })).toBeVisible();
    const overview = await page.locator('aside nav button').allTextContents();

    await page.goto('/app/configuracion');
    await expect(page.getByRole('button', { name: 'Resumen' })).toBeVisible();
    const company = await page.locator('aside nav button').allTextContents();

    expect(company).toEqual(overview);
    expect(overview.join(' ')).toContain('Resumen');
    expect(overview.join(' ')).toContain('Documentos');
    expect(overview.join(' ')).toContain('Proyectos');
    expect(overview.join(' ')).toContain('Clientes');
    expect(overview.join(' ')).toContain('Opiniones');
    expect(overview.join(' ')).toContain('Analítica');
    expect(overview.join(' ')).toContain('Plan y facturación');
    expect(overview.join(' ')).toContain('Equipo y configuración');

    const routes: [string, string][] = [
      ['/app/perfil', 'Perfil'],
      ['/app/perfil/cuenta', 'Mi cuenta'],
      ['/app/documentos', 'Documentos'],
      ['/app/proyectos', 'Proyectos'],
      ['/app/clientes', 'Clientes'],
      ['/app/opiniones', 'Opiniones'],
      ['/app/sello', 'Sello y embeds'],
      ['/app/analytics', 'Analítica'],
      ['/app/facturacion', 'Plan y facturación'],
      ['/app/configuracion', 'Equipo y configuración'],
    ];
    for (const [path, heading] of routes) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    }
  });

  test('la opción Perfil del sidebar abre el perfil de empresa, no el público', async ({
    page,
    request,
  }) => {
    const organization = await seedOrganization(request, 'Sidebar Perfil E2E SL');
    await loginInBrowser(page, organization);

    await page.goto('/app');
    await page
      .locator('aside nav button')
      .filter({ hasText: /Perfil/ })
      .click();
    await expect(page).toHaveURL(/\/app\/perfil$/);
    await expect(page.getByRole('heading', { name: 'Perfil', exact: true })).toBeVisible();
  });
});
