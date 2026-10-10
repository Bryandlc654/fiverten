import { expect, test } from '@playwright/test';

test.describe('Registro de organización', () => {
  test('crea la cuenta y redirige al panel', async ({ page }) => {
    const email = `registro-${Date.now()}-${Math.round(Math.random() * 1e6)}@fiverten.test`;

    await page.goto('/register');
    await page.getByLabel('Nombre de la empresa').fill('Reseñas Verificadas SL');
    await page.getByLabel('Nombre', { exact: true }).fill('Grace');
    await page.getByLabel('Apellidos').fill('Hopper');
    await page.getByLabel('Correo electrónico').fill(email);
    await page.getByLabel('Contraseña').fill('Password123!');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    await page.waitForURL('**/dashboard');
    await expect(page.getByRole('heading', { name: 'Reseñas Verificadas SL' })).toBeVisible();
    await expect(page.getByText('Grace Hopper')).toBeVisible();
  });

  test('rechaza una contraseña demasiado corta', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('Nombre de la empresa').fill('Corta SL');
    await page.getByLabel('Correo electrónico').fill(`corta-${Date.now()}@fiverten.test`);
    await page.getByLabel('Contraseña').fill('123');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    await expect(page.getByTestId('auth-error')).toContainText('al menos 8 caracteres');
    await expect(page).toHaveURL(/\/register$/);
  });
});
