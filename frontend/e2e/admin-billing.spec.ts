import { expect, test } from '@playwright/test';
import { canSeed, promoteToSuperAdmin } from './helpers/db';
import { BACKEND_URL, loginInBrowser, seedOrganization } from './helpers/seed';

test.describe('Membresías del super admin', () => {
  test('crea un plan, suscribe una empresa y registra un pago', async ({ page, request }) => {
    test.skip(!canSeed(), 'Define E2E_DATABASE_URL para sembrar empresas');

    const organization = await seedOrganization(request, `Membresía E2E ${Date.now()}`);
    await promoteToSuperAdmin(organization.email);

    const login = await request.post(`${BACKEND_URL}/api/auth/login`, {
      data: { email: organization.email, password: organization.password },
    });
    const { accessToken } = (await login.json()) as { accessToken: string };
    const headers = { Authorization: `Bearer ${accessToken}` };
    const organizations = await request.get(`${BACKEND_URL}/api/admin/organizations`, {
      headers,
      params: { search: organization.companyName },
    });
    const organizationId = (
      (await organizations.json()) as { items: { id: string }[] }
    ).items[0].id;

    await loginInBrowser(page, organization);

    await page.goto('/admin/suscripciones');
    await expect(page.getByRole('heading', { name: /Membres/i })).toBeVisible();
    await page.getByRole('button', { name: 'Planes' }).click();
    await page.getByRole('button', { name: 'Nuevo plan' }).click();

    const stamp = Date.now();
    const planName = `E2E ${stamp}`;
    const planCode = `e2e-${stamp}`;
    const dialog = page.getByRole('dialog', { name: /Nuevo plan/i });
    await dialog.getByLabel(/Código/).fill(planCode);
    await dialog.getByLabel(/Nombre/).fill(planName);
    await dialog.getByLabel(/Precio mensual/).fill('19');
    await dialog.getByLabel(/Precio anual/).fill('190');
    await dialog.getByLabel(/Límite de reseñas/).fill('100');
    await dialog.getByLabel(/Límite de usuarios/).fill('4');
    await dialog.getByRole('button', { name: 'Guardar' }).click();

    await expect(page.getByText(planName, { exact: false })).toBeVisible();

    const plansResponse = await request.get(`${BACKEND_URL}/api/admin/plans`, { headers });
    const plans = (await plansResponse.json()) as { plans: { id: string; code: string }[] };
    const planId = plans.plans.find((plan) => plan.code === planCode)?.id;
    expect(planId).toBeTruthy();

    await page.goto(`/admin/organizations/${organizationId}`);
    await expect(page.getByRole('heading', { name: /Suscripción y pagos/i })).toBeVisible();
    await page.getByLabel('Plan').selectOption(planId as string);
    await page.getByRole('button', { name: 'Crear suscripción' }).click();
    await expect(page.getByRole('button', { name: 'Actualizar suscripción' })).toBeVisible();

    await page.getByLabel(/Importe/).fill('19');
    await page.getByRole('button', { name: 'Registrar pago' }).click();
    await expect(
      page.locator('li').filter({ hasText: '19 EUR' }).first(),
    ).toBeVisible();
  });
});
