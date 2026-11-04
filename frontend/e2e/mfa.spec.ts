import { expect, test } from '@playwright/test';
import { loginInBrowser, seedOrganization } from './helpers/seed';
import { totp } from './helpers/totp';

test.describe('Verificación en dos pasos', () => {
  test('se activa, se exige al entrar y se puede desactivar', async ({ page, request }) => {
    const organization = await seedOrganization(request, 'Seguridad E2E');
    await loginInBrowser(page, organization);

    await page.goto('/dashboard/seguridad');
    const card = page.getByTestId('mfa-card');
    await expect(card.getByText('Desactivada', { exact: true })).toBeVisible();

    await card.getByRole('button', { name: 'Activar verificación en dos pasos' }).click();
    const secret = (await card.locator('code').textContent())?.trim() ?? '';
    expect(secret.length).toBeGreaterThan(10);

    await card.getByLabel('Código de verificación').fill(totp(secret));
    await card.getByRole('button', { name: 'Confirmar y activar' }).click();
    await expect(card.getByText('Activada', { exact: true })).toBeVisible();

    // Cierra sesión y comprueba que el login pide el segundo factor.
    await page.getByRole('button', { name: 'Menú de usuario' }).click();
    await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click();
    await page.waitForURL('**/login');

    await page.getByLabel('Correo corporativo').fill(organization.email);
    await page.getByLabel('Contraseña').fill(organization.password);
    await page.getByRole('button', { name: 'Acceder' }).click();

    await expect(page.getByRole('heading', { name: 'Verificación en dos pasos' })).toBeVisible();
    await page.getByLabel('Código de verificación').fill(totp(secret));
    await page.getByRole('button', { name: 'Verificar código' }).click();
    await page.waitForURL('**/dashboard', { waitUntil: 'domcontentloaded' });

    // Desactiva el 2FA desde seguridad.
    await page.goto('/dashboard/seguridad');
    const securityCard = page.getByTestId('mfa-card');
    await securityCard.getByLabel('Contraseña').fill(organization.password);
    await securityCard.getByLabel('Código actual').fill(totp(secret));
    await securityCard.getByRole('button', { name: 'Desactivar 2FA' }).click();
    await expect(securityCard.getByText('Desactivada', { exact: true })).toBeVisible();
  });
});
