import { expect, test } from '@playwright/test';
import { canSeed, createPlan } from './helpers/db';
import { loginInBrowser, seedOrganization } from './helpers/seed';

test.describe('Cambio de plan de la empresa', () => {
  test('el propietario puede cambiar de plan desde Mi plan', async ({ page, request }) => {
    test.skip(!canSeed(), 'Define E2E_DATABASE_URL para sembrar planes');

    const organization = await seedOrganization(request, 'Cambio Plan E2E');
    const stamp = Date.now();
    const planName = `Plan E2E ${stamp}`;
    await createPlan({
      code: `plan-e2e-${stamp}`,
      name: planName,
      priceMonthly: 29,
      userLimit: 10,
      reviewLimit: 1000,
    });

    await loginInBrowser(page, organization);
    await page.goto('/dashboard/membresia');
    await expect(page.getByRole('heading', { name: 'Mi plan' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Planes disponibles' })).toBeVisible();

    page.on('dialog', (dialog) => dialog.accept());
    const card = page.locator('article').filter({ hasText: planName });
    await expect(card).toBeVisible();
    await card.getByRole('button', { name: 'Cambiar a este plan' }).click();

    await expect(page.getByText(`Plan actualizado a ${planName}.`)).toBeVisible();
    await expect(card.getByText('Plan actual').first()).toBeVisible();
  });
});
