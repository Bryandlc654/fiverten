import { expect, test } from '@playwright/test';
import { canSeed, promoteToSuperAdmin, seedCase } from './helpers/db';
import { loginInBrowser, makeProfilePublic, seedOrganization } from './helpers/seed';

test.describe('Casos de evidencias', () => {
  test('el cliente ve su caso y puede aceptar retirar la reseña', async ({ page, request }) => {
    test.skip(!canSeed(), 'Define E2E_DATABASE_URL para sembrar casos');

    const organization = await seedOrganization(request, 'Caso Cliente E2E');
    const { token } = await seedCase(organization.slug, 'company_notified');

    await page.goto(`/caso/${token}`);

    await expect(page.getByText('Tu reseña sobre Caso Cliente E2E')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Revisión de evidencias' })).toBeVisible();
    await expect(page.getByText('Pagué y el pedido nunca llegó.')).toBeVisible();
    await expect(page.getByText('¿Habéis llegado a un acuerdo?')).toBeVisible();

    await page.getByRole('button', { name: 'Acepto retirar la reseña' }).click();
    await expect(page.getByText('✓ Has aceptado el acuerdo')).toBeVisible();
  });

  test('la empresa abre el caso desde su panel', async ({ page, request }) => {
    test.skip(!canSeed(), 'Define E2E_DATABASE_URL para sembrar casos');

    const organization = await seedOrganization(request, 'Caso Empresa E2E');
    await makeProfilePublic(request, organization);
    await seedCase(organization.slug, 'company_notified');

    await loginInBrowser(page, organization);
    await page.goto('/dashboard/casos');

    await expect(page.getByText('No recibí el pedido').first()).toBeVisible();
    await page.getByText('No recibí el pedido').first().click();

    await expect(page.getByRole('heading', { name: 'Evidencias y conversación' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Acuerdo con el cliente' })).toBeVisible();
  });

  test('el super admin revisa el caso y ve las acciones', async ({ page, request }) => {
    test.skip(!canSeed(), 'Define E2E_DATABASE_URL para sembrar casos');

    const organization = await seedOrganization(request, 'Caso Admin E2E');
    const { reviewCase } = await seedCase(organization.slug, 'company_notified');
    await promoteToSuperAdmin(organization.email);

    await loginInBrowser(page, organization);
    await page.goto(`/admin/casos?id=${reviewCase.id}`);

    await expect(page.getByRole('heading', { name: 'Casos de evidencias' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Acciones' })).toBeVisible();
    await expect(page.getByText('Publicar la reseña')).toBeVisible();
  });
});
