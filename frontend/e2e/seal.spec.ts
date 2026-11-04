import { expect, test } from '@playwright/test';
import { loginInBrowser, seedOrganization } from './helpers/seed';

test.describe('Sello, QR y widget', () => {
  test('genera un QR real y muestra el código de widget', async ({ page, request }) => {
    const organization = await seedOrganization(request, 'Sello E2E SL');
    await loginInBrowser(page, organization);

    await page.goto('/dashboard');
    const seal = page.getByRole('heading', { name: 'Sello verificado' }).locator('..');

    await seal.getByRole('button', { name: 'QR' }).click();
    await expect(
      seal.getByRole('img', { name: /Código QR del perfil/ }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(seal.getByRole('link', { name: 'Descargar QR' })).toBeVisible();

    await seal.getByRole('button', { name: 'Widget' }).click();
    await expect(seal.getByText(/\/api\/widget\/.*\.js/)).toBeVisible();
    await expect(seal.getByText(/<script src=/)).toBeVisible();
  });
});
